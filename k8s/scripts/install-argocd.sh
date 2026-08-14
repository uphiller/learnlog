#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

export KUBECONFIG="${KUBECONFIG:-$HOME/.kube/config}"

helm repo add argo https://argoproj.github.io/argo-helm 2>/dev/null || true
helm repo update argo

helm upgrade --install argocd argo/argo-cd \
  --namespace argocd \
  --create-namespace \
  --values k8s/argocd/values.yaml \
  --wait \
  --timeout 10m

echo ""
echo "Argo CD installed."
echo ""
echo "Register board-platform Application:"
echo "  k8s/scripts/register-argocd-app.sh"
echo ""
echo "UI:  http://argocd.bettercodelab.com  (add DNS A record if needed)"
echo "     kubectl -n argocd port-forward svc/argocd-server 8080:80"
echo ""
echo "Login: admin / $(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d)"
echo ""
echo "CLI:"
echo "  argocd login argocd.bettercodelab.com --username admin --insecure"
