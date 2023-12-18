FROM python:3.9-slim AS builder
ENV DOCKERIZE_VERSION v0.7.0

ARG PORT
ARG POSTGRES_HOST
ARG POSTGRES_DB
ARG POSTGRES_USER
ARG POSTGRES_PASSWORD
ARG POSTGRES_PORT
ARG NEXTAUTH_SECRET
ARG FRONTEND_PUBLIC_URL
ENV NEXTAUTH_URL=$FRONTEND_PUBLIC_URL

RUN apt-get update \
    && apt-get install -y wget \
    && wget -O - https://github.com/jwilder/dockerize/releases/download/$DOCKERIZE_VERSION/dockerize-linux-amd64-$DOCKERIZE_VERSION.tar.gz | tar xzf - -C /usr/local/bin \
    && apt-get autoremove -yqq --purge wget && rm -rf /var/lib/apt/lists/*
	
WORKDIR /app

COPY requirements* .
RUN pip install --no-cache-dir --upgrade -r requirements-prod.txt

COPY . .

FROM python:3.9-slim AS deployer
ENV NEXTAUTH_URL=$FRONTEND_PUBLIC_URL
COPY --from=builder /usr/local/bin/dockerize /usr/local/bin/dockerize
COPY --from=builder /usr/local/bin/alembic /usr/local/bin/alembic
COPY --from=builder /usr/local/bin/uvicorn /usr/local/bin/uvicorn

COPY --from=builder /usr/local/lib/python3.9/site-packages /usr/local/lib/python3.9/site-packages
COPY --from=builder /app /app
RUN apt-get update && apt-get install -y make && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN chmod +x entrypoint.sh

ENTRYPOINT ["./entrypoint.sh"]

CMD uvicorn server:app --host 0.0.0.0 --port $PORT
