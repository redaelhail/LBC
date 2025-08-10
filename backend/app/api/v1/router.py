from fastapi import APIRouter
from app.api.v1.endpoints import search, health, auth

api_router = APIRouter()
api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(search.router, prefix="/search", tags=["search"])
