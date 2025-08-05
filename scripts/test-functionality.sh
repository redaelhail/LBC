#!/bin/bash

echo "🧪 Testing SanctionsGuard Pro Enhanced Functionality"
echo "===================================================="

BASE_URL="http://localhost:8000/api/v1"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
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

echo -e "\n${BLUE}Testing Enhanced Endpoints${NC}"
echo "=========================="

# Test dashboard stats
test_endpoint "GET" "/dashboard/stats" "" "Dashboard Statistics"

# Test search history
test_endpoint "GET" "/search/history?limit=10" "" "Search History"

# Test report templates
test_endpoint "GET" "/reports/templates" "" "Report Templates"

# Test report generation
test_endpoint "POST" "/reports/generate" '{"report_type": "daily_summary", "format": "json"}' "Generate Daily Summary Report"

# Test search with history recording
test_endpoint "POST" "/search/entities" '{"query": "Putin", "dataset": "default", "limit": 3}' "Search with History Recording"

echo -e "\n${GREEN}🎉 Testing Complete!${NC}"
echo "Access the enhanced frontend at: http://localhost:3000"
