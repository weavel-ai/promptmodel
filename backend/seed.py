import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

# Database connection parameters
db_params = {
    "dbname": os.environ.get("POSTGRES_DB"),
    "user": os.environ.get("POSTGRES_USER"),
    "password": os.environ.get("POSTGRES_PASSWORD"),
    "host": os.environ.get("POSTGRES_HOST"),
    "port": os.environ.get("POSTGRES_PORT"),
}

# Read the contents of the seed.sql file
with open("seed.sql", "r") as file:
    seed_sql = file.read()

try:
    # Connect to the database
    conn = psycopg2.connect(**db_params)
    cursor = conn.cursor()

    # Execute the seed SQL script
    cursor.execute(seed_sql)

    # Commit the changes and close the connection
    conn.commit()

except Exception as e:
    print(f"Error: {e}")
finally:
    cursor.close()
    conn.close()
