# # Dockerfile for Next.js
FROM node:21-alpine AS development
WORKDIR /web
# Install pnpm first
RUN corepack enable && corepack prepare pnpm@8.6.5 --activate  # Change to your version
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
CMD ["pnpm", "run", "dev"]