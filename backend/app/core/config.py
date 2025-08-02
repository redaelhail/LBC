# backend/app/core/config.py
from pydantic_settings import BaseSettings
from typing import List, Optional
import secrets

class Settings(BaseSettings):
    # API Settings
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = secrets.token_urlsafe(32)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    
    # Database
    DATABASE_URL: str = "postgresql://sanctionsguard:secure_password_123@localhost:5432/sanctionsguard"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]
    ALLOWED_HOSTS: List[str] = ["localhost", "127.0.0.1"]
    
    # OpenSanctions Configuration
    OPENSANCTIONS_BASE_URL: str = "http://opensanctions-api:8000"  # Internal Docker network
    OPENSANCTIONS_EXTERNAL_URL: str = "http://localhost:9000"     # External access
    OPENSANCTIONS_TIMEOUT: int = 30
    
    # Moroccan Specific Settings
    BAM_API_ENDPOINT: Optional[str] = None
    REGISTRE_COMMERCE_API: Optional[str] = None
    MOROCCO_HIGH_RISK_THRESHOLD: float = 80.0
    MOROCCO_MEDIUM_RISK_THRESHOLD: float = 50.0
    
    # Environment
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    class Config:
        env_file = ".env"

settings = Settings()

# Logging configuration
import logging

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)