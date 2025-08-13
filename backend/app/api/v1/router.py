from fastapi import APIRouter
from app.api.v1.endpoints import search, health, auth, entities, risk_scoring, search_history, audit, reports, collaboration, data_sources

api_router = APIRouter()
api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(search.router, prefix="/search", tags=["search"])
api_router.include_router(entities.router, prefix="/entities", tags=["entities"])
api_router.include_router(risk_scoring.router, prefix="/risk-scoring", tags=["risk_scoring"])

# Phase 3 Enhanced Features - Re-enabled after database migration
api_router.include_router(search_history.router, prefix="/search-history", tags=["search_history"])
api_router.include_router(audit.router, prefix="/audit", tags=["audit_compliance"])
api_router.include_router(reports.router, prefix="/reports", tags=["pdf_reports"])
api_router.include_router(collaboration.router, prefix="/collaboration", tags=["team_collaboration"])

# Phase 4 Data Integration Features - New data source management
api_router.include_router(data_sources.router, prefix="/data-sources", tags=["data_integration"])
