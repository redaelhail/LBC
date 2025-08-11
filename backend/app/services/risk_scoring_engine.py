"""
Risk Scoring Engine for ACAPS LBC/FT Platform
Implements the three-tier scoring system: Inherent Risk, Risk Management Device, and Net Risk
Based on ACAPS specifications and FATF recommendations
"""

from typing import Dict, List, Optional, Tuple, Any
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import logging
import math
from dataclasses import dataclass

from app.models import (
    SupervisedEntity, EntityCategory, RiskScore, RiskLevel, ScoreType, 
    ScoringDomain, ScoringDomainAnalysis, User
)

logger = logging.getLogger(__name__)

@dataclass
class ScoringInput:
    """Input data structure for risk scoring"""
    entity_id: int
    questionnaire_data: Dict[str, Any]
    financial_metrics: Dict[str, float]
    operational_data: Dict[str, Any]
    regulatory_history: Dict[str, Any]
    analyst_notes: Optional[str] = None

@dataclass 
class DomainScore:
    """Domain-specific scoring result"""
    domain_code: str
    domain_name: str
    score: float
    weight: float
    weighted_score: float
    maturity_level: int
    findings: List[str]
    recommendations: List[str]

@dataclass
class RiskScoringResult:
    """Complete risk scoring result"""
    entity_id: int
    score_type: ScoreType
    final_score: float
    risk_level: RiskLevel
    domain_scores: List[DomainScore]
    calculation_details: Dict[str, Any]
    confidence_level: float
    warnings: List[str]

