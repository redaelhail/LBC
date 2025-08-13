# backend/app/api/v1/endpoints/auth.py
from datetime import timedelta, datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import Dict, Any
from pydantic import BaseModel, EmailStr
import logging

from app.core.auth import (
    authenticate_user, 
    create_access_token, 
    get_password_hash,
    get_current_user,
    get_current_active_superuser
)
from app.core.config import settings
from app.database import get_db
from app.models.user import User, UserRole
from app.models.audit_log import AuditLog
from app.services.audit_service import get_audit_service

logger = logging.getLogger(__name__)
router = APIRouter()

class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str
    full_name: str
    role: str = "viewer"
    organization: str = ""
    department: str = ""

class UserUpdate(BaseModel):
    email: EmailStr = None
    username: str = None
    full_name: str = None
    role: str = None
    organization: str = None
    department: str = None
    is_active: bool = None
    is_superuser: bool = None

class PasswordChangeRequest(BaseModel):
    old_password: str
    new_password: str

class ProfileUpdate(BaseModel):
    full_name: str = None
    organization: str = None
    department: str = None

class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    full_name: str
    role: str
    organization: str | None
    department: str | None
    is_active: bool
    is_superuser: bool
    created_at: datetime
    last_login: datetime | None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class LoginRequest(BaseModel):
    email: str
    password: str

def log_audit_action(
    db: Session, 
    user_id: int, 
    action: str, 
    resource: str = None,
    ip_address: str = None,
    user_agent: str = None,
    extra_data: dict = None
):
    """Log audit action for compliance"""
    audit_log = AuditLog(
        user_id=user_id,
        action=action,
        resource=resource,
        ip_address=ip_address,
        user_agent=user_agent,
        extra_data=extra_data
    )
    db.add(audit_log)
    db.commit()

@router.post("/register", response_model=UserResponse)
async def register(
    user_data: UserCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_superuser)  # Only admins can create users
) -> UserResponse:
    """Register a new user (admin only)"""
    
    # Check if user exists
    existing_user = db.query(User).filter(
        (User.email == user_data.email) | (User.username == user_data.username)
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email or username already exists"
        )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        email=user_data.email,
        username=user_data.username,
        hashed_password=hashed_password,
        full_name=user_data.full_name,
        role=user_data.role,
        organization=user_data.organization,
        department=user_data.department
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Log audit action
    log_audit_action(
        db=db,
        user_id=current_user.id,
        action="CREATE_USER",
        resource=f"user:{new_user.id}",
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent"),
        extra_data={
            "created_user_email": new_user.email,
            "created_user_role": new_user.role
        }
    )
    
    return new_user

@router.post("/login", response_model=Token)
async def login(
    login_data: LoginRequest,
    request: Request,
    db: Session = Depends(get_db)
) -> Token:
    """Authenticate user and return access token"""
    
    user = authenticate_user(db, login_data.email, login_data.password)
    if not user:
        # Log failed login attempt with enhanced audit service
        try:
            audit_service = get_audit_service(db)
            audit_service.log_authentication(
                user_id=None,
                action="LOGIN_FAILED",
                request=request,
                username=login_data.email,
                success=False,
                failure_reason="invalid_credentials"
            )
        except Exception as audit_error:
            logger.warning(f"Enhanced audit logging failed for failed login: {str(audit_error)}")
            # Fallback to basic logging
            try:
                log_audit_action(
                    db=db,
                    user_id=None,
                    action="LOGIN_FAILED",
                    resource=login_data.email,
                    ip_address=request.client.host,
                    user_agent=request.headers.get("user-agent"),
                    extra_data={"reason": "invalid_credentials"}
                )
            except Exception as fallback_error:
                logger.error(f"Both enhanced and basic audit logging failed: {str(fallback_error)}")
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=user.id, expires_delta=access_token_expires
    )
    
    # Log successful login with enhanced audit service
    try:
        audit_service = get_audit_service(db)
        audit_service.log_authentication(
            user_id=user.id,
            action="LOGIN_SUCCESS",
            request=request,
            username=user.email,
            success=True
        )
    except Exception as audit_error:
        logger.warning(f"Enhanced audit logging failed for successful login: {str(audit_error)}")
        # Fallback to basic logging
        try:
            log_audit_action(
                db=db,
                user_id=user.id,
                action="LOGIN_SUCCESS",
                ip_address=request.client.host,
                user_agent=request.headers.get("user-agent")
            )
        except Exception as fallback_error:
            logger.error(f"Both enhanced and basic audit logging failed: {str(fallback_error)}")
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.from_orm(user)
    )

