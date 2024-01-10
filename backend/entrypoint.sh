#!/bin/sh
echo "wait db server"
dockerize -wait tcp://${POSTGRES_HOST}:${POSTGRES_PORT} -timeout 20s

echo "Running migrations"
alembic upgrade head


if [ "${SEED_DB}" = "true" ]; then
    echo "Seeding the database with seed.sql using Python script"
    python /app/seed.py
fi


echo "Starting FastAPI"
exec "$@"
