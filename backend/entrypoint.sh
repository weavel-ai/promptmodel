#!/bin/sh
echo "wait db server"
dockerize -wait tcp://${POSTGRES_HOST}:${POSTGRES_PORT} -timeout 20s

echo "Running migrations"
alembic upgrade head

echo "Starting FastAPI"
exec "$@"
