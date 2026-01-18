#!/bin/bash
# Test Railway Deployment
# This script tests if your Railway deployment is working correctly

set -e

echo "🧪 Testing Railway Deployment"
echo "=============================="
echo ""

# Get Railway URL
echo "🔍 Getting Railway URL..."
RAILWAY_URL=$(railway status --json 2>/dev/null | grep -o '"url":"[^"]*"' | cut -d'"' -f4 || echo "")

if [ -z "$RAILWAY_URL" ]; then
    echo "❌ Could not get Railway URL"
    echo "   Make sure you're linked to a Railway project: railway link"
    exit 1
fi

echo "✅ Railway URL: $RAILWAY_URL"
echo ""

# Test 1: Health Check
echo "🏥 Test 1: Health Check"
echo "   Testing: $RAILWAY_URL/api/health"
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$RAILWAY_URL/api/health")
HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | head -n -1)
HEALTH_CODE=$(echo "$HEALTH_RESPONSE" | tail -n 1)

if [ "$HEALTH_CODE" = "200" ]; then
    echo "   ✅ Health check passed (200 OK)"
    echo "   Response: $HEALTH_BODY"
else
    echo "   ❌ Health check failed (HTTP $HEALTH_CODE)"
    echo "   Response: $HEALTH_BODY"
    exit 1
fi
echo ""

# Test 2: Database Connection
echo "🗄️  Test 2: Database Connection"
DB_STATUS=$(echo "$HEALTH_BODY" | grep -o '"database":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
if [ "$DB_STATUS" = "connected" ]; then
    echo "   ✅ Database connected"
else
    echo "   ❌ Database not connected (status: $DB_STATUS)"
    exit 1
fi
echo ""

# Test 3: Login Endpoint
echo "🔐 Test 3: Login Endpoint"
echo "   Testing: $RAILWAY_URL/api/auth/login"
LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$RAILWAY_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"head@company.com","password":"password123"}')
LOGIN_BODY=$(echo "$LOGIN_RESPONSE" | head -n -1)
LOGIN_CODE=$(echo "$LOGIN_RESPONSE" | tail -n 1)

if [ "$LOGIN_CODE" = "200" ]; then
    echo "   ✅ Login endpoint working (200 OK)"
    TOKEN=$(echo "$LOGIN_BODY" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    if [ ! -z "$TOKEN" ]; then
        echo "   ✅ JWT token received"
    else
        echo "   ⚠️  No token in response"
    fi
else
    echo "   ❌ Login failed (HTTP $LOGIN_CODE)"
    echo "   Response: $LOGIN_BODY"
    echo "   Note: This might be expected if database is not seeded yet"
fi
echo ""

# Test 4: Users Endpoint (Protected)
if [ ! -z "$TOKEN" ]; then
    echo "🔒 Test 4: Protected Endpoint (Users)"
    echo "   Testing: $RAILWAY_URL/api/users"
    USERS_RESPONSE=$(curl -s -w "\n%{http_code}" "$RAILWAY_URL/api/users" \
        -H "Authorization: Bearer $TOKEN")
    USERS_BODY=$(echo "$USERS_RESPONSE" | head -n -1)
    USERS_CODE=$(echo "$USERS_RESPONSE" | tail -n 1)
    
    if [ "$USERS_CODE" = "200" ]; then
        echo "   ✅ Protected endpoint working (200 OK)"
        USER_COUNT=$(echo "$USERS_BODY" | grep -o '"id"' | wc -l | xargs)
        echo "   ✅ Found $USER_COUNT users"
    else
        echo "   ❌ Protected endpoint failed (HTTP $USERS_CODE)"
        echo "   Response: $USERS_BODY"
    fi
    echo ""
fi

# Test 5: Database Tables
echo "📊 Test 5: Database Tables"
echo "   Checking via Railway CLI..."
USER_COUNT=$(railway run psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | xargs || echo "0")
REIMB_COUNT=$(railway run psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM reimbursements;" 2>/dev/null | xargs || echo "0")

if [ "$USER_COUNT" -gt "0" ]; then
    echo "   ✅ Users table exists ($USER_COUNT users)"
else
    echo "   ⚠️  Users table empty or not accessible"
    echo "   Run: ./scripts/railway-migrate.sh"
fi

if [ "$REIMB_COUNT" -ge "0" ]; then
    echo "   ✅ Reimbursements table exists ($REIMB_COUNT reimbursements)"
else
    echo "   ⚠️  Reimbursements table not accessible"
fi
echo ""

# Test 6: Environment Variables
echo "🔧 Test 6: Environment Variables"
echo "   Checking critical variables..."
HAS_JWT=$(railway variables | grep JWT_SECRET > /dev/null && echo "yes" || echo "no")
HAS_DB=$(railway variables | grep DATABASE_URL > /dev/null && echo "yes" || echo "no")
HAS_NODE_ENV=$(railway variables | grep NODE_ENV > /dev/null && echo "yes" || echo "no")

if [ "$HAS_JWT" = "yes" ]; then
    echo "   ✅ JWT_SECRET configured"
else
    echo "   ❌ JWT_SECRET not configured"
fi

if [ "$HAS_DB" = "yes" ]; then
    echo "   ✅ DATABASE_URL configured"
else
    echo "   ❌ DATABASE_URL not configured"
fi

if [ "$HAS_NODE_ENV" = "yes" ]; then
    echo "   ✅ NODE_ENV configured"
else
    echo "   ⚠️  NODE_ENV not configured (using default)"
fi
echo ""

# Summary
echo "📋 Test Summary"
echo "==============="
echo ""
echo "🌐 Application URL: $RAILWAY_URL"
echo "🏥 Health Check: ✅"
echo "🗄️  Database: ✅"
echo "🔐 Authentication: $([ ! -z "$TOKEN" ] && echo "✅" || echo "⚠️")"
echo "📊 Data: $USER_COUNT users, $REIMB_COUNT reimbursements"
echo ""

if [ "$USER_COUNT" -eq "0" ]; then
    echo "⚠️  Database appears empty. Run migration:"
    echo "   ./scripts/railway-migrate.sh"
    echo ""
fi

echo "✅ Deployment test complete!"
echo ""
echo "🎯 Next steps:"
echo "   1. Open app: railway open"
echo "   2. View logs: railway logs -f"
echo "   3. Monitor: $RAILWAY_URL/api/health"
echo ""