class RiskScoringEngine:
    """
    Core risk scoring engine implementing ACAPS methodology
    """
    
    # Risk level thresholds (0-100 scale)
    RISK_THRESHOLDS = {
        "critical": 80.0,
        "high": 60.0, 
        "medium": 40.0,
        "low": 0.0
    }
    
    # Default domain weights by entity category
    DEFAULT_DOMAIN_WEIGHTS = {
        EntityCategory.INSURANCE_COMPANY: {
            "ORG": 0.25,    # Organisation LBC/FT
            "CLASS": 0.30,  # Classification des risques
            "FILT": 0.25,   # Filtrage et surveillance
            "KYC": 0.20     # Connaissance client
        },
        EntityCategory.REINSURANCE_COMPANY: {
            "ORG": 0.30,
            "CLASS": 0.25,
            "FILT": 0.25,
            "KYC": 0.20
        },
        EntityCategory.INSURANCE_INTERMEDIARY: {
            "ORG": 0.20,
            "CLASS": 0.25,
            "FILT": 0.30,
            "KYC": 0.25
        }
    }
    
    def __init__(self, db: Session):
        self.db = db
        
    def calculate_inherent_risk(self, scoring_input: ScoringInput) -> RiskScoringResult:
        """
        Calculate inherent risk score (Risque inhérent)
        Based on entity characteristics and business environment
        """
        try:
            entity = self.db.query(SupervisedEntity).filter(
                SupervisedEntity.id == scoring_input.entity_id
            ).first()
            
            if not entity:
                raise ValueError(f"Entity {scoring_input.entity_id} not found")
            
            # Get scoring domains applicable to this entity type
            domains = self._get_applicable_domains(entity.category)
            domain_scores = []
            
            # Calculate score for each domain
            for domain in domains:
                domain_score = self._calculate_inherent_domain_score(
                    domain, entity, scoring_input
                )
                domain_scores.append(domain_score)
            
            # Calculate weighted final score
            final_score = self._calculate_weighted_score(domain_scores, entity.category)
            risk_level = self._determine_risk_level(final_score)
            
            # Generate calculation details
            calculation_details = {
                "methodology": "inherent_risk_assessment",
                "factors_considered": [
                    "business_size_complexity",
                    "geographical_exposure", 
                    "product_risk_profile",
                    "customer_base_risk",
                    "regulatory_history"
                ],
                "data_sources": ["questionnaire", "financial_statements", "regulatory_filings"],
                "calculation_timestamp": datetime.utcnow().isoformat()
            }
            
            # Assess confidence level
            confidence_level = self._assess_confidence_level(scoring_input, "inherent")
            
            # Generate warnings if needed
            warnings = self._generate_warnings(entity, domain_scores, "inherent")
            
            return RiskScoringResult(
                entity_id=scoring_input.entity_id,
                score_type=ScoreType.INHERENT_RISK,
                final_score=final_score,
                risk_level=risk_level,
                domain_scores=domain_scores,
                calculation_details=calculation_details,
                confidence_level=confidence_level,
                warnings=warnings
            )
            
        except Exception as e:
            logger.error(f"Error calculating inherent risk for entity {scoring_input.entity_id}: {str(e)}")
            raise

    def calculate_risk_management_device(self, scoring_input: ScoringInput) -> RiskScoringResult:
        """
        Calculate Risk Management Device score (Dispositif de maîtrise des risques)
        Based on control effectiveness and maturity
        """
        try:
            entity = self.db.query(SupervisedEntity).filter(
                SupervisedEntity.id == scoring_input.entity_id
            ).first()
            
            if not entity:
                raise ValueError(f"Entity {scoring_input.entity_id} not found")
            
            domains = self._get_applicable_domains(entity.category)
            domain_scores = []
            
            # Calculate DMR score for each domain
            for domain in domains:
                domain_score = self._calculate_dmr_domain_score(
                    domain, entity, scoring_input
                )
                domain_scores.append(domain_score)
            
            # Calculate weighted final score
            final_score = self._calculate_weighted_score(domain_scores, entity.category)
            risk_level = self._determine_risk_level(final_score)
            
            calculation_details = {
                "methodology": "control_maturity_assessment",
                "maturity_framework": "five_level_scale",
                "factors_considered": [
                    "governance_structure",
                    "policy_framework",
                    "operational_controls",
                    "monitoring_systems",
                    "staff_competency"
                ],
                "calculation_timestamp": datetime.utcnow().isoformat()
            }
            
            confidence_level = self._assess_confidence_level(scoring_input, "dmr")
            warnings = self._generate_warnings(entity, domain_scores, "dmr")
            
            return RiskScoringResult(
                entity_id=scoring_input.entity_id,
                score_type=ScoreType.RISK_MANAGEMENT_DEVICE,
                final_score=final_score,
                risk_level=risk_level,
                domain_scores=domain_scores,
                calculation_details=calculation_details,
                confidence_level=confidence_level,
                warnings=warnings
            )
            
        except Exception as e:
            logger.error(f"Error calculating DMR score for entity {scoring_input.entity_id}: {str(e)}")
            raise

    def calculate_net_risk(self, entity_id: int, analyst_id: int) -> RiskScoringResult:
        """
        Calculate Net Risk score (Risque net)
        Matrix calculation: Inherent Risk × Risk Management Device effectiveness
        """
        try:
            # Get latest inherent risk and DMR scores
            inherent_score = self._get_latest_score(entity_id, ScoreType.INHERENT_RISK)
            dmr_score = self._get_latest_score(entity_id, ScoreType.RISK_MANAGEMENT_DEVICE)
            
            if not inherent_score or not dmr_score:
                raise ValueError(
                    "Both inherent risk and DMR scores are required for net risk calculation"
                )
            
            # Net risk matrix calculation
            # Higher DMR score = better controls = lower net risk
            # Formula: Net Risk = Inherent Risk × (100 - DMR Score) / 100
            dmr_effectiveness = dmr_score.final_score / 100.0
            risk_mitigation_factor = 1.0 - dmr_effectiveness
            
            net_risk_score = inherent_score.final_score * (1.0 - dmr_effectiveness * 0.7)  # 70% max mitigation
            
            # Ensure score stays within bounds
            net_risk_score = max(0.0, min(100.0, net_risk_score))
            
            risk_level = self._determine_risk_level(net_risk_score)
            
            # Create combined domain scores
            combined_domains = self._combine_domain_scores(inherent_score, dmr_score)
            
            calculation_details = {
                "methodology": "net_risk_matrix",
                "inherent_risk_score": inherent_score.final_score,
                "dmr_score": dmr_score.final_score,
                "dmr_effectiveness": dmr_effectiveness,
                "mitigation_factor": risk_mitigation_factor,
                "formula": "Net Risk = Inherent Risk × (1 - DMR Effectiveness × 0.7)",
                "calculation_timestamp": datetime.utcnow().isoformat()
            }
            
            return RiskScoringResult(
                entity_id=entity_id,
                score_type=ScoreType.NET_RISK,
                final_score=net_risk_score,
                risk_level=risk_level,
                domain_scores=combined_domains,
                calculation_details=calculation_details,
                confidence_level=min(inherent_score.confidence_level, dmr_score.confidence_level),
                warnings=inherent_score.warnings + dmr_score.warnings
            )
            
        except Exception as e:
            logger.error(f"Error calculating net risk for entity {entity_id}: {str(e)}")
            raise

    def save_scoring_result(
        self, 
        result: RiskScoringResult, 
        analyst_id: int, 
        scoring_period: str = None
    ) -> RiskScore:
        """
        Save scoring result to database
        """
        try:
            # Mark previous scores as not current
            self.db.query(RiskScore).filter(
                RiskScore.entity_id == result.entity_id,
                RiskScore.score_type == result.score_type,
                RiskScore.is_current == True
            ).update({"is_current": False})
            
            # Create new risk score record
            risk_score = RiskScore(
                entity_id=result.entity_id,
                score_type=result.score_type,
                score_value=result.final_score,
                risk_level=result.risk_level,
                scoring_period=scoring_period or f"{datetime.utcnow().year}-Q{(datetime.utcnow().month - 1) // 3 + 1}",
                domain_scores={ds.domain_code: ds.score for ds in result.domain_scores},
                calculation_method="automatic" if result.confidence_level > 0.8 else "hybrid",
                weighting_factors={ds.domain_code: ds.weight for ds in result.domain_scores},
                base_indicators=result.calculation_details,
                analyst_comments="; ".join(result.warnings) if result.warnings else None,
                created_by=analyst_id,
                is_current=True
            )
            
            self.db.add(risk_score)
            self.db.flush()
            
            # Save domain analyses
            for domain_score in result.domain_scores:
                domain = self.db.query(ScoringDomain).filter(
                    ScoringDomain.domain_code == domain_score.domain_code
                ).first()
                
                if domain:
                    domain_analysis = ScoringDomainAnalysis(
                        risk_score_id=risk_score.id,
                        domain_id=domain.id,
                        domain_score=domain_score.score,
                        weight_applied=domain_score.weight,
                        weighted_score=domain_score.weighted_score,
                        findings="; ".join(domain_score.findings),
                        recommendations="; ".join(domain_score.recommendations),
                        maturity_level=domain_score.maturity_level,
                        analyst_id=analyst_id,
                        is_complete=True
                    )
                    self.db.add(domain_analysis)
            
            self.db.commit()
            return risk_score
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error saving scoring result: {str(e)}")
            raise

    # Private helper methods
    
    def _get_applicable_domains(self, entity_category: EntityCategory) -> List[ScoringDomain]:
        """Get scoring domains applicable to entity category"""
        return self.db.query(ScoringDomain).filter(
            ScoringDomain.is_active == True
        ).all()

    def _calculate_inherent_domain_score(
        self, 
        domain: ScoringDomain, 
        entity: SupervisedEntity, 
        scoring_input: ScoringInput
    ) -> DomainScore:
        """Calculate inherent risk score for a specific domain"""
        
        base_score = 50.0  # Start with medium risk
        findings = []
        recommendations = []
        
        # Domain-specific calculations
        if domain.domain_code == "ORG":
            score = self._score_organization_inherent(entity, scoring_input)
        elif domain.domain_code == "CLASS":  
            score = self._score_classification_inherent(entity, scoring_input)
        elif domain.domain_code == "FILT":
            score = self._score_filtering_inherent(entity, scoring_input)
        elif domain.domain_code == "KYC":
            score = self._score_kyc_inherent(entity, scoring_input)
        else:
            score = base_score
            
        # Get domain weight
        weight = self.DEFAULT_DOMAIN_WEIGHTS.get(entity.category, {}).get(domain.domain_code, 1.0)
        
        return DomainScore(
            domain_code=domain.domain_code,
            domain_name=domain.domain_name,
            score=score,
            weight=weight,
            weighted_score=score * weight,
            maturity_level=self._score_to_maturity_level(score),
            findings=findings,
            recommendations=recommendations
        )

    def _calculate_dmr_domain_score(
        self, 
        domain: ScoringDomain, 
        entity: SupervisedEntity, 
        scoring_input: ScoringInput
    ) -> DomainScore:
        """Calculate DMR score for a specific domain"""
        
        # Domain-specific DMR calculations
        if domain.domain_code == "ORG":
            score = self._score_organization_dmr(entity, scoring_input)
        elif domain.domain_code == "CLASS":
            score = self._score_classification_dmr(entity, scoring_input)
        elif domain.domain_code == "FILT":
            score = self._score_filtering_dmr(entity, scoring_input)
        elif domain.domain_code == "KYC":
            score = self._score_kyc_dmr(entity, scoring_input)
        else:
            score = 50.0
            
        weight = self.DEFAULT_DOMAIN_WEIGHTS.get(entity.category, {}).get(domain.domain_code, 1.0)
        
        return DomainScore(
            domain_code=domain.domain_code,
            domain_name=domain.domain_name,
            score=score,
            weight=weight,
            weighted_score=score * weight,
            maturity_level=self._score_to_maturity_level(score),
            findings=[],
            recommendations=[]
        )

    def _score_organization_inherent(self, entity: SupervisedEntity, input_data: ScoringInput) -> float:
        """Score organization domain for inherent risk"""
        score = 50.0
        
        # Entity size factor (larger = higher inherent risk)
        if entity.authorized_capital:
            if entity.authorized_capital > 1_000_000_000:  # > 1B MAD
                score += 15
            elif entity.authorized_capital > 500_000_000:  # > 500M MAD
                score += 10
            elif entity.authorized_capital > 100_000_000:  # > 100M MAD
                score += 5
        
        # Business complexity
        if entity.activities_authorized and len(entity.activities_authorized) > 3:
            score += 10
            
        # Category-specific adjustments
        if entity.category == EntityCategory.REINSURANCE_COMPANY:
            score += 10  # Higher inherent complexity
        elif entity.category == EntityCategory.INSURANCE_INTERMEDIARY:
            score += 5
            
        return min(100.0, max(0.0, score))

    def _score_organization_dmr(self, entity: SupervisedEntity, input_data: ScoringInput) -> float:
        """Score organization domain for DMR effectiveness"""
        score = 50.0
        
        # Check for LBC/FT organization indicators
        questionnaire = input_data.questionnaire_data
        
        if questionnaire.get("has_lbc_committee"):
            score += 15
        if questionnaire.get("dedicated_compliance_officer"):
            score += 10
        if questionnaire.get("written_lbc_policies"):
            score += 10
        if questionnaire.get("regular_training"):
            score += 10
        if questionnaire.get("board_oversight"):
            score += 5
            
        return min(100.0, max(0.0, score))

    def _score_classification_inherent(self, entity: SupervisedEntity, input_data: ScoringInput) -> float:
        """Score classification domain for inherent risk"""
        score = 40.0  # Start lower for classification
        
        # Risk indicators
        if entity.pep_exposure:
            score += 20
        if entity.foreign_clients_ratio and entity.foreign_clients_ratio > 0.3:
            score += 15
        if entity.cash_transactions_volume and entity.cash_transactions_volume > 10_000_000:
            score += 10
        if entity.high_risk_countries_exposure and entity.high_risk_countries_exposure > 0.1:
            score += 15
            
        return min(100.0, max(0.0, score))

    def _score_classification_dmr(self, entity: SupervisedEntity, input_data: ScoringInput) -> float:
        """Score classification domain for DMR effectiveness"""
        score = 50.0
        
        questionnaire = input_data.questionnaire_data
        
        if questionnaire.get("risk_assessment_methodology"):
            score += 20
        if questionnaire.get("customer_risk_rating"):
            score += 15
        if questionnaire.get("regular_risk_reviews"):
            score += 10
        if questionnaire.get("documented_risk_appetite"):
            score += 5
            
        return min(100.0, max(0.0, score))

    def _score_filtering_inherent(self, entity: SupervisedEntity, input_data: ScoringInput) -> float:
        """Score filtering domain for inherent risk"""
        score = 45.0
        
        # Transaction volume impact
        if entity.total_premiums_written and entity.total_premiums_written > 1_000_000_000:
            score += 15
        elif entity.total_premiums_written and entity.total_premiums_written > 500_000_000:
            score += 10
            
        # Product complexity
        if entity.activities_authorized:
            complex_products = ["vie", "capitalisation", "epargne"]
            if any(prod in entity.activities_authorized for prod in complex_products):
                score += 10
                
        return min(100.0, max(0.0, score))

    def _score_filtering_dmr(self, entity: SupervisedEntity, input_data: ScoringInput) -> float:
        """Score filtering domain for DMR effectiveness"""  
        score = 50.0
        
        questionnaire = input_data.questionnaire_data
        
        if questionnaire.get("automated_monitoring"):
            score += 20
        if questionnaire.get("sanctions_screening"):
            score += 15
        if questionnaire.get("transaction_thresholds"):
            score += 10
        if questionnaire.get("suspicious_activity_detection"):
            score += 10
        if questionnaire.get("timely_reporting"):
            score += 5
            
        return min(100.0, max(0.0, score))

    def _score_kyc_inherent(self, entity: SupervisedEntity, input_data: ScoringInput) -> float:
        """Score KYC domain for inherent risk"""
        score = 40.0
        
        # Customer base complexity
        if entity.foreign_clients_ratio and entity.foreign_clients_ratio > 0.2:
            score += 20
        if entity.pep_exposure:
            score += 15
            
        # Business model factors
        if entity.category == EntityCategory.INSURANCE_INTERMEDIARY:
            score += 10  # More direct customer interaction
            
        return min(100.0, max(0.0, score))

    def _score_kyc_dmr(self, entity: SupervisedEntity, input_data: ScoringInput) -> float:
        """Score KYC domain for DMR effectiveness"""
        score = 50.0
        
        questionnaire = input_data.questionnaire_data
        
        if questionnaire.get("customer_identification_procedures"):
            score += 15
        if questionnaire.get("beneficial_ownership_identification"):
            score += 15
        if questionnaire.get("enhanced_due_diligence"):
            score += 15
        if questionnaire.get("ongoing_monitoring"):
            score += 10
        if questionnaire.get("record_keeping_procedures"):
            score += 5
            
        return min(100.0, max(0.0, score))

    def _calculate_weighted_score(self, domain_scores: List[DomainScore], entity_category: EntityCategory) -> float:
        """Calculate weighted final score from domain scores"""
        total_weighted_score = sum(ds.weighted_score for ds in domain_scores)
        total_weight = sum(ds.weight for ds in domain_scores)
        
        if total_weight == 0:
            return 50.0  # Default middle score
            
        return total_weighted_score / total_weight

    def _determine_risk_level(self, score: float) -> RiskLevel:
        """Determine risk level from numeric score"""
        if score >= self.RISK_THRESHOLDS["critical"]:
            return RiskLevel.CRITICAL
        elif score >= self.RISK_THRESHOLDS["high"]:
            return RiskLevel.HIGH
        elif score >= self.RISK_THRESHOLDS["medium"]:
            return RiskLevel.MEDIUM
        else:
            return RiskLevel.LOW

    def _score_to_maturity_level(self, score: float) -> int:
        """Convert numeric score to 1-5 maturity level"""
        if score >= 80:
            return 5  # Optimisé
        elif score >= 65:
            return 4  # Géré
        elif score >= 45:
            return 3  # En développement
        elif score >= 25:
            return 2  # Initial
        else:
            return 1  # Inexistant

    def _assess_confidence_level(self, scoring_input: ScoringInput, score_type: str) -> float:
        """Assess confidence in scoring based on data completeness"""
        confidence = 0.5  # Base confidence
        
        # Data completeness factors
        if scoring_input.questionnaire_data:
            confidence += 0.2
        if scoring_input.financial_metrics:
            confidence += 0.1
        if scoring_input.operational_data:
            confidence += 0.1
        if scoring_input.regulatory_history:
            confidence += 0.1
            
        return min(1.0, confidence)

    def _generate_warnings(self, entity: SupervisedEntity, domain_scores: List[DomainScore], score_type: str) -> List[str]:
        """Generate warnings based on scoring results"""
        warnings = []
        
        # Check for high risk domains
        high_risk_domains = [ds for ds in domain_scores if ds.score >= 75]
        if high_risk_domains:
            warnings.append(f"High risk detected in domains: {', '.join([ds.domain_name for ds in high_risk_domains])}")
        
        # Check for data gaps
        if not entity.last_questionnaire_submission:
            warnings.append("No recent questionnaire data available")
        elif entity.last_questionnaire_submission < datetime.utcnow() - timedelta(days=365):
            warnings.append("Questionnaire data is older than 12 months")
            
        return warnings

    def _get_latest_score(self, entity_id: int, score_type: ScoreType) -> Optional[RiskScoringResult]:
        """Get latest score of specific type for entity"""
        score_record = (
            self.db.query(RiskScore)
            .filter(
                RiskScore.entity_id == entity_id,
                RiskScore.score_type == score_type,
                RiskScore.is_current == True
            )
            .order_by(RiskScore.scoring_date.desc())
            .first()
        )
        
        if not score_record:
            return None
            
        # Convert to RiskScoringResult format
        return RiskScoringResult(
            entity_id=entity_id,
            score_type=score_type,
            final_score=score_record.final_score,
            risk_level=score_record.risk_level,
            domain_scores=[],  # Would need to load from domain_analyses
            calculation_details=score_record.base_indicators or {},
            confidence_level=0.8,  # Default
            warnings=[]
        )

    def _combine_domain_scores(self, inherent: RiskScoringResult, dmr: RiskScoringResult) -> List[DomainScore]:
        """Combine inherent and DMR domain scores for net risk"""
        combined = []
        
        # Create a simple combination - in practice would be more sophisticated
        for inh_domain in inherent.domain_scores:
            dmr_domain = next(
                (d for d in dmr.domain_scores if d.domain_code == inh_domain.domain_code), 
                None
            )
            
            if dmr_domain:
                # Net score calculation per domain
                net_score = inh_domain.score * (1.0 - dmr_domain.score / 200.0)  # Simplified
                
                combined.append(DomainScore(
                    domain_code=inh_domain.domain_code,
                    domain_name=inh_domain.domain_name,
                    score=net_score,
                    weight=inh_domain.weight,
                    weighted_score=net_score * inh_domain.weight,
                    maturity_level=self._score_to_maturity_level(net_score),
                    findings=inh_domain.findings + dmr_domain.findings,
                    recommendations=inh_domain.recommendations + dmr_domain.recommendations
                ))
        
        return combined