#!/usr/bin/env bash
set -euo pipefail

echo "==> Installing dependencies"
npm ci

echo "==> Validating Prisma schema"
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/instrareply" npx prisma validate

echo "==> Generating Prisma client"
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/instrareply" npm run db:generate

echo "==> Typecheck"
npm run typecheck

echo "==> Lint"
npm run lint

echo "==> Tests"
npm test

echo "==> Production build"
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/instrareply" \
REDIS_URL="redis://localhost:6379" \
NEXTAUTH_URL="http://localhost:3000" \
NEXTAUTH_SECRET="test-secret-for-ci-build" \
CRON_SECRET="test-secret-for-ci-cron" \
ENCRYPTION_KEY="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef" \
RESEND_API_KEY="re_test" \
EMAIL_FROM="InstaReply <login@example.com>" \
META_GRAPH_API_VERSION="v25.0" \
INSTAGRAM_APP_ID="test" \
INSTAGRAM_APP_SECRET="test" \
FACEBOOK_APP_SECRET="test" \
WEBHOOK_VERIFY_TOKEN="test" \
npm run build

echo
echo "✅ DM Magnet / OpenReply integration verification passed"
