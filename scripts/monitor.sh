#!/bin/bash

# AIRism Monitoring Script
# Monitors application and database health

set -e

HEALTH_URL="http://localhost:3000/api/health"
LOG_FILE="monitor.log"

echo "🔍 AIRism Health Monitor"
echo "========================"
echo ""

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Check if services are running
check_services() {
    log "Checking Docker services..."
    
    if ! docker-compose ps | grep -q "Up"; then
        log "❌ Services are not running!"
        return 1
    fi
    
    log "✅ Docker services are running"
    return 0
}

# Check application health
check_app_health() {
    log "Checking application health..."
    
    response=$(curl -s -w "\n%{http_code}" "$HEALTH_URL" 2>/dev/null || echo "000")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" = "200" ]; then
        log "✅ Application is healthy"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
        return 0
    else
        log "❌ Application health check failed (HTTP $http_code)"
        echo "$body"
        return 1
    fi
}

# Check database connectivity
check_database() {
    log "Checking database connectivity..."
    
    if docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
        log "✅ Database is accepting connections"
        return 0
    else
        log "❌ Database is not responding"
        return 1
    fi
}

# Check disk space
check_disk_space() {
    log "Checking disk space..."
    
    usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ "$usage" -gt 90 ]; then
        log "⚠️  Disk space critical: ${usage}% used"
        return 1
    elif [ "$usage" -gt 80 ]; then
        log "⚠️  Disk space warning: ${usage}% used"
        return 0
    else
        log "✅ Disk space OK: ${usage}% used"
        return 0
    fi
}

# Check memory usage
check_memory() {
    log "Checking memory usage..."
    
    if command -v free > /dev/null; then
        free -h | grep Mem | awk '{print "Memory: " $3 " used / " $2 " total"}'
    fi
    
    log "✅ Memory check complete"
}

# Check Docker resource usage
check_docker_resources() {
    log "Checking Docker resource usage..."
    
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" | head -n 5
    
    log "✅ Docker resource check complete"
}

# Main monitoring loop
main() {
    local all_ok=true
    
    check_services || all_ok=false
    echo ""
    
    check_app_health || all_ok=false
    echo ""
    
    check_database || all_ok=false
    echo ""
    
    check_disk_space || all_ok=false
    echo ""
    
    check_memory
    echo ""
    
    check_docker_resources
    echo ""
    
    if [ "$all_ok" = true ]; then
        log "✅ All checks passed"
        exit 0
    else
        log "❌ Some checks failed"
        exit 1
    fi
}

# Run monitoring
main
