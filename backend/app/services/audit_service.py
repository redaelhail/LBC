# backend/app/services/audit_service.py
"""
Enhanced Audit Service for Comprehensive Compliance Tracking
Logs all user actions, security events, and system activities for regulatory compliance
"""

import logging
import json
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from fastapi import Request
import re
import hashlib

from app.models.audit_log import AuditLog
from app.models.user import User

logger = logging.getLogger(__name__)

class AuditService:
    """Enhanced audit service for comprehensive compliance tracking"""
    
    # Action categories for better organization
    CATEGORIES = {
        'AUTHENTICATION': ['LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'PASSWORD_CHANGE', 'SESSION_EXPIRED'],
        'SEARCH': ['SEARCH_INDIVIDUAL', 'SEARCH_BATCH', 'SEARCH_ADVANCED', 'SEARCH_FAILED'],
        'DATA_EXPORT': ['EXPORT_PDF', 'EXPORT_CSV', 'EXPORT_JSON', 'DOWNLOAD_TEMPLATE'],
        'USER_MANAGEMENT': ['CREATE_USER', 'UPDATE_USER', 'DELETE_USER', 'ROLE_CHANGE'],
        'SECURITY': ['BLACKLIST_ADD', 'BLACKLIST_REMOVE', 'SUSPICIOUS_ACTIVITY', 'ACCESS_DENIED'],
        'SYSTEM': ['SYSTEM_START', 'SYSTEM_STOP', 'DATA_SYNC', 'BACKUP_CREATED']
    }
    
    # Risk levels for different actions
    RISK_LEVELS = {
        'HIGH': ['DELETE_USER', 'ROLE_CHANGE', 'BLACKLIST_REMOVE', 'SUSPICIOUS_ACTIVITY', 'LOGIN_FAILED'],
        'MEDIUM': ['CREATE_USER', 'UPDATE_USER', 'BLACKLIST_ADD', 'EXPORT_PDF', 'ACCESS_DENIED'],
        'LOW': ['LOGIN', 'LOGOUT', 'SEARCH_INDIVIDUAL', 'SEARCH_BATCH', 'EXPORT_CSV']
    }
    
    def __init__(self, db: Session):
        self.db = db
    
    def log_action(
        self,
        user_id: int,
        action: str,
        request: Request = None,
        resource: str = None,
        resource_type: str = None,
        success: bool = True,
        extra_data: Dict[str, Any] = None,
        session_id: str = None
    ) -> AuditLog:
        """
        Log a user action with comprehensive tracking
        
        Args:
            user_id: ID of the user performing the action
            action: The action being performed (e.g., 'LOGIN', 'SEARCH', 'EXPORT')
            request: FastAPI request object for extracting IP, user agent, etc.
            resource: The resource being acted upon (entity ID, query, etc.)
            resource_type: Type of resource (ENTITY, SEARCH, USER, etc.)
            success: Whether the action was successful
            extra_data: Additional context data
            session_id: Session identifier
        
        Returns:
            Created AuditLog instance
        """
        try:
            # Determine category
            category = self._get_category(action)
            
            # Determine risk level
            risk_level = self._get_risk_level(action)
            
            # Extract IP and MAC address
            ip_address = self._extract_ip_address(request)
            mac_address = self._extract_mac_address(request)
            
            # Extract user agent
            user_agent = request.headers.get("user-agent") if request else None
            
            # Sanitize extra data
            if extra_data:
                extra_data = self._sanitize_extra_data(extra_data)
            
            # Create audit log entry (with fallback for missing fields)
            audit_data = {
                "user_id": user_id,
                "action": action,
                "resource": resource,
                "ip_address": ip_address,
                "user_agent": user_agent,
                "extra_data": extra_data,
                "timestamp": datetime.utcnow()
            }
            
            # Add enhanced fields if they exist in the model
            try:
                audit_data.update({
                    "category": category,
                    "resource_type": resource_type,
                    "mac_address": mac_address,
                    "session_id": session_id,
                    "success": success,
                    "risk_level": risk_level
                })
            except:
                # If enhanced fields don't exist, just use basic fields
                pass
                
            audit_log = AuditLog(**audit_data)
            
            self.db.add(audit_log)
            self.db.commit()
            
            # Log to application logs for monitoring
            log_level = logging.WARNING if not success or risk_level == 'HIGH' else logging.INFO
            logger.log(
                log_level,
                f"AUDIT: User {user_id} performed {action} on {resource_type or 'system'} "
                f"from IP {ip_address} - {'SUCCESS' if success else 'FAILED'}"
            )
            
            return audit_log
            
        except Exception as e:
            logger.error(f"Failed to create audit log: {str(e)}")
            # Don't fail the main operation if audit logging fails
            return None
    
    def log_authentication(
        self,
        user_id: Optional[int],
        action: str,
        request: Request,
        username: str = None,
        success: bool = True,
        failure_reason: str = None
    ) -> AuditLog:
        """Log authentication events with enhanced security tracking"""
        extra_data = {
            'username': username,
            'failure_reason': failure_reason,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        return self.log_action(
            user_id=user_id or 0,  # Use 0 for failed logins where user_id is unknown
            action=action,
            request=request,
            resource=username,
            resource_type='USER',
            success=success,
            extra_data=extra_data
        )
    
    def log_search(
        self,
        user_id: int,
        query: str,
        search_type: str,
        results_count: int,
        request: Request,
        filters: Dict[str, Any] = None,
        execution_time: float = None
    ) -> AuditLog:
        """Log search activities with detailed parameters"""
        extra_data = {
            'query': query[:100],  # Truncate long queries
            'search_type': search_type,
            'results_count': results_count,
            'filters': filters,
            'execution_time_ms': execution_time,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        return self.log_action(
            user_id=user_id,
            action=f'SEARCH_{search_type.upper()}',
            request=request,
            resource=query,
            resource_type='SEARCH',
            success=True,
            extra_data=extra_data
        )
    
    def log_export(
        self,
        user_id: int,
        export_type: str,
        resource: str,
        request: Request,
        record_count: int = None,
        file_size: int = None
    ) -> AuditLog:
        """Log data export activities for compliance tracking"""
        extra_data = {
            'export_type': export_type,
            'record_count': record_count,
            'file_size_bytes': file_size,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        return self.log_action(
            user_id=user_id,
            action=f'EXPORT_{export_type.upper()}',
            request=request,
            resource=resource,
            resource_type='EXPORT',
            success=True,
            extra_data=extra_data
        )
    
    def log_blacklist_action(
        self,
        user_id: int,
        action: str,
        entity_id: str,
        entity_name: str,
        request: Request,
        reason: str = None
    ) -> AuditLog:
        """Log blacklist management actions for security tracking"""
        extra_data = {
            'entity_name': entity_name,
            'reason': reason,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        return self.log_action(
            user_id=user_id,
            action=f'BLACKLIST_{action.upper()}',
            request=request,
            resource=entity_id,
            resource_type='ENTITY',
            success=True,
            extra_data=extra_data
        )
    
    def get_user_activity(
        self,
        user_id: int,
        start_date: datetime = None,
        end_date: datetime = None,
        limit: int = 100
    ) -> List[AuditLog]:
        """Get user activity history for personal workspace"""
        query = self.db.query(AuditLog).filter(AuditLog.user_id == user_id)
        
        if start_date:
            query = query.filter(AuditLog.timestamp >= start_date)
        if end_date:
            query = query.filter(AuditLog.timestamp <= end_date)
        
        return query.order_by(AuditLog.timestamp.desc()).limit(limit).all()
    
    def get_security_events(
        self,
        start_date: datetime = None,
        risk_level: str = None,
        limit: int = 100
    ) -> List[AuditLog]:
        """Get security events for monitoring"""
        query = self.db.query(AuditLog).filter(
            AuditLog.category.in_(['AUTHENTICATION', 'SECURITY'])
        )
        
        if start_date:
            query = query.filter(AuditLog.timestamp >= start_date)
        if risk_level:
            query = query.filter(AuditLog.risk_level == risk_level)
        
        return query.order_by(AuditLog.timestamp.desc()).limit(limit).all()
    
    def get_failed_attempts(
        self,
        hours: int = 24,
        ip_address: str = None
    ) -> List[AuditLog]:
        """Get failed authentication attempts for security monitoring"""
        since = datetime.utcnow() - timedelta(hours=hours)
        query = self.db.query(AuditLog).filter(
            AuditLog.success == False,
            AuditLog.timestamp >= since
        )
        
        if ip_address:
            query = query.filter(AuditLog.ip_address == ip_address)
        
        return query.order_by(AuditLog.timestamp.desc()).all()
    
    def _get_category(self, action: str) -> str:
        """Determine the category for an action"""
        for category, actions in self.CATEGORIES.items():
            if action in actions:
                return category
        return 'SYSTEM'  # Default category
    
    def _get_risk_level(self, action: str) -> str:
        """Determine the risk level for an action"""
        for level, actions in self.RISK_LEVELS.items():
            if action in actions:
                return level
        return 'LOW'  # Default risk level
    
    def _extract_ip_address(self, request: Request) -> Optional[str]:
        """Extract the real IP address from the request"""
        if not request:
            return None
        
        # Check for forwarded headers first
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip
        
        # Fallback to client IP
        return getattr(request.client, 'host', None)
    
    def _extract_mac_address(self, request: Request) -> Optional[str]:
        """Extract MAC address from request headers (if available)"""
        if not request:
            return None
        
        # Some networks/proxies may include MAC address in custom headers
        mac_header = request.headers.get("x-mac-address")
        if mac_header:
            return mac_header
        
        # Generate a session-based identifier as fallback
        try:
            if hasattr(request, 'session') and request.session:
                session_data = str(request.session.get('user_id', '')) + str(request.headers.get('user-agent', ''))
                return hashlib.md5(session_data.encode()).hexdigest()[:12]
        except (AttributeError, RuntimeError):
            # Session middleware not available, skip MAC address extraction
            pass
        
        return None
    
    def _sanitize_extra_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Sanitize extra data to prevent logging sensitive information"""
        sanitized = {}
        sensitive_keys = ['password', 'token', 'secret', 'key', 'credential']
        
        for key, value in data.items():
            if any(sensitive in key.lower() for sensitive in sensitive_keys):
                sanitized[key] = "[REDACTED]"
            elif isinstance(value, str) and len(value) > 1000:
                sanitized[key] = value[:1000] + "..."
            else:
                sanitized[key] = value
        
        return sanitized

# Global audit service instance
audit_service = None

def get_audit_service(db: Session) -> AuditService:
    """Get audit service instance"""
    return AuditService(db)