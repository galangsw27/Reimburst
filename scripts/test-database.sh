#!/bin/bash

echo "🔍 Testing Database Schema..."
echo ""

# Test 1: Check table structure
echo "1️⃣ Checking reimbursements table structure..."
docker exec -i reimbursement_db psql -U postgres -d reimbursement_db -c "\d reimbursements" | grep -E "(employee_name|employee_email|project|approvals|asset|lead_name)"

if [ $? -eq 0 ]; then
    echo "✅ New columns exist"
else
    echo "❌ New columns missing"
fi

echo ""

# Test 2: Check status constraint
echo "2️⃣ Checking status constraint..."
docker exec -i reimbursement_db psql -U postgres -d reimbursement_db -c "\d reimbursements" | grep "approved_by_finance"

if [ $? -eq 0 ]; then
    echo "✅ Status constraint updated"
else
    echo "❌ Status constraint not updated"
fi

echo ""

# Test 3: Check existing data
echo "3️⃣ Checking existing reimbursements..."
docker exec -i reimbursement_db psql -U postgres -d reimbursement_db -c "SELECT COUNT(*) as total_reimbursements FROM reimbursements;"

echo ""

# Test 4: Check approvals field
echo "4️⃣ Checking approvals field type..."
docker exec -i reimbursement_db psql -U postgres -d reimbursement_db -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'reimbursements' AND column_name = 'approvals';"

echo ""

# Test 5: Check indexes
echo "5️⃣ Checking indexes..."
docker exec -i reimbursement_db psql -U postgres -d reimbursement_db -c "SELECT indexname FROM pg_indexes WHERE tablename = 'reimbursements' AND indexname LIKE 'idx_reimbursements_%';"

echo ""
echo "✅ Database test completed!"
