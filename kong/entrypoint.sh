#!/bin/bash
set -euo pipefail

python3 /kong/render_kong_config.py

sync_jwks_loop() {
  sleep 45
  local prev=""
  if [[ -f /tmp/kong.yml ]]; then
    prev=$(sha256sum /tmp/kong.yml | awk '{print $1}')
  fi
  while true; do
    sleep 90
    if ! python3 /kong/render_kong_config.py 2>/dev/null; then
      continue
    fi
    local new
    new=$(sha256sum /tmp/kong.yml | awk '{print $1}')
    if [[ -n "${prev}" && "${new}" != "${prev}" ]]; then
      prev="${new}"
      kong reload 2>/dev/null || true
    elif [[ -z "${prev}" ]]; then
      prev="${new}"
    fi
  done
}

sync_jwks_loop &

exec /docker-entrypoint.sh kong docker-start
