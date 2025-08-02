from fastapi import APIRouter
from typing import Dict, Any

router = APIRouter()

@router.get("/status")
async def health_status() -> Dict[str, Any]:
    return {
        "status": "healthy",
        "service": "SanctionsGuard Pro API",
        "version": "1.0.0",
        "environment": "development"
    }
