#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

echo "Building images via docker compose..."
docker compose build user-service book-service group-service feedback-service kong frontend

for svc in user-service book-service group-service feedback-service kong frontend; do
  image="board-platform-${svc}:latest"
  echo "Importing ${image} into k3s..."
  docker save "${image}" | sudo k3s ctr images import -
done

echo "Done. Images ready for kubectl apply -k k8s/"
