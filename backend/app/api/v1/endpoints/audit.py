# backend/app/api/v1/endpoints/audit.py
"""
Audit Trail API Endpoints
Provides comprehensive audit logging and compliance tracking
"""

from fastapi import APIRouter, HTTPException, Depends, Request, Query
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.audit_log import AuditLog
from app.models.user import User
from app.core.auth import get_current_user
from app.core.permissions import require_admin
from app.services.audit_service import get_audit_service, AuditService

router = APIRouter()

class AuditLogResponse(BaseModel):
    id: int
    user_id: int
    action: str
    category: str
    resource: Optional[str]
    resource_type: Optional[str]
    ip_address: Optional[str]
    user_agent: Optional[str]
    success: bool
    risk_level: str
    timestamp: datetime
    extra_data: Optional[Dict[str, Any]]
    user_email: Optional[str]

class SecurityEventResponse(BaseModel):
    id: int
    user_id: int
    action: str
    category: str
    ip_address: Optional[str]
    success: bool
    risk_level: str
    timestamp: datetime
    details: Optional[str]

@router.get("/audit-logs")
async def get_audit_logs(
    start_date: Optional[datetime] = Query(None, description="Start date for filtering"),
    end_date: Optional[datetime] = Query(None, description="End date for filtering"),
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    category: Optional[str] = Query(None, description="Filter by category"),
    action: Optional[str] = Query(None, description="Filter by action"),
    risk_level: Optional[str] = Query(None, description="Filter by risk level"),
    limit: int = Query(100, le=1000, description="Maximum number of records"),
    offset: int = Query(0, description="Number of records to skip"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
) -> Dict[str, Any]:
    """
    Get audit logs with comprehensive filtering options
    Requires admin permissions
    """
    try:
        # Build query
        query = db.query(AuditLog).join(User, AuditLog.user_id == User.id)
        
        # Apply filters
        if start_date:
            query = query.filter(AuditLog.timestamp >= start_date)
        if end_date:
            query = query.filter(AuditLog.timestamp <= end_date)
        if user_id:
            query = query.filter(AuditLog.user_id == user_id)
        if category:
            query = query.filter(AuditLog.category == category)
        if action:
            query = query.filter(AuditLog.action == action)
        if risk_level:
            query = query.filter(AuditLog.risk_level == risk_level)
        
        # Get total count
        total = query.count()
        
        # Apply pagination and ordering
        logs = query.order_by(AuditLog.timestamp.desc()).offset(offset).limit(limit).all()
        
        # Format response
        items = []
        for log in logs:
            items.append(AuditLogResponse(
                id=log.id,
                user_id=log.user_id,
                action=log.action,
                category=log.category,
                resource=log.resource,
                resource_type=log.resource_type,
                ip_address=log.ip_address,
                user_agent=log.user_agent,
                success=log.success,
                risk_level=log.risk_level,
                timestamp=log.timestamp,
                extra_data=log.extra_data,
                user_email=log.user.email if log.user else None
            ))
        
        return {
            "items": items,
            "total": total,
            "limit": limit,
            "offset": offset,
            "has_more": total > offset + limit
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve audit logs: {str(e)}")

@router.get("/user-activity/{user_id}")
async def get_user_activity(
    user_id: int,
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    limit: int = Query(50, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get activity history for a specific user
    Users can only see their own activity unless they're admin
    """
    try:
        # Check permissions
        if current_user.role not in ['admin_technique', 'admin_fonctionnel'] and current_user.id != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        audit_service = get_audit_service(db)
        logs = audit_service.get_user_activity(
            user_id=user_id,
            start_date=start_date,
            end_date=end_date,
            limit=limit
        )
        
        items = []
        for log in logs:
            items.append({
                "id": log.id,
                "action": log.action,
                "category": log.category,
                "resource": log.resource,
                "resource_type": log.resource_type,
                "success": log.success,
                "risk_level": log.risk_level,
                "timestamp": log.timestamp,
                "extra_data": log.extra_data
            })
        
        return {
            "user_id": user_id,
            "items": items,
            "total": len(items)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve user activity: {str(e)}")

@router.get("/security-events")
async def get_security_events(
    hours: int = Query(24, description="Hours to look back"),
    risk_level: Optional[str] = Query(None, description="Filter by risk level"),
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
) -> Dict[str, Any]:
    """
    Get security events for monitoring
    Requires admin permissions
    """
    try:
        audit_service = get_audit_service(db)
        start_date = datetime.utcnow() - timedelta(hours=hours)
        
        logs = audit_service.get_security_events(
            start_date=start_date,
            risk_level=risk_level,
            limit=limit
        )
        
        events = []
        for log in logs:
            events.append(SecurityEventResponse(
                id=log.id,
                user_id=log.user_id,
                action=log.action,
                category=log.category,
                ip_address=log.ip_address,
                success=log.success,
                risk_level=log.risk_level,
                timestamp=log.timestamp,
                details=f"{log.resource_type}: {log.resource}" if log.resource else None
            ))
        
        return {
            "events": events,
            "total": len(events),
            "time_range_hours": hours,
            "generated_at": datetime.utcnow()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve security events: {str(e)}")

@router.get("/failed-attempts")
async def get_failed_attempts(
    hours: int = Query(24, description="Hours to look back"),
    ip_address: Optional[str] = Query(None, description="Filter by IP address"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
) -> Dict[str, Any]:
    """
    Get failed authentication attempts for security monitoring
    Requires admin permissions
    """
    try:
        audit_service = get_audit_service(db)
        failed_attempts = audit_service.get_failed_attempts(
            hours=hours,
            ip_address=ip_address
        )
        
        attempts = []
        for attempt in failed_attempts:
            attempts.append({
                "id": attempt.id,
                "user_id": attempt.user_id,
                "action": attempt.action,
                "ip_address": attempt.ip_address,
                "user_agent": attempt.user_agent,
                "timestamp": attempt.timestamp,
                "extra_data": attempt.extra_data
            })
        
        return {
            "failed_attempts": attempts,
            "total": len(attempts),
            "time_range_hours": hours,
            "ip_filter": ip_address
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve failed attempts: {str(e)}")

@router.get("/analytics")
async def get_audit_analytics(
    days: int = Query(30, description="Days to analyze"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
) -> Dict[str, Any]:
    """
    Get audit analytics for compliance reporting
    Requires admin permissions
    """
    try:
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Activity by category
        category_stats = db.query(
            AuditLog.category,
            db.func.count(AuditLog.id).label('count')
        ).filter(
            AuditLog.timestamp >= start_date
        ).group_by(AuditLog.category).all()
        
        # Activity by risk level
        risk_stats = db.query(
            AuditLog.risk_level,
            db.func.count(AuditLog.id).label('count')
        ).filter(
            AuditLog.timestamp >= start_date
        ).group_by(AuditLog.risk_level).all()
        
        # Daily activity
        daily_stats = db.query(
            db.func.date(AuditLog.timestamp).label('date'),
            db.func.count(AuditLog.id).label('count')
        ).filter(
            AuditLog.timestamp >= start_date
        ).group_by(db.func.date(AuditLog.timestamp)).all()
        
        # Failed attempts
        failed_count = db.query(AuditLog).filter(
            AuditLog.timestamp >= start_date,
            AuditLog.success == False
        ).count()
        
        # Most active users
        user_stats = db.query(
            AuditLog.user_id,
            User.email,
            db.func.count(AuditLog.id).label('count')
        ).join(User).filter(
            AuditLog.timestamp >= start_date
        ).group_by(AuditLog.user_id, User.email).order_by(
            db.func.count(AuditLog.id).desc()
        ).limit(10).all()
        
        return {
            "period_days": days,
            "category_distribution": [{"category": cat, "count": count} for cat, count in category_stats],
            "risk_distribution": [{"risk_level": risk, "count": count} for risk, count in risk_stats],
            "daily_activity": [{"date": str(date), "count": count} for date, count in daily_stats],
            "failed_attempts_total": failed_count,
            "most_active_users": [
                {"user_id": user_id, "email": email, "activity_count": count} 
                for user_id, email, count in user_stats
            ],
            "generated_at": datetime.utcnow()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate audit analytics: {str(e)}")