# Build stage
FROM node:20-alpine AS build
WORKDIR /app

RUN npm install -g pnpm

COPY . .
RUN pnpm install
RUN pnpm build

# Run stage
FROM node:20-alpine
WORKDIR /app
RUN npm install -g pnpm
COPY --from=build /app /app
COPY --from=build /app/node_modules /app/node_modules
CMD ["pnpm", "start"]
