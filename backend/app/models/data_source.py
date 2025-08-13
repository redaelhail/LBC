# backend/app/models/data_source.py
from sqlalchemy import Column, Integer, String, DateTime, Boolean, JSON, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime

class DataSource(Base):
    __tablename__ = "data_sources"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False, index=True)
    url = Column(Text, nullable=False)
    source_type = Column(String, nullable=False)  # sanctions, pep, watchlist, etc.
    format = Column(String, default="json")  # json, xml, csv
    authentication_method = Column(String, default="none")  # none, api_key, oauth, basic
    api_key = Column(String)  # Encrypted API key
    headers = Column(JSON)  # Additional headers
    update_frequency = Column(Integer, default=24)  # Hours between updates
    priority = Column(Integer, default=1)  # 1 = highest priority
    enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    sync_logs = relationship("DataSourceSyncLog", back_populates="data_source")

class DataSourceSyncLog(Base):
    __tablename__ = "data_source_sync_logs"

    id = Column(Integer, primary_key=True, index=True)
    data_source_id = Column(Integer, ForeignKey("data_sources.id"), nullable=False)
    started_at = Column(DateTime, nullable=False)
    completed_at = Column(DateTime)
    success = Column(Boolean, default=False)
    error_message = Column(Text)
    total_records = Column(Integer, default=0)
    new_records = Column(Integer, default=0)
    updated_records = Column(Integer, default=0)
    deleted_records = Column(Integer, default=0)
    duration_seconds = Column(Integer)
    triggered_by = Column(String)  # user_id or 'system'
    metadata = Column(JSON)  # Additional sync metadata
    
    # Relationships
    data_source = relationship("DataSource", back_populates="sync_logs")

class EntitySource(Base):
    """Links entities to their data sources for provenance tracking"""
    __tablename__ = "entity_sources"

    id = Column(Integer, primary_key=True, index=True)
    entity_id = Column(String, nullable=False, index=True)  # External entity ID
    data_source_id = Column(Integer, ForeignKey("data_sources.id"), nullable=False)
    source_entity_id = Column(String, nullable=False)  # ID in source system
    first_seen = Column(DateTime, default=datetime.utcnow)
    last_seen = Column(DateTime, default=datetime.utcnow)
    last_modified = Column(DateTime, default=datetime.utcnow)
    entity_hash = Column(String, index=True)  # Hash for change detection
    raw_data = Column(JSON)  # Original entity data from source
    normalized_data = Column(JSON)  # Normalized entity data
    is_active = Column(Boolean, default=True)
    
    # Relationships
    data_source = relationship("DataSource")

class DataSourceMetrics(Base):
    """Stores metrics and statistics for data sources"""
    __tablename__ = "data_source_metrics"

    id = Column(Integer, primary_key=True, index=True)
    data_source_id = Column(Integer, ForeignKey("data_sources.id"), nullable=False)
    metric_date = Column(DateTime, nullable=False, index=True)
    total_entities = Column(Integer, default=0)
    active_entities = Column(Integer, default=0)
    new_entities_today = Column(Integer, default=0)
    updated_entities_today = Column(Integer, default=0)
    sync_count_today = Column(Integer, default=0)
    avg_sync_duration = Column(Integer, default=0)  # seconds
    success_rate = Column(Integer, default=100)  # percentage
    last_error = Column(Text)
    
    # Relationships
    data_source = relationship("DataSource")