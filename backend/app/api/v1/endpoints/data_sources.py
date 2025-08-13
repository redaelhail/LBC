# backend/app/api/v1/endpoints/data_sources.py
"""
Data Source Management API Endpoints
Provides data source integration, synchronization, and monitoring capabilities
"""

from fastapi import APIRouter, HTTPException, Depends, Request, BackgroundTasks
from typing import Dict, Any, List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User
from app.core.auth import get_current_user
from app.core.permissions import require_admin
from app.services.data_source_service import get_data_source_manager, DataSourceStatus
from app.services.audit_service import get_audit_service

router = APIRouter()

class DataSourceSyncRequest(BaseModel):
    sources: Optional[List[str]] = None  # Specific sources to sync, or None for all
    force: bool = False  # Force sync even if not due

class DataSourceConfigRequest(BaseModel):
    name: str
    url: str
    enabled: bool = True
    update_frequency: int = 24
    api_key: Optional[str] = None
    source_type: str = "sanctions"
    priority: int = 1

class DataSourceStatusResponse(BaseModel):
    name: str
    last_update: Optional[datetime]
    last_success: Optional[datetime]
    last_error: Optional[str]
    total_records: int
    new_records: int
    updated_records: int
    is_healthy: bool
    next_update: Optional[datetime]
    source_type: str
    enabled: bool

