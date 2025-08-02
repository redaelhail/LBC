#!/bin/bash

echo "🧪 Testing SanctionsGuard Pro setup..."

# Test backend
echo "Testing backend API..."
if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ Backend API is responding"
else
    echo "❌ Backend API is not responding"
fi

# Test API endpoints
echo "Testing search endpoint..."
SEARCH_RESPONSE=$(curl -s -X POST "http://localhost:8000/api/v1/search/entities" \
  -H "Content-Type: application/json" \
  -d '{"query": "test", "dataset": "default"}')

if echo "$SEARCH_RESPONSE" | grep -q "results"; then
    echo "✅ Search API is working"
else
    echo "❌ Search API failed"
fi

# Test frontend
echo "Testing frontend..."
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend is accessible"
else
    echo "❌ Frontend is not accessible"
fi

# Test database
echo "Testing database..."
if docker compose exec -T postgres psql -U sanctionsguard -d sanctionsguard -c "SELECT COUNT(*) FROM users;" > /dev/null 2>&1; then
    echo "✅ Database is working"
else
    echo "❌ Database connection failed"
fi

echo ""
echo "🏁 Test completed!"
