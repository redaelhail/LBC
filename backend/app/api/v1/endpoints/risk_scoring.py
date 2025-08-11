from fastapi import APIRouter, HTTPException, Depends, Request
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from datetime import datetime
import logging

from app.database import get_db
from app.models import (
    SupervisedEntity, RiskScore, ScoreType, RiskLevel, ScoreStatus,
    ScoringDomain, ScoringDomainAnalysis, User, AuditLog
)
from app.core.auth import get_current_user
from app.core.permissions import require_analyst_or_above, require_compliance_officer_or_above
from app.services.risk_scoring_engine import RiskScoringEngine, ScoringInput

logger = logging.getLogger(__name__)
router = APIRouter()

# Pydantic Models
class RiskScoringRequest(BaseModel):
    entity_id: int
    score_type: ScoreType
    questionnaire_data: Dict[str, Any] = Field(default_factory=dict)
    financial_metrics: Dict[str, float] = Field(default_factory=dict)
    operational_data: Dict[str, Any] = Field(default_factory=dict)
    regulatory_history: Dict[str, Any] = Field(default_factory=dict)
    analyst_notes: Optional[str] = None
    scoring_period: Optional[str] = None

class ExpertAdjustmentRequest(BaseModel):
    adjustment: float = Field(..., ge=-100, le=100, description="Score adjustment (-100 to +100)")
    reason: str = Field(..., min_length=10, description="Justification for adjustment")

class RiskMatrixPosition(BaseModel):
    inherent_risk: float
    dmr_score: float
    net_risk: float
    risk_level: RiskLevel
    matrix_cell: str  # e.g., "H-M" for High Inherent, Medium DMR

class RiskScoreResponse(BaseModel):
    id: int
    entity_id: int
    score_type: ScoreType
    score_value: float
    final_score: float
    risk_level: RiskLevel
    scoring_date: datetime
    status: ScoreStatus
    domain_scores: Dict[str, float]
    analyst_comments: Optional[str]
    expert_adjustment: float
    is_current: bool
    matrix_position: Optional[RiskMatrixPosition] = None

class DomainAnalysisResponse(BaseModel):
    domain_name: str
    domain_code: str
    score: float
    maturity_level: int
    findings: Optional[str]
    recommendations: Optional[str]
    control_effectiveness: Optional[str]

# API Endpoints

