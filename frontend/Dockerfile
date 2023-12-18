# Base image
FROM node:20-alpine AS base
ARG DATABASE_URL
ARG NEXTAUTH_SECRET
ARG FRONTEND_PUBLIC_URL
ENV NEXTAUTH_URL=$FRONTEND_PUBLIC_URL
ARG BACKEND_PUBLIC_URL
ENV NEXT_PUBLIC_ENDPOINT_URL=${BACKEND_PUBLIC_URL}/api
ARG SALT

# It's important to update the index before installing packages to ensure you're getting the latest versions.
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk update && apk upgrade --no-cache libcrypto3 libssl3 libc6-compat

FROM base AS deps
ENV NEXTAUTH_URL=$FRONTEND_PUBLIC_URL
ENV NEXT_PUBLIC_ENDPOINT_URL=${BACKEND_PUBLIC_URL}/api
ARG NEXTAUTH_SECRET
ARG NEXT_PUBLIC_SELF_HOSTED

WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Rebuild the source code only when needed
FROM base AS builder
ENV NEXTAUTH_URL=$FRONTEND_PUBLIC_URL
ENV NEXT_PUBLIC_ENDPOINT_URL=${BACKEND_PUBLIC_URL}/api
ARG NEXTAUTH_SECRET
ARG NEXT_SERVER_ENDPOINT_URL
ARG NEXT_PUBLIC_SELF_HOSTED

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
# Copy the rest of the application source code
COPY . .

# Build your application if necessary
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
ENV NEXTAUTH_URL=$FRONTEND_PUBLIC_URL
ENV NEXT_PUBLIC_ENDPOINT_URL=${BACKEND_PUBLIC_URL}/api
ARG NEXTAUTH_SECRET
ARG NEXT_PUBLIC_SELF_HOSTED

WORKDIR /app

RUN echo ${NEXT_PUBLIC_ENDPOINT_URL}

ENV NODE_ENV production
ENV NEXT_SHARP_PATH ./node_modules/sharp

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT 3000
# set hostname to localhost
ENV HOSTNAME "0.0.0.0"

# Run application

CMD ["node", "server.js"]
