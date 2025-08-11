from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime

class EntityLBCContact(Base):
    """
    LBC/FT (Anti-Money Laundering/Counter-Terrorism Financing) contact persons
    Tracks designated compliance officers and their responsibilities
    """
    __tablename__ = "entity_lbc_contacts"

    id = Column(Integer, primary_key=True, index=True)
    
    # Entity Relationship
    entity_id = Column(Integer, ForeignKey("supervised_entities.id"), nullable=False, index=True)
    
    # Personal Information
    full_name = Column(String(255), nullable=False)
    first_name = Column(String(100))
    last_name = Column(String(100))
    national_id = Column(String(50))
    
    # Contact Information
    email = Column(String(255), nullable=False, index=True)
    phone = Column(String(50), nullable=False)
    mobile_phone = Column(String(50))
    fax = Column(String(50))
    office_address = Column(Text)
    
    # Professional Information
    position_title = Column(String(200), nullable=False)
    department = Column(String(100))
    direct_supervisor = Column(String(200))
    appointment_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime)  # Null if still active
    is_active = Column(Boolean, default=True, index=True)
    
    # LBC/FT Specific Information
    is_primary_contact = Column(Boolean, default=False, index=True)
    is_compliance_officer = Column(Boolean, default=False)
    lbc_ft_certification = Column(String(200))
    certification_date = Column(DateTime)
    certification_expiry = Column(DateTime)
    
    # Training and Qualifications
    lbc_ft_training_completed = Column(Boolean, default=False)
    last_training_date = Column(DateTime)
    training_institution = Column(String(200))
    continuing_education_hours = Column(Integer, default=0)
    
    # Responsibilities and Authority
    responsibilities = Column(Text)
    reporting_authority = Column(Boolean, default=False)  # Can submit regulatory reports
    investigation_authority = Column(Boolean, default=False)  # Can conduct internal investigations
    training_responsibility = Column(Boolean, default=False)  # Responsible for staff training
    
    # Communication Preferences
    preferred_language = Column(String(50), default="French")
    communication_method = Column(String(50), default="email")  # email, phone, postal
    receives_regulatory_updates = Column(Boolean, default=True)
    
    # Performance Metrics
    reports_submitted_count = Column(Integer, default=0)
    training_sessions_conducted = Column(Integer, default=0)
    last_report_date = Column(DateTime)
    response_time_avg_hours = Column(Integer)  # Average response time in hours
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    notes = Column(Text)
    
    # Relationships
    entity = relationship("SupervisedEntity", back_populates="lbc_contacts")
    
    def __repr__(self):
        return f"<EntityLBCContact(id={self.id}, name='{self.full_name}', entity_id={self.entity_id})>"

    @property
    def is_current(self):
        """Check if contact is currently active"""
        return self.is_active and (self.end_date is None or self.end_date > datetime.utcnow())
    
    @property
    def certification_status(self):
        """Check certification validity"""
        if not self.certification_date:
            return "not_certified"
        
        if self.certification_expiry and self.certification_expiry < datetime.utcnow():
            return "expired"
        
        return "valid"
    
    @property
    def training_status(self):
        """Check training currency"""
        if not self.lbc_ft_training_completed:
            return "incomplete"
        
        if not self.last_training_date:
            return "unknown"
        
        # Training should be refreshed annually
        days_since_training = (datetime.utcnow() - self.last_training_date).days
        if days_since_training > 365:
            return "overdue"
        elif days_since_training > 300:  # Warning at 10 months
            return "due_soon"
        
        return "current"
    
    @property
    def contact_summary(self):
        """Get contact information summary"""
        return {
            "name": self.full_name,
            "position": self.position_title,
            "email": self.email,
            "phone": self.phone,
            "is_primary": self.is_primary_contact,
            "certification_status": self.certification_status,
            "training_status": self.training_status
        }