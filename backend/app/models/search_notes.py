from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime

class SearchNote(Base):
    __tablename__ = "search_notes"

    id = Column(Integer, primary_key=True, index=True)
    search_history_id = Column(Integer, ForeignKey("search_history.id"), nullable=False)
    entity_id = Column(String, nullable=False)  # ID of the specific entity from results
    entity_name = Column(String, nullable=False)  # Name of the entity for display
    note_text = Column(Text, nullable=False)
    risk_assessment = Column(String, nullable=True)  # Additional risk notes
    action_taken = Column(String, nullable=True)  # What action was taken
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    search_history = relationship("SearchHistory", back_populates="notes")
    user = relationship("User")