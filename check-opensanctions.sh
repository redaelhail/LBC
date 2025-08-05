#!/bin/bash
echo "🔍 OpenSanctions Loading Status Check"
echo "===================================="

# Check API health
if curl -sf "http://localhost:9000/healthz" >/dev/null 2>&1; then
    echo "✅ API: Healthy"
else
    echo "❌ API: Not responding"
    exit 1
fi

# Check datasets
DATASETS_RESPONSE=$(curl -s "http://localhost:9000/datasets" 2>/dev/null)
if echo "$DATASETS_RESPONSE" | grep -q '"datasets"'; then
    DATASET_COUNT=$(echo "$DATASETS_RESPONSE" | jq -r '.datasets | length' 2>/dev/null || echo "0")
    echo "✅ Data: Loaded ($DATASET_COUNT datasets available)"
    echo ""
    echo "🎉 OpenSanctions is ready! Try searching for:"
    echo "   • Vladimir Putin"
    echo "   • Donald Trump" 
    echo "   • Kim Jong Un"
    echo ""
    echo "Your app will automatically switch from mock to real data!"
else
    echo "⏳ Data: Still loading..."
    echo ""
    echo "💡 While waiting, your app works with mock data at:"
    echo "   http://localhost:3000"
fi

# Test backend integration
echo ""
echo "🧪 Testing backend integration:"
SEARCH_TEST=$(curl -s -X POST "http://localhost:8000/api/v1/search/entities" \
  -H "Content-Type: application/json" \
  -d '{"query": "test"}' 2>/dev/null)

if echo "$SEARCH_TEST" | grep -q '"source": "opensanctions"'; then
    echo "✅ Using real OpenSanctions data"
elif echo "$SEARCH_TEST" | grep -q '"source": "mock"'; then
    echo "⚠️  Using mock data (OpenSanctions still loading)"
else
    echo "❌ Backend integration issue"
fi