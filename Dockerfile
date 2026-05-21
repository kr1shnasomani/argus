FROM ubuntu:26.04

ENV PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive

# Install system dependencies: Python 3.11, Node 20 LTS, supervisor
RUN apt-get update && apt-get install -y \
    python3.11 \
    python3.11-venv \
    python3-pip \
    curl \
    supervisor \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN mkdir -p /var/log/supervisor /etc/supervisor/conf.d

# ── Backend ──────────────────────────────────────────────────────────────────
COPY backend/requirements.txt backend/requirements.txt
RUN python3.11 -m venv /app/backend/venv && \
    /app/backend/venv/bin/pip install --no-cache-dir -r backend/requirements.txt

# ── Sandbox ───────────────────────────────────────────────────────────────────
COPY sandbox/requirements.txt sandbox/requirements.txt
RUN python3.11 -m venv /app/sandbox/venv && \
    /app/sandbox/venv/bin/pip install --no-cache-dir -r sandbox/requirements.txt

# ── Frontend ──────────────────────────────────────────────────────────────────
# Copy package.json only first so npm install layer is cached unless deps change.
# Delete package-lock.json before install: the lockfile is generated on macOS
# (arm64) and the native @tailwindcss/oxide binary won't match linux/amd64.
COPY frontend/package.json frontend/package.json
RUN cd frontend && rm -f package-lock.json && npm install

# Copy frontend source and build
COPY frontend/ frontend/
RUN cd frontend && npm run build

# ── Application source ────────────────────────────────────────────────────────
COPY backend/ backend/
COPY sandbox/ sandbox/

# ── Config / entrypoint ───────────────────────────────────────────────────────
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Expose ports: Backend API, Sandbox API, Frontend Preview
EXPOSE 8005 8001 5173

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["all"]
