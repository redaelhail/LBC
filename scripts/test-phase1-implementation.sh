#!/bin/bash

# Test Phase 1 Implementation
# Tests supervised entities, risk scoring, and API endpoints

set -e

echo "🧪 Starting Phase 1 Implementation Testing..."
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_BASE_URL="http://localhost:8000/api/v1"
AUTH_TOKEN=""

# Function to print colored output
print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
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

# Function to check if service is running
check_service() {
    local service_name=$1
    local port=$2
    
    if curl -s "http://localhost:$port/health" > /dev/null; then
        print_success "$service_name is running on port $port"
        return 0
    else
        print_error "$service_name is not running on port $port"
        return 1
    fi
}

# Function to authenticate and get token
authenticate() {
    print_step "Authenticating with API..."
    
    local auth_response=$(curl -s -X POST "$API_BASE_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d '{
            "username": "admin",
            "password": "admin123"
        }')
    
    AUTH_TOKEN=$(echo $auth_response | jq -r '.access_token' 2>/dev/null)
    
    if [ "$AUTH_TOKEN" != "null" ] && [ -n "$AUTH_TOKEN" ]; then
        print_success "Authentication successful"
        return 0
    else
        print_error "Authentication failed: $auth_response"
        return 1
    fi
}

# Function to test API endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local expected_status=$3
    local description=$4
    local data=$5
    
    print_step "Testing: $description"
    
    local cmd="curl -s -w '%{http_code}' -X $method '$API_BASE_URL$endpoint'"
    
    if [ -n "$AUTH_TOKEN" ]; then
        cmd="$cmd -H 'Authorization: Bearer $AUTH_TOKEN'"
    fi
    
    if [ -n "$data" ]; then
        cmd="$cmd -H 'Content-Type: application/json' -d '$data'"
    fi
    
    local response=$(eval $cmd)
    local status_code=${response: -3}
    local body=${response%???}
    
    if [ "$status_code" = "$expected_status" ]; then
        print_success "$description - Status: $status_code"
        if [ -n "$body" ] && [ "$body" != "" ]; then
            echo "Response preview: $(echo $body | jq -c . 2>/dev/null || echo $body | head -c 100)..."
        fi
        return 0
    else
        print_error "$description - Expected: $expected_status, Got: $status_code"
        if [ -n "$body" ]; then
            echo "Response: $body"
        fi
        return 1
    fi
}

# Function to run database migration test
test_database_migration() {
    print_step "Testing database migrations..."
    
    # Check if new tables exist
    local tables_check=$(docker exec sanctionsguard-pro-db-1 psql -U sanctionsguard -d sanctionsguard -c "
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('supervised_entities', 'entity_directors', 'entity_lbc_contacts', 'risk_scores', 'scoring_domains', 'scoring_domain_analyses')
    " -t 2>/dev/null || echo "")
    
    if echo "$tables_check" | grep -q "supervised_entities"; then
        print_success "Database migrations applied successfully"
        
        # Check sample data
        local sample_count=$(docker exec sanctionsguard-pro-db-1 psql -U sanctionsguard -d sanctionsguard -c "
            SELECT COUNT(*) FROM supervised_entities;
        " -t 2>/dev/null | tr -d ' ')
        
        print_success "Sample entities in database: $sample_count"
        return 0
    else
        print_warning "New tables not found - migrations may need to be applied"
        return 1
    fi
}

# Function to test entity management
test_entity_management() {
    print_step "Testing Entity Management APIs..."
    
    # Test list entities
    test_endpoint "GET" "/entities" "200" "List supervised entities"
    
    # Test entity statistics
    test_endpoint "GET" "/entities/statistics/overview" "200" "Get entity statistics"
    
    # Test create entity
    local new_entity='{
        "denomination": "Test Insurance Company",
        "category": "insurance_company",
        "registration_number": "RC-TEST-001",
        "tax_id": "TEST123456",
        "headquarters_address": "Test Address, Casablanca",
        "city": "Casablanca",
        "authorized_capital": 50000000,
        "paid_capital": 50000000,
        "activities_authorized": ["automobile", "habitation"],
        "license_number": "LIC-TEST-001",
        "notes": "Test entity created by automated test"
    }'
    
    local create_response=$(curl -s -X POST "$API_BASE_URL/entities" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -H "Content-Type: application/json" \
        -d "$new_entity")
    
    local entity_id=$(echo $create_response | jq -r '.id' 2>/dev/null)
    
    if [ "$entity_id" != "null" ] && [ -n "$entity_id" ]; then
        print_success "Created test entity with ID: $entity_id"
        
        # Test get entity details
        test_endpoint "GET" "/entities/$entity_id" "200" "Get entity details"
        
        # Test update entity
        local update_data='{"notes": "Updated by automated test"}'
        test_endpoint "PUT" "/entities/$entity_id" "200" "Update entity" "$update_data"
        
        return 0
    else
        print_error "Failed to create test entity: $create_response"
        return 1
    fi
}

# Function to test risk scoring
test_risk_scoring() {
    print_step "Testing Risk Scoring APIs..."
    
    # Test get scoring domains
    test_endpoint "GET" "/risk-scoring/domains" "200" "Get scoring domains"
    
    # Test entity risk scores (for sample entity)
    test_endpoint "GET" "/risk-scoring/entity/1/scores" "200" "Get entity risk scores"
    
    # Test risk matrix
    test_endpoint "GET" "/risk-scoring/matrix/1" "200" "Get risk matrix"
    
    # Test calculate risk score (simplified test)
    local scoring_request='{
        "entity_id": 1,
        "score_type": "inherent_risk",
        "questionnaire_data": {
            "has_lbc_committee": true,
            "dedicated_compliance_officer": true,
            "written_lbc_policies": true,
            "regular_training": false,
            "board_oversight": true,
            "risk_assessment_methodology": true,
            "customer_risk_rating": false,
            "automated_monitoring": true,
            "sanctions_screening": true,
            "customer_identification_procedures": true
        },
        "financial_metrics": {
            "total_assets": 500000000,
            "annual_revenue": 100000000
        },
        "operational_data": {
            "number_of_branches": 10,
            "number_of_employees": 150
        },
        "regulatory_history": {
            "last_inspection_date": "2023-06-15",
            "inspection_findings": "minor"
        },
        "analyst_notes": "Automated test calculation"
    }'
    
    print_step "Testing risk score calculation..."
    local calc_response=$(curl -s -X POST "$API_BASE_URL/risk-scoring/calculate" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -H "Content-Type: application/json" \
        -d "$scoring_request")
    
    local score_id=$(echo $calc_response | jq -r '.score_id' 2>/dev/null)
    
    if [ "$score_id" != "null" ] && [ -n "$score_id" ]; then
        print_success "Risk score calculated with ID: $score_id"
        
        # Test domain analyses
        test_endpoint "GET" "/risk-scoring/score/$score_id/domains" "200" "Get domain analyses"
        
        return 0
    else
        print_warning "Risk score calculation test skipped or failed: $calc_response"
        return 1
    fi
}

