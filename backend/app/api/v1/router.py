from fastapi import APIRouter
from app.api.v1.endpoints import search, health, auth, entities, risk_scoring

api_router = APIRouter()
api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(search.router, prefix="/search", tags=["search"])
api_router.include_router(entities.router, prefix="/entities", tags=["entities"])
api_router.include_router(risk_scoring.router, prefix="/risk-scoring", tags=["risk_scoring"])