@router.post("/calculate", response_model=Dict[str, Any])
async def calculate_risk_score(
    request: RiskScoringRequest,
    http_request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst_or_above)
) -> Dict[str, Any]:
    """
    Calculate risk score for an entity
    """
    try:
        # Verify entity exists
        entity = db.query(SupervisedEntity).filter(
            SupervisedEntity.id == request.entity_id
        ).first()
        if not entity:
            raise HTTPException(status_code=404, detail="Entity not found")
        
        # Initialize scoring engine
        engine = RiskScoringEngine(db)
        
        # Prepare scoring input
        scoring_input = ScoringInput(
            entity_id=request.entity_id,
            questionnaire_data=request.questionnaire_data,
            financial_metrics=request.financial_metrics,
            operational_data=request.operational_data,
            regulatory_history=request.regulatory_history,
            analyst_notes=request.analyst_notes
        )
        
        # Calculate score based on type
        if request.score_type == ScoreType.INHERENT_RISK:
            result = engine.calculate_inherent_risk(scoring_input)
        elif request.score_type == ScoreType.RISK_MANAGEMENT_DEVICE:
            result = engine.calculate_risk_management_device(scoring_input)
        elif request.score_type == ScoreType.NET_RISK:
            result = engine.calculate_net_risk(request.entity_id, current_user.id)
        else:
            raise HTTPException(status_code=400, detail="Invalid score type")
        
        # Save result to database
        saved_score = engine.save_scoring_result(
            result, 
            current_user.id, 
            request.scoring_period
        )
        
        # Log the action
        audit_log = AuditLog(
            user_id=current_user.id,
            action="CALCULATE_RISK_SCORE",
            resource=f"entity:{request.entity_id}",
            ip_address=http_request.client.host,
            user_agent=http_request.headers.get("user-agent"),
            extra_data={
                "score_type": request.score_type.value,
                "calculated_score": result.final_score,
                "risk_level": result.risk_level.value,
                "confidence_level": result.confidence_level
            }
        )
        db.add(audit_log)
        db.commit()
        
        # Calculate matrix position if net risk
        matrix_position = None
        if request.score_type == ScoreType.NET_RISK:
            matrix_position = await _calculate_matrix_position(request.entity_id, db)
        
        return {
            "message": "Risk score calculated successfully",
            "score_id": saved_score.id,
            "entity_id": request.entity_id,
            "score_type": request.score_type.value,
            "calculated_score": result.final_score,
            "risk_level": result.risk_level.value,
            "domain_scores": {ds.domain_code: ds.score for ds in result.domain_scores},
            "calculation_details": result.calculation_details,
            "confidence_level": result.confidence_level,
            "warnings": result.warnings,
            "matrix_position": matrix_position
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating risk score: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to calculate risk score")

@router.get("/entity/{entity_id}/scores", response_model=List[RiskScoreResponse])
async def get_entity_risk_scores(
    entity_id: int,
    score_type: Optional[ScoreType] = None,
    current_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst_or_above)
) -> List[RiskScoreResponse]:
    """
    Get risk scores for an entity
    """
    try:
        # Verify entity exists
        entity = db.query(SupervisedEntity).filter(
            SupervisedEntity.id == entity_id
        ).first()
        if not entity:
            raise HTTPException(status_code=404, detail="Entity not found")
        
        # Build query
        query = db.query(RiskScore).filter(RiskScore.entity_id == entity_id)
        
        if score_type:
            query = query.filter(RiskScore.score_type == score_type)
        
        if current_only:
            query = query.filter(RiskScore.is_current == True)
        
        scores = query.order_by(RiskScore.scoring_date.desc()).all()
        
        # Build response
        response = []
        for score in scores:
            # Calculate matrix position if needed
            matrix_position = None
            if score.score_type == ScoreType.NET_RISK:
                matrix_position = await _calculate_matrix_position(entity_id, db, score.scoring_date)
            
            response.append(RiskScoreResponse(
                id=score.id,
                entity_id=score.entity_id,
                score_type=score.score_type,
                score_value=score.score_value,
                final_score=score.final_score,
                risk_level=score.risk_level,
                scoring_date=score.scoring_date,
                status=score.status,
                domain_scores=score.domain_scores or {},
                analyst_comments=score.analyst_comments,
                expert_adjustment=score.expert_adjustment,
                is_current=score.is_current,
                matrix_position=matrix_position
            ))
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting entity risk scores: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve risk scores")

@router.get("/score/{score_id}/domains", response_model=List[DomainAnalysisResponse])
async def get_score_domain_analyses(
    score_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst_or_above)
) -> List[DomainAnalysisResponse]:
    """
    Get domain analyses for a specific risk score
    """
    try:
        # Verify score exists
        score = db.query(RiskScore).filter(RiskScore.id == score_id).first()
        if not score:
            raise HTTPException(status_code=404, detail="Risk score not found")
        
        # Get domain analyses
        analyses = (
            db.query(ScoringDomainAnalysis)
            .join(ScoringDomain)
            .filter(ScoringDomainAnalysis.risk_score_id == score_id)
            .all()
        )
        
        response = []
        for analysis in analyses:
            response.append(DomainAnalysisResponse(
                domain_name=analysis.domain.domain_name,
                domain_code=analysis.domain.domain_code,
                score=analysis.domain_score,
                maturity_level=analysis.maturity_level or 1,
                findings=analysis.findings,
                recommendations=analysis.recommendations,
                control_effectiveness=analysis.control_effectiveness
            ))
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting domain analyses: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve domain analyses")

