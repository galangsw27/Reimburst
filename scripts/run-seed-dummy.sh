#!/bin/bash

# Script to seed dummy data into the database
# Usage: ./scripts/run-seed-dummy.sh

set -e

echo "🌱 Starting database seeding with dummy data..."

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL is not set"
    echo "Please set DATABASE_URL in your .env file"
    exit 1
fi

echo "📊 Database: $DATABASE_URL"
echo ""

# Run the seed script
echo "🔄 Executing seed script..."
psql "$DATABASE_URL" -f scripts/seed-dummy-data.sql

echo ""
echo "✅ Database seeding completed successfully!"
echo ""
echo "📋 Summary:"
echo "   - Users: 9 (1 head, 2 leads, 1 finance, 5 testers)"
echo "   - Projects: 4 (3 active, 1 inactive)"
echo "   - Assets: 6 (5 active, 1 inactive)"
echo "   - Reimbursements: 15 (various statuses)"
echo ""
echo "🔐 Test Credentials:"
echo "   Lead: john.lead@airism.com"
echo "   Head: michael.head@airism.com"
echo "   Finance: lisa.finance@airism.com"
echo "   Tester: alice.tester@airism.com"
echo ""
echo "💡 You can now test the Request Module with this dummy data!"
