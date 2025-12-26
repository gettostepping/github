#!/bin/bash
# Test API Key with curl
# Usage: ./scripts/test-api-key-curl.sh YOUR_API_KEY

API_KEY=$1
BASE_URL=${NEXTAUTH_URL:-http://localhost:3000}

if [ -z "$API_KEY" ]; then
  echo "❌ Error: API key required"
  echo "Usage: ./scripts/test-api-key-curl.sh YOUR_API_KEY"
  exit 1
fi

echo "🧪 Testing API Key: ${API_KEY:0:20}..."
echo ""

# Test 1: Get system stats
echo "📊 Test 1: GET /api/admin/stats"
curl -X GET \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  "$BASE_URL/api/admin/stats"
echo -e "\n\n"

# Test 2: Get API keys list (requires session auth, so this will fail - that's expected)
echo "📋 Test 2: GET /api/admin/api-keys (should fail - requires session auth)"
curl -X GET \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  "$BASE_URL/api/admin/api-keys"
echo -e "\n\n"

# Test 3: User lookup (requires admin permission)
echo "👤 Test 3: GET /api/admin/user-lookup?type=uid&query=1"
curl -X GET \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  "$BASE_URL/api/admin/user-lookup?type=uid&query=1"
echo -e "\n\n"

echo "✅ Tests complete!"

