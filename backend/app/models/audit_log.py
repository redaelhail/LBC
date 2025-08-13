# backend/app/models/audit_log.py
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Text, Boolean
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String, nullable=False)  # LOGIN, SEARCH, EXPORT, CREATE_USER, BLACKLIST, etc.
    category = Column(String, nullable=False, default='SYSTEM')  # AUTHENTICATION, SEARCH, DATA_EXPORT, USER_MANAGEMENT, SECURITY
    resource = Column(String)  # Entity ID, report name, search query, etc.
    resource_type = Column(String)  # ENTITY, REPORT, USER, SEARCH, etc.
    ip_address = Column(String)
    mac_address = Column(String)  # For enhanced security tracking
    user_agent = Column(Text)
    session_id = Column(String)  # Track user sessions
    success = Column(Boolean, default=True)  # Track failed attempts
    risk_level = Column(String, default='LOW')  # LOW, MEDIUM, HIGH based on action
    extra_data = Column(JSON)  # Additional context data
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="audit_logs")