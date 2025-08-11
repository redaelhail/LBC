from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON, Text, Boolean, Enum
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime
import enum

class EntityCategory(str, enum.Enum):
    INSURANCE_COMPANY = "insurance_company"
    REINSURANCE_COMPANY = "reinsurance_company" 
    INSURANCE_INTERMEDIARY = "insurance_intermediary"
    BROKER = "broker"
    AGENT = "agent"

class EntityStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    UNDER_INVESTIGATION = "under_investigation"

class SupervisedEntity(Base):
    """
    Signaletic records (Fiche signalétique) for supervised entities
    Based on ACAPS specifications for insurance companies and intermediaries
    """
    __tablename__ = "supervised_entities"

    id = Column(Integer, primary_key=True, index=True)
    
    # Basic Information
    denomination = Column(String(255), nullable=False, index=True)
    commercial_name = Column(String(255))
    category = Column(Enum(EntityCategory, values_callable=lambda obj: [e.value for e in obj]), nullable=False, index=True)
    registration_number = Column(String(100), unique=True, index=True)
    tax_id = Column(String(50))
    
    # Legal Information
    legal_form = Column(String(100))
    incorporation_date = Column(DateTime)
    headquarters_address = Column(Text)
    postal_code = Column(String(20))
    city = Column(String(100))
    country = Column(String(100), default="Morocco")
    
    # Business Information
    authorized_capital = Column(Float)
    paid_capital = Column(Float)
    annual_turnover = Column(Float)
    number_of_employees = Column(Integer)
    
    # Insurance Specific
    activities_authorized = Column(JSON)  # List of authorized insurance activities
    license_number = Column(String(100))
    license_date = Column(DateTime)
    
    # Key Business Metrics
    total_premiums_written = Column(Float, default=0.0)
    total_claims_paid = Column(Float, default=0.0)
    technical_reserves = Column(Float, default=0.0)
    solvency_ratio = Column(Float)
    
    # Risk Indicators
    pep_exposure = Column(Boolean, default=False)  # Politically Exposed Persons
    foreign_clients_ratio = Column(Float, default=0.0)
    cash_transactions_volume = Column(Float, default=0.0)
    high_risk_countries_exposure = Column(Float, default=0.0)
    
    # Regulatory Status
    status = Column(Enum(EntityStatus, values_callable=lambda obj: [e.value for e in obj]), default=EntityStatus.ACTIVE, index=True)
    last_inspection_date = Column(DateTime)
    next_inspection_due = Column(DateTime)
    compliance_rating = Column(String(20))  # A, B, C, D ratings
    
    # LBC/FT Specific Information
    lbc_ft_policy_date = Column(DateTime)
    lbc_ft_training_date = Column(DateTime)
    suspicious_transactions_reported = Column(Integer, default=0)
    last_questionnaire_submission = Column(DateTime)
    
    # Metadata
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    notes = Column(Text)
    
    # Relationships
    directors = relationship("EntityDirector", back_populates="entity", cascade="all, delete-orphan")
    lbc_contacts = relationship("EntityLBCContact", back_populates="entity", cascade="all, delete-orphan")
    risk_scores = relationship("RiskScore", back_populates="entity", cascade="all, delete-orphan")
    creator = relationship("User")
    
    def __repr__(self):
        return f"<SupervisedEntity(id={self.id}, denomination='{self.denomination}', category='{self.category}')>"

    @property
    def current_risk_score(self):
        """Get the most recent risk score"""
        if self.risk_scores:
            return max(self.risk_scores, key=lambda x: x.scoring_date)
        return None
    
    @property
    def key_financial_metrics(self):
        """Get key financial indicators as dict"""
        return {
            "authorized_capital": self.authorized_capital,
            "paid_capital": self.paid_capital,
            "annual_turnover": self.annual_turnover,
            "total_premiums": self.total_premiums_written,
            "solvency_ratio": self.solvency_ratio,
            "technical_reserves": self.technical_reserves
        }
    
    @property 
    def risk_indicators(self):
        """Get risk indicators as dict"""
        return {
            "pep_exposure": self.pep_exposure,
            "foreign_clients_ratio": self.foreign_clients_ratio,
            "cash_transactions_volume": self.cash_transactions_volume,
            "high_risk_countries_exposure": self.high_risk_countries_exposure,
            "suspicious_transactions_reported": self.suspicious_transactions_reported
        }