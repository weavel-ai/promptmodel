# Stage 1: Builder
FROM python:3.9-slim AS builder
ENV DOCKERIZE_VERSION v0.7.0

ARG PORT
ARG POSTGRES_HOST
ARG POSTGRES_DB
ARG POSTGRES_USER
ARG POSTGRES_PASSWORD
ARG POSTGRES_PORT
ARG REDIS_HOST
ARG NEXTAUTH_SECRET
ARG FRONTEND_PUBLIC_URL
ARG SEED_DB=false
ENV NEXT_PUBLIC_SELF_HOSTED=true
ENV NEXTAUTH_URL=$FRONTEND_PUBLIC_URL

# Install Dockerize and any other necessary packages
RUN apt-get update \
    && apt-get install -y wget postgresql-client \
    && wget -O - https://github.com/jwilder/dockerize/releases/download/$DOCKERIZE_VERSION/dockerize-linux-amd64-$DOCKERIZE_VERSION.tar.gz | tar xzf - -C /usr/local/bin \
    && apt-get autoremove -yqq --purge wget && rm -rf /var/lib/apt/lists/*

# # Copy the Python script into the image
# COPY seed.py /app/seed.py
    
WORKDIR /app

COPY requirements* .
RUN pip install --no-cache-dir --upgrade -r requirements-prod.txt

COPY . .

# Stage 3: Deployer
FROM python:3.9-slim AS deployer
ARG FRONTEND_PUBLIC_URL
ENV NEXT_PUBLIC_SELF_HOSTED=true
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

# CMD uvicorn server:app --host 0.0.0.0 --port $PORT
