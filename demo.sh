#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────
# mcpdiff demo — pre-captured contacts server snapshots v1 → v2
#
# Everything here runs against the snapshots in contracts/demo/,
# so no live server is needed. See the README for the live
# workflows (check, check --watch, ci).
# ─────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLI="npx mcpdiff"
V1="$SCRIPT_DIR/contracts/demo/v1.0.0.mcpc.json"
V2="$SCRIPT_DIR/contracts/demo/v2.0.0.mcpc.json"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║          mcpdiff demo — contacts server      ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ── Step 1: Inspect the snapshots ────────────────────────────
echo "━━━ Step 1: Inspecting the v1.0.0 snapshot ━━━"
echo ""
$CLI inspect "$V1" --tools
echo ""

echo "━━━ Step 2: Inspecting the v2.0.0 snapshot ━━━"
echo ""
$CLI inspect "$V2" --tools
echo ""

# ── Step 3: Diff v1 → v2 ────────────────────────────────────
echo "━━━ Step 3: Diffing v1.0.0 → v2.0.0 ━━━"
echo ""

# Run diff — allow non-zero exit (breaking changes expected)
$CLI diff "$V1" "$V2" || true
echo ""

# ── Step 4: Other output formats ─────────────────────────────
echo "━━━ Step 4: JSON output (for CI/programmatic use) ━━━"
echo ""
$CLI diff "$V1" "$V2" --format json 2>/dev/null || true
echo ""

# ── Step 5: Demonstrate exit codes ───────────────────────────
echo "━━━ Step 5: Exit code behavior ━━━"
echo ""

set +e

$CLI diff "$V1" "$V2" --quiet
echo "  Default (--fail-on breaking): exit code $?"

$CLI diff "$V1" "$V2" --fail-on warning --quiet
echo "  Strict  (--fail-on warning):  exit code $?"

$CLI diff "$V1" "$V1" --quiet
echo "  No changes (same file):       exit code $?"

set -e

echo ""

# ── Step 6: Webhook notification ──────────────────────────
echo "━━━ Step 6: Webhook notification ━━━"
echo ""

WEBHOOK_URL="http://localhost:8089/webhook"

echo "  Starting webhook receiver on port 8089..."
PORT=8089 node "$SCRIPT_DIR/webhook-receiver.js" &
WEBHOOK_PID=$!
sleep 0.5

echo "  Running diff with --webhook..."
$CLI diff "$V1" "$V2" --webhook "$WEBHOOK_URL" --quiet || true

sleep 0.5
echo ""
echo "  Stopping webhook receiver..."
kill $WEBHOOK_PID 2>/dev/null || true
wait $WEBHOOK_PID 2>/dev/null || true
echo ""

echo "━━━ Done! ━━━"
echo ""
echo "Try it yourself:"
echo "  npx mcpdiff inspect contracts/demo/v1.0.0.mcpc.json --schema create_contact"
echo "  npx mcpdiff diff contracts/demo/v1.0.0.mcpc.json contracts/demo/v2.0.0.mcpc.json --format markdown"
echo "  npx mcpdiff check              # live server vs committed baseline"
echo "  npx mcpdiff check --watch      # re-check on every file change"
echo ""
