from fastapi import APIRouter, HTTPException, Depends, Request, Query
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_, func
from datetime import datetime, date
import logging

from app.database import get_db
from app.models import (
    SupervisedEntity, EntityCategory, EntityStatus, EntityDirector, 
    EntityLBCContact, RiskScore, RiskLevel, User, AuditLog
)
from app.core.auth import get_current_user
from app.core.permissions import require_analyst_or_above, require_compliance_officer_or_above, require_admin
from app.services.elasticsearch_service import elasticsearch_service

logger = logging.getLogger(__name__)
router = APIRouter()

# Pydantic Models for Request/Response
class EntityDirectorCreate(BaseModel):
    full_name: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    national_id: Optional[str] = None
    position_title: str
    is_effective_director: bool = False
    appointment_date: datetime
    email: Optional[str] = None
    phone: Optional[str] = None
    responsibilities: Optional[str] = None

class EntityLBCContactCreate(BaseModel):
    full_name: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: str
    phone: str
    position_title: str
    is_primary_contact: bool = False
    is_compliance_officer: bool = False
    appointment_date: datetime
    responsibilities: Optional[str] = None

class SupervisedEntityCreate(BaseModel):
    denomination: str
    commercial_name: Optional[str] = None
    category: EntityCategory
    registration_number: Optional[str] = None
    tax_id: Optional[str] = None
    legal_form: Optional[str] = None
    incorporation_date: Optional[datetime] = None
    headquarters_address: Optional[str] = None
    city: Optional[str] = None
    authorized_capital: Optional[float] = None
    paid_capital: Optional[float] = None
    activities_authorized: Optional[List[str]] = None
    license_number: Optional[str] = None
    notes: Optional[str] = None

class SupervisedEntityUpdate(BaseModel):
    denomination: Optional[str] = None
    commercial_name: Optional[str] = None
    category: Optional[EntityCategory] = None
    registration_number: Optional[str] = None
    tax_id: Optional[str] = None
    legal_form: Optional[str] = None
    incorporation_date: Optional[datetime] = None
    headquarters_address: Optional[str] = None
    city: Optional[str] = None
    authorized_capital: Optional[float] = None
    paid_capital: Optional[float] = None
    activities_authorized: Optional[List[str]] = None
    license_number: Optional[str] = None
    status: Optional[EntityStatus] = None
    notes: Optional[str] = None
    # Financial metrics
    total_premiums_written: Optional[float] = None
    total_claims_paid: Optional[float] = None
    technical_reserves: Optional[float] = None
    solvency_ratio: Optional[float] = None
    # Risk indicators
    pep_exposure: Optional[bool] = None
    foreign_clients_ratio: Optional[float] = None
    cash_transactions_volume: Optional[float] = None
    high_risk_countries_exposure: Optional[float] = None

class EntityResponse(BaseModel):
    id: int
    denomination: str
    commercial_name: Optional[str]
    category: EntityCategory
    registration_number: Optional[str]
    status: EntityStatus
    created_at: datetime
    current_risk_level: Optional[RiskLevel] = None
    directors_count: int = 0
    lbc_contacts_count: int = 0

    class Config:
        from_attributes = True

class EntityDetailResponse(BaseModel):
    id: int
    denomination: str
    commercial_name: Optional[str]
    category: EntityCategory
    registration_number: Optional[str]
    tax_id: Optional[str]
    headquarters_address: Optional[str]
    city: Optional[str]
    status: EntityStatus
    authorized_capital: Optional[float]
    paid_capital: Optional[float]
    activities_authorized: Optional[List[str]]
    license_number: Optional[str]
    # Risk indicators
    pep_exposure: Optional[bool]
    foreign_clients_ratio: Optional[float]
    cash_transactions_volume: Optional[float]
    high_risk_countries_exposure: Optional[float]
    # Metadata
    created_at: datetime
    updated_at: datetime
    notes: Optional[str]
    # Relationships
    directors: List[Dict[str, Any]] = []
    lbc_contacts: List[Dict[str, Any]] = []
    current_risk_score: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True

# API Endpoints