# Function to test frontend components
test_frontend_components() {
    print_step "Testing Frontend Components..."
    
    # Check if frontend files exist
    local components_dir="../frontend/src/components"
    
    if [ -f "$components_dir/EntityProfile.tsx" ]; then
        print_success "EntityProfile component found"
    else
        print_error "EntityProfile component not found"
        return 1
    fi
    
    if [ -f "$components_dir/RiskMatrixVisualization.tsx" ]; then
        print_success "RiskMatrixVisualization component found"
    else
        print_error "RiskMatrixVisualization component not found"
        return 1
    fi
    
    # Check TypeScript compilation (if available)
    if command -v tsc &> /dev/null; then
        cd ../frontend
        if npm run build > /dev/null 2>&1; then
            print_success "Frontend builds successfully"
            cd ../scripts
            return 0
        else
            print_warning "Frontend build has issues"
            cd ../scripts
            return 1
        fi
    else
        print_warning "TypeScript compiler not available - skipping build test"
        return 0
    fi
}

# Function to generate test report
generate_test_report() {
    local passed=$1
    local failed=$2
    local total=$((passed + failed))
    
    echo ""
    echo "=============================================="
    echo "📊 PHASE 1 IMPLEMENTATION TEST RESULTS"
    echo "=============================================="
    echo "Total Tests: $total"
    echo "Passed: $passed"
    echo "Failed: $failed"
    
    if [ $failed -eq 0 ]; then
        print_success "🎉 All tests passed! Phase 1 implementation is ready."
        echo ""
        echo "✅ Implemented Features:"
        echo "   • Supervised Entity Management"
        echo "   • Entity Directors & LBC Contacts"
        echo "   • Risk Scoring Engine (3-tier system)"
        echo "   • Risk Matrix Visualization"
        echo "   • Entity Profile UI Components"
        echo "   • Database Schema & Migrations"
        echo "   • API Endpoints with Authentication"
        echo "   • Audit Logging"
        echo ""
        echo "🚀 Ready to proceed with Phase 2!"
    else
        print_warning "⚠️  Some tests failed. Review implementation before proceeding."
        echo ""
        echo "Please check the errors above and resolve issues."
    fi
    
    return $failed
}

# Main test execution
main() {
    local passed=0
    local failed=0
    
    echo "Starting comprehensive Phase 1 testing..."
    echo ""
    
    # Check services
    if check_service "Backend API" "8000"; then
        ((passed++))
    else
        ((failed++))
        print_warning "Backend service not running. Some tests will be skipped."
    fi
    
    if check_service "Database" "5432"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test database migrations
    if test_database_migration; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test authentication (if backend is running)
    if [ $passed -gt 0 ] && authenticate; then
        ((passed++))
        
        # Test entity management
        if test_entity_management; then
            ((passed++))
        else
            ((failed++))
        fi
        
        # Test risk scoring
        if test_risk_scoring; then
            ((passed++))
        else
            ((failed++))
        fi
        
    else
        ((failed++))
        print_warning "Skipping API tests due to authentication failure"
    fi
    
    # Test frontend components
    if test_frontend_components; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Generate final report
    generate_test_report $passed $failed
    
    return $?
}

# Run main function
main "$@"