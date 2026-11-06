#!/usr/bin/env bash
set -euo pipefail
umask 077

EXPECTED_PROJECT_REF="agnphzqyrjihrpaewwaa"
: "${SUPABASE_DB_URL:?Set the target Supabase PostgreSQL connection string}"
: "${SUPABASE_PROJECT_REF:?Set SUPABASE_PROJECT_REF to identify the target project}"
: "${RESTORE_CONFIRM_PROJECT_REF:?Set RESTORE_CONFIRM_PROJECT_REF to the exact target project ref}"
: "${BACKUP_FILE:?Set BACKUP_FILE to a verified custom-format dump}"

if [[ "$SUPABASE_PROJECT_REF" != "$EXPECTED_PROJECT_REF" || "$RESTORE_CONFIRM_PROJECT_REF" != "$EXPECTED_PROJECT_REF" ]]; then
  echo "Refusing restore: both project-ref checks must match this repository's dedicated database." >&2
  exit 1
fi
if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "Backup file does not exist: $BACKUP_FILE" >&2
  exit 1
fi
if [[ -f "$BACKUP_FILE.sha256" ]]; then
  (cd "$(dirname "$BACKUP_FILE")" && sha256sum --check "$(basename "$BACKUP_FILE").sha256")
fi
pg_restore --list "$BACKUP_FILE" >/dev/null
echo "WARNING: this replaces objects in the public schema of project $EXPECTED_PROJECT_REF."
pg_restore --clean --if-exists --no-owner --no-acl --exit-on-error --dbname="$SUPABASE_DB_URL" "$BACKUP_FILE"
echo "Restore completed. Run hosted acceptance checks before returning the service to users."
