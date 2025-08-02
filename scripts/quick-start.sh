#!/bin/bash

# scripts/quick-start.sh - Start all services without waiting

echo "🚀 Quick Start: SanctionsGuard Pro with OpenSanctions"
echo "⚠️  Note: Services will start in background. OpenSanctions may take 10-15 minutes to be fully ready."

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    cp .env.example .env
    echo "📝 Created .env file"
fi

# Start all services at once
echo "🏗️  Building and starting all services..."
docker compose up -d --build

echo ""
echo "🎉 All services started in background!"
echo ""
echo "📱 Service URLs (may take time to be ready):"
echo "   🌐 SanctionsGuard Pro:     http://localhost:3000"
echo "   🔧 Backend API:           http://localhost:8000"
echo "   📚 API Documentation:     http://localhost:8000/docs"
echo "   🔍 OpenSanctions API:     http://localhost:9000"
echo "   📊 Elasticsearch:         http://localhost:9200"
echo ""
echo "⏳ Expected startup times:"
echo "   PostgreSQL & Redis:       ~30 seconds"
echo "   Backend & Frontend:       ~1-2 minutes"
echo "   Elasticsearch:            ~2-5 minutes"
echo "   OpenSanctions API:        ~5-15 minutes"
echo ""
echo "🛠️  Monitoring commands:"
echo "   📊 Check status:          docker compose ps"
echo "   📊 View all logs:         docker compose logs -f"
echo "   📊 View OpenSanctions:    docker compose logs -f opensanctions-api"
echo "   📊 View Elasticsearch:    docker compose logs -f opensanctions-index"
echo "   🧪 Test when ready:       ./scripts/test.sh"
echo "   ⏹️  Stop services:         docker compose down"
echo ""
echo "💡 Tip: Run './scripts/monitor.sh' to watch the startup progress"

---

# scripts/monitor.sh - Monitor service startup progress

#!/bin/bash

echo "📊 Monitoring SanctionsGuard Pro Startup Progress"
echo "================================================="

check_service() {
    local name="$1"
    local url="$2"
    local port="$3"
    
    if curl -f "$url" >/dev/null 2>&1; then
        echo "✅ $name (port $port)"
        return 0
    else
        echo "⏳ $name (port $port) - starting..."
        return 1
    fi
}

show_opensanctions_progress() {
    echo ""
    echo "🔍 OpenSanctions Detailed Status:"
    
    # Check if container is running
    if docker compose ps opensanctions-api | grep -q "Up"; then
        echo "   Container: ✅ Running"
        
        # Check API health
        if curl -s http://localhost:9000/healthz >/dev/null 2>&1; then
            echo "   API Health: ✅ Healthy"
            
            # Try to get datasets info
            DATASETS=$(curl -s http://localhost:9000/datasets 2>/dev/null)
            if echo "$DATASETS" | grep -q "datasets"; then
                echo "   Data Status: ✅ Loaded"
                DATASET_COUNT=$(echo "$DATASETS" | grep -o '"name"' | wc -l)
                echo "   Available Datasets: $DATASET_COUNT"
            else
                echo "   Data Status: ⏳ Loading..."
            fi
        else
            echo "   API Health: ⏳ Initializing..."
        fi
    else
        echo "   Container: ❌ Not running"
    fi
    
    # Show recent logs
    echo ""
    echo "📋 Recent OpenSanctions logs:"
    docker compose logs --tail=5 opensanctions-api 2>/dev/null | sed 's/^/   /'
}

# Main monitoring loop
while true; do
    clear
    echo "📊 SanctionsGuard Pro Service Status - $(date)"
    echo "=============================================="
    echo ""
    
    # Check each service
    check_service "PostgreSQL" "localhost:5432" "5432" || true
    check_service "Redis" "localhost:6379" "6379" || true
    check_service "Backend API" "http://localhost:8000/health" "8000" || true
    check_service "Frontend" "http://localhost:3000" "3000" || true
    check_service "Elasticsearch" "http://localhost:9200/_cluster/health" "9200" || true
    check_service "OpenSanctions API" "http://localhost:9000/healthz" "9000" || true
    
    show_opensanctions_progress
    
    echo ""
    echo "🔄 Refreshing in 10 seconds... (Ctrl+C to exit)"
    
    sleep 10
done

---

# scripts/status.sh - Quick status check

#!/bin/bash

echo "📊 SanctionsGuard Pro - Quick Status Check"
echo "=========================================="

# Container status
echo ""
echo "🐳 Container Status:"
docker compose ps

# Service health checks
echo ""
echo "🔍 Service Health:"

services=(
    "PostgreSQL:localhost:5432"
    "Redis:localhost:6379" 
    "Backend:http://localhost:8000/health"
    "Frontend:http://localhost:3000"
    "Elasticsearch:http://localhost:9200"
    "OpenSanctions:http://localhost:9000/healthz"
)

for service in "${services[@]}"; do
    IFS=':' read -r name url <<< "$service"
    if curl -f "$url" >/dev/null 2>&1; then
        echo "✅ $name"
    else
        echo "❌ $name"
    fi
done

# OpenSanctions data status
echo ""
echo "📊 OpenSanctions Data Status:"
if curl -s http://localhost:9000/datasets >/dev/null 2>&1; then
    DATASETS=$(curl -s http://localhost:9000/datasets)
    if echo "$DATASETS" | grep -q "datasets"; then
        DATASET_COUNT=$(echo "$DATASETS" | grep -o '"name"' | wc -l)
        echo "✅ Data loaded - $DATASET_COUNT datasets available"
    else
        echo "⏳ Data still loading..."
    fi
else
    echo "❌ OpenSanctions API not responding"
fi

# Integration test
echo ""
echo "🧪 Integration Test:"
SEARCH_RESPONSE=$(curl -s -X POST "http://localhost:8000/api/v1/search/entities" \
  -H "Content-Type: application/json" \
  -d '{"query": "test"}' 2>/dev/null)

if echo "$SEARCH_RESPONSE" | grep -q '"source": "opensanctions"'; then
    echo "✅ Using real OpenSanctions data"
elif echo "$SEARCH_RESPONSE" | grep -q '"source": "mock"'; then
    echo "⚠️  Using mock data (OpenSanctions still loading)"
else
    echo "❌ Search integration failed"
fi

echo ""
echo "💡 For continuous monitoring, run: ./scripts/monitor.sh"