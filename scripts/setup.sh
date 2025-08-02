#!/bin/bash

# scripts/setup.sh - Improved version with proper wait handling

set -e  # Exit on any error

echo "🚀 Starting SanctionsGuard Pro with OpenSanctions Integration..."
echo "⚠️  Note: This process can take 10-15 minutes on first run due to data indexing"

# Check prerequisites
check_prerequisites() {
    echo "🔍 Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        echo "❌ Docker not found. Please install Docker first."
        exit 1
    fi

    if ! command -v docker compose &> /dev/null; then
        echo "❌ Docker Compose not found. Please install Docker Compose first."
        exit 1
    fi

    # Check available memory
    echo "💾 Checking system resources..."
    if command -v free &> /dev/null; then
        TOTAL_MEM_KB=$(free | grep '^Mem:' | awk '{print $2}')
        TOTAL_MEM_GB=$((TOTAL_MEM_KB / 1024 / 1024))
        echo "   Available RAM: ${TOTAL_MEM_GB}GB"
        
        if [ "$TOTAL_MEM_GB" -lt 6 ]; then
            echo "⚠️  Warning: OpenSanctions works best with 8GB+ RAM"
            echo "   Your system has ${TOTAL_MEM_GB}GB - expect slower performance"
            echo "   Continue anyway? (y/N)"
            read -r response
            if [[ ! "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
                echo "Setup cancelled"
                exit 1
            fi
        fi
    fi
    
    echo "✅ Prerequisites satisfied"
}

# Setup environment
setup_environment() {
    echo "📝 Setting up environment..."
    
    if [ ! -f .env ]; then
        cp .env.example .env
        echo "   Created .env file from template"
    else
        echo "   Using existing .env file"
    fi
    
    # Create necessary directories
    mkdir -p logs uploads
    echo "   Created application directories"
}

# Wait for service with better feedback
wait_for_service() {
    local service_name="$1"
    local url="$2"
    local max_wait="$3"
    local check_interval="${4:-10}"
    
    echo "⏳ Waiting for $service_name to be ready..."
    echo "   URL: $url"
    echo "   Max wait time: ${max_wait}s"
    
    local wait_time=0
    local dots=""
    
    while [ $wait_time -lt $max_wait ]; do
        # Add a dot for visual progress
        dots="${dots}."
        if [ ${#dots} -gt 10 ]; then
            dots="."
        fi
        
        # Show progress
        local progress=$((wait_time * 100 / max_wait))
        printf "\r   Progress: [%-20s] %d%% (%ds/%ds) %s" \
               "$(printf '=%.0s' $(seq 1 $((progress / 5))))" \
               "$progress" "$wait_time" "$max_wait" "$dots"
        
        # Check if service is ready
        if curl -f "$url" >/dev/null 2>&1; then
            printf "\n✅ $service_name is ready!\n"
            return 0
        fi
        
        sleep $check_interval
        wait_time=$((wait_time + check_interval))
    done
    
    printf "\n❌ $service_name failed to start within ${max_wait}s\n"
    return 1
}

# Start services in phases
start_infrastructure() {
    echo ""
    echo "🏗️  Phase 1: Building Docker images..."
    docker compose build --parallel
    
    echo ""
    echo "🚀 Phase 2: Starting infrastructure services..."
    echo "   Starting: Elasticsearch, PostgreSQL, Redis"
    docker compose up -d opensanctions-index postgres redis
    
    echo ""
    echo "📊 Waiting for infrastructure services..."
    
    # Wait for PostgreSQL
    if ! wait_for_service "PostgreSQL" "http://localhost:5432" 60 5; then
        echo "❌ PostgreSQL failed to start"
        echo "💡 Try: docker compose logs postgres"
        exit 1
    fi
    
    # Wait for Redis  
    if ! wait_for_service "Redis" "http://localhost:6379" 30 5; then
        echo "❌ Redis failed to start"
        echo "💡 Try: docker compose logs redis"
        exit 1
    fi
    
    # Wait for Elasticsearch (this takes the longest)
    echo ""
    echo "⏳ Elasticsearch is starting... (this typically takes 2-5 minutes)"
    if ! wait_for_service "Elasticsearch" "http://localhost:9200/_cluster/health?wait_for_status=yellow&timeout=10s" 600 15; then
        echo "❌ Elasticsearch failed to start"
        echo "💡 This might be due to:"
        echo "   - Insufficient memory (needs 4GB+)"
        echo "   - Port 9200 already in use"
        echo "   - Docker resource limits"
        echo "💡 Try: docker compose logs opensanctions-index"
        exit 1
    fi
}

start_opensanctions() {
    echo ""
    echo "🚀 Phase 3: Starting OpenSanctions API..."
    docker compose up -d opensanctions-api
    
    echo ""
    echo "⏳ OpenSanctions API is starting... (this can take 3-8 minutes)"
    echo "   The API needs to initialize and may download/index data"
    
    if ! wait_for_service "OpenSanctions API" "http://localhost:9000/healthz" 900 20; then
        echo "❌ OpenSanctions API failed to start"
        echo "💡 This might be due to:"
        echo "   - Elasticsearch not fully ready"
        echo "   - Network issues downloading data"
        echo "   - Resource constraints"
        echo "💡 Try: docker compose logs opensanctions-api"
        
        echo ""
        echo "🔧 Attempting to restart OpenSanctions API..."
        docker compose restart opensanctions-api
        
        if ! wait_for_service "OpenSanctions API (retry)" "http://localhost:9000/healthz" 300 15; then
            echo "❌ OpenSanctions API still not responding"
            echo "💡 You can continue setup and the API may become available later"
            echo "   Continue without OpenSanctions? (y/N)"
            read -r response
            if [[ ! "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
                exit 1
            fi
        fi
    fi
}

start_application() {
    echo ""
    echo "🚀 Phase 4: Starting application services..."
    docker compose up -d backend frontend
    
    echo ""
    echo "⏳ Waiting for application services..."
    
    # Wait for backend
    if ! wait_for_service "Backend API" "http://localhost:8000/health" 120 10; then
        echo "❌ Backend failed to start"
        echo "💡 Try: docker compose logs backend"
        exit 1
    fi
    
    # Wait for frontend
    if ! wait_for_service "Frontend" "http://localhost:3000" 60 5; then
        echo "❌ Frontend failed to start"
        echo "💡 Try: docker compose logs frontend"
        exit 1
    fi
}

test_integration() {
    echo ""
    echo "🧪 Testing OpenSanctions integration..."
    
    # Test search API
    echo "   Testing search functionality..."
    SEARCH_RESPONSE=$(curl -s -X POST "http://localhost:8000/api/v1/search/entities" \
      -H "Content-Type: application/json" \
      -d '{"query": "test", "dataset": "default", "limit": 2}' 2>/dev/null)

    if echo "$SEARCH_RESPONSE" | grep -q '"source": "opensanctions"'; then
        echo "✅ OpenSanctions integration working - using real data"
    elif echo "$SEARCH_RESPONSE" | grep -q '"source": "mock"'; then
        echo "⚠️  Using mock data - OpenSanctions may still be initializing"
        echo "   This is normal. Real data will be available once indexing completes."
    else
        echo "❌ Search API test failed"
        echo "   Response: $SEARCH_RESPONSE"
    fi
    
    # Test datasets
    echo "   Testing available datasets..."
    DATASETS_RESPONSE=$(curl -s "http://localhost:8000/api/v1/search/datasets" 2>/dev/null)
    if echo "$DATASETS_RESPONSE" | grep -q "datasets"; then
        echo "✅ Datasets API working"
    else
        echo "⚠️  Datasets API not fully ready"
    fi
}

show_status() {
    echo ""
    echo "📋 Final Service Status:"
    echo "========================"
    docker compose ps
    
    echo ""
    echo "🎉 Setup completed!"
    echo ""
    echo "📱 Access your application:"
    echo "   🌐 SanctionsGuard Pro:     http://localhost:3000"
    echo "   🔧 Backend API:           http://localhost:8000"
    echo "   📚 API Documentation:     http://localhost:8000/docs"
    echo "   🔍 OpenSanctions API:     http://localhost:9000"
    echo "   📊 Elasticsearch:         http://localhost:9200"
    echo ""
    echo "👤 Default login credentials:"
    echo "   📧 Email: admin@sanctionsguard.ma"
    echo "   🔑 Password: admin123"
    echo ""
    echo "🛠️  Useful commands:"
    echo "   📊 View all logs:         docker compose logs -f"
    echo "   📊 View specific service:  docker compose logs -f [service-name]"
    echo "   🧪 Test integration:      ./scripts/test.sh"
    echo "   🛑 Stop all services:     docker compose down"
    echo "   🔄 Restart service:       docker compose restart [service-name]"
    echo "   🧹 Clean restart:         ./scripts/clean-restart.sh"
    echo ""
    
    # Show data initialization status
    echo "📊 Data Status:"
    if curl -s http://localhost:9000/healthz >/dev/null 2>&1; then
        echo "   OpenSanctions: ✅ API Ready"
        
        # Check if data is loaded
        STATS_RESPONSE=$(curl -s "http://localhost:9000/datasets" 2>/dev/null)
        if echo "$STATS_RESPONSE" | grep -q "datasets"; then
            echo "   Data Status: ✅ Loaded"
        else
            echo "   Data Status: ⏳ Still loading (check logs: docker compose logs opensanctions-api)"
        fi
    else
        echo "   OpenSanctions: ⏳ Still starting (this can take up to 15 minutes)"
        echo "   💡 Monitor progress: docker compose logs -f opensanctions-api"
    fi
    
    echo ""
    echo "🎯 Next Steps:"
    echo "   1. Open http://localhost:3000 in your browser"
    echo "   2. Try searching for 'Putin' or other known entities"
    echo "   3. If using mock data, wait for OpenSanctions to finish loading"
    echo "   4. Check ./scripts/test.sh for integration testing"
}

# Main execution flow
main() {
    check_prerequisites
    setup_environment
    start_infrastructure
    start_opensanctions
    start_application
    test_integration
    show_status
}

# Handle interruption
trap 'echo ""; echo "❌ Setup interrupted"; exit 1' INT

# Run main function
main

echo ""
echo "✨ SanctionsGuard Pro is ready to use!"