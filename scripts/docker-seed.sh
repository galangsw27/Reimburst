#!/bin/bash
# Docker Database Seed Script
# Run this after docker-compose up to seed the database

set -e

echo "🌱 Seeding Docker Database"
echo "=========================="
echo ""

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
until docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; do
  echo "   Database is unavailable - sleeping"
  sleep 2
done
echo "✅ Database is ready!"
echo ""

# Check if already seeded
USER_COUNT=$(docker-compose exec -T postgres psql -U postgres -d reimbursement_db -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | xargs || echo "0")

if [ "$USER_COUNT" -gt "0" ]; then
  echo "⚠️  Database already has $USER_COUNT users"
  read -p "Do you want to re-seed? This will delete all data (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Seed cancelled"
    exit 0
  fi
  
  echo "🗑️  Clearing existing data..."
  docker-compose exec -T postgres psql -U postgres -d reimbursement_db -c "TRUNCATE users, reimbursements CASCADE;" > /dev/null
  echo "✅ Data cleared"
  echo ""
fi

# Run seed
echo "🌱 Running seed script..."
docker-compose exec -T app npm run db:seed
echo "✅ Seed complete!"
echo ""

# Verify
echo "🔍 Verifying database..."
echo ""
echo "📊 User count:"
docker-compose exec -T postgres psql -U postgres -d reimbursement_db -t -c "SELECT COUNT(*) as total_users FROM users;"
echo ""
echo "📊 Users by role:"
docker-compose exec -T postgres psql -U postgres -d reimbursement_db -c "SELECT role, COUNT(*) as count FROM users GROUP BY role ORDER BY role;"
echo ""

echo "✅ All done!"
echo ""
echo "🎯 Default credentials:"
echo "   - Head: head@company.com / password123"
echo "   - Finance: finance@company.com / password123"
echo "   - Lead 1-3: lead1@company.com / password123"
echo "   - Users: user1@company.com / password123"
echo ""