@router.get("/", response_model=Dict[str, Any])
async def list_entities(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    category: Optional[EntityCategory] = None,
    status: Optional[EntityStatus] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst_or_above)
) -> Dict[str, Any]:
    """
    List supervised entities with filtering and pagination
    """
    try:
        # Build base query
        query = db.query(SupervisedEntity)
        
        # Apply filters
        if category:
            query = query.filter(SupervisedEntity.category == category)
        
        if status:
            query = query.filter(SupervisedEntity.status == status)
        
        if search:
            search_filter = or_(
                SupervisedEntity.denomination.ilike(f"%{search}%"),
                SupervisedEntity.commercial_name.ilike(f"%{search}%"),
                SupervisedEntity.registration_number.ilike(f"%{search}%"),
                SupervisedEntity.tax_id.ilike(f"%{search}%")
            )
            query = query.filter(search_filter)
        
        # Get total count
        total = query.count()
        
        # Apply pagination and get results
        entities = query.order_by(SupervisedEntity.denomination.asc()).offset(skip).limit(limit).all()
        
        # Enhance with additional data
        entity_responses = []
        for entity in entities:
            # Get current risk score
            current_risk_score = (
                db.query(RiskScore)
                .filter(RiskScore.entity_id == entity.id, RiskScore.is_current == True)
                .order_by(RiskScore.scoring_date.desc())
                .first()
            )
            
            entity_data = {
                "id": entity.id,
                "denomination": entity.denomination,
                "commercial_name": entity.commercial_name,
                "category": entity.category,
                "registration_number": entity.registration_number,
                "status": entity.status,
                "created_at": entity.created_at,
                "current_risk_level": current_risk_score.risk_level if current_risk_score else None,
                "directors_count": len(entity.directors),
                "lbc_contacts_count": len(entity.lbc_contacts)
            }
            entity_responses.append(entity_data)
        
        # Log the action
        audit_log = AuditLog(
            user_id=current_user.id,
            action="LIST_ENTITIES",
            resource=f"entities",
            extra_data={
                "filters": {
                    "category": category.value if category else None,
                    "status": status.value if status else None,
                    "search": search
                },
                "results_count": len(entity_responses),
                "total": total
            }
        )
        db.add(audit_log)
        db.commit()
        
        return {
            "entities": entity_responses,
            "total": total,
            "skip": skip,
            "limit": limit,
            "filters": {
                "category": category,
                "status": status,
                "search": search
            }
        }
        
    except Exception as e:
        logger.error(f"Error listing entities: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve entities")

@router.post("/", response_model=EntityDetailResponse)
async def create_entity(
    entity_data: SupervisedEntityCreate,
    http_request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_compliance_officer_or_above)
) -> SupervisedEntity:
    """
    Create a new supervised entity
    """
    try:
        # Check for duplicate registration number
        if entity_data.registration_number:
            existing = db.query(SupervisedEntity).filter(
                SupervisedEntity.registration_number == entity_data.registration_number
            ).first()
            if existing:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Entity with registration number {entity_data.registration_number} already exists"
                )
        
        # Create entity
        db_entity = SupervisedEntity(
            **entity_data.model_dump(exclude_unset=True),
            created_by=current_user.id
        )
        
        db.add(db_entity)
        db.flush()  # Get the ID
        
        # Log the action
        audit_log = AuditLog(
            user_id=current_user.id,
            action="CREATE_ENTITY",
            resource=f"entity:{db_entity.id}",
            ip_address=http_request.client.host,
            user_agent=http_request.headers.get("user-agent"),
            extra_data={
                "entity_data": entity_data.model_dump(exclude_unset=True)
            }
        )
        db.add(audit_log)
        db.commit()
        
        # Refresh to get relationships
        db.refresh(db_entity)
        
        # Index in Elasticsearch for search
        try:
            entity_dict = _build_entity_detail_response(db_entity, db)
            await elasticsearch_service.index_entity(entity_dict)
            logger.info(f"Entity {db_entity.id} indexed in Elasticsearch")
        except Exception as e:
            logger.error(f"Failed to index entity {db_entity.id} in Elasticsearch: {str(e)}")
            # Continue without failing the request
        
        return _build_entity_detail_response(db_entity, db)
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating entity: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create entity")

