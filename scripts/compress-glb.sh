#!/usr/bin/env bash
# Meshopt-compress the Blender export (public/garage/garage.raw.glb, git-ignored) into the shipped garage.glb.
# The site decodes it with three's MeshoptDecoder; src/garage/assets.test.ts checks the 3 MB budget.
set -euo pipefail
cd "$(dirname "$0")/.."
npx --yes @gltf-transform/cli@4.5.1 meshopt public/garage/garage.raw.glb public/garage/garage.glb
ls -l public/garage/garage.glb
