# backend/app/core/permissions.py
from functools import wraps
from fastapi import HTTPException, status, Depends
from app.models.user import User, UserRole
from app.core.auth import get_current_user

def require_role(allowed_roles: list[UserRole]):
    """Decorator to require specific user roles"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, current_user: User = Depends(get_current_user), **kwargs):
            if current_user.role not in allowed_roles:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access denied. Required roles: {[role.value for role in allowed_roles]}"
                )
            return await func(*args, current_user=current_user, **kwargs)
        return wrapper
    return decorator

# Role-based permission dependencies
async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Require admin role"""
    if current_user.role != UserRole.ADMIN.value and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user

async def require_compliance_officer_or_above(current_user: User = Depends(get_current_user)) -> User:
    """Require compliance officer role or higher"""
    allowed_roles = [UserRole.ADMIN.value, UserRole.COMPLIANCE_OFFICER.value]
    if current_user.role not in allowed_roles and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Compliance officer privileges or higher required"
        )
    return current_user

async def require_analyst_or_above(current_user: User = Depends(get_current_user)) -> User:
    """Require analyst role or higher"""
    allowed_roles = [UserRole.ADMIN.value, UserRole.COMPLIANCE_OFFICER.value, UserRole.ANALYST.value]
    if current_user.role not in allowed_roles and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Analyst privileges or higher required"
        )
    return current_user

# Permission checking functions
def can_export_reports(user: User) -> bool:
    """Check if user can export reports"""
    return user.role in [UserRole.ADMIN.value, UserRole.COMPLIANCE_OFFICER.value] or user.is_superuser

def can_manage_users(user: User) -> bool:
    """Check if user can manage other users"""
    return user.role == UserRole.ADMIN.value or user.is_superuser

def can_view_audit_logs(user: User) -> bool:
    """Check if user can view audit logs"""
    return user.role == UserRole.ADMIN.value or user.is_superuser

def can_search_entities(user: User) -> bool:
    """Check if user can search entities"""
    return user.role in [UserRole.ADMIN.value, UserRole.COMPLIANCE_OFFICER.value, UserRole.ANALYST.value] or user.is_superuser

def can_star_entities(user: User) -> bool:
    """Check if user can star/bookmark entities"""
    return user.role in [UserRole.ADMIN.value, UserRole.COMPLIANCE_OFFICER.value, UserRole.ANALYST.value] or user.is_superuser