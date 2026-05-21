FROM ubuntu:26.04

ENV PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    python3.11 \
    python3.11-venv \
    python3-pip \
    curl \
    supervisor \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Ensure we have the latest supervisor
RUN mkdir -p /var/log/supervisor /etc/supervisor/conf.d

# Copy all project files
COPY . .

# Setup backend
RUN python3.11 -m venv /app/backend/venv && \
    /app/backend/venv/bin/pip install --no-cache-dir -r backend/requirements.txt

# Setup sandbox
RUN python3.11 -m venv /app/sandbox/venv && \
    /app/sandbox/venv/bin/pip install --no-cache-dir -r sandbox/requirements.txt

# Setup frontend
RUN cd frontend && npm install && npm run build

# Copy supervisor and entrypoint configurations
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Expose ports: Backend, Sandbox, Frontend Preview
EXPOSE 8005 8001 5173

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["all"]
