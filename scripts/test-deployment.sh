#!/bin/bash

# AIRism Deployment Test Script
# Tests the deployment before going to production

set -e

echo "🧪 AIRism Deployment Test"
echo "========================="
echo ""

FAILED=0

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test function
test_step() {
    local description=$1
    local command=$2
    
    echo -n "Testing: $description... "
    
    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
        return 0
    else
        echo -e "${RED}✗${NC}"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

# Test with output
test_step_verbose() {
    local description=$1
    local command=$2
    
    echo "Testing: $description"
    
    if eval "$command"; then
        echo -e "${GREEN}✓ Passed${NC}"
        echo ""
        return 0
    else
        echo -e "${RED}✗ Failed${NC}"
        echo ""
        FAILED=$((FAILED + 1))
        return 1
    fi
}

echo "📋 Pre-deployment Checks"
echo "------------------------"

# Check Docker
test_step "Docker is installed" "command -v docker"
test_step "Docker is running" "docker info"
test_step "Docker Compose is installed" "command -v docker-compose"

# Check files
test_step ".env file exists" "test -f .env"
test_step "Dockerfile exists" "test -f Dockerfile"
test_step "docker-compose.yml exists" "test -f docker-compose.yml"
test_step "init.sql exists" "test -f scripts/init.sql"

# Check environment variables
test_step "JWT_SECRET is set" "grep -q 'JWT_SECRET=' .env"
test_step "DATABASE_URL is set" "grep -q 'DATABASE_URL=' .env"

echo ""
echo "🏗️  Build Tests"
echo "---------------"

# Build test
test_step_verbose "Building Docker images" "docker-compose build --no-cache"

echo "🚀 Deployment Tests"
echo "-------------------"

# Start services
test_step_verbose "Starting services" "docker-compose up -d"

# Wait for services
echo "⏳ Waiting for services to be ready (30 seconds)..."
sleep 30

# Test services
test_step "Database container is running" "docker-compose ps postgres | grep -q 'Up'"
test_step "App container is running" "docker-compose ps app | grep -q 'Up'"

# Test connectivity
test_step "Database is accepting connections" "docker-compose exec -T postgres pg_isready -U postgres"
test_step "Application responds to HTTP" "curl -f -s http://localhost:3000 > /dev/null"

# Test health endpoint
echo ""
echo "🏥 Health Check Tests"
echo "---------------------"

HEALTH_RESPONSE=$(curl -s http://localhost:3000/api/health)
HEALTH_STATUS=$(echo "$HEALTH_RESPONSE" | jq -r '.status' 2>/dev/null || echo "error")

if [ "$HEALTH_STATUS" = "healthy" ]; then
    echo -e "${GREEN}✓${NC} Health check passed"
    echo "$HEALTH_RESPONSE" | jq '.'
else
    echo -e "${RED}✗${NC} Health check failed"
    echo "$HEALTH_RESPONSE"
    FAILED=$((FAILED + 1))
fi

echo ""
echo "🗄️  Database Tests"
echo "------------------"

# Test database tables
test_step "Users table exists" "docker-compose exec -T postgres psql -U postgres -d reimbursement_db -c '\dt users' | grep -q 'users'"
test_step "Reimbursements table exists" "docker-compose exec -T postgres psql -U postgres -d reimbursement_db -c '\dt reimbursements' | grep -q 'reimbursements'"

# Test database data
USER_COUNT=$(docker-compose exec -T postgres psql -U postgres -d reimbursement_db -t -c "SELECT COUNT(*) FROM users;" | tr -d ' \n')
echo "Users in database: $USER_COUNT"

REIMB_COUNT=$(docker-compose exec -T postgres psql -U postgres -d reimbursement_db -t -c "SELECT COUNT(*) FROM reimbursements;" | tr -d ' \n')
echo "Reimbursements in database: $REIMB_COUNT"

echo ""
echo "📊 Resource Usage"
echo "-----------------"

docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"

echo ""
echo "📝 Container Logs (last 10 lines)"
echo "----------------------------------"

echo "App logs:"
docker-compose logs --tail=10 app

echo ""
echo "Database logs:"
docker-compose logs --tail=10 postgres

echo ""
echo "🧹 Cleanup"
echo "----------"

read -p "Stop and remove test containers? (y/N) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker-compose down
    echo "Containers stopped and removed"
else
    echo "Containers left running"
fi

echo ""
echo "📊 Test Summary"
echo "==============="

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    echo "Deployment is ready for production."
    exit 0
else
    echo -e "${RED}✗ $FAILED test(s) failed${NC}"
    echo "Please fix the issues before deploying to production."
    exit 1
fi