@router.get("/{entity_id}", response_model=EntityDetailResponse)
async def get_entity(
    entity_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst_or_above)
) -> SupervisedEntity:
    """
    Get detailed information about a supervised entity
    """
    try:
        # Get entity with relationships
        entity = (
            db.query(SupervisedEntity)
            .options(
                joinedload(SupervisedEntity.directors),
                joinedload(SupervisedEntity.lbc_contacts),
                joinedload(SupervisedEntity.risk_scores)
            )
            .filter(SupervisedEntity.id == entity_id)
            .first()
        )
        
        if not entity:
            raise HTTPException(status_code=404, detail="Entity not found")
        
        # Log access
        audit_log = AuditLog(
            user_id=current_user.id,
            action="VIEW_ENTITY",
            resource=f"entity:{entity_id}"
        )
        db.add(audit_log)
        db.commit()
        
        return _build_entity_detail_response(entity, db)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting entity {entity_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve entity")

@router.put("/{entity_id}", response_model=EntityDetailResponse)
async def update_entity(
    entity_id: int,
    entity_data: SupervisedEntityUpdate,
    http_request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_compliance_officer_or_above)
) -> SupervisedEntity:
    """
    Update a supervised entity
    """
    try:
        entity = db.query(SupervisedEntity).filter(SupervisedEntity.id == entity_id).first()
        if not entity:
            raise HTTPException(status_code=404, detail="Entity not found")
        
        # Store original data for audit
        original_data = {
            "denomination": entity.denomination,
            "category": entity.category.value,
            "status": entity.status.value
        }
        
        # Update fields
        update_data = entity_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(entity, field, value)
        
        # Log the action
        audit_log = AuditLog(
            user_id=current_user.id,
            action="UPDATE_ENTITY",
            resource=f"entity:{entity_id}",
            ip_address=http_request.client.host,
            user_agent=http_request.headers.get("user-agent"),
            extra_data={
                "original_data": original_data,
                "updated_data": update_data
            }
        )
        db.add(audit_log)
        db.commit()
        
        # Reindex in Elasticsearch after update
        try:
            entity_dict = _build_entity_detail_response(entity, db)
            await elasticsearch_service.update_entity(entity_dict)
            logger.info(f"Entity {entity_id} reindexed in Elasticsearch")
        except Exception as e:
            logger.error(f"Failed to reindex entity {entity_id} in Elasticsearch: {str(e)}")
            # Continue without failing the request
        
        return _build_entity_detail_response(entity, db)
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating entity {entity_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update entity")

@router.delete("/{entity_id}")
async def delete_entity(
    entity_id: int,
    http_request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
) -> Dict[str, Any]:
    """
    Delete a supervised entity (soft delete by changing status)
    """
    try:
        entity = db.query(SupervisedEntity).filter(SupervisedEntity.id == entity_id).first()
        if not entity:
            raise HTTPException(status_code=404, detail="Entity not found")
        
        # Soft delete - change status instead of actual deletion
        entity.status = EntityStatus.INACTIVE
        
        # Log the action
        audit_log = AuditLog(
            user_id=current_user.id,
            action="DELETE_ENTITY",
            resource=f"entity:{entity_id}",
            ip_address=http_request.client.host,
            user_agent=http_request.headers.get("user-agent"),
            extra_data={
                "entity_denomination": entity.denomination
            }
        )
        db.add(audit_log)
        db.commit()
        
        return {"message": "Entity deactivated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting entity {entity_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete entity")

# Director Management Endpoints

@router.post("/{entity_id}/directors", response_model=Dict[str, Any])
async def add_director(
    entity_id: int,
    director_data: EntityDirectorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_compliance_officer_or_above)
) -> Dict[str, Any]:
    """
    Add a director to an entity
    """
    try:
        # Verify entity exists
        entity = db.query(SupervisedEntity).filter(SupervisedEntity.id == entity_id).first()
        if not entity:
            raise HTTPException(status_code=404, detail="Entity not found")
        
        # Create director
        director = EntityDirector(
            **director_data.model_dump(),
            entity_id=entity_id
        )
        
        db.add(director)
        db.commit()
        db.refresh(director)
        
        return {
            "message": "Director added successfully",
            "director_id": director.id,
            "director": {
                "id": director.id,
                "full_name": director.full_name,
                "position_title": director.position_title,
                "is_effective_director": director.is_effective_director,
                "appointment_date": director.appointment_date,
                "is_active": director.is_active
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error adding director to entity {entity_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to add director")

@router.post("/{entity_id}/lbc-contacts", response_model=Dict[str, Any])
async def add_lbc_contact(
    entity_id: int,
    contact_data: EntityLBCContactCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_compliance_officer_or_above)
) -> Dict[str, Any]:
    """
    Add an LBC/FT contact to an entity
    """
    try:
        # Verify entity exists
        entity = db.query(SupervisedEntity).filter(SupervisedEntity.id == entity_id).first()
        if not entity:
            raise HTTPException(status_code=404, detail="Entity not found")
        
        # Create contact
        contact = EntityLBCContact(
            **contact_data.model_dump(),
            entity_id=entity_id
        )
        
        db.add(contact)
        db.commit()
        db.refresh(contact)
        
        return {
            "message": "LBC/FT contact added successfully",
            "contact_id": contact.id,
            "contact": contact.contact_summary
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error adding LBC contact to entity {entity_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to add LBC contact")

@router.get("/statistics/overview")
async def get_entities_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst_or_above)
) -> Dict[str, Any]:
    """
    Get overview statistics for supervised entities
    """
    try:
        # Basic counts
        total_entities = db.query(SupervisedEntity).count()
        active_entities = db.query(SupervisedEntity).filter(SupervisedEntity.status == EntityStatus.ACTIVE).count()
        
        # By category
        category_stats = (
            db.query(SupervisedEntity.category, func.count(SupervisedEntity.id))
            .group_by(SupervisedEntity.category)
            .all()
        )
        
        # By status
        status_stats = (
            db.query(SupervisedEntity.status, func.count(SupervisedEntity.id))
            .group_by(SupervisedEntity.status)
            .all()
        )
        
        # Risk distribution (entities with risk scores)
        risk_distribution = (
            db.query(RiskScore.risk_level, func.count(func.distinct(RiskScore.entity_id)))
            .filter(RiskScore.is_current == True)
            .group_by(RiskScore.risk_level)
            .all()
        )
        
        return {
            "total_entities": total_entities,
            "active_entities": active_entities,
            "category_distribution": {str(cat): count for cat, count in category_stats},
            "status_distribution": {str(status): count for status, count in status_stats},
            "risk_distribution": {str(risk): count for risk, count in risk_distribution},
            "entities_with_risk_scores": sum(count for _, count in risk_distribution),
            "entities_without_risk_scores": total_entities - sum(count for _, count in risk_distribution)
        }
        
    except Exception as e:
        logger.error(f"Error getting entities statistics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get statistics")

# Helper Functions

def _build_entity_detail_response(entity: SupervisedEntity, db: Session) -> Dict[str, Any]:
    """Build detailed entity response with all related data"""
    
    # Get current risk score
    current_risk_score = (
        db.query(RiskScore)
        .filter(RiskScore.entity_id == entity.id, RiskScore.is_current == True)
        .order_by(RiskScore.scoring_date.desc())
        .first()
    )
    
    # Format directors
    directors = []
    for director in entity.directors:
        directors.append({
            "id": director.id,
            "full_name": director.full_name,
            "position_title": director.position_title,
            "is_effective_director": director.is_effective_director,
            "appointment_date": director.appointment_date,
            "is_active": director.is_active,
            "tenure_years": director.tenure_years,
            "risk_flags": director.risk_flags
        })
    
    # Format LBC contacts
    lbc_contacts = []
    for contact in entity.lbc_contacts:
        lbc_contacts.append({
            "id": contact.id,
            "full_name": contact.full_name,
            "position_title": contact.position_title,
            "email": contact.email,
            "phone": contact.phone,
            "is_primary_contact": contact.is_primary_contact,
            "is_compliance_officer": contact.is_compliance_officer,
            "certification_status": contact.certification_status,
            "training_status": contact.training_status
        })
    
    # Format current risk score
    risk_score_data = None
    if current_risk_score:
        risk_score_data = {
            "id": current_risk_score.id,
            "score_type": current_risk_score.score_type.value,
            "score_value": current_risk_score.final_score,
            "risk_level": current_risk_score.risk_level.value,
            "scoring_date": current_risk_score.scoring_date,
            "domain_scores": current_risk_score.domain_scores,
            "status": current_risk_score.status.value
        }
    
    return {
        "id": entity.id,
        "denomination": entity.denomination,
        "commercial_name": entity.commercial_name,
        "category": entity.category.value,
        "registration_number": entity.registration_number,
        "tax_id": entity.tax_id,
        "headquarters_address": entity.headquarters_address,
        "city": entity.city,
        "status": entity.status.value,
        "authorized_capital": entity.authorized_capital,
        "paid_capital": entity.paid_capital,
        "activities_authorized": entity.activities_authorized,
        "license_number": entity.license_number,
        "pep_exposure": entity.pep_exposure,
        "foreign_clients_ratio": entity.foreign_clients_ratio,
        "cash_transactions_volume": entity.cash_transactions_volume,
        "high_risk_countries_exposure": entity.high_risk_countries_exposure,
        "created_at": entity.created_at,
        "updated_at": entity.updated_at,
        "notes": entity.notes,
        "directors": directors,
        "lbc_contacts": lbc_contacts,
        "current_risk_score": risk_score_data,
        "key_metrics": entity.key_financial_metrics,
        "risk_indicators": entity.risk_indicators
    }