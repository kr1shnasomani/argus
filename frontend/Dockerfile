FROM node:20-alpine AS base

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Development stage (used by docker-compose for local dev with hot reloading)
FROM base AS development
CMD ["npm", "run", "dev", "--", "--host"]

# Build stage (used for creating production assets)
FROM base AS builder
RUN npm run build

# Production stage (default when building without a target)
FROM nginx:alpine AS production

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
