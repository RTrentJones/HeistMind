#!/usr/bin/env bash
#
# Run a Supabase CLI command that pulls Docker images, with backoff + image-registry rotation (F101).
#
# The local stack (`supabase start`) and `supabase gen types --local` (postgres-meta) pull images
# from public.ecr.aws by default; a shared-runner rate limit there ("toomanyrequests: Data limit
# exceeded") failed "Supabase CI/CD" on 2 of 4 development runs. The CLI (2.121.0) reads
# SUPABASE_INTERNAL_IMAGE_REGISTRY (public.ecr.aws | ghcr.io | docker.io) to pull the same
# supabase/* images from a mirror, so each retry rotates registries: ghcr.io first (same network
# as the GitHub runner), then the ECR default, then Docker Hub, then ghcr.io again.
#
# Usage: scripts/ci/supabase-retry.sh [--stop-between] -- <command> [args...]
#   --stop-between   run `supabase stop --no-backup` before each retry (for `supabase start`)
#
# Exit status:
#   0    the command succeeded
#   75   EX_TEMPFAIL — every attempt failed on an image pull / registry / network error. This is a
#        CI-INFRASTRUCTURE failure, not a verdict on the code; callers decide the policy.
#   *    the command's own exit status for any other (real) failure, e.g. a migration that does
#        not apply during `supabase start`. Retried once (health-check flakes), then returned.
#
# Env: SUPABASE_RETRY_REGISTRIES (space-separated, "default" = the CLI's own choice) and
#      SUPABASE_RETRY_BACKOFF (space-separated seconds) override the schedule.
set -uo pipefail

stop_between=false
while [ $# -gt 0 ]; do
  case "$1" in
    --stop-between) stop_between=true; shift ;;
    --) shift; break ;;
    *) break ;;
  esac
done
if [ $# -eq 0 ]; then
  echo "usage: $0 [--stop-between] -- <command> [args...]" >&2
  exit 2
fi

read -r -a registries <<< "${SUPABASE_RETRY_REGISTRIES:-ghcr.io default docker.io ghcr.io}"
read -r -a backoff <<< "${SUPABASE_RETRY_BACKOFF:-15 45 90}"

# Output that means "couldn't fetch an image / reach a registry", not "the code is wrong".
infra_pattern='toomanyrequests|too many requests|rate limit|rate exceeded|data limit exceeded|pull access denied|manifest unknown|manifest for .* not found|failed to pull|error pulling image|failed to resolve reference|unexpected EOF|TLS handshake timeout|i/o timeout|connection reset by peer|net/http: request canceled|502 Bad Gateway|503 Service Unavailable|504 Gateway Timeout'

log="$(mktemp)"
trap 'rm -f "$log"' EXIT

attempts=${#registries[@]}
other_failures=0
rc=1
for ((i = 0; i < attempts; i++)); do
  registry="${registries[$i]}"
  if [ "$registry" = "default" ]; then
    unset SUPABASE_INTERNAL_IMAGE_REGISTRY
    label="CLI default registry"
  else
    export SUPABASE_INTERNAL_IMAGE_REGISTRY="$registry"
    label="$registry"
  fi
  echo "▶ attempt $((i + 1))/$attempts via $label: $*"

  # Tee to the console + a log for classification. A pnpm script's own `> file` redirect (e.g.
  # db:types-local writing supabase-types.ts) happens inside the script, so generated output is
  # unaffected; only the CLI's progress/errors reach the log.
  "$@" 2>&1 | tee "$log"
  rc=${PIPESTATUS[0]}
  if [ "$rc" -eq 0 ]; then
    echo "✅ succeeded via $label"
    exit 0
  fi

  if grep -Eiq "$infra_pattern" "$log"; then
    echo "::warning::Image/registry failure via $label (attempt $((i + 1))/$attempts)."
  else
    other_failures=$((other_failures + 1))
    if [ "$other_failures" -ge 2 ]; then
      echo "❌ '$*' failed twice for a non-registry reason — not retrying (exit $rc)."
      exit "$rc"
    fi
    echo "⚠️ '$*' failed (exit $rc) for a non-registry reason; retrying once."
  fi

  if [ $((i + 1)) -lt "$attempts" ]; then
    if [ "$stop_between" = true ]; then
      supabase stop --no-backup >/dev/null 2>&1 || true
    fi
    delay="${backoff[$i]:-${backoff[${#backoff[@]}-1]}}"
    echo "… backing off ${delay}s"
    sleep "$delay"
  fi
done

if grep -Eiq "$infra_pattern" "$log"; then
  echo "::error::'$*' could not pull its images from any registry (${registries[*]}) — CI infrastructure failure."
  exit 75
fi
exit "$rc"
