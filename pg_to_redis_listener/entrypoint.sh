#!/bin/sh
echo "wait db server"
dockerize -wait tcp://${POSTGRES_HOST}:${POSTGRES_PORT} -timeout 20s

exec "$@"