@router.post("/logout")
async def logout(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, str]:
    """Logout user (log audit action)"""
    
    # Log logout with enhanced audit service
    try:
        audit_service = get_audit_service(db)
        audit_service.log_authentication(
            user_id=current_user.id,
            action="LOGOUT",
            request=request,
            username=current_user.email,
            success=True
        )
    except Exception as audit_error:
        logger.warning(f"Enhanced audit logging failed for logout: {str(audit_error)}")
        # Fallback to basic logging
        try:
            log_audit_action(
                db=db,
                user_id=current_user.id,
                action="LOGOUT",
                ip_address=request.client.host,
                user_agent=request.headers.get("user-agent")
            )
        except Exception as fallback_error:
            logger.error(f"Both enhanced and basic audit logging failed: {str(fallback_error)}")
    
    return {"message": "Successfully logged out"}

@router.get("/debug-admin")
async def debug_admin_user(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Debug endpoint to check admin user status (temporary)"""
    try:
        admin_email = "admin@sanctionsguard.com"
        admin_password = "admin123"
        
        # Check if admin user exists
        admin_user = db.query(User).filter(User.email == admin_email).first()
        
        if not admin_user:
            # Create admin user if it doesn't exist
            from app.core.auth import get_password_hash
            
            admin_user = User(
                username="admin",
                email=admin_email,
                hashed_password=get_password_hash(admin_password),
                full_name="System Administrator",
                role="admin",
                is_superuser=True,
                is_active=True
            )
            
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)
            
            return {
                "status": "admin_user_created",
                "message": "Admin user was created",
                "email": admin_email,
                "password": admin_password,
                "user_id": admin_user.id
            }
        else:
            from app.core.auth import verify_password
            password_valid = verify_password(admin_password, admin_user.hashed_password)
            
            return {
                "status": "admin_user_exists",
                "message": "Admin user exists",
                "email": admin_email,
                "password": admin_password,
                "user_id": admin_user.id,
                "is_active": admin_user.is_active,
                "is_superuser": admin_user.is_superuser,
                "role": admin_user.role,
                "password_valid": password_valid
            }
            
    except Exception as e:
        return {
            "status": "error",
            "message": f"Debug failed: {str(e)}"
        }

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
) -> UserResponse:
    """Get current user information"""
    return current_user

@router.get("/users", response_model=list[UserResponse])
async def list_users(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_active_superuser),
    db: Session = Depends(get_db)
) -> list[UserResponse]:
    """List all users (admin only)"""
    
    users = db.query(User).offset(skip).limit(limit).all()
    return users

@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_update: UserUpdate,
    request: Request,
    current_user: User = Depends(get_current_active_superuser),
    db: Session = Depends(get_db)
) -> UserResponse:
    """Update user (admin only)"""
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Store old values for audit
    old_values = {
        "email": user.email,
        "username": user.username,
        "role": user.role,
        "is_active": user.is_active,
        "is_superuser": user.is_superuser
    }
    
    # Update user fields only if provided
    update_data = user_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        if hasattr(user, field):
            setattr(user, field, value)
    
    db.commit()
    db.refresh(user)
    
    # Log audit action
    changes = {}
    for field, old_value in old_values.items():
        new_value = getattr(user, field)
        if old_value != new_value:
            changes[field] = {"old": old_value, "new": new_value}
    
    log_audit_action(
        db=db,
        user_id=current_user.id,
        action="UPDATE_USER",
        resource=f"user:{user.id}",
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent"),
        extra_data={
            "updated_user_email": user.email,
            "changes": changes
        }
    )
    
    return user

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    request: Request,
    current_user: User = Depends(get_current_active_superuser),
    db: Session = Depends(get_db)
) -> Dict[str, str]:
    """Deactivate user (admin only) - we don't actually delete for audit purposes"""
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate your own account"
        )
    
    # Deactivate instead of delete
    user.is_active = False
    db.commit()
    
    # Log audit action
    log_audit_action(
        db=db,
        user_id=current_user.id,
        action="DEACTIVATE_USER",
        resource=f"user:{user.id}",
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent"),
        extra_data={"deactivated_user_email": user.email}
    )
    
    return {"message": f"User {user.email} has been deactivated"}

