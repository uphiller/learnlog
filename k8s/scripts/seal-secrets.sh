#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/k8s/secrets/sealed"
ENV_FILE="${POSTGRES_ENV:-$ROOT/k8s/secrets/postgres.env}"

export KUBECONFIG="${KUBECONFIG:-$HOME/.kube/config}"

if ! kubectl get crd sealedsecrets.bitnami.com >/dev/null 2>&1; then
  echo "Sealed Secrets CRD not found. Run: k8s/scripts/install-sealed-secrets.sh" >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE (copy from k8s/secrets/postgres.env.example)" >&2
  exit 1
fi

# shellcheck disable=SC1090
set -a
source "$ENV_FILE"
set +a

: "${POSTGRES_HOST:?POSTGRES_HOST required in $ENV_FILE}"
: "${POSTGRES_DB:?POSTGRES_DB required in $ENV_FILE}"
: "${POSTGRES_USER:?POSTGRES_USER required in $ENV_FILE}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD required in $ENV_FILE}"

KEYCLOAK_ADMIN_USER="${KEYCLOAK_ADMIN_USER:-admin}"
KEYCLOAK_ADMIN_PASSWORD="${KEYCLOAK_ADMIN_PASSWORD:-admin}"

mkdir -p "$OUT"

kubeseal_args=(
  --controller-namespace kube-system
  --controller-name sealed-secrets-controller
  -o yaml
)

kubectl create secret generic postgres-credentials \
  --namespace board \
  --from-literal=POSTGRES_HOST="$POSTGRES_HOST" \
  --from-literal=POSTGRES_DB="$POSTGRES_DB" \
  --from-literal=POSTGRES_USER="$POSTGRES_USER" \
  --from-literal=POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
  --dry-run=client -o yaml | kubeseal "${kubeseal_args[@]}" \
  > "$OUT/postgres-credentials.yaml"

kubectl create secret generic keycloak-admin \
  --namespace board \
  --from-literal=username="$KEYCLOAK_ADMIN_USER" \
  --from-literal=password="$KEYCLOAK_ADMIN_PASSWORD" \
  --dry-run=client -o yaml | kubeseal "${kubeseal_args[@]}" \
  > "$OUT/keycloak-admin.yaml"

echo "Wrote:"
echo "  $OUT/postgres-credentials.yaml"
echo "  $OUT/keycloak-admin.yaml"
echo ""
echo "Commit the sealed manifests, then apply:"
echo "  kubectl kustomize --load-restrictor LoadRestrictionsNone k8s/ | kubectl apply -f -"
