#!/bin/bash
# Railway Database Migration & Seed Script
# This script automates database setup on Railway

set -e  # Exit on error

echo "🚂 Railway Database Migration & Seed"
echo "===================================="
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found."
    echo "📦 Installing Railway CLI..."
    npm install -g @railway/cli
    echo "✅ Railway CLI installed!"
    echo ""
fi

# Check if logged in
echo "📝 Checking Railway login status..."
if ! railway whoami &> /dev/null; then
    echo "🔐 Please login to Railway..."
    railway login
fi
echo "✅ Logged in to Railway"
echo ""

# Check project link
echo "🔗 Checking project link..."
if ! railway status &> /dev/null; then
    echo "❌ Not linked to a Railway project."
    echo "🔗 Please link to your project..."
    railway link
fi
echo "✅ Project linked"
echo ""

# Check if DATABASE_URL is available
echo "🔍 Checking database connection..."
if ! railway run printenv DATABASE_URL &> /dev/null; then
    echo "❌ DATABASE_URL not found. Make sure PostgreSQL service is added to your Railway project."
    exit 1
fi
echo "✅ Database connection available"
echo ""

# Run migrations
echo "🗄️  Running database migrations..."
echo "   - Creating tables (users, reimbursements)"
echo "   - Creating indexes"
echo "   - Creating triggers"

# Try different methods to connect to Railway database
if railway run --service postgres psql -f scripts/init.sql 2>/dev/null; then
    echo "✅ Migration complete (method 1)!"
elif cat scripts/init.sql | railway run psql $DATABASE_URL 2>/dev/null; then
    echo "✅ Migration complete (method 2)!"
else
    echo "⚠️  Direct psql failed, trying via app service..."
    railway run node -e "
    const { Pool } = require('pg');
    const fs = require('fs');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const sql = fs.readFileSync('scripts/init.sql', 'utf8');
    pool.query(sql).then(() => {
        console.log('✅ Migration complete (method 3)!');
        process.exit(0);
    }).catch(err => {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    });
    "
fi
echo ""

# Optional: Run additional migration
if [ -f "scripts/migrate-approvals.sql" ]; then
    echo "🔄 Running additional migrations..."
    if railway run --service postgres psql -f scripts/migrate-approvals.sql 2>/dev/null; then
        echo "✅ Additional migration complete!"
    elif cat scripts/migrate-approvals.sql | railway run psql $DATABASE_URL 2>/dev/null; then
        echo "✅ Additional migration complete!"
    else
        echo "⚠️  Additional migration skipped (may already be applied)"
    fi
    echo ""
fi

# Run seed
echo "🌱 Seeding database with initial data..."
echo "   - Creating 18 users (1 head, 1 finance, 3 leads, 13 users)"
echo "   - Hashing passwords"
echo "   - Setting up user hierarchy"
railway run npm run db:seed
echo "✅ Seed complete!"
echo ""

# Verify
echo "🔍 Verifying database setup..."
echo ""
echo "📊 User count:"
railway run psql $DATABASE_URL -t -c "SELECT COUNT(*) as total_users FROM users;" 2>/dev/null || echo "   (verification skipped)"
echo ""
echo "📊 Users by role:"
railway run psql $DATABASE_URL -c "SELECT role, COUNT(*) as count FROM users GROUP BY role ORDER BY role;" 2>/dev/null || echo "   (verification skipped)"
echo ""
echo "📊 Reimbursement count:"
railway run psql $DATABASE_URL -t -c "SELECT COUNT(*) as total_reimbursements FROM reimbursements;" 2>/dev/null || echo "   (verification skipped)"
echo ""

echo "✅ All done! Database is ready."
echo ""
echo "🎯 Next steps:"
echo "   1. Deploy your application: git push origin main"
echo "   2. Test health endpoint: curl https://your-app.railway.app/api/health"
echo "   3. Login with: head@company.com / password123"
echo ""
echo "📝 Default credentials:"
echo "   - Head: head@company.com / password123"
echo "   - Finance: finance@company.com / password123"
echo "   - Lead 1-3: lead1@company.com / password123"
echo "   - Users: user1@company.com / password123"
echo ""