@router.get("/audit-logs")
async def get_audit_logs(
    skip: int = 0,
    limit: int = 100,
    action: str = None,
    user_id: int = None,
    current_user: User = Depends(get_current_active_superuser),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Get audit logs (admin only)"""
    
    query = db.query(AuditLog)
    
    if action:
        query = query.filter(AuditLog.action == action)
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    
    total = query.count()
    logs = query.order_by(AuditLog.timestamp.desc()).offset(skip).limit(limit).all()
    
    return {
        "total": total,
        "logs": [
            {
                "id": log.id,
                "user_id": log.user_id,
                "user_email": log.user.email if log.user else None,
                "action": log.action,
                "resource": log.resource,
                "ip_address": log.ip_address,
                "user_agent": log.user_agent,
                "metadata": log.extra_data,
                "timestamp": log.timestamp.isoformat()
            }
            for log in logs
        ]
    }

# User Profile Management Endpoints

@router.put("/profile", response_model=UserResponse)
async def update_profile(
    profile_update: ProfileUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> UserResponse:
    """Update current user's profile"""
    
    # Store old values for audit
    old_values = {
        "full_name": current_user.full_name,
        "organization": current_user.organization,
        "department": current_user.department
    }
    
    # Update profile fields only if provided
    update_data = profile_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        if hasattr(current_user, field):
            setattr(current_user, field, value)
    
    db.commit()
    db.refresh(current_user)
    
    # Log audit action
    changes = {}
    for field, old_value in old_values.items():
        new_value = getattr(current_user, field)
        if old_value != new_value:
            changes[field] = {"old": old_value, "new": new_value}
    
    log_audit_action(
        db=db,
        user_id=current_user.id,
        action="UPDATE_PROFILE",
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent"),
        extra_data={"changes": changes}
    )
    
    return current_user

@router.post("/change-password")
async def change_password(
    password_change: PasswordChangeRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, str]:
    """Change current user's password"""
    
    # Verify old password
    from app.core.auth import verify_password
    if not verify_password(password_change.old_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Update password
    current_user.hashed_password = get_password_hash(password_change.new_password)
    db.commit()
    
    # Log audit action
    log_audit_action(
        db=db,
        user_id=current_user.id,
        action="CHANGE_PASSWORD",
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent")
    )
    
    return {"message": "Password changed successfully"}

# User Management Endpoints (Admin only)

@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    current_user: User = Depends(get_current_active_superuser),
    db: Session = Depends(get_db)
) -> UserResponse:
    """Get user by ID (admin only)"""
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user

@router.post("/users/{user_id}/activate")
async def activate_user(
    user_id: int,
    request: Request,
    current_user: User = Depends(get_current_active_superuser),
    db: Session = Depends(get_db)
) -> Dict[str, str]:
    """Activate user account (admin only)"""
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if user.is_active:
        return {"message": f"User {user.email} is already active"}
    
    user.is_active = True
    db.commit()
    
    # Log audit action
    log_audit_action(
        db=db,
        user_id=current_user.id,
        action="ACTIVATE_USER",
        resource=f"user:{user.id}",
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent"),
        extra_data={"activated_user_email": user.email}
    )
    
    return {"message": f"User {user.email} has been activated"}

@router.post("/users/{user_id}/deactivate")
async def deactivate_user(
    user_id: int,
    request: Request,
    current_user: User = Depends(get_current_active_superuser),
    db: Session = Depends(get_db)
) -> Dict[str, str]:
    """Deactivate user account (admin only)"""
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate your own account"
        )
    
    if not user.is_active:
        return {"message": f"User {user.email} is already inactive"}
    
    user.is_active = False
    db.commit()
    
    # Log audit action
    log_audit_action(
        db=db,
        user_id=current_user.id,
        action="DEACTIVATE_USER",
        resource=f"user:{user.id}",
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent"),
        extra_data={"deactivated_user_email": user.email}
    )
    
    return {"message": f"User {user.email} has been deactivated"}

