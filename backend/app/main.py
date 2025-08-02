from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import structlog

from app.core.config import settings
from app.api.v1.router import api_router

logger = structlog.get_logger()

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting SanctionsGuard Pro API")
    yield
    logger.info("Shutting down SanctionsGuard Pro API")

app = FastAPI(
    title="SanctionsGuard Pro API",
    description="Professional Sanctions Screening Platform for Moroccan Financial Institutions",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "SanctionsGuard Pro",
        "version": "1.0.0"
    }

@app.get("/")
async def root():
    return {
        "message": "SanctionsGuard Pro API",
        "docs": "/docs",
        "health": "/health"
    }
