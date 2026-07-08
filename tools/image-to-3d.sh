#!/usr/bin/env bash
# image-to-3d.sh — convert a character image into a GLB model using TripoSR
# (free, open-source, runs locally on CPU).
#
# One-time setup:
#   python3 -m venv triposr-venv && . triposr-venv/bin/activate
#   pip install torch --index-url https://download.pytorch.org/whl/cpu
#   git clone https://github.com/VAST-AI-Research/TripoSR.git
#   pip install -r TripoSR/requirements.txt
#
# Usage:
#   TRIPOSR_DIR=/path/to/TripoSR tools/image-to-3d.sh input.jpg assets/goblin-ai.glb
#
# Tips for good conversions: single subject, full body visible, neutral
# pose, plain background, even lighting.
set -euo pipefail

IMG="$1"
OUT="$2"
TRIPOSR_DIR="${TRIPOSR_DIR:?set TRIPOSR_DIR to the TripoSR checkout}"
WORK="$(mktemp -d)"

python "$TRIPOSR_DIR/run.py" "$IMG" \
  --output-dir "$WORK" \
  --model-save-format glb \
  --mc-resolution 256

cp "$WORK"/0/mesh.glb "$OUT"
rm -rf "$WORK"
echo "wrote $OUT"
