# backend/app/models/audit_log.py
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String, nullable=False)  # LOGIN, SEARCH, EXPORT, CREATE_USER, etc.
    resource = Column(String)  # Entity ID, report name, etc.
    ip_address = Column(String)
    user_agent = Column(Text)
    extra_data = Column(JSON)  # Additional context data
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="audit_logs")