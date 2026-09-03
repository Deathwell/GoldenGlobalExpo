# ==============================================================================
# GOLDEN GLOBAL EXPO — ENTERPRISE MULTI-STAGE DOCKERFILE
# Lightweight, secure, non-root Python 3.13 ASGI production runtime
# ==============================================================================

FROM python:3.13-slim as base

# Set production environment flags
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    PORT=8000

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Python production packages
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Create dedicated non-root application user for defense-in-depth
RUN groupadd -g 10001 exportgroup && \
    useradd -u 10001 -g exportgroup -s /bin/bash -m exportuser

# Copy application source code
COPY . .

# Ensure data and cache directories exist with correct permissions
RUN mkdir -p /app/data && \
    chown -R exportuser:exportgroup /app

# Switch to non-root security context
USER exportuser

# Expose production port
EXPOSE 8000

# Container Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/api/prices || exit 1

# Production ASGI Entrypoint
CMD ["uvicorn", "backend.app:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4", "--log-level", "info"]
