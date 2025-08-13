# backend/app/services/collaboration_service.py
"""
User Collaboration Service
Provides comprehensive collaboration features including comments, notes sharing, 
and team coordination for sanctions screening activities
"""

import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc
from fastapi import HTTPException

from app.models.search_history import SearchHistory
from app.models.search_notes import SearchNote
from app.models.starred_entity import StarredEntity
from app.models.user import User

logger = logging.getLogger(__name__)

class CollaborationService:
    """Service for managing user collaboration features"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def share_search_results(
        self,
        search_history_id: int,
        owner_user_id: int,
        target_user_ids: List[int],
        message: Optional[str] = None,
        permission_level: str = "view"  # view, comment, edit
    ) -> Dict[str, Any]:
        """
        Share search results with other users
        
        Args:
            search_history_id: ID of the search to share
            owner_user_id: ID of the user sharing the search
            target_user_ids: List of user IDs to share with
            message: Optional message to include with the share
            permission_level: Permission level for shared users
            
        Returns:
            Dict with sharing results
        """
        try:
            # Verify search exists and belongs to owner
            search_history = self.db.query(SearchHistory).filter(
                SearchHistory.id == search_history_id,
                SearchHistory.user_id == owner_user_id
            ).first()
            
            if not search_history:
                raise HTTPException(status_code=404, detail="Search history not found")
            
            # Verify target users exist
            target_users = self.db.query(User).filter(User.id.in_(target_user_ids)).all()
            if len(target_users) != len(target_user_ids):
                raise HTTPException(status_code=400, detail="One or more target users not found")
            
            # Create shared search entries (using search_notes as collaboration metadata)
            shared_count = 0
            failed_shares = []
            
            for user in target_users:
                try:
                    # Check if already shared
                    existing_share = self.db.query(SearchNote).filter(
                        SearchNote.search_history_id == search_history_id,
                        SearchNote.user_id == user.id,
                        SearchNote.note_text.like("SHARED:%")
                    ).first()
                    
                    if not existing_share:
                        # Create sharing note
                        share_note = SearchNote(
                            search_history_id=search_history_id,
                            entity_id="shared_search",
                            entity_name=f"Shared by {self._get_user_display_name(owner_user_id)}",
                            note_text=f"SHARED:{permission_level}:{message or 'Search results shared'}",
                            risk_assessment="SHARED",
                            action_taken="SHARED_SEARCH",
                            user_id=user.id
                        )
                        
                        self.db.add(share_note)
                        shared_count += 1
                    
                except Exception as e:
                    logger.error(f"Failed to share with user {user.id}: {str(e)}")
                    failed_shares.append(user.id)
            
            self.db.commit()
            
            return {
                "search_history_id": search_history_id,
                "shared_with_count": shared_count,
                "total_targets": len(target_user_ids),
                "failed_shares": failed_shares,
                "permission_level": permission_level,
                "message": message,
                "shared_at": datetime.utcnow().isoformat()
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error sharing search results: {str(e)}")
            self.db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to share search results: {str(e)}")
    
    def get_shared_searches(
        self,
        user_id: int,
        limit: int = 50,
        offset: int = 0,
        shared_by_user: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Get searches that have been shared with the user
        
        Args:
            user_id: User ID to get shared searches for
            limit: Maximum number of results
            offset: Number of results to skip
            shared_by_user: Optional filter by sharing user
            
        Returns:
            Dict containing shared searches with metadata
        """
        try:
            # Get shared search notes
            query = self.db.query(SearchNote, SearchHistory, User).join(
                SearchHistory, SearchNote.search_history_id == SearchHistory.id
            ).join(
                User, SearchHistory.user_id == User.id
            ).filter(
                SearchNote.user_id == user_id,
                SearchNote.note_text.like("SHARED:%")
            )
            
            if shared_by_user:
                query = query.filter(SearchHistory.user_id == shared_by_user)
            
            # Get total count
            total = query.count()
            
            # Apply pagination and ordering
            shared_items = query.order_by(SearchNote.created_at.desc()).offset(offset).limit(limit).all()
            
            # Format results
            items = []
            for share_note, search_history, sharing_user in shared_items:
                # Parse share information
                share_parts = share_note.note_text.split(":", 2)
                permission_level = share_parts[1] if len(share_parts) > 1 else "view"
                share_message = share_parts[2] if len(share_parts) > 2 else ""
                
                items.append({
                    "share_id": share_note.id,
                    "search_history_id": search_history.id,
                    "query": search_history.query,
                    "search_type": search_history.search_type,
                    "results_count": search_history.results_count,
                    "risk_level": search_history.risk_level,
                    "created_at": search_history.created_at.isoformat(),
                    "shared_by": {
                        "id": sharing_user.id,
                        "name": sharing_user.full_name,
                        "email": sharing_user.email
                    },
                    "shared_at": share_note.created_at.isoformat(),
                    "permission_level": permission_level,
                    "share_message": share_message,
                    "data_source": search_history.data_source
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
            logger.error(f"Error getting shared searches: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to retrieve shared searches: {str(e)}")
    
    def add_collaborative_note(
        self,
        search_history_id: int,
        entity_id: str,
        entity_name: str,
        note_text: str,
        user_id: int,
        reply_to_note_id: Optional[int] = None,
        risk_assessment: Optional[str] = None,
        action_taken: Optional[str] = None,
        tags: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Add a collaborative note to a search result
        Supports threaded conversations and team coordination
        
        Args:
            search_history_id: ID of the search
            entity_id: ID of the entity being commented on
            entity_name: Name of the entity
            note_text: The note content
            user_id: ID of the user adding the note
            reply_to_note_id: Optional ID of note being replied to
            risk_assessment: Risk assessment level
            action_taken: Action taken or recommended
            tags: Optional tags for categorization
            
        Returns:
            Dict with note creation results
        """
        try:
            # Verify search exists and user has access
            search_history = self.db.query(SearchHistory).filter(
                SearchHistory.id == search_history_id
            ).first()
            
            if not search_history:
                raise HTTPException(status_code=404, detail="Search history not found")
            
            # Check if user has access (owner or shared with)
            has_access = (
                search_history.user_id == user_id or
                self.db.query(SearchNote).filter(
                    SearchNote.search_history_id == search_history_id,
                    SearchNote.user_id == user_id,
                    SearchNote.note_text.like("SHARED:%")
                ).count() > 0
            )
            
            if not has_access:
                raise HTTPException(status_code=403, detail="Access denied to this search")
            
            # If replying to a note, verify it exists
            parent_note = None
            if reply_to_note_id:
                parent_note = self.db.query(SearchNote).filter(
                    SearchNote.id == reply_to_note_id,
                    SearchNote.search_history_id == search_history_id
                ).first()
                
                if not parent_note:
                    raise HTTPException(status_code=404, detail="Parent note not found")
            
            # Create the collaborative note
            note_content = note_text
            if reply_to_note_id:
                note_content = f"REPLY_TO:{reply_to_note_id}:{note_text}"
            
            if tags:
                note_content += f" #tags:{','.join(tags)}"
            
            collaborative_note = SearchNote(
                search_history_id=search_history_id,
                entity_id=entity_id,
                entity_name=entity_name,
                note_text=note_content,
                risk_assessment=risk_assessment,
                action_taken=action_taken,
                user_id=user_id
            )
            
            self.db.add(collaborative_note)
            self.db.commit()
            self.db.refresh(collaborative_note)
            
            # Get user info for response
            user = self.db.query(User).filter(User.id == user_id).first()
            
            return {
                "id": collaborative_note.id,
                "search_history_id": search_history_id,
                "entity_id": entity_id,
                "entity_name": entity_name,
                "note_text": note_text,
                "risk_assessment": risk_assessment,
                "action_taken": action_taken,
                "tags": tags,
                "created_by": {
                    "id": user.id,
                    "name": user.full_name,
                    "email": user.email
                } if user else None,
                "created_at": collaborative_note.created_at.isoformat(),
                "reply_to_note_id": reply_to_note_id,
                "message": "Collaborative note added successfully"
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error adding collaborative note: {str(e)}")
            self.db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to add collaborative note: {str(e)}")
    
    def get_collaborative_notes(
        self,
        search_history_id: int,
        entity_id: Optional[str] = None,
        user_id: Optional[int] = None,
        include_threads: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Get collaborative notes for a search, optionally filtered by entity or user
        
        Args:
            search_history_id: ID of the search
            entity_id: Optional filter by entity
            user_id: ID of user requesting (for access control)
            include_threads: Whether to include threaded replies
            
        Returns:
            List of collaborative notes with threading information
        """
        try:
            # Verify access to search
            if user_id:
                search_history = self.db.query(SearchHistory).filter(
                    SearchHistory.id == search_history_id
                ).first()
                
                if not search_history:
                    raise HTTPException(status_code=404, detail="Search history not found")
                
                has_access = (
                    search_history.user_id == user_id or
                    self.db.query(SearchNote).filter(
                        SearchNote.search_history_id == search_history_id,
                        SearchNote.user_id == user_id,
                        SearchNote.note_text.like("SHARED:%")
                    ).count() > 0
                )
                
                if not has_access:
                    raise HTTPException(status_code=403, detail="Access denied to this search")
            
            # Build query
            query = self.db.query(SearchNote, User).join(
                User, SearchNote.user_id == User.id
            ).filter(
                SearchNote.search_history_id == search_history_id,
                ~SearchNote.note_text.like("SHARED:%")  # Exclude sharing metadata notes
            )
            
            if entity_id:
                query = query.filter(SearchNote.entity_id == entity_id)
            
            notes_with_users = query.order_by(SearchNote.created_at.asc()).all()
            
            # Process notes and build threads
            notes_dict = {}
            root_notes = []
            
            for note, user in notes_with_users:
                # Parse note content for replies and tags
                note_text = note.note_text
                reply_to_note_id = None
                tags = []
                
                if note_text.startswith("REPLY_TO:"):
                    parts = note_text.split(":", 2)
                    if len(parts) >= 3:
                        reply_to_note_id = int(parts[1])
                        note_text = parts[2]
                
                # Extract tags
                if "#tags:" in note_text:
                    text_parts = note_text.split("#tags:")
                    note_text = text_parts[0].strip()
                    if len(text_parts) > 1:
                        tags = text_parts[1].split(",")
                
                note_dict = {
                    "id": note.id,
                    "entity_id": note.entity_id,
                    "entity_name": note.entity_name,
                    "note_text": note_text,
                    "risk_assessment": note.risk_assessment,
                    "action_taken": note.action_taken,
                    "created_by": {
                        "id": user.id,
                        "name": user.full_name,
                        "email": user.email
                    },
                    "created_at": note.created_at.isoformat(),
                    "reply_to_note_id": reply_to_note_id,
                    "tags": tags,
                    "replies": [] if include_threads else None
                }
                
                notes_dict[note.id] = note_dict
                
                if reply_to_note_id is None:
                    root_notes.append(note_dict)
            
            # Build threads if requested
            if include_threads:
                for note in notes_dict.values():
                    if note["reply_to_note_id"] and note["reply_to_note_id"] in notes_dict:
                        parent = notes_dict[note["reply_to_note_id"]]
                        parent["replies"].append(note)
                
                return root_notes
            else:
                return list(notes_dict.values())
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting collaborative notes: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to retrieve collaborative notes: {str(e)}")
    
    def get_team_activity(
        self,
        user_id: int,
        days: int = 7,
        organization_filter: bool = True
    ) -> Dict[str, Any]:
        """
        Get team activity summary for collaborative oversight
        
        Args:
            user_id: User ID requesting the activity
            days: Number of days to look back
            organization_filter: Whether to filter by same organization
            
        Returns:
            Dict containing team activity summary
        """
        try:
            start_date = datetime.utcnow() - timedelta(days=days)
            
            # Get requesting user info
            requesting_user = self.db.query(User).filter(User.id == user_id).first()
            if not requesting_user:
                raise HTTPException(status_code=404, detail="User not found")
            
            # Build team user filter
            team_users_query = self.db.query(User).filter(User.id != user_id, User.is_active == True)
            
            if organization_filter and requesting_user.organization:
                team_users_query = team_users_query.filter(User.organization == requesting_user.organization)
            
            team_users = team_users_query.all()
            team_user_ids = [user.id for user in team_users]
            
            if not team_user_ids:
                return {
                    "message": "No team members found",
                    "days": days,
                    "activity": []
                }
            
            # Get recent searches by team members
            recent_searches = self.db.query(SearchHistory, User).join(
                User, SearchHistory.user_id == User.id
            ).filter(
                SearchHistory.user_id.in_(team_user_ids),
                SearchHistory.created_at >= start_date
            ).order_by(SearchHistory.created_at.desc()).limit(50).all()
            
            # Get recent notes by team members
            recent_notes = self.db.query(SearchNote, User, SearchHistory).join(
                User, SearchNote.user_id == User.id
            ).join(
                SearchHistory, SearchNote.search_history_id == SearchHistory.id
            ).filter(
                SearchNote.user_id.in_(team_user_ids),
                SearchNote.created_at >= start_date,
                ~SearchNote.note_text.like("SHARED:%")
            ).order_by(SearchNote.created_at.desc()).limit(50).all()
            
            # Get recent shared searches
            recent_shares = self.db.query(SearchNote, User, SearchHistory).join(
                User, SearchNote.user_id == User.id  # User who received the share
            ).join(
                SearchHistory, SearchNote.search_history_id == SearchHistory.id
            ).filter(
                SearchHistory.user_id.in_(team_user_ids),  # Shared by team members
                SearchNote.created_at >= start_date,
                SearchNote.note_text.like("SHARED:%")
            ).order_by(SearchNote.created_at.desc()).limit(20).all()
            
            # Combine and format activity
            activity = []
            
            # Add searches
            for search, search_user in recent_searches:
                activity.append({
                    "type": "search",
                    "user": {
                        "id": search_user.id,
                        "name": search_user.full_name,
                        "email": search_user.email
                    },
                    "timestamp": search.created_at.isoformat(),
                    "details": {
                        "query": search.query,
                        "results_count": search.results_count,
                        "risk_level": search.risk_level,
                        "search_id": search.id
                    }
                })
            
            # Add notes
            for note, note_user, search in recent_notes:
                activity.append({
                    "type": "note",
                    "user": {
                        "id": note_user.id,
                        "name": note_user.full_name,
                        "email": note_user.email
                    },
                    "timestamp": note.created_at.isoformat(),
                    "details": {
                        "entity_name": note.entity_name,
                        "note_preview": note.note_text[:100] + "..." if len(note.note_text) > 100 else note.note_text,
                        "search_query": search.query,
                        "search_id": search.id
                    }
                })
            
            # Add shares
            for share, recipient_user, search in recent_shares:
                activity.append({
                    "type": "share",
                    "user": {
                        "id": search.user_id,  # The sharer
                        "name": self._get_user_display_name(search.user_id),
                        "email": self._get_user_email(search.user_id)
                    },
                    "timestamp": share.created_at.isoformat(),
                    "details": {
                        "shared_with": {
                            "id": recipient_user.id,
                            "name": recipient_user.full_name
                        },
                        "search_query": search.query,
                        "search_id": search.id
                    }
                })
            
            # Sort all activity by timestamp (newest first)
            activity.sort(key=lambda x: x["timestamp"], reverse=True)
            
            return {
                "period_days": days,
                "total_activities": len(activity),
                "team_members_count": len(team_users),
                "activity": activity[:30],  # Limit to 30 most recent
                "generated_at": datetime.utcnow().isoformat()
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting team activity: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to retrieve team activity: {str(e)}")
    
    def _get_user_display_name(self, user_id: int) -> str:
        """Get display name for a user"""
        user = self.db.query(User).filter(User.id == user_id).first()
        return user.full_name if user else "Unknown User"
    
    def _get_user_email(self, user_id: int) -> str:
        """Get email for a user"""
        user = self.db.query(User).filter(User.id == user_id).first()
        return user.email if user else "unknown@example.com"

# Service factory function
def get_collaboration_service(db: Session) -> CollaborationService:
    """Get collaboration service instance"""
    return CollaborationService(db)