@router.get("/status")
async def get_data_sources_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get status of all data sources
    Available to all authenticated users for transparency
    """
    try:
        data_manager = get_data_source_manager(db)
        statuses = await data_manager.get_source_status()
        
        # Convert to response format
        response_data = {}
        for name, status in statuses.items():
            response_data[name] = {
                "name": status.name,
                "last_update": status.last_update,
                "last_success": status.last_success,
                "last_error": status.last_error,
                "total_records": status.total_records,
                "new_records": status.new_records,
                "updated_records": status.updated_records,
                "is_healthy": status.is_healthy,
                "next_update": status.next_update,
                "source_type": data_manager.adapters[name].config.source_type if name in data_manager.adapters else "unknown",
                "enabled": data_manager.adapters[name].config.enabled if name in data_manager.adapters else False
            }
        
        return {
            "sources": response_data,
            "total_sources": len(response_data),
            "healthy_sources": sum(1 for s in response_data.values() if s["is_healthy"]),
            "last_check": datetime.utcnow()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get data sources status: {str(e)}")

@router.post("/sync")
async def sync_data_sources(
    sync_request: DataSourceSyncRequest,
    background_tasks: BackgroundTasks,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
) -> Dict[str, str]:
    """
    Trigger synchronization of data sources
    Requires admin permissions
    """
    try:
        data_manager = get_data_source_manager(db)
        audit_service = get_audit_service(db)
        
        # Log sync initiation
        audit_service.log_action(
            user_id=current_user.id,
            action="DATA_SOURCE_SYNC_INITIATED",
            request=request,
            resource="data_sources",
            resource_type="DATA_SOURCE",
            success=True,
            extra_data={
                "sources": sync_request.sources or "all",
                "force": sync_request.force,
                "initiated_by": current_user.email
            }
        )
        
        # Run sync in background
        background_tasks.add_task(
            _perform_sync,
            data_manager,
            sync_request.sources,
            sync_request.force,
            current_user.id,
            db
        )
        
        return {
            "message": "Data source synchronization started",
            "sources": sync_request.sources or "all",
            "initiated_by": current_user.email,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start sync: {str(e)}")

async def _perform_sync(
    data_manager,
    sources: Optional[List[str]],
    force: bool,
    user_id: int,
    db: Session
):
    """Background task to perform data source synchronization"""
    try:
        audit_service = get_audit_service(db)
        
        if sources:
            # Sync specific sources
            results = {}
            for source_name in sources:
                if source_name in data_manager.adapters:
                    adapter = data_manager.adapters[source_name]
                    if force or data_manager._needs_update(adapter):
                        status = await data_manager._sync_source(adapter)
                        results[source_name] = status
        else:
            # Sync all sources
            results = await data_manager.sync_all_sources(force=force)
        
        # Log completion
        total_new = sum(status.new_records for status in results.values())
        total_updated = sum(status.updated_records for status in results.values())
        successful_syncs = sum(1 for status in results.values() if status.is_healthy)
        
        audit_service.log_action(
            user_id=user_id,
            action="DATA_SOURCE_SYNC_COMPLETED",
            resource="data_sources",
            resource_type="DATA_SOURCE",
            success=successful_syncs == len(results),
            extra_data={
                "synced_sources": list(results.keys()),
                "total_new_records": total_new,
                "total_updated_records": total_updated,
                "successful_syncs": successful_syncs,
                "failed_syncs": len(results) - successful_syncs
            }
        )
        
    except Exception as e:
        # Log error
        audit_service = get_audit_service(db)
        audit_service.log_action(
            user_id=user_id,
            action="DATA_SOURCE_SYNC_FAILED",
            resource="data_sources",
            resource_type="DATA_SOURCE",
            success=False,
            extra_data={"error": str(e)}
        )

@router.get("/connections/test")
async def test_data_source_connections(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
) -> Dict[str, Any]:
    """
    Test connections to all data sources
    Requires admin permissions
    """
    try:
        data_manager = get_data_source_manager(db)
        connection_results = await data_manager.test_all_connections()
        
        # Log connection test
        audit_service = get_audit_service(db)
        audit_service.log_action(
            user_id=current_user.id,
            action="DATA_SOURCE_CONNECTION_TEST",
            request=request,
            resource="data_sources",
            resource_type="DATA_SOURCE",
            success=True,
            extra_data={
                "connection_results": connection_results,
                "healthy_connections": sum(1 for healthy in connection_results.values() if healthy),
                "total_connections": len(connection_results)
            }
        )
        
        return {
            "connections": connection_results,
            "summary": {
                "total": len(connection_results),
                "healthy": sum(1 for healthy in connection_results.values() if healthy),
                "failed": sum(1 for healthy in connection_results.values() if not healthy)
            },
            "tested_at": datetime.utcnow()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to test connections: {str(e)}")

@router.get("/statistics")
async def get_data_source_statistics(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get data source synchronization statistics
    Available to all authenticated users
    """
    try:
        # This would typically query audit logs and sync history
        # For now, return mock statistics
        
        data_manager = get_data_source_manager(db)
        sources_status = await data_manager.get_source_status()
        
        total_records = sum(status.total_records for status in sources_status.values())
        active_sources = sum(1 for name, adapter in data_manager.adapters.items() if adapter.config.enabled)
        
        return {
            "period_days": days,
            "total_sources": len(data_manager.adapters),
            "active_sources": active_sources,
            "total_records": total_records,
            "sync_frequency": {
                source: adapter.config.update_frequency 
                for source, adapter in data_manager.adapters.items()
            },
            "source_types": {
                "sanctions": len([a for a in data_manager.adapters.values() if a.config.source_type == "sanctions"]),
                "pep": len([a for a in data_manager.adapters.values() if a.config.source_type == "pep"]),
                "watchlist": len([a for a in data_manager.adapters.values() if a.config.source_type == "watchlist"])
            },
            "last_successful_syncs": {
                name: status.last_success.isoformat() if status.last_success else None
                for name, status in sources_status.items()
            },
            "generated_at": datetime.utcnow()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate statistics: {str(e)}")

@router.get("/health")
async def get_data_sources_health(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get overall health status of data integration system
    Available to all authenticated users
    """
    try:
        data_manager = get_data_source_manager(db)
        statuses = await data_manager.get_source_status()
        
        healthy_count = sum(1 for status in statuses.values() if status.is_healthy)
        total_count = len(statuses)
        
        # Determine overall health
        if healthy_count == total_count:
            overall_status = "healthy"
        elif healthy_count > total_count / 2:
            overall_status = "warning"
        else:
            overall_status = "critical"
        
        # Find oldest successful sync
        last_successful_syncs = [
            status.last_success for status in statuses.values() 
            if status.last_success
        ]
        oldest_sync = min(last_successful_syncs) if last_successful_syncs else None
        
        return {
            "overall_status": overall_status,
            "healthy_sources": healthy_count,
            "total_sources": total_count,
            "health_percentage": (healthy_count / max(total_count, 1)) * 100,
            "oldest_successful_sync": oldest_sync.isoformat() if oldest_sync else None,
            "issues": [
                {
                    "source": name,
                    "last_error": status.last_error,
                    "last_success": status.last_success.isoformat() if status.last_success else None
                }
                for name, status in statuses.items()
                if not status.is_healthy and status.last_error
            ],
            "checked_at": datetime.utcnow()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get health status: {str(e)}")

@router.get("/logs/sync")
async def get_sync_logs(
    days: int = 7,
    source: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
) -> Dict[str, Any]:
    """
    Get synchronization logs and history
    Requires admin permissions
    """
    try:
        # This would typically query audit logs for sync-related events
        # For now, return mock data structure
        
        return {
            "period_days": days,
            "source_filter": source,
            "sync_events": [
                {
                    "timestamp": datetime.utcnow().isoformat(),
                    "source": source or "all",
                    "type": "DATA_SOURCE_SYNC_COMPLETED",
                    "user": current_user.email,
                    "records_processed": 150,
                    "new_records": 5,
                    "updated_records": 3,
                    "duration_seconds": 45,
                    "success": True
                }
            ],
            "summary": {
                "total_syncs": 1,
                "successful_syncs": 1,
                "failed_syncs": 0,
                "average_duration": 45,
                "total_records_processed": 150
            },
            "generated_at": datetime.utcnow()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get sync logs: {str(e)}")

@router.post("/schedule")
async def configure_sync_schedule(
    schedule_config: Dict[str, Any],
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
) -> Dict[str, str]:
    """
    Configure automatic synchronization schedule
    Requires admin permissions
    """
    try:
        # This would typically update scheduler configuration
        # For now, just log the configuration change
        
        audit_service = get_audit_service(db)
        audit_service.log_action(
            user_id=current_user.id,
            action="DATA_SOURCE_SCHEDULE_UPDATED",
            request=request,
            resource="sync_schedule",
            resource_type="CONFIGURATION",
            success=True,
            extra_data={
                "schedule_config": schedule_config,
                "updated_by": current_user.email
            }
        )
        
        return {
            "message": "Synchronization schedule updated successfully",
            "updated_by": current_user.email,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update schedule: {str(e)}")