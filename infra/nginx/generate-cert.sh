#!/usr/bin/env bash
# infra/nginx/generate-cert.sh
# Genera un certificado SSL self-signed para desarrollo local (Nginx).
#
# - Salida: infra/nginx/certs/local.crt + infra/nginx/certs/local.key
# - SAN: localhost, 127.0.0.1, jcs.local
# - Validez: 365 dias
# - Idempotente: si el cert ya existe y tiene < 300 dias, no regenera
#
# Uso:  bash infra/nginx/generate-cert.sh

set -euo pipefail

CERT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/certs"
CERT_FILE="${CERT_DIR}/local.crt"
KEY_FILE="${CERT_DIR}/local.key"

# Si existe y es reciente, salir sin regenerar.
if [[ -f "${CERT_FILE}" ]]; then
  end_date="$(openssl x509 -enddate -noout -in "${CERT_FILE}" 2>/dev/null | cut -d= -f2 || true)"
  if [[ -n "${end_date}" ]]; then
    end_epoch="$(date -d "${end_date}" +%s 2>/dev/null || echo 0)"
    now_epoch="$(date +%s)"
    age_days=$(( (end_epoch - now_epoch) / 86400 ))
    if (( age_days >= 300 )); then
      echo "[generate-cert] cert existe con ${age_days} dias restantes — OK, no regenero."
      exit 0
    else
      echo "[generate-cert] cert existe pero solo ${age_days} dias restantes — regenero."
    fi
  fi
fi

mkdir -p "${CERT_DIR}"

echo "[generate-cert] generando self-signed cert en ${CERT_DIR}/"
openssl req -x509 -nodes -newkey rsa:2048 \
  -days 365 \
  -subj "/CN=jcs.local" \
  -addext "subjectAltName=DNS:localhost,DNS:jcs.local,IP:127.0.0.1" \
  -keyout "${KEY_FILE}" \
  -out "${CERT_FILE}" \
  >/dev/null 2>&1

chmod 600 "${KEY_FILE}"
chmod 644 "${CERT_FILE}"

echo "[generate-cert] listo: ${CERT_FILE} + ${KEY_FILE}"
