#!/usr/bin/env bash
set -euo pipefail
umask 077

EXPECTED_PROJECT_REF="agnphzqyrjihrpaewwaa"
: "${SUPABASE_DB_URL:?Set the server-side Supabase PostgreSQL connection string}"
: "${SUPABASE_PROJECT_REF:?Set SUPABASE_PROJECT_REF to confirm the target project}"
if [[ "$SUPABASE_PROJECT_REF" != "$EXPECTED_PROJECT_REF" ]]; then
  echo "Refusing backup: project ref does not match this repository's dedicated database." >&2
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$BACKUP_DIR"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_file="$BACKUP_DIR/sre-public-$timestamp.dump"
manifest_file="$backup_file.sha256"

pg_dump "$SUPABASE_DB_URL" --schema=public --format=custom --no-owner --no-acl --compress=6 --file="$backup_file"
pg_restore --list "$backup_file" >/dev/null
(
  cd "$BACKUP_DIR"
  sha256sum "$(basename "$backup_file")" > "$(basename "$manifest_file")"
)
printf 'Created and verified public-schema backup: %s\n' "$backup_file"
