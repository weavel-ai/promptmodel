#!/bin/sh
echo "wait db server"
dockerize -wait tcp://db:5432 -timeout 20s

echo "Running migrations"
alembic upgrade head

echo "Starting FastAPI"
exec "$@"
