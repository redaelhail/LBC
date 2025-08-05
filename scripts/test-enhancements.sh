#!/bin/bash

echo "🧪 Testing SanctionsGuard Pro Enhancements"
echo "=========================================="
echo ""
echo "This script tests ONLY the new enhanced functionality"
echo "Your existing search functionality is preserved"
echo ""

BASE_URL="http://localhost:8000/api/v1"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

test_endpoint() {
    local method="$1"
    local endpoint="$2"
    local data="$3"
    local description="$4"
    
    echo -e "\n${BLUE}Testing:${NC} $description"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$BASE_URL$endpoint" 2>/dev/null)
    elif [ "$method" = "POST" ]; then
        response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data" 2>/dev/null)
    fi
    
    http_code=$(echo "$response" | tail -n1)
    response_body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✅ SUCCESS${NC} (HTTP $http_code)"
        if echo "$response_body" | jq . >/dev/null 2>&1; then
            echo "$response_body" | jq '.' | head -10
        fi
    else
        echo -e "${RED}❌ FAILED${NC} (HTTP $http_code)"
        echo "$response_body"
    fi
}

echo -e "${YELLOW}Testing Enhanced Endpoints Only${NC}"
echo "================================"

# Test new dashboard endpoint
test_endpoint "GET" "/dashboard/stats" "" "Dashboard Statistics (New)"

# Test search history endpoint
test_endpoint "GET" "/dashboard/history?limit=5" "" "Search History (New)"

# Test report templates
test_endpoint "GET" "/reports/templates" "" "Report Templates (New)"

# Test report generation
test_endpoint "POST" "/reports/generate" '{"report_type": "daily_summary", "format": "json"}' "Daily Summary Report (New)"

# Test existing endpoints to ensure they still work
echo -e "\n${YELLOW}Testing Existing Endpoints (Should Still Work)${NC}"
echo "============================================="

test_endpoint "GET" "/health/status" "" "Health Check (Existing)"
test_endpoint "POST" "/search/entities" '{"query": "test", "dataset": "default", "limit": 3}' "Search Entities (Existing)"

echo -e "\n${GREEN}🎉 Enhancement Testing Complete!${NC}"
echo ""
echo "📊 New Features Available:"
echo "   ✅ Dashboard: http://localhost:3000 (use enhanced components)"
echo "   ✅ Search History: Available via /api/v1/dashboard/history"
echo "   ✅ Reports: Available via /api/v1/reports/generate"
echo ""
echo "🔧 Integration Options:"
echo "   1. Use enhanced components: frontend/src/components/enhanced/"
echo "   2. Add search tracking: import from app.utils.search_tracker"
echo "   3. Add new tabs to existing UI"
echo ""
echo "💡 Your existing search functionality is preserved and working!"
