from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime

class EntityDirector(Base):
    """
    Entity directors and key management personnel
    Tracks effective directors and their roles as required by ACAPS
    """
    __tablename__ = "entity_directors"

    id = Column(Integer, primary_key=True, index=True)
    
    # Entity Relationship
    entity_id = Column(Integer, ForeignKey("supervised_entities.id"), nullable=False, index=True)
    
    # Personal Information
    full_name = Column(String(255), nullable=False)
    first_name = Column(String(100))
    last_name = Column(String(100))
    national_id = Column(String(50), index=True)
    passport_number = Column(String(50))
    nationality = Column(String(100))
    date_of_birth = Column(DateTime)
    place_of_birth = Column(String(200))
    
    # Contact Information
    email = Column(String(255))
    phone = Column(String(50))
    address = Column(Text)
    
    # Professional Information
    position_title = Column(String(200), nullable=False)
    department = Column(String(100))
    is_effective_director = Column(Boolean, default=False, index=True)
    appointment_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime)  # Null if still active
    is_active = Column(Boolean, default=True, index=True)
    
    # Qualification and Experience
    education_background = Column(Text)
    professional_experience = Column(Text)
    insurance_experience_years = Column(Integer)
    previous_positions = Column(Text)
    
    # Compliance Information
    has_criminal_record = Column(Boolean, default=False)
    is_pep = Column(Boolean, default=False)  # Politically Exposed Person
    sanctions_screening_status = Column(String(50), default="pending")  # pending, clear, flagged
    last_screening_date = Column(DateTime)
    
    # Powers and Responsibilities
    signing_authority = Column(Boolean, default=False)
    financial_authority_limit = Column(Integer)  # Maximum financial decision amount
    responsibilities = Column(Text)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    notes = Column(Text)
    
    # Relationships
    entity = relationship("SupervisedEntity", back_populates="directors")
    
    def __repr__(self):
        return f"<EntityDirector(id={self.id}, name='{self.full_name}', position='{self.position_title}')>"

    @property
    def is_current(self):
        """Check if director is currently active"""
        return self.is_active and (self.end_date is None or self.end_date > datetime.utcnow())
    
    @property
    def tenure_years(self):
        """Calculate years in current position"""
        if not self.appointment_date:
            return 0
        
        end_date = self.end_date or datetime.utcnow()
        tenure = end_date - self.appointment_date
        return round(tenure.days / 365.25, 1)
    
    @property
    def risk_flags(self):
        """Get list of risk indicators"""
        flags = []
        if self.has_criminal_record:
            flags.append("criminal_record")
        if self.is_pep:
            flags.append("politically_exposed")
        if self.sanctions_screening_status == "flagged":
            flags.append("sanctions_flagged")
        return flags