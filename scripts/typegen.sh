#!/bin/bash
# Generate TypeScript types from Trazo backend OpenAPI schema.
#
# Usage:
#   npm run typegen          # Regenerate types from live backend
#   npm run typegen:check    # Verify committed types match backend schema (CI)
#
# Prerequisites:
#   - Backend running at localhost:8000 (cd trazo-back && poetry run python manage.py runserver)
#   - OR set TRAZO_API_SCHEMA_URL environment variable to a different URL
#
# Output:
#   src/types/api.generated.ts (gitignored, regenerated on every typegen run)
#
# Part of Phase 2: Event Field SSOT Migration. See CLAUDE.md for architecture.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
OUTPUT_FILE="$APP_DIR/src/types/api.generated.ts"

# Allow override via env var; default to local dev backend
SCHEMA_URL="${TRAZO_API_SCHEMA_URL:-http://localhost:8000/api/schema/}"

# Check mode: regenerate to a temp file and diff against committed types
CHECK_MODE=false
if [[ "${1:-}" == "--check" ]]; then
    CHECK_MODE=true
fi

# Ensure output directory exists
mkdir -p "$(dirname "$OUTPUT_FILE")"

if [[ "$CHECK_MODE" == "true" ]]; then
    TEMP_FILE="$(mktemp -t trazo-api-check.XXXXXX.ts)"
    trap 'rm -f "$TEMP_FILE"' EXIT

    echo "Generating types from $SCHEMA_URL to temp file..."
    npx openapi-typescript "$SCHEMA_URL" -o "$TEMP_FILE"

    if diff -q "$OUTPUT_FILE" "$TEMP_FILE" > /dev/null 2>&1; then
        echo "api.generated.ts is up-to-date"
        exit 0
    else
        echo ""
        echo "ERROR: api.generated.ts is out of sync with backend schema."
        echo "Run 'npm run typegen' and commit the result."
        echo ""
        echo "Diff:"
        diff "$OUTPUT_FILE" "$TEMP_FILE" | head -40
        exit 1
    fi
else
    echo "Generating types from $SCHEMA_URL..."
    npx openapi-typescript "$SCHEMA_URL" -o "$OUTPUT_FILE"
    echo ""
    echo "Types written to: $OUTPUT_FILE"
    echo "Size: $(wc -l < "$OUTPUT_FILE") lines"
fi