@router.post("/users/{user_id}/reset-password")
async def reset_user_password(
    user_id: int,
    new_password: str,
    request: Request,
    current_user: User = Depends(get_current_active_superuser),
    db: Session = Depends(get_db)
) -> Dict[str, str]:
    """Reset user password (admin only)"""
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update password
    user.hashed_password = get_password_hash(new_password)
    db.commit()
    
    # Log audit action
    log_audit_action(
        db=db,
        user_id=current_user.id,
        action="RESET_USER_PASSWORD",
        resource=f"user:{user.id}",
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent"),
        extra_data={"reset_user_email": user.email}
    )
    
    return {"message": f"Password reset for user {user.email}"}

@router.get("/users/{user_id}/activity")
async def get_user_activity(
    user_id: int,
    limit: int = 50,
    current_user: User = Depends(get_current_active_superuser),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Get user activity logs (admin only)"""
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Get user's audit logs
    logs = db.query(AuditLog).filter(
        AuditLog.user_id == user_id
    ).order_by(AuditLog.timestamp.desc()).limit(limit).all()
    
    # Get user's search history
    from app.models.search_history import SearchHistory
    searches = db.query(SearchHistory).filter(
        SearchHistory.user_id == user_id
    ).order_by(SearchHistory.created_at.desc()).limit(20).all()
    
    return {
        "user": UserResponse.from_orm(user),
        "audit_logs": [
            {
                "id": log.id,
                "action": log.action,
                "resource": log.resource,
                "ip_address": log.ip_address,
                "timestamp": log.timestamp.isoformat(),
                "metadata": log.extra_data
            }
            for log in logs
        ],
        "recent_searches": [
            {
                "id": search.id,
                "query": search.query,
                "search_type": search.search_type,
                "results_count": search.results_count,
                "risk_level": search.risk_level,
                "created_at": search.created_at.isoformat()
            }
            for search in searches
        ]
    }

# Bulk User Operations

@router.post("/users/bulk-activate")
async def bulk_activate_users(
    user_ids: list[int],
    request: Request,
    current_user: User = Depends(get_current_active_superuser),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Bulk activate multiple users (admin only)"""
    
    users = db.query(User).filter(User.id.in_(user_ids)).all()
    
    activated_users = []
    already_active = []
    
    for user in users:
        if not user.is_active:
            user.is_active = True
            activated_users.append(user.email)
        else:
            already_active.append(user.email)
    
    if activated_users:
        db.commit()
        
        # Log audit action
        log_audit_action(
            db=db,
            user_id=current_user.id,
            action="BULK_ACTIVATE_USERS",
            ip_address=request.client.host,
            user_agent=request.headers.get("user-agent"),
            extra_data={
                "activated_users": activated_users,
                "count": len(activated_users)
            }
        )
    
    return {
        "activated": activated_users,
        "already_active": already_active,
        "activated_count": len(activated_users)
    }

@router.post("/users/bulk-deactivate")
async def bulk_deactivate_users(
    user_ids: list[int],
    request: Request,
    current_user: User = Depends(get_current_active_superuser),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Bulk deactivate multiple users (admin only)"""
    
    # Prevent self-deactivation
    if current_user.id in user_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate your own account"
        )
    
    users = db.query(User).filter(User.id.in_(user_ids)).all()
    
    deactivated_users = []
    already_inactive = []
    
    for user in users:
        if user.is_active:
            user.is_active = False
            deactivated_users.append(user.email)
        else:
            already_inactive.append(user.email)
    
    if deactivated_users:
        db.commit()
        
        # Log audit action
        log_audit_action(
            db=db,
            user_id=current_user.id,
            action="BULK_DEACTIVATE_USERS",
            ip_address=request.client.host,
            user_agent=request.headers.get("user-agent"),
            extra_data={
                "deactivated_users": deactivated_users,
                "count": len(deactivated_users)
            }
        )
    
    return {
        "deactivated": deactivated_users,
        "already_inactive": already_inactive,
        "deactivated_count": len(deactivated_users)
    }