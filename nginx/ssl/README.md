# ==============================================================================
# GOLDEN GLOBAL EXPO — NGINX SSL CERTIFICATES DIRECTORY
# ==============================================================================

Place your production SSL/TLS certificates in this directory before deploying:
- `cert.pem` (or `fullchain.pem`) - SSL Certificate and intermediate chain
- `key.pem` (or `privkey.pem`) - Private Key

In production, Let's Encrypt / Certbot or enterprise CA certificates can be mounted
here. See `HANDOVER_MANUAL.md` for certificate generation instructions.
