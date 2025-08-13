# backend/app/api/v1/endpoints/search_history.py
"""
Advanced Search History Management API Endpoints
Provides comprehensive search history tracking, analytics, and management features
"""

from fastapi import APIRouter, HTTPException, Depends, Query, Request
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User
from app.core.auth import get_current_user
from app.core.permissions import require_analyst_or_above
from app.services.search_history_service import get_search_history_service
from app.services.audit_service import get_audit_service

router = APIRouter()

class SearchHistoryFilter(BaseModel):
    query_filter: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    risk_levels: Optional[List[str]] = None
    data_sources: Optional[List[str]] = None
    search_types: Optional[List[str]] = None
    has_notes: Optional[bool] = None
    has_starred: Optional[bool] = None
    min_results: Optional[int] = None
    max_results: Optional[int] = None
    sort_by: str = "created_at"
    sort_order: str = "desc"

class BulkDeleteRequest(BaseModel):
    search_history_ids: List[int]

@router.get("/advanced")
async def get_advanced_search_history(
    request: Request,
    limit: int = Query(50, le=1000, description="Maximum number of results"),
    offset: int = Query(0, description="Number of results to skip"),
    query_filter: Optional[str] = Query(None, description="Filter by search query (partial match)"),
    date_from: Optional[datetime] = Query(None, description="Filter searches from this date"),
    date_to: Optional[datetime] = Query(None, description="Filter searches until this date"),
    risk_levels: Optional[List[str]] = Query(None, description="Filter by risk levels"),
    data_sources: Optional[List[str]] = Query(None, description="Filter by data sources"),
    search_types: Optional[List[str]] = Query(None, description="Filter by search types"),
    has_notes: Optional[bool] = Query(None, description="Filter by presence of notes"),
    has_starred: Optional[bool] = Query(None, description="Filter by presence of starred entities"),
    min_results: Optional[int] = Query(None, description="Minimum number of results"),
    max_results: Optional[int] = Query(None, description="Maximum number of results"),
    sort_by: str = Query("created_at", description="Field to sort by"),
    sort_order: str = Query("desc", description="Sort order (asc/desc)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst_or_above)
) -> Dict[str, Any]:
    """
    Get search history with advanced filtering and sorting options
    Supports comprehensive filtering by various criteria
    """
    try:
        search_history_service = get_search_history_service(db)
        
        result = search_history_service.get_search_history_with_filters(
            user_id=current_user.id,
            limit=limit,
            offset=offset,
            query_filter=query_filter,
            date_from=date_from,
            date_to=date_to,
            risk_levels=risk_levels,
            data_sources=data_sources,
            search_types=search_types,
            has_notes=has_notes,
            has_starred=has_starred,
            min_results=min_results,
            max_results=max_results,
            sort_by=sort_by,
            sort_order=sort_order
        )
        
        # Log analytics access
        audit_service = get_audit_service(db)
        audit_service.log_action(
            user_id=current_user.id,
            action="SEARCH_HISTORY_ACCESS",
            request=request,
            resource="advanced_search_history",
            resource_type="SEARCH_HISTORY",
            success=True,
            extra_data={
                "filters_applied": result["filters_applied"],
                "results_count": result["total"]
            }
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve search history: {str(e)}")

@router.get("/analytics")
async def get_search_analytics(
    request: Request,
    days: int = Query(30, le=365, description="Number of days to analyze"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst_or_above)
) -> Dict[str, Any]:
    """
    Get comprehensive search analytics for the current user
    Provides insights into search patterns, performance, and compliance metrics
    """
    try:
        search_history_service = get_search_history_service(db)
        analytics = search_history_service.get_search_analytics(
            user_id=current_user.id,
            days=days
        )
        
        # Log analytics access
        audit_service = get_audit_service(db)
        audit_service.log_action(
            user_id=current_user.id,
            action="SEARCH_ANALYTICS_ACCESS",
            request=request,
            resource=f"analytics_{days}days",
            resource_type="ANALYTICS",
            success=True,
            extra_data={
                "period_days": days,
                "total_searches": analytics["total_searches"]
            }
        )
        
        return analytics
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate analytics: {str(e)}")

@router.get("/similar/{search_id}")
async def get_similar_searches(
    search_id: int,
    limit: int = Query(10, le=50, description="Maximum number of similar searches"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst_or_above)
) -> List[Dict[str, Any]]:
    """
    Find searches similar to a given search based on query similarity
    Helps users find related previous searches
    """
    try:
        # First get the original search to extract the query
        from app.models.search_history import SearchHistory
        original_search = db.query(SearchHistory).filter(
            SearchHistory.id == search_id,
            SearchHistory.user_id == current_user.id
        ).first()
        
        if not original_search:
            raise HTTPException(status_code=404, detail="Search not found")
        
        search_history_service = get_search_history_service(db)
        similar_searches = search_history_service.get_similar_searches(
            user_id=current_user.id,
            query=original_search.query,
            limit=limit
        )
        
        return similar_searches
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to find similar searches: {str(e)}")

@router.delete("/{search_history_id}")
async def delete_search_history(
    search_history_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, str]:
    """
    Delete a specific search history item
    Removes the search and all associated notes and starred entities
    """
    try:
        search_history_service = get_search_history_service(db)
        success = search_history_service.delete_search_history(
            user_id=current_user.id,
            search_history_id=search_history_id
        )
        
        if success:
            # Log deletion action
            audit_service = get_audit_service(db)
            audit_service.log_action(
                user_id=current_user.id,
                action="SEARCH_HISTORY_DELETE",
                request=request,
                resource=str(search_history_id),
                resource_type="SEARCH_HISTORY",
                success=True,
                extra_data={
                    "search_history_id": search_history_id
                }
            )
            
            return {"message": "Search history deleted successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to delete search history")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete search history: {str(e)}")

@router.post("/bulk-delete")
async def bulk_delete_search_history(
    delete_request: BulkDeleteRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Bulk delete multiple search history items
    Useful for cleaning up old searches in batches
    """
    try:
        search_history_service = get_search_history_service(db)
        result = search_history_service.bulk_delete_search_history(
            user_id=current_user.id,
            search_history_ids=delete_request.search_history_ids
        )
        
        # Log bulk deletion action
        audit_service = get_audit_service(db)
        audit_service.log_action(
            user_id=current_user.id,
            action="SEARCH_HISTORY_BULK_DELETE",
            request=request,
            resource=f"bulk_delete_{len(delete_request.search_history_ids)}_items",
            resource_type="SEARCH_HISTORY",
            success=result["success"],
            extra_data={
                "total_requested": result["total_requested"],
                "deleted_count": result["deleted_count"],
                "failed_ids": result["failed_ids"]
            }
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to bulk delete: {str(e)}")

@router.get("/export")
async def export_search_history(
    request: Request,
    format: str = Query("json", regex="^(json|csv)$", description="Export format"),
    days: Optional[int] = Query(None, description="Number of days to export (all if not specified)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst_or_above)
) -> Dict[str, Any]:
    """
    Export search history in various formats for compliance and analysis
    Supports JSON and CSV formats
    """
    try:
        search_history_service = get_search_history_service(db)
        
        # Get search history data
        date_from = datetime.utcnow() - timedelta(days=days) if days else None
        
        history_data = search_history_service.get_search_history_with_filters(
            user_id=current_user.id,
            limit=10000,  # Large limit for export
            offset=0,
            date_from=date_from,
            sort_by="created_at",
            sort_order="desc"
        )
        
        if format == "json":
            export_data = {
                "exported_at": datetime.utcnow().isoformat(),
                "user_id": current_user.id,
                "user_email": current_user.email,
                "period_days": days,
                "total_searches": history_data["total"],
                "searches": history_data["items"]
            }
        else:  # CSV format
            # For CSV, we'll return instructions on how to convert
            export_data = {
                "message": "CSV export format - convert JSON data to CSV using appropriate tools",
                "csv_headers": [
                    "id", "query", "search_type", "results_count", "risk_level", 
                    "created_at", "data_source", "execution_time_ms", "notes_count", 
                    "starred_count", "has_notes", "has_starred"
                ],
                "data": history_data["items"]
            }
        
        # Log export action
        audit_service = get_audit_service(db)
        audit_service.log_export(
            user_id=current_user.id,
            export_type=format.upper(),
            resource=f"search_history_{days or 'all'}days",
            request=request,
            record_count=history_data["total"]
        )
        
        return export_data
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export search history: {str(e)}")

@router.get("/summary")
async def get_search_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst_or_above)
) -> Dict[str, Any]:
    """
    Get a quick summary of search history statistics
    Provides overview metrics for dashboard display
    """
    try:
        from app.models.search_history import SearchHistory
        from app.models.search_notes import SearchNote
        from app.models.starred_entity import StarredEntity
        from sqlalchemy import func
        
        # Basic counts
        total_searches = db.query(SearchHistory).filter(
            SearchHistory.user_id == current_user.id
        ).count()
        
        # Searches in last 30 days
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        recent_searches = db.query(SearchHistory).filter(
            SearchHistory.user_id == current_user.id,
            SearchHistory.created_at >= thirty_days_ago
        ).count()
        
        # Total notes
        total_notes = db.query(SearchNote).join(SearchHistory).filter(
            SearchHistory.user_id == current_user.id
        ).count()
        
        # Total starred
        total_starred = db.query(StarredEntity).join(SearchHistory).filter(
            SearchHistory.user_id == current_user.id
        ).count()
        
        # High risk searches
        high_risk_searches = db.query(SearchHistory).filter(
            SearchHistory.user_id == current_user.id,
            SearchHistory.risk_level == 'HIGH'
        ).count()
        
        # Most recent search
        latest_search = db.query(SearchHistory).filter(
            SearchHistory.user_id == current_user.id
        ).order_by(SearchHistory.created_at.desc()).first()
        
        return {
            "total_searches": total_searches,
            "recent_searches_30d": recent_searches,
            "total_notes": total_notes,
            "total_starred": total_starred,
            "high_risk_searches": high_risk_searches,
            "latest_search": {
                "id": latest_search.id,
                "query": latest_search.query,
                "created_at": latest_search.created_at.isoformat(),
                "results_count": latest_search.results_count
            } if latest_search else None,
            "generated_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate summary: {str(e)}")