#!/usr/bin/env bash
set -euo pipefail

BOARD_ORIGIN="https://board.bettercodelab.com"

wait_for_port() {
  for _ in $(seq 1 90); do
    if (exec 3<>/dev/tcp/127.0.0.1/8080) 2>/dev/null; then
      exec 3<&- 3>&-
      return 0
    fi
    sleep 2
  done
  return 1
}

configure_realms() {
  for _ in $(seq 1 60); do
    if /opt/keycloak/bin/kcadm.sh config credentials \
      --server "http://127.0.0.1:8080" \
      --realm master \
      --user "${KEYCLOAK_ADMIN}" \
      --password "${KEYCLOAK_ADMIN_PASSWORD}" 2>/dev/null; then
      break
    fi
    sleep 2
  done

  for realm in master board; do
    /opt/keycloak/bin/kcadm.sh update "realms/${realm}" -s sslRequired=NONE || true
  done

  CLIENT_UUID="$(/opt/keycloak/bin/kcadm.sh get clients -r board -q clientId=board-spa --fields id 2>/dev/null | grep -oE '[0-9a-f-]{36}' | head -1 || true)"
  if [[ -n "${CLIENT_UUID}" ]]; then
    /opt/keycloak/bin/kcadm.sh update "clients/${CLIENT_UUID}" -r board \
      -s "attributes.post.logout.redirect.uris=${BOARD_ORIGIN}/*##http://localhost:5173/*" \
      -s 'attributes.use.refresh.tokens=true' \
      -s 'attributes.pkce.code.challenge.method=S256' || echo "WARN: board-spa client update failed (realm import may suffice)."
    echo "Updated board-spa client for ${BOARD_ORIGIN}."
  fi

  echo "Set sslRequired=NONE for master and board realms (HTTP behind TLS proxy)."
}

configure_google_idp() {
  if [[ -z "${GOOGLE_CLIENT_ID:-}" || -z "${GOOGLE_CLIENT_SECRET:-}" ]]; then
    echo "GOOGLE_CLIENT_ID/SECRET not set; skip Google IdP."
    return 0
  fi

  local idp_common=(
    -s enabled=true
    -s 'config.clientId='"${GOOGLE_CLIENT_ID}"
    -s 'config.clientSecret='"${GOOGLE_CLIENT_SECRET}"
    -s 'config.defaultScope=openid profile email'
    -s 'config.syncMode=IMPORT'
    -s 'config.trustEmail=true'
    -s 'config.updateProfileFirstLoginMode=off'
    -s updateProfileFirstLoginMode=off
    -s trustEmail=true
  )

  if /opt/keycloak/bin/kcadm.sh get "identity-provider/instances/google" -r board >/dev/null 2>&1; then
    /opt/keycloak/bin/kcadm.sh update "identity-provider/instances/google" -r board \
      "${idp_common[@]}" || true
    echo "Updated Google identity provider."
  else
    /opt/keycloak/bin/kcadm.sh create identity-provider/instances -r board \
      -s alias=google \
      -s providerId=google \
      "${idp_common[@]}" || true
    echo "Created Google identity provider."
  fi
}

configure_first_broker_review_profile() {
  local review_cfg_id
  review_cfg_id="$(
    /opt/keycloak/bin/kcadm.sh get 'authentication/flows/first%20broker%20login/executions' -r board 2>/dev/null \
      | grep -A12 'idp-review-profile' \
      | grep -oE '"authenticationConfig"[[:space:]]*:[[:space:]]*"[0-9a-f-]{36}"' \
      | head -1 \
      | grep -oE '[0-9a-f-]{36}' \
      || true
  )"
  if [[ -n "${review_cfg_id}" ]]; then
    /opt/keycloak/bin/kcadm.sh update "authentication/config/${review_cfg_id}" -r board \
      -s 'config.update.profile.on.first.login=off' 2>/dev/null || \
      echo "WARN: could not set first-broker review profile to off."
  fi
}

configure_board_login_profile() {
  /opt/keycloak/bin/kcadm.sh update "authentication/required-actions/UPDATE_PROFILE" -r board \
    -s enabled=false \
    -s defaultAction=false 2>/dev/null || true

  configure_first_broker_review_profile

  if [[ -f /opt/keycloak/config/board-user-profile.json ]]; then
    /opt/keycloak/bin/kcadm.sh update "users/profile" -r board \
      -f /opt/keycloak/config/board-user-profile.json 2>/dev/null || \
      echo "WARN: user profile JSON update skipped (apply in Admin if needed)."
  fi

  echo "Board realm: skip IdP profile form; first/last name not required for users."
}

/opt/keycloak/bin/kc.sh start-dev --import-realm &
KC_PID=$!

echo "Waiting for Keycloak..."
wait_for_port
sleep 5
configure_realms
configure_google_idp
configure_board_login_profile

wait "$KC_PID"
