#!/usr/bin/env bash
set -euo pipefail

export KUBECONFIG="${KUBECONFIG:-$HOME/.kube/config}"

SEALED_SECRETS_VERSION="${SEALED_SECRETS_VERSION:-0.27.3}"
URL="https://github.com/bitnami-labs/sealed-secrets/releases/download/v${SEALED_SECRETS_VERSION}/controller.yaml"

kubectl apply -f "$URL"
kubectl -n kube-system rollout status deployment/sealed-secrets-controller --timeout=120s

echo ""
echo "Sealed Secrets controller ready."
echo "Regenerate encrypted manifests after credential changes:"
echo "  k8s/scripts/seal-secrets.sh"
