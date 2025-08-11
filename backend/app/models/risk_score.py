from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON, Text, Boolean, Enum
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime
import enum

class RiskLevel(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class ScoreType(str, enum.Enum):
    INHERENT_RISK = "inherent_risk"  # Risque inhérent
    RISK_MANAGEMENT_DEVICE = "risk_management_device"  # DMR - Dispositif de maîtrise des risques
    NET_RISK = "net_risk"  # Risque net (calculated from inherent + DMR)

class ScoreStatus(str, enum.Enum):
    DRAFT = "draft"
    PENDING_REVIEW = "pending_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    ARCHIVED = "archived"

class RiskScore(Base):
    """
    Risk scoring system for supervised entities
    Implements the three-tier scoring approach: Inherent Risk, DMR, and Net Risk
    """
    __tablename__ = "risk_scores"

    id = Column(Integer, primary_key=True, index=True)
    
    # Entity Relationship
    entity_id = Column(Integer, ForeignKey("supervised_entities.id"), nullable=False, index=True)
    
    # Scoring Information
    score_type = Column(Enum(ScoreType, values_callable=lambda obj: [e.value for e in obj]), nullable=False, index=True)
    score_value = Column(Float, nullable=False)  # 0-100 scale
    risk_level = Column(Enum(RiskLevel, values_callable=lambda obj: [e.value for e in obj]), nullable=False, index=True)
    scoring_period = Column(String(50))  # e.g., "2023-Q4", "2024-Annual"
    scoring_date = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    
    # Domain-specific scores (JSON structure for flexibility)
    domain_scores = Column(JSON)  # {"organization": 75, "classification": 60, "filtering": 80}
    
    # Calculation Details
    calculation_method = Column(String(100))  # "automatic", "manual", "hybrid"
    weighting_factors = Column(JSON)  # Pondérations used in calculation
    base_indicators = Column(JSON)  # Raw data used for scoring
    
    # Review and Validation
    status = Column(Enum(ScoreStatus, values_callable=lambda obj: [e.value for e in obj]), default=ScoreStatus.DRAFT, index=True)
    reviewed_by = Column(Integer, ForeignKey("users.id"))
    review_date = Column(DateTime)
    approved_by = Column(Integer, ForeignKey("users.id"))
    approval_date = Column(DateTime)
    
    # Expert Adjustments
    expert_adjustment = Column(Float, default=0.0)  # Manual adjustment to calculated score
    adjustment_reason = Column(Text)
    adjusted_by = Column(Integer, ForeignKey("users.id"))
    adjustment_date = Column(DateTime)
    
    # Comments and Documentation
    analyst_comments = Column(Text)
    management_comments = Column(Text)
    regulatory_notes = Column(Text)
    
    # Version Control
    version = Column(Integer, default=1)
    previous_score_id = Column(Integer, ForeignKey("risk_scores.id"))
    is_current = Column(Boolean, default=True, index=True)
    
    # Metadata
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    entity = relationship("SupervisedEntity", back_populates="risk_scores")
    creator = relationship("User", foreign_keys=[created_by])
    reviewer = relationship("User", foreign_keys=[reviewed_by])
    approver = relationship("User", foreign_keys=[approved_by])
    adjuster = relationship("User", foreign_keys=[adjusted_by])
    previous_score = relationship("RiskScore", remote_side=[id])
    domain_analyses = relationship("ScoringDomainAnalysis", back_populates="risk_score", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<RiskScore(id={self.id}, entity_id={self.entity_id}, type='{self.score_type}', score={self.score_value})>"

    @property
    def final_score(self):
        """Get the final score including expert adjustments"""
        return self.score_value + self.expert_adjustment
    
    @property
    def risk_level_from_score(self):
        """Calculate risk level based on final score"""
        final = self.final_score
        if final >= 80:
            return RiskLevel.CRITICAL
        elif final >= 60:
            return RiskLevel.HIGH
        elif final >= 40:
            return RiskLevel.MEDIUM
        else:
            return RiskLevel.LOW
    
    @property
    def is_overdue_for_review(self):
        """Check if score needs review (older than 12 months)"""
        if not self.scoring_date:
            return True
        
        months_old = (datetime.utcnow() - self.scoring_date).days / 30
        return months_old > 12
    
    @property
    def completion_percentage(self):
        """Calculate how complete the scoring is"""
        completeness = 0
        total_checks = 5
        
        if self.score_value is not None:
            completeness += 1
        if self.domain_scores:
            completeness += 1
        if self.analyst_comments:
            completeness += 1
        if self.status in [ScoreStatus.APPROVED, ScoreStatus.PENDING_REVIEW]:
            completeness += 1
        if self.base_indicators:
            completeness += 1
            
        return (completeness / total_checks) * 100

class ScoringDomain(Base):
    """
    Scoring domains for systematic risk assessment
    Based on ACAPS control domains (organisation, classification, filtrage, etc.)
    """
    __tablename__ = "scoring_domains"

    id = Column(Integer, primary_key=True, index=True)
    
    # Domain Definition
    domain_name = Column(String(100), nullable=False, unique=True, index=True)
    domain_code = Column(String(20), nullable=False, unique=True)
    description = Column(Text)
    category = Column(String(50))  # "lbc_ft_organization", "risk_classification", "filtering", etc.
    
    # Weighting and Configuration
    default_weight = Column(Float, default=1.0)  # Default weighting factor
    applicable_entity_types = Column(JSON)  # Which entity categories this applies to
    
    # Scoring Criteria
    scoring_criteria = Column(JSON)  # Detailed scoring rubric
    maturity_scale = Column(JSON)  # Maturity levels and descriptions
    
    # Status
    is_active = Column(Boolean, default=True, index=True)
    version = Column(Integer, default=1)
    
    # Metadata
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    domain_analyses = relationship("ScoringDomainAnalysis", back_populates="domain", cascade="all, delete-orphan")
    creator = relationship("User")
    
    def __repr__(self):
        return f"<ScoringDomain(id={self.id}, name='{self.domain_name}', code='{self.domain_code}')>"

class ScoringDomainAnalysis(Base):
    """
    Domain-specific analysis and scoring details
    Fiches d'analyse by domain as specified in requirements
    """
    __tablename__ = "scoring_domain_analyses"

    id = Column(Integer, primary_key=True, index=True)
    
    # Relationships
    risk_score_id = Column(Integer, ForeignKey("risk_scores.id"), nullable=False, index=True)
    domain_id = Column(Integer, ForeignKey("scoring_domains.id"), nullable=False, index=True)
    
    # Scoring Details
    domain_score = Column(Float, nullable=False)  # 0-100 score for this domain
    weight_applied = Column(Float, default=1.0)  # Actual weight used
    weighted_score = Column(Float)  # domain_score * weight_applied
    
    # Analysis Content
    findings = Column(Text)  # Key findings for this domain
    strengths = Column(Text)  # Identified strengths
    weaknesses = Column(Text)  # Identified weaknesses
    recommendations = Column(Text)  # Recommended improvements
    
    # Supporting Evidence
    evidence_sources = Column(JSON)  # List of evidence reviewed
    questionnaire_responses = Column(JSON)  # Relevant questionnaire data
    documentation_reviewed = Column(JSON)  # Documents analyzed
    
    # Expert Assessment
    maturity_level = Column(Integer)  # 1-5 maturity scale
    maturity_justification = Column(Text)
    control_effectiveness = Column(String(50))  # "effective", "partially_effective", "ineffective"
    
    # Review Status
    is_complete = Column(Boolean, default=False)
    requires_follow_up = Column(Boolean, default=False)
    follow_up_actions = Column(JSON)
    
    # Metadata
    analyst_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    analysis_date = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    risk_score = relationship("RiskScore", back_populates="domain_analyses")
    domain = relationship("ScoringDomain", back_populates="domain_analyses")
    analyst = relationship("User")
    
    def __repr__(self):
        return f"<ScoringDomainAnalysis(id={self.id}, domain='{self.domain.domain_name if self.domain else 'N/A'}', score={self.domain_score})>"

    @property
    def score_interpretation(self):
        """Get text interpretation of domain score"""
        if self.domain_score >= 80:
            return "Excellent"
        elif self.domain_score >= 60:
            return "Good"
        elif self.domain_score >= 40:
            return "Adequate"
        elif self.domain_score >= 20:
            return "Weak"
        else:
            return "Poor"