@router.post("/score/{score_id}/expert-adjustment", response_model=Dict[str, Any])
async def apply_expert_adjustment(
    score_id: int,
    adjustment_request: ExpertAdjustmentRequest,
    http_request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_compliance_officer_or_above)
) -> Dict[str, Any]:
    """
    Apply expert adjustment to a risk score
    """
    try:
        # Get risk score
        score = db.query(RiskScore).filter(RiskScore.id == score_id).first()
        if not score:
            raise HTTPException(status_code=404, detail="Risk score not found")
        
        # Store original values
        original_adjustment = score.expert_adjustment
        original_final_score = score.final_score
        
        # Apply adjustment
        score.expert_adjustment = adjustment_request.adjustment
        score.adjustment_reason = adjustment_request.reason
        score.adjusted_by = current_user.id
        score.adjustment_date = datetime.utcnow()
        
        # Recalculate risk level if needed
        new_final_score = score.final_score
        if new_final_score >= 80:
            score.risk_level = RiskLevel.CRITICAL
        elif new_final_score >= 60:
            score.risk_level = RiskLevel.HIGH
        elif new_final_score >= 40:
            score.risk_level = RiskLevel.MEDIUM
        else:
            score.risk_level = RiskLevel.LOW
        
        # Log the action
        audit_log = AuditLog(
            user_id=current_user.id,
            action="EXPERT_ADJUSTMENT",
            resource=f"risk_score:{score_id}",
            ip_address=http_request.client.host,
            user_agent=http_request.headers.get("user-agent"),
            extra_data={
                "entity_id": score.entity_id,
                "original_adjustment": original_adjustment,
                "new_adjustment": adjustment_request.adjustment,
                "adjustment_reason": adjustment_request.reason,
                "original_final_score": original_final_score,
                "new_final_score": new_final_score
            }
        )
        db.add(audit_log)
        db.commit()
        
        return {
            "message": "Expert adjustment applied successfully",
            "score_id": score_id,
            "original_score": score.score_value,
            "adjustment": adjustment_request.adjustment,
            "final_score": score.final_score,
            "new_risk_level": score.risk_level.value,
            "adjusted_by": current_user.full_name,
            "adjustment_date": score.adjustment_date
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error applying expert adjustment: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to apply expert adjustment")

@router.post("/score/{score_id}/approve", response_model=Dict[str, Any])
async def approve_risk_score(
    score_id: int,
    http_request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_compliance_officer_or_above)
) -> Dict[str, Any]:
    """
    Approve a risk score
    """
    try:
        score = db.query(RiskScore).filter(RiskScore.id == score_id).first()
        if not score:
            raise HTTPException(status_code=404, detail="Risk score not found")
        
        if score.status == ScoreStatus.APPROVED:
            raise HTTPException(status_code=400, detail="Score is already approved")
        
        # Update status
        score.status = ScoreStatus.APPROVED
        score.approved_by = current_user.id
        score.approval_date = datetime.utcnow()
        
        # Log the action
        audit_log = AuditLog(
            user_id=current_user.id,
            action="APPROVE_RISK_SCORE",
            resource=f"risk_score:{score_id}",
            ip_address=http_request.client.host,
            extra_data={
                "entity_id": score.entity_id,
                "score_type": score.score_type.value,
                "final_score": score.final_score
            }
        )
        db.add(audit_log)
        db.commit()
        
        return {
            "message": "Risk score approved successfully",
            "score_id": score_id,
            "approved_by": current_user.full_name,
            "approval_date": score.approval_date
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error approving risk score: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to approve risk score")

@router.get("/matrix/{entity_id}", response_model=Dict[str, Any])
async def get_risk_matrix(
    entity_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst_or_above)
) -> Dict[str, Any]:
    """
    Get risk matrix visualization data for an entity
    """
    try:
        # Get latest scores
        inherent_score = (
            db.query(RiskScore)
            .filter(
                RiskScore.entity_id == entity_id,
                RiskScore.score_type == ScoreType.INHERENT_RISK,
                RiskScore.is_current == True
            )
            .order_by(RiskScore.scoring_date.desc())
            .first()
        )
        
        dmr_score = (
            db.query(RiskScore)
            .filter(
                RiskScore.entity_id == entity_id,
                RiskScore.score_type == ScoreType.RISK_MANAGEMENT_DEVICE,
                RiskScore.is_current == True
            )
            .order_by(RiskScore.scoring_date.desc())
            .first()
        )
        
        net_score = (
            db.query(RiskScore)
            .filter(
                RiskScore.entity_id == entity_id,
                RiskScore.score_type == ScoreType.NET_RISK,
                RiskScore.is_current == True
            )
            .order_by(RiskScore.scoring_date.desc())
            .first()
        )
        
        # Calculate matrix position
        matrix_data = {
            "entity_id": entity_id,
            "has_complete_assessment": bool(inherent_score and dmr_score),
            "inherent_risk": {
                "score": inherent_score.final_score if inherent_score else None,
                "level": inherent_score.risk_level.value if inherent_score else None,
                "date": inherent_score.scoring_date if inherent_score else None
            },
            "dmr_score": {
                "score": dmr_score.final_score if dmr_score else None,
                "level": dmr_score.risk_level.value if dmr_score else None,
                "date": dmr_score.scoring_date if dmr_score else None
            },
            "net_risk": {
                "score": net_score.final_score if net_score else None,
                "level": net_score.risk_level.value if net_score else None,
                "date": net_score.scoring_date if net_score else None
            }
        }
        
        # Generate matrix visualization data
        if inherent_score and dmr_score:
            matrix_data["matrix_position"] = _generate_matrix_visualization(
                inherent_score.final_score,
                dmr_score.final_score,
                net_score.final_score if net_score else None
            )
        
        return matrix_data
        
    except Exception as e:
        logger.error(f"Error getting risk matrix: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get risk matrix")

