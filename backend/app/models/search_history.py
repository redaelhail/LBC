from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime

class SearchHistory(Base):
    __tablename__ = "search_history"

    id = Column(Integer, primary_key=True, index=True)
    query = Column(String, nullable=False)
    search_type = Column(String, default="Person")  # Person, Company, etc.
    results_count = Column(Integer, default=0)
    risk_level = Column(String, default="LOW")  # LOW, MEDIUM, HIGH
    relevance_score = Column(Float, default=0.0)
    data_source = Column(String, default="opensanctions")  # opensanctions, mock
    execution_time_ms = Column(Integer, default=0)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    results_data = Column(JSON, nullable=True)  # Store full search results
    notes = Column(Text, nullable=True)  # General notes for this search
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="search_history")
    search_notes = relationship("SearchNote", back_populates="search_history", cascade="all, delete-orphan")
    starred_entities = relationship("StarredEntity", back_populates="search_history", cascade="all, delete-orphan")