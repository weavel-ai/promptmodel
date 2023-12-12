import os
import select
import psycopg2
import psycopg2.extensions
import redis
import json

# Connect to PostgreSQL
pg_conn = psycopg2.connect(
    dbname=os.environ.get("POSTGRES_DB"), 
    user=os.environ.get("POSTGRES_USER"), 
    password=os.environ.get("POSTGRES_PASSWORD"), 
    host=os.environ("POSTGRES_HOST")  # use the service name as the hostname
)
pg_conn.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_AUTOCOMMIT)

# Connect to Redis
redis_conn = redis.Redis(host='redis', port=6379, db=0)

# Listen to the channel
pg_curs = pg_conn.cursor()
channels = ['project_channel', 'function_model_channel', 'chat_model_channel', 'sample_input_channel', 'function_schema_channel', 'run_log_channel', 'chat_log_channel'] # Add other channels
for channel in channels:
    pg_curs.execute(f"LISTEN {channel}")

print("Waiting for notifications on channel 'my_pg_channel'")

while True:
    if select.select([pg_conn], [], [], 5) == ([], [], []):
        print("Timeout: No notifications in the last 5 seconds")
    else:
        pg_conn.poll()
        while pg_conn.notifies:
            notify = pg_conn.notifies.pop(0)
            print("Got NOTIFY:", json.loads(notify.payload))
            redis_conn.publish('my_redis_channel', notify.payload)
