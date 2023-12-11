# Build stage
FROM node:20-alpine AS build
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm


COPY . .
RUN pnpm install
RUN pnpm build

# Run stage
FROM node:20-alpine
WORKDIR /app
COPY --from=build /app .
CMD ["pnpm", "start"]
