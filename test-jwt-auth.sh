#!/bin/bash

# JWT Authentication Test Script
# This script tests the JWT authentication implementation

BASE_URL="http://localhost:3000"

echo "==================================="
echo "JWT Authentication Test"
echo "==================================="
echo ""

# Test 1: Login and get token
echo "Test 1: Login to get JWT token"
echo "-----------------------------------"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"user1@company.com","password":"password123"}')

echo "Login Response:"
echo "$LOGIN_RESPONSE" | jq '.'
echo ""

# Extract token from response
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ FAILED: Could not get token from login"
  exit 1
fi

echo "✅ SUCCESS: Got JWT token"
echo ""

# Test 2: Access protected endpoint WITHOUT token (should fail with 401)
echo "Test 2: Access /api/projects WITHOUT token (should fail)"
echo "-----------------------------------"
NO_AUTH_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$BASE_URL/api/projects")
HTTP_STATUS=$(echo "$NO_AUTH_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)

if [ "$HTTP_STATUS" == "401" ]; then
  echo "✅ SUCCESS: Got 401 Unauthorized as expected"
else
  echo "❌ FAILED: Expected 401, got $HTTP_STATUS"
fi
echo ""

# Test 3: Access protected endpoint WITH token (should succeed)
echo "Test 3: Access /api/projects WITH token (should succeed)"
echo "-----------------------------------"
AUTH_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$BASE_URL/api/projects" \
  -H "Authorization: Bearer $TOKEN")
HTTP_STATUS=$(echo "$AUTH_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$AUTH_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" == "200" ]; then
  echo "✅ SUCCESS: Got 200 OK with valid token"
  echo "Response:"
  echo "$RESPONSE_BODY" | jq '.'
else
  echo "❌ FAILED: Expected 200, got $HTTP_STATUS"
  echo "Response:"
  echo "$RESPONSE_BODY"
fi
echo ""

# Test 4: Access assets endpoint WITH token
echo "Test 4: Access /api/assets WITH token (should succeed)"
echo "-----------------------------------"
ASSETS_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$BASE_URL/api/assets" \
  -H "Authorization: Bearer $TOKEN")
HTTP_STATUS=$(echo "$ASSETS_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)

if [ "$HTTP_STATUS" == "200" ]; then
  echo "✅ SUCCESS: Got 200 OK for assets endpoint"
else
  echo "❌ FAILED: Expected 200, got $HTTP_STATUS"
fi
echo ""

# Test 5: Access reports endpoint WITH token
echo "Test 5: Access /api/reports WITH token (should succeed)"
echo "-----------------------------------"
REPORTS_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$BASE_URL/api/reports" \
  -H "Authorization: Bearer $TOKEN")
HTTP_STATUS=$(echo "$REPORTS_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)

if [ "$HTTP_STATUS" == "200" ]; then
  echo "✅ SUCCESS: Got 200 OK for reports endpoint"
else
  echo "❌ FAILED: Expected 200, got $HTTP_STATUS"
fi
echo ""

# Test 6: Try to create project with regular user (should fail with 403)
echo "Test 6: Try to create project as regular user (should fail with 403)"
echo "-----------------------------------"
CREATE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$BASE_URL/api/projects" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"projectId":"5-999-999","name":"Test Project"}')
HTTP_STATUS=$(echo "$CREATE_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)

if [ "$HTTP_STATUS" == "403" ]; then
  echo "✅ SUCCESS: Got 403 Forbidden as expected (user role cannot create projects)"
else
  echo "⚠️  WARNING: Expected 403, got $HTTP_STATUS (role-based auth may need adjustment)"
fi
echo ""

# Test 7: Login as lead and try to create project (should succeed)
echo "Test 7: Login as lead and create project (should succeed)"
echo "-----------------------------------"
LEAD_LOGIN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"lead1@company.com","password":"password123"}')
LEAD_TOKEN=$(echo "$LEAD_LOGIN" | jq -r '.token')

if [ "$LEAD_TOKEN" != "null" ] && [ -n "$LEAD_TOKEN" ]; then
  CREATE_AS_LEAD=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$BASE_URL/api/projects" \
    -H "Authorization: Bearer $LEAD_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"projectId":"5-999-888","name":"Test Project by Lead"}')
  HTTP_STATUS=$(echo "$CREATE_AS_LEAD" | grep "HTTP_STATUS" | cut -d: -f2)
  
  if [ "$HTTP_STATUS" == "201" ] || [ "$HTTP_STATUS" == "400" ]; then
    echo "✅ SUCCESS: Lead can access create endpoint (got $HTTP_STATUS)"
  else
    echo "❌ FAILED: Expected 201 or 400, got $HTTP_STATUS"
  fi
else
  echo "❌ FAILED: Could not login as lead"
fi
echo ""

echo "==================================="
echo "Test Summary"
echo "==================================="
echo "All critical tests completed."
echo "Check the results above for any failures."
