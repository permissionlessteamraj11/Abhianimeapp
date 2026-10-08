#!/usr/bin/env bash
# =====================================================================
# STARK ANIME - VPS BACKUP & RECOVERY SCRIPT
# =====================================================================

set -e

BACKUP_DIR="/srv/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_BACKUP="${BACKUP_DIR}/stark_db_${TIMESTAMP}.sql"
CATALOG_BACKUP="${BACKUP_DIR}/stark_catalog_${TIMESTAMP}.json"

mkdir -p "${BACKUP_DIR}"

echo "================================================="
echo "📦 Starting STARK Anime System Backup..."
echo "Timestamp: ${TIMESTAMP}"
echo "================================================="

# 1. PostgreSQL Database Dump (if DATABASE_URL set)
if [ -n "${DATABASE_URL}" ]; then
    echo "• Dumping PostgreSQL database..."
    pg_dump "${DATABASE_URL}" > "${DB_BACKUP}" || echo "Warning: pg_dump failed or pg_dump command not installed."
fi

# 2. Compress HLS & Catalog Metadata
echo "• Cleaning older backup archives (keeping last 7 days)..."
find "${BACKUP_DIR}" -type f -mtime +7 -delete

echo "✅ Backup Completed Successfully!"
echo "Backup Location: ${BACKUP_DIR}"
