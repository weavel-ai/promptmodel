import os
import select
import psycopg2
import psycopg2.extensions
import redis
import json
from dotenv import load_dotenv

load_dotenv()

# Connect to PostgreSQL
pg_conn = psycopg2.connect(
    dbname=os.environ.get("POSTGRES_DB"), 
    user=os.environ.get("POSTGRES_USER"), 
    password=os.environ.get("POSTGRES_PASSWORD"), 
    host=os.environ.get("POSTGRES_HOST"),  # use the service name as the hostname
    port=os.environ.get("POSTGRES_PORT") or 5432  # Default to 5432 if no port specified
)

pg_conn.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_AUTOCOMMIT)

redis_host = os.environ.get("REDIS_HOST") or 'localhost'
redis_port = os.environ.get("REDIS_PORT") or 6379
# Connect to Redis
redis_conn = redis.Redis(host=redis_host, port=redis_port, db=0)
# redis_conn = redis.Redis(host='redis', port=6379, db=0)

# Listen to the channel
pg_curs = pg_conn.cursor()
channels = ['project_channel', 'function_model_channel', 'chat_model_channel', 'sample_input_channel', 'function_schema_channel', 'run_log_channel', 'chat_log_channel'] # Add other channels
for channel in channels:
    pg_curs.execute(f"LISTEN {channel}")
    print(f"Listening to {channel}")

while True:
    if select.select([pg_conn], [], [], 60) == ([], [], []):
        print("Timeout: No notifications in the last 60 seconds")
    else:
        pg_conn.poll()
        while pg_conn.notifies:
            notify = pg_conn.notifies.pop(0)
            print("Got NOTIFY:", notify.channel)
            if notify.payload:
                data = json.loads(notify.payload)
                channel = notify.channel
                if data.get("project_uuid"):
                    channel += f"_p_{data['project_uuid']}"
                if data.get("organization_id"):
                    channel += f"_o_{data['organization_id']}"
                print(f"Publishing to {channel}")
                redis_conn.publish(channel, notify.payload)
