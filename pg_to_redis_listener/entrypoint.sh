#!/bin/sh
echo "wait db server"
dockerize -wait tcp://db:5432 -timeout 20s

exec "$@"