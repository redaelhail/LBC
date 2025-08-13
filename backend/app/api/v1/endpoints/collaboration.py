# backend/app/api/v1/endpoints/collaboration.py
"""
User Collaboration API Endpoints
Provides comprehensive collaboration features including sharing, comments, and team coordination
"""

from fastapi import APIRouter, HTTPException, Depends, Query, Request
from typing import Dict, Any, List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User
from app.core.auth import get_current_user
from app.core.permissions import require_analyst_or_above
from app.services.collaboration_service import get_collaboration_service
from app.services.audit_service import get_audit_service

router = APIRouter()

class ShareSearchRequest(BaseModel):
    search_history_id: int
    target_user_ids: List[int]
    message: Optional[str] = None
    permission_level: str = "view"  # view, comment, edit

class CollaborativeNoteRequest(BaseModel):
    search_history_id: int
    entity_id: str
    entity_name: str
    note_text: str
    reply_to_note_id: Optional[int] = None
    risk_assessment: Optional[str] = None
    action_taken: Optional[str] = None
    tags: Optional[List[str]] = None

@router.post("/share")
async def share_search_results(
    share_request: ShareSearchRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst_or_above)
) -> Dict[str, Any]:
    """
    Share search results with other users
    Enables team collaboration on suspicious entities and search findings
    """
    try:
        collaboration_service = get_collaboration_service(db)
        
        result = collaboration_service.share_search_results(
            search_history_id=share_request.search_history_id,
            owner_user_id=current_user.id,
            target_user_ids=share_request.target_user_ids,
            message=share_request.message,
            permission_level=share_request.permission_level
        )
        
        # Log sharing action
        audit_service = get_audit_service(db)
        audit_service.log_action(
            user_id=current_user.id,
            action="SEARCH_SHARE",
            request=request,
            resource=str(share_request.search_history_id),
            resource_type="SEARCH_HISTORY",
            success=result["shared_with_count"] > 0,
            extra_data={
                "shared_with_count": result["shared_with_count"],
                "target_user_ids": share_request.target_user_ids,
                "permission_level": share_request.permission_level,
                "message": share_request.message
            }
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to share search results: {str(e)}")

@router.get("/shared")
async def get_shared_searches(
    limit: int = Query(50, le=100, description="Maximum number of results"),
    offset: int = Query(0, description="Number of results to skip"),
    shared_by_user: Optional[int] = Query(None, description="Filter by sharing user ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst_or_above)
) -> Dict[str, Any]:
    """
    Get searches that have been shared with the current user
    Provides access to team members' search results and findings
    """
    try:
        collaboration_service = get_collaboration_service(db)
        
        result = collaboration_service.get_shared_searches(
            user_id=current_user.id,
            limit=limit,
            offset=offset,
            shared_by_user=shared_by_user
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve shared searches: {str(e)}")

@router.post("/notes")
async def add_collaborative_note(
    note_request: CollaborativeNoteRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst_or_above)
) -> Dict[str, Any]:
    """
    Add a collaborative note to a search result
    Supports threaded conversations and team coordination on specific entities
    """
    try:
        collaboration_service = get_collaboration_service(db)
        
        result = collaboration_service.add_collaborative_note(
            search_history_id=note_request.search_history_id,
            entity_id=note_request.entity_id,
            entity_name=note_request.entity_name,
            note_text=note_request.note_text,
            user_id=current_user.id,
            reply_to_note_id=note_request.reply_to_note_id,
            risk_assessment=note_request.risk_assessment,
            action_taken=note_request.action_taken,
            tags=note_request.tags
        )
        
        # Log collaborative note addition
        audit_service = get_audit_service(db)
        audit_service.log_action(
            user_id=current_user.id,
            action="COLLABORATIVE_NOTE_ADD",
            request=request,
            resource=f"search_{note_request.search_history_id}_entity_{note_request.entity_id}",
            resource_type="COLLABORATIVE_NOTE",
            success=True,
            extra_data={
                "search_history_id": note_request.search_history_id,
                "entity_id": note_request.entity_id,
                "entity_name": note_request.entity_name,
                "reply_to_note_id": note_request.reply_to_note_id,
                "tags": note_request.tags
            }
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add collaborative note: {str(e)}")

@router.get("/notes/{search_history_id}")
async def get_collaborative_notes(
    search_history_id: int,
    entity_id: Optional[str] = Query(None, description="Filter by specific entity"),
    include_threads: bool = Query(True, description="Include threaded replies"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst_or_above)
) -> List[Dict[str, Any]]:
    """
    Get collaborative notes for a search with threading support
    Shows team discussions and coordination on search results
    """
    try:
        collaboration_service = get_collaboration_service(db)
        
        notes = collaboration_service.get_collaborative_notes(
            search_history_id=search_history_id,
            entity_id=entity_id,
            user_id=current_user.id,
            include_threads=include_threads
        )
        
        return notes
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve collaborative notes: {str(e)}")

@router.get("/team-activity")
async def get_team_activity(
    days: int = Query(7, ge=1, le=30, description="Number of days to look back"),
    organization_filter: bool = Query(True, description="Filter by same organization"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst_or_above)
) -> Dict[str, Any]:
    """
    Get team activity summary for collaborative oversight
    Shows recent searches, notes, and sharing activity by team members
    """
    try:
        collaboration_service = get_collaboration_service(db)
        
        activity = collaboration_service.get_team_activity(
            user_id=current_user.id,
            days=days,
            organization_filter=organization_filter
        )
        
        return activity
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve team activity: {str(e)}")

@router.get("/team-members")
async def get_team_members(
    organization_filter: bool = Query(True, description="Filter by same organization"),
    active_only: bool = Query(True, description="Include only active users"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst_or_above)
) -> List[Dict[str, Any]]:
    """
    Get list of team members available for collaboration
    Helps users identify who they can share searches with
    """
    try:
        from app.models.user import User
        
        # Build team members query
        query = db.query(User).filter(User.id != current_user.id)
        
        if active_only:
            query = query.filter(User.is_active == True)
        
        if organization_filter and current_user.organization:
            query = query.filter(User.organization == current_user.organization)
        
        team_members = query.order_by(User.full_name).all()
        
        # Format results
        members = []
        for member in team_members:
            members.append({
                "id": member.id,
                "full_name": member.full_name,
                "email": member.email,
                "role": member.role,
                "organization": member.organization,
                "department": member.department,
                "is_active": member.is_active,
                "last_login": member.last_login.isoformat() if member.last_login else None
            })
        
        return members
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve team members: {str(e)}")

@router.get("/my-shares")
async def get_my_shared_searches(
    limit: int = Query(50, le=100, description="Maximum number of results"),
    offset: int = Query(0, description="Number of results to skip"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst_or_above)
) -> Dict[str, Any]:
    """
    Get searches that the current user has shared with others
    Provides overview of user's sharing activity
    """
    try:
        from app.models.search_history import SearchHistory
        from app.models.search_notes import SearchNote
        from app.models.user import User
        from sqlalchemy import func
        
        # Get searches shared by current user
        shared_searches_query = db.query(
            SearchHistory,
            func.count(SearchNote.id).label('shared_with_count'),
            func.max(SearchNote.created_at).label('last_shared_at')
        ).join(
            SearchNote, SearchHistory.id == SearchNote.search_history_id
        ).filter(
            SearchHistory.user_id == current_user.id,
            SearchNote.note_text.like("SHARED:%")
        ).group_by(SearchHistory.id)
        
        # Get total count
        total = shared_searches_query.count()
        
        # Apply pagination
        shared_searches = shared_searches_query.order_by(
            func.max(SearchNote.created_at).desc()
        ).offset(offset).limit(limit).all()
        
        # Format results with details about who it was shared with
        items = []
        for search_history, shared_count, last_shared_at in shared_searches:
            # Get details of who it was shared with
            share_notes = db.query(SearchNote, User).join(
                User, SearchNote.user_id == User.id
            ).filter(
                SearchNote.search_history_id == search_history.id,
                SearchNote.note_text.like("SHARED:%")
            ).all()
            
            shared_with = []
            for share_note, shared_user in share_notes:
                share_parts = share_note.note_text.split(":", 2)
                permission_level = share_parts[1] if len(share_parts) > 1 else "view"
                
                shared_with.append({
                    "user_id": shared_user.id,
                    "user_name": shared_user.full_name,
                    "user_email": shared_user.email,
                    "permission_level": permission_level,
                    "shared_at": share_note.created_at.isoformat()
                })
            
            items.append({
                "search_id": search_history.id,
                "query": search_history.query,
                "search_type": search_history.search_type,
                "results_count": search_history.results_count,
                "risk_level": search_history.risk_level,
                "created_at": search_history.created_at.isoformat(),
                "shared_with_count": shared_count,
                "last_shared_at": last_shared_at.isoformat(),
                "shared_with": shared_with
            })
        
        return {
            "items": items,
            "total": total,
            "page": (offset // limit) + 1,
            "pages": (total + limit - 1) // limit,
            "limit": limit,
            "offset": offset
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve shared searches: {str(e)}")

@router.delete("/notes/{note_id}")
async def delete_collaborative_note(
    note_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst_or_above)
) -> Dict[str, str]:
    """
    Delete a collaborative note (only by the author or admin)
    Allows users to remove their own notes from team discussions
    """
    try:
        from app.models.search_notes import SearchNote
        
        # Find the note and verify ownership
        note = db.query(SearchNote).filter(
            SearchNote.id == note_id,
            SearchNote.user_id == current_user.id,
            ~SearchNote.note_text.like("SHARED:%")  # Cannot delete sharing metadata
        ).first()
        
        if not note:
            raise HTTPException(status_code=404, detail="Note not found or access denied")
        
        # Store info for audit log
        search_history_id = note.search_history_id
        entity_id = note.entity_id
        
        # Delete the note
        db.delete(note)
        db.commit()
        
        # Log deletion action
        audit_service = get_audit_service(db)
        audit_service.log_action(
            user_id=current_user.id,
            action="COLLABORATIVE_NOTE_DELETE",
            request=request,
            resource=f"note_{note_id}",
            resource_type="COLLABORATIVE_NOTE",
            success=True,
            extra_data={
                "note_id": note_id,
                "search_history_id": search_history_id,
                "entity_id": entity_id
            }
        )
        
        return {"message": "Collaborative note deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete collaborative note: {str(e)}")

@router.get("/statistics")
async def get_collaboration_statistics(
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst_or_above)
) -> Dict[str, Any]:
    """
    Get collaboration statistics for the current user
    Shows sharing activity, notes created, and team engagement metrics
    """
    try:
        from app.models.search_history import SearchHistory
        from app.models.search_notes import SearchNote
        from app.models.user import User
        from sqlalchemy import func
        from datetime import datetime, timedelta
        
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Searches shared by user
        searches_shared_by_user = db.query(SearchHistory).join(SearchNote).filter(
            SearchHistory.user_id == current_user.id,
            SearchNote.note_text.like("SHARED:%"),
            SearchNote.created_at >= start_date
        ).distinct().count()
        
        # Searches shared with user
        searches_shared_with_user = db.query(SearchNote).filter(
            SearchNote.user_id == current_user.id,
            SearchNote.note_text.like("SHARED:%"),
            SearchNote.created_at >= start_date
        ).count()
        
        # Collaborative notes created by user
        notes_created = db.query(SearchNote).filter(
            SearchNote.user_id == current_user.id,
            ~SearchNote.note_text.like("SHARED:%"),
            SearchNote.created_at >= start_date
        ).count()
        
        # Notes on user's searches by others
        notes_on_user_searches = db.query(SearchNote).join(SearchHistory).filter(
            SearchHistory.user_id == current_user.id,
            SearchNote.user_id != current_user.id,
            ~SearchNote.note_text.like("SHARED:%"),
            SearchNote.created_at >= start_date
        ).count()
        
        # Active collaborators (unique users who interacted with user's content)
        active_collaborators = db.query(SearchNote.user_id).join(SearchHistory).filter(
            SearchHistory.user_id == current_user.id,
            SearchNote.user_id != current_user.id,
            SearchNote.created_at >= start_date
        ).distinct().count()
        
        return {
            "period_days": days,
            "collaboration_metrics": {
                "searches_shared_by_me": searches_shared_by_user,
                "searches_shared_with_me": searches_shared_with_user,
                "notes_created_by_me": notes_created,
                "notes_on_my_searches": notes_on_user_searches,
                "active_collaborators": active_collaborators
            },
            "engagement_rate": {
                "sharing_activity": searches_shared_by_user + searches_shared_with_user,
                "note_activity": notes_created + notes_on_user_searches,
                "total_collaborative_actions": searches_shared_by_user + searches_shared_with_user + notes_created + notes_on_user_searches
            },
            "generated_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate collaboration statistics: {str(e)}")