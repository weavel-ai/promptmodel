from datetime import datetime
from typing import Optional
import time
import os
import json
import select
import sys
import psycopg2
import psycopg2.extensions
from psycopg2.extensions import connection as pg_connection
import redis
from redis import Redis


def connect_to_postgres() -> Optional[pg_connection]:
    print("Start connecting to PostgreSQL")
    try:
        conn = psycopg2.connect(
            dbname=os.environ.get("POSTGRES_DB"),
            user=os.environ.get("POSTGRES_USER"),
            password=os.environ.get("POSTGRES_PASSWORD"),
            host=os.environ.get("POSTGRES_HOST"),
            port=os.environ.get("POSTGRES_PORT") or 5432,
        )
        conn.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_AUTOCOMMIT)
        return conn
    except psycopg2.OperationalError as e:
        print(f"Error connecting to PostgreSQL: {e}")
        return None


def connect_to_redis() -> Optional[Redis]:
    print("Start connecting to Redis")
    try:
        redis_host = os.environ.get("REDIS_HOST") or "localhost"
        redis_port = int(os.environ.get("REDIS_PORT", 6379))
        redis_password = os.environ.get("REDIS_PASSWORD") or None
        return redis.Redis(
            host=redis_host, port=redis_port, db=0, password=redis_password
        )
    except redis.RedisError as e:
        print(f"Error connecting to Redis: {e}")
        return None


def listen_to_pg_channels(pg_conn: Optional[pg_connection], channels: list):
    print("Starting to listen to PostgreSQL channels")
    cursors = {channel: pg_conn.cursor() for channel in channels}
    for channel, cursor in cursors.items():
        cursor.execute(f"LISTEN {channel}")
        print(f"Listening to {channel}")
        
def check_pg_connection(pg_conn: Optional[pg_connection]):
    try:
        with pg_conn.cursor() as cursor:
            cursor.execute("SELECT 1")
        return True
    except psycopg2.OperationalError:
        return False

def check_redis_connection(redis_conn: Optional[Redis]):
    try:
        return redis_conn.ping()
    except redis.RedisError:
        return False


pg_conn: Optional[pg_connection] = connect_to_postgres()
print("End connecting to PostgreSQL")
redis_conn: Optional[Redis] = connect_to_redis()
print("End connecting to Redis")

if not pg_conn or not redis_conn:
    print("Failed to establish database connections. Exiting...")
    sys.exit(1)

channels = [
    "project_channel",
    "function_model_channel",
    "chat_model_channel",
    "sample_input_channel",
    "function_schema_channel",
    "run_log_channel",
    "chat_log_channel",
]

listen_to_pg_channels(pg_conn, channels)

last_check_time = time.time()

while True:
    current_time = time.time()
    try:
        
        if select.select([pg_conn], [], [], 60) == ([], [], []):
            print(
                f"Timeout ({datetime.now()}): No notifications in the last 60 seconds"
            )
        else:
            pg_conn.poll()

            for notify in pg_conn.notifies:
                print("Got NOTIFY:", notify.channel)
                if notify.payload:
                    data: dict = json.loads(notify.payload)
                    channel = notify.channel
                    if data.get("project_uuid"):
                        channel += f"_p_{data['project_uuid']}"
                    if data.get("organization_id"):
                        channel += f"_o_{data['organization_id']}"
                    print(f"Publishing to {channel}")
                    redis_conn.publish(channel, notify.payload)
                    # Remove the notification from the queue
                pg_conn.notifies.remove(notify)
                
        if current_time - last_check_time >= 180:
            print(f"Checking database connections at {datetime.now()}")
            last_check_time = current_time
            if not check_pg_connection(pg_conn):
                pg_conn = connect_to_postgres()
                if pg_conn:
                    listen_to_pg_channels(pg_conn, channels)
                else:
                    print("Failed to reestablish PostgreSQL connection. Exiting...")
                    raise psycopg2.DatabaseError
            if not check_redis_connection(redis_conn):
                redis_conn = connect_to_redis()
                if not redis_conn:
                    print("Failed to reestablish Redis connection. Exiting...")
                    raise redis.RedisError
    except (psycopg2.DatabaseError, redis.RedisError) as error:
        print(f"Error: {error}")
        pg_conn = connect_to_postgres()
        redis_conn = connect_to_redis()
        if not pg_conn or not redis_conn:
            print("Failed to reestablish database connections. Exiting...")
            break
        listen_to_pg_channels(pg_conn, channels)
