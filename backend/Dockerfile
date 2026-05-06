# ── Build stage ──────────────────────────────────────────────────────────────
FROM rust:latest AS builder

WORKDIR /app

# Cache dependencies first
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo 'fn main(){}' > src/main.rs && cargo build --release && rm -rf src

# Build the real binary
COPY src ./src
RUN touch src/main.rs && cargo build --release

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/target/release/mhw-api ./mhw-api

# Render injects PORT; default 8080 for local
ENV MHW_BIND=0.0.0.0:8080
EXPOSE 8080

CMD ["./mhw-api"]
