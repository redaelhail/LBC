from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime

class StarredEntity(Base):
    __tablename__ = "starred_entities"

    id = Column(Integer, primary_key=True, index=True)
    search_history_id = Column(Integer, ForeignKey("search_history.id", ondelete="CASCADE"), nullable=False)
    entity_id = Column(String, nullable=False, index=True)
    entity_name = Column(String, nullable=False)
    entity_data = Column(JSON, nullable=False)  # Complete entity information
    relevance_score = Column(Float, default=0.0)
    risk_level = Column(String, default="LOW")  # LOW, MEDIUM, HIGH
    tags = Column(String, nullable=True)  # Comma-separated tags
    notes = Column(Text, nullable=True)  # Compliance notes for this starred entity
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    starred_at = Column(DateTime, default=datetime.utcnow)
    
    # Unique constraint to prevent duplicate stars for same entity in same search
    __table_args__ = (UniqueConstraint('entity_id', 'search_history_id', name='_entity_search_uc'),)
    
    # Relationships
    search_history = relationship("SearchHistory", back_populates="starred_entities")
    user = relationship("User", back_populates="starred_entities")