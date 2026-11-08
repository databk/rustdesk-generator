# Stage 1: Build frontend
FROM node:22-slim AS frontend-builder

ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY=""
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
ENV NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY
RUN npm run build

# Stage 2: Build backend (includes frontend assets via rust-embed)
FROM rust:1.89-slim AS backend-builder

WORKDIR /app
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*
COPY backend/Cargo.toml backend/Cargo.lock ./backend/
COPY backend/src/ ./backend/src/
COPY --from=frontend-builder /app/frontend/out ./frontend/out/
RUN cargo build --release --manifest-path backend/Cargo.toml

# Stage 3: Runtime (single binary, no static files needed)
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y ca-certificates libssl3 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=backend-builder /app/backend/target/release/rustdesk-generator-backend /app/rustdesk-generator-backend

ENV PORT=3000
ENV DATA_DIR=/app/data

EXPOSE 3000

CMD ["/app/rustdesk-generator-backend"]
