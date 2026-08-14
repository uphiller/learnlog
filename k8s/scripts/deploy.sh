#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

if [[ ! -f k8s/secrets/app.env ]]; then
  cp k8s/secrets/app.env.example k8s/secrets/app.env
  echo "Created k8s/secrets/app.env from example (edit OAuth/API keys if needed)."
fi

if [[ -d /var/lib/rancher/k3s/server/manifests ]] || sudo test -d /var/lib/rancher/k3s/server/manifests 2>/dev/null; then
  echo "Installing Traefik HelmChartConfig for Cloudflare forwarded headers..."
  sudo cp k8s/traefik/helmchartconfig.yaml /var/lib/rancher/k3s/server/manifests/traefik-config.yaml
else
  echo "WARN: k3s manifests dir not found — copy k8s/traefik/helmchartconfig.yaml manually after k3s install."
fi

export KUBECONFIG="${KUBECONFIG:-$HOME/.kube/config}"
kubectl kustomize --load-restrictor LoadRestrictionsNone k8s/ | kubectl apply -f -

echo ""
echo "Deploy started. Watch rollout:"
echo "  kubectl -n board get pods -w"
