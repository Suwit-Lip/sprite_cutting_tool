# syntax=docker/dockerfile:1.7

# ── Stage 1: build the Vue frontend ─────────────────────────────────────────────
FROM node:20-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# ── Stage 2: build the Go backend ───────────────────────────────────────────────
FROM golang:1.23-alpine AS backend
WORKDIR /app
COPY backend/go.mod backend/go.sum* ./backend/
RUN cd backend && go mod download
COPY backend/ ./backend/
# Embed the built frontend into the binary via go:embed.
COPY --from=frontend /app/frontend/dist ./backend/internal/static/dist
RUN cd backend && CGO_ENABLED=0 go build -ldflags="-s -w" -o /out/sprite-cutter ./cmd/server

# ── Stage 3: runtime — needs Python + scipy/Pillow/numpy ────────────────────────
FROM python:3.12-slim AS runtime
WORKDIR /app

# System libs needed by Pillow (libjpeg, zlib are present in slim already).
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY engine/requirements.txt ./engine/requirements.txt
RUN pip install --no-cache-dir -r engine/requirements.txt

COPY engine/ ./engine/
COPY --from=backend /out/sprite-cutter /app/sprite-cutter

ENV PORT=8080 \
    PYTHON_BIN=python3 \
    INPUT_DIR=/data/input \
    OUTPUT_DIR=/data/output \
    PROMPTS_FILE=/data/prompts.json \
    PRESETS_FILE=/data/presets.json

EXPOSE 8080
ENTRYPOINT ["/app/sprite-cutter"]
