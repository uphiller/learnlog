#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

export KUBECONFIG="${KUBECONFIG:-$HOME/.kube/config}"

if ! kubectl get ns argocd &>/dev/null; then
  echo "Argo CD namespace not found. Run: k8s/scripts/install-argocd.sh"
  exit 1
fi

echo "Applying AppProject and Application..."
kubectl apply -f k8s/argocd/project.yaml
kubectl apply -f k8s/argocd/application.yaml

echo ""
echo "Waiting for initial sync..."
kubectl -n argocd wait application/board-platform --for=condition=Synced --timeout=5m || true

echo ""
kubectl -n argocd get application board-platform -o wide
echo ""
echo "Git push -> auto sync (poll ~3m, or configure GitHub webhook below)."
echo ""
echo "GitHub webhook (optional, instant sync on push):"
echo "  URL:    https://argocd.bettercodelab.com/api/webhook"
echo "  Events: Push"
echo ""
echo "OAuth/API secrets (one-time, not overwritten by Argo CD):"
echo "  kubectl -n board create secret generic app-secrets \\"
echo "    --from-env-file=k8s/secrets/app.env --dry-run=client -o yaml | kubectl apply -f -"
echo ""
echo "UI: https://argocd.bettercodelab.com"
