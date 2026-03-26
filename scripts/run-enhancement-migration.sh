#!/bin/bash

# Enhancement Flow Migration Runner
# This script safely runs the enhancement flow database migration

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "scripts/enhancement-flow-migration.sql" ]; then
    print_error "Migration script not found. Please run this from the project root directory."
    exit 1
fi

# Default database connection settings
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-reimbursement_db}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-postgres}

# Check if running in Docker environment
if [ -n "$DATABASE_URL" ]; then
    print_status "Using DATABASE_URL for connection"
    CONNECTION_STRING="$DATABASE_URL"
elif command -v docker &> /dev/null && docker ps | grep -q "reimbursement_db"; then
    print_status "Detected Docker environment, using docker exec"
    DOCKER_MODE=true
else
    print_status "Using direct PostgreSQL connection"
    CONNECTION_STRING="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"
fi

print_status "Starting Enhancement Flow Database Migration..."
print_status "Timestamp: $(date)"

# Create backup before migration
print_status "Creating database backup..."
if [ "$DOCKER_MODE" = true ]; then
    docker exec reimbursement_db pg_dump -U postgres reimbursement_db > "backup_before_enhancement_$(date +%Y%m%d_%H%M%S).sql"
else
    if [ -n "$CONNECTION_STRING" ]; then
        pg_dump "$CONNECTION_STRING" > "backup_before_enhancement_$(date +%Y%m%d_%H%M%S).sql"
    else
        PGPASSWORD=$DB_PASSWORD pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME > "backup_before_enhancement_$(date +%Y%m%d_%H%M%S).sql"
    fi
fi
print_success "Database backup created"

# Run the migration
print_status "Running enhancement flow migration..."

if [ "$DOCKER_MODE" = true ]; then
    # Use docker exec for containerized database
    if docker exec -i reimbursement_db psql -U postgres -d reimbursement_db < scripts/enhancement-flow-migration.sql; then
        print_success "Migration executed successfully via Docker"
    else
        print_error "Migration failed via Docker"
        exit 1
    fi
else
    # Use direct connection
    if [ -n "$CONNECTION_STRING" ]; then
        if psql "$CONNECTION_STRING" < scripts/enhancement-flow-migration.sql; then
            print_success "Migration executed successfully via connection string"
        else
            print_error "Migration failed via connection string"
            exit 1
        fi
    else
        if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME < scripts/enhancement-flow-migration.sql; then
            print_success "Migration executed successfully via direct connection"
        else
            print_error "Migration failed via direct connection"
            exit 1
        fi
    fi
fi

# Verify migration
print_status "Verifying migration results..."

# Function to run verification query
run_verification() {
    local query="$1"
    local description="$2"
    
    print_status "Checking: $description"
    
    if [ "$DOCKER_MODE" = true ]; then
        docker exec reimbursement_db psql -U postgres -d reimbursement_db -c "$query"
    else
        if [ -n "$CONNECTION_STRING" ]; then
            psql "$CONNECTION_STRING" -c "$query"
        else
            PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "$query"
        fi
    fi
}

# Verify new tables exist
run_verification "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('projects', 'assets', 'documents') ORDER BY table_name;" "New tables created"

# Verify new columns exist
run_verification "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND ((table_name = 'users' AND column_name = 'status') OR (table_name = 'reimbursements' AND column_name IN ('project_id', 'asset_id', 'validation_errors'))) ORDER BY table_name, column_name;" "New columns added"

# Verify indexes exist
run_verification "SELECT tablename, indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%' AND tablename IN ('projects', 'assets', 'documents') ORDER BY tablename, indexname;" "Performance indexes created"

# Check role updates
run_verification "SELECT DISTINCT role FROM users ORDER BY role;" "User roles updated"

# Count records in new tables
run_verification "SELECT 'projects' as table_name, COUNT(*) as record_count FROM projects UNION ALL SELECT 'assets' as table_name, COUNT(*) as record_count FROM assets UNION ALL SELECT 'documents' as table_name, COUNT(*) as record_count FROM documents;" "Sample data inserted"

print_success "Migration verification completed"
print_success "Enhancement Flow Database Migration completed successfully!"
print_status "Backup file created: backup_before_enhancement_$(date +%Y%m%d)_*.sql"

# Show next steps
echo ""
print_status "Next Steps:"
echo "1. Verify the application can connect to the database"
echo "2. Run application tests to ensure compatibility"
echo "3. Update application code to use new tables and columns"
echo "4. Deploy updated application code"
echo ""
print_warning "Keep the backup file safe in case rollback is needed"