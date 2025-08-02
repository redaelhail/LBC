#!/bin/bash

echo "🚀 Starting SanctionsGuard Pro in development mode..."

# Start only database and Redis
echo "🗄️  Starting database and Redis..."
docker compose up -d postgres redis

echo "⏳ Waiting for database to be ready..."
sleep 15

until docker compose exec -T postgres pg_isready -U sanctionsguard -d sanctionsguard > /dev/null 2>&1; do
    echo "⏳ Waiting for database..."
    sleep 5
done

echo "✅ Database is ready"
echo ""
echo "🎉 Development environment ready!"
echo ""
echo "To start the services manually:"
echo "   🐍 Backend: cd backend && python -m venv venv && source venv/bin/activate && pip install -r requirements-dev.txt && uvicorn app.main:app --reload"
echo "   ⚛️  Frontend: cd frontend && npm install && npm run dev"
echo ""
echo "Or use Docker for full stack:"
echo "   🐳 Docker: docker compose up -d"