@router.get("/domains", response_model=List[Dict[str, Any]])
async def get_scoring_domains(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst_or_above)
) -> List[Dict[str, Any]]:
    """
    Get all available scoring domains
    """
    try:
        domains = db.query(ScoringDomain).filter(ScoringDomain.is_active == True).all()
        
        response = []
        for domain in domains:
            response.append({
                "id": domain.id,
                "domain_name": domain.domain_name,
                "domain_code": domain.domain_code,
                "description": domain.description,
                "category": domain.category,
                "default_weight": domain.default_weight,
                "applicable_entity_types": domain.applicable_entity_types,
                "scoring_criteria": domain.scoring_criteria,
                "maturity_scale": domain.maturity_scale
            })
        
        return response
        
    except Exception as e:
        logger.error(f"Error getting scoring domains: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get scoring domains")

# Helper Functions

async def _calculate_matrix_position(entity_id: int, db: Session, as_of_date: datetime = None) -> Optional[RiskMatrixPosition]:
    """Calculate risk matrix position for an entity"""
    try:
        # Get scores around the specified date
        date_filter = as_of_date or datetime.utcnow()
        
        inherent = (
            db.query(RiskScore)
            .filter(
                RiskScore.entity_id == entity_id,
                RiskScore.score_type == ScoreType.INHERENT_RISK,
                RiskScore.scoring_date <= date_filter
            )
            .order_by(RiskScore.scoring_date.desc())
            .first()
        )
        
        dmr = (
            db.query(RiskScore)
            .filter(
                RiskScore.entity_id == entity_id,
                RiskScore.score_type == ScoreType.RISK_MANAGEMENT_DEVICE,
                RiskScore.scoring_date <= date_filter
            )
            .order_by(RiskScore.scoring_date.desc())
            .first()
        )
        
        net = (
            db.query(RiskScore)
            .filter(
                RiskScore.entity_id == entity_id,
                RiskScore.score_type == ScoreType.NET_RISK,
                RiskScore.scoring_date <= date_filter
            )
            .order_by(RiskScore.scoring_date.desc())
            .first()
        )
        
        if not (inherent and dmr):
            return None
        
        # Determine matrix cell position
        inherent_level = _score_to_level_abbrev(inherent.final_score)
        dmr_level = _score_to_level_abbrev(dmr.final_score)
        matrix_cell = f"{inherent_level}-{dmr_level}"
        
        return RiskMatrixPosition(
            inherent_risk=inherent.final_score,
            dmr_score=dmr.final_score,
            net_risk=net.final_score if net else 0.0,
            risk_level=net.risk_level if net else RiskLevel.MEDIUM,
            matrix_cell=matrix_cell
        )
        
    except Exception:
        return None

def _score_to_level_abbrev(score: float) -> str:
    """Convert score to abbreviated risk level"""
    if score >= 80:
        return "C"  # Critical
    elif score >= 60:
        return "H"  # High
    elif score >= 40:
        return "M"  # Medium
    else:
        return "L"  # Low

def _generate_matrix_visualization(inherent_score: float, dmr_score: float, net_score: Optional[float]) -> Dict[str, Any]:
    """Generate matrix visualization data"""
    return {
        "inherent_position": {
            "x": inherent_score,
            "y": 0,
            "label": f"Inherent: {inherent_score:.1f}"
        },
        "dmr_position": {
            "x": 0,
            "y": dmr_score,
            "label": f"DMR: {dmr_score:.1f}"
        },
        "net_position": {
            "x": inherent_score,
            "y": dmr_score,
            "value": net_score,
            "label": f"Net: {net_score:.1f}" if net_score else "Net: Not calculated"
        },
        "matrix_cell": f"{_score_to_level_abbrev(inherent_score)}-{_score_to_level_abbrev(dmr_score)}",
        "visualization_data": {
            "inherent_risk_axis": {"min": 0, "max": 100, "label": "Risque Inhérent"},
            "dmr_axis": {"min": 0, "max": 100, "label": "Dispositif de Maîtrise des Risques"},
            "risk_zones": [
                {"zone": "low", "color": "#22c55e", "range": [0, 40]},
                {"zone": "medium", "color": "#eab308", "range": [40, 60]},
                {"zone": "high", "color": "#f97316", "range": [60, 80]},
                {"zone": "critical", "color": "#ef4444", "range": [80, 100]}
            ]
        }
    }