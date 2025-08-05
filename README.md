# SanctionsGuard Pro

Professional Sanctions Screening Platform with OpenSanctions Integration

## Quick Start

```bash
# Start all services
docker compose up --build

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000/docs
# OpenSanctions API: http://localhost:9000
```

## Mobile Access

See [MOBILE_ACCESS.md](MOBILE_ACCESS.md) for external mobile access instructions.

## Features

- 🔍 **Real-time Sanctions Screening** - Complete entity screening with OpenSanctions data
- 📊 **Professional Dashboard** - Analytics, metrics, and compliance insights
- 📈 **Search History Management** - Star, filter, and manage past searches
- 📋 **Entity Notes System** - Add detailed compliance notes to any entity
- 🌐 **Comprehensive Data Display** - Full OpenSanctions metadata including:
  - Personal information (citizenship, birth/death dates, gender)
  - Contact details (addresses, phone numbers, emails)
  - Identity documents (passport/ID numbers)
  - Professional information (positions, titles)
  - All aliases and alternative names
  - Official sanctions notes and sources
- 📱 **Mobile Responsive** - Optimized for desktop and mobile use
- 🔒 **Secure & Private** - Data processing stays on your network

## Architecture

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: FastAPI + Python
- **Database**: PostgreSQL
- **Cache**: Redis
- **Sanctions Data**: OpenSanctions (Elasticsearch + Yente API)
- **Deployment**: Docker Compose

## Services

- `frontend` - React application (port 3000)
- `backend` - FastAPI server (port 8000)
- `postgres` - Database (port 5432)
- `redis` - Cache (port 6379)
- `opensanctions-index` - Elasticsearch (port 9200)
- `opensanctions-api` - Yente API (port 9000)

## Development

```bash
# View logs
docker compose logs -f [service-name]

# Restart a service
docker compose restart [service-name]

# Stop all services
docker compose down
```

## License

Private - All Rights Reserved
