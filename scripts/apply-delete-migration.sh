#!/bin/bash
# Apply the delete sessions migration to Supabase

set -e

# Load environment variables
if [ -f .env.local ]; then
  export $(cat .env.local | grep -v '^#' | xargs)
fi

SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}"
SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "❌ Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local"
  echo ""
  echo "You need to run this migration manually in the Supabase SQL Editor:"
  echo "1. Go to https://supabase.com/dashboard → Your project → SQL Editor"
  echo "2. Copy the contents of: supabase/migrations/20260308100000_allow_authenticated_delete_sessions.sql"
  echo "3. Paste and click 'Run'"
  exit 1
fi

echo "🔄 Applying migration: 20260308100000_allow_authenticated_delete_sessions.sql"
echo ""

SQL_CONTENT=$(cat supabase/migrations/20260308100000_allow_authenticated_delete_sessions.sql)

curl -X POST "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $(echo "$SQL_CONTENT" | jq -Rs .)}"

echo ""
echo "✅ Migration applied successfully!"
echo ""
echo "Now try deleting a session again."
