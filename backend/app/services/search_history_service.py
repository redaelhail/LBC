# backend/app/services/search_history_service.py
"""
Advanced Search History Management Service
Provides comprehensive search history tracking, analytics, and management features
"""

import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc, asc
from fastapi import HTTPException

from app.models.search_history import SearchHistory
from app.models.search_notes import SearchNote
from app.models.starred_entity import StarredEntity
from app.models.user import User

logger = logging.getLogger(__name__)

class AdvancedSearchHistoryService:
    """Advanced service for search history management and analytics"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_search_history_with_filters(
        self,
        user_id: int,
        limit: int = 50,
        offset: int = 0,
        query_filter: str = None,
        date_from: datetime = None,
        date_to: datetime = None,
        risk_levels: List[str] = None,
        data_sources: List[str] = None,
        search_types: List[str] = None,
        has_notes: bool = None,
        has_starred: bool = None,
        min_results: int = None,
        max_results: int = None,
        sort_by: str = "created_at",
        sort_order: str = "desc"
    ) -> Dict[str, Any]:
        """
        Get search history with comprehensive filtering and sorting options
        
        Args:
            user_id: User ID to filter by
            limit: Maximum number of results
            offset: Number of results to skip
            query_filter: Filter by search query (partial match)
            date_from: Filter searches from this date
            date_to: Filter searches until this date
            risk_levels: Filter by risk levels (LOW, MEDIUM, HIGH)
            data_sources: Filter by data sources (opensanctions, mock, etc.)
            search_types: Filter by search types (Person, Company, etc.)
            has_notes: Filter by presence of notes
            has_starred: Filter by presence of starred entities
            min_results: Minimum number of results
            max_results: Maximum number of results
            sort_by: Field to sort by
            sort_order: Sort order (asc/desc)
            
        Returns:
            Dict containing search history with pagination info
        """
        try:
            # Build base query
            query = self.db.query(SearchHistory).filter(SearchHistory.user_id == user_id)
            
            # Apply filters
            if query_filter:
                query = query.filter(SearchHistory.query.ilike(f"%{query_filter}%"))
            
            if date_from:
                query = query.filter(SearchHistory.created_at >= date_from)
            
            if date_to:
                query = query.filter(SearchHistory.created_at <= date_to)
            
            if risk_levels:
                query = query.filter(SearchHistory.risk_level.in_(risk_levels))
            
            if data_sources:
                query = query.filter(SearchHistory.data_source.in_(data_sources))
            
            if search_types:
                query = query.filter(SearchHistory.search_type.in_(search_types))
            
            if min_results is not None:
                query = query.filter(SearchHistory.results_count >= min_results)
            
            if max_results is not None:
                query = query.filter(SearchHistory.results_count <= max_results)
            
            if has_notes is not None:
                if has_notes:
                    query = query.join(SearchNote).distinct()
                else:
                    query = query.outerjoin(SearchNote).filter(SearchNote.id.is_(None))
            
            if has_starred is not None:
                if has_starred:
                    query = query.join(StarredEntity).distinct()
                else:
                    query = query.outerjoin(StarredEntity).filter(StarredEntity.id.is_(None))
            
            # Get total count before applying limit/offset
            total = query.count()
            
            # Apply sorting
            sort_column = getattr(SearchHistory, sort_by, SearchHistory.created_at)
            if sort_order.lower() == "desc":
                query = query.order_by(desc(sort_column))
            else:
                query = query.order_by(asc(sort_column))
            
            # Apply pagination
            searches = query.offset(offset).limit(limit).all()
            
            # Enhanced search history items with additional metadata
            items = []
            for search in searches:
                # Get notes count
                notes_count = self.db.query(SearchNote).filter(
                    SearchNote.search_history_id == search.id
                ).count()
                
                # Get starred entities count
                starred_count = self.db.query(StarredEntity).filter(
                    StarredEntity.search_history_id == search.id
                ).count()
                
                # Calculate days since search
                days_since = (datetime.utcnow() - search.created_at).days
                
                item = {
                    "id": search.id,
                    "query": search.query,
                    "search_type": search.search_type,
                    "results_count": search.results_count,
                    "risk_level": search.risk_level,
                    "relevance_score": search.relevance_score,
                    "created_at": search.created_at.isoformat(),
                    "data_source": search.data_source,
                    "execution_time_ms": search.execution_time_ms,
                    "notes_count": notes_count,
                    "starred_count": starred_count,
                    "days_since": days_since,
                    "has_notes": notes_count > 0,
                    "has_starred": starred_count > 0,
                    "notes": search.notes
                }
                items.append(item)
            
            return {
                "items": items,
                "total": total,
                "page": (offset // limit) + 1,
                "pages": (total + limit - 1) // limit,
                "limit": limit,
                "offset": offset,
                "filters_applied": {
                    "query_filter": query_filter,
                    "date_from": date_from.isoformat() if date_from else None,
                    "date_to": date_to.isoformat() if date_to else None,
                    "risk_levels": risk_levels,
                    "data_sources": data_sources,
                    "search_types": search_types,
                    "has_notes": has_notes,
                    "has_starred": has_starred,
                    "min_results": min_results,
                    "max_results": max_results
                },
                "sorting": {
                    "sort_by": sort_by,
                    "sort_order": sort_order
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting filtered search history: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to retrieve search history: {str(e)}")
    
    def get_search_analytics(
        self,
        user_id: int,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Get comprehensive search analytics for a user
        
        Args:
            user_id: User ID to analyze
            days: Number of days to analyze (default 30)
            
        Returns:
            Dict containing comprehensive analytics
        """
        try:
            start_date = datetime.utcnow() - timedelta(days=days)
            
            # Base query for the time period
            base_query = self.db.query(SearchHistory).filter(
                SearchHistory.user_id == user_id,
                SearchHistory.created_at >= start_date
            )
            
            # Total searches
            total_searches = base_query.count()
            
            # Search frequency (searches per day)
            daily_searches = self.db.query(
                func.date(SearchHistory.created_at).label('date'),
                func.count(SearchHistory.id).label('count')
            ).filter(
                SearchHistory.user_id == user_id,
                SearchHistory.created_at >= start_date
            ).group_by(func.date(SearchHistory.created_at)).all()
            
            # Risk level distribution
            risk_distribution = self.db.query(
                SearchHistory.risk_level,
                func.count(SearchHistory.id).label('count')
            ).filter(
                SearchHistory.user_id == user_id,
                SearchHistory.created_at >= start_date
            ).group_by(SearchHistory.risk_level).all()
            
            # Data source distribution
            source_distribution = self.db.query(
                SearchHistory.data_source,
                func.count(SearchHistory.id).label('count')
            ).filter(
                SearchHistory.user_id == user_id,
                SearchHistory.created_at >= start_date
            ).group_by(SearchHistory.data_source).all()
            
            # Search type distribution
            type_distribution = self.db.query(
                SearchHistory.search_type,
                func.count(SearchHistory.id).label('count')
            ).filter(
                SearchHistory.user_id == user_id,
                SearchHistory.created_at >= start_date
            ).group_by(SearchHistory.search_type).all()
            
            # Performance metrics
            avg_execution_time = self.db.query(
                func.avg(SearchHistory.execution_time_ms)
            ).filter(
                SearchHistory.user_id == user_id,
                SearchHistory.created_at >= start_date,
                SearchHistory.execution_time_ms.isnot(None)
            ).scalar()
            
            avg_results_count = self.db.query(
                func.avg(SearchHistory.results_count)
            ).filter(
                SearchHistory.user_id == user_id,
                SearchHistory.created_at >= start_date
            ).scalar()
            
            # Most searched terms
            top_queries = self.db.query(
                SearchHistory.query,
                func.count(SearchHistory.id).label('count')
            ).filter(
                SearchHistory.user_id == user_id,
                SearchHistory.created_at >= start_date
            ).group_by(SearchHistory.query).order_by(
                func.count(SearchHistory.id).desc()
            ).limit(10).all()
            
            # Searches with notes
            searches_with_notes = self.db.query(SearchHistory).join(SearchNote).filter(
                SearchHistory.user_id == user_id,
                SearchHistory.created_at >= start_date
            ).distinct().count()
            
            # Searches with starred entities
            searches_with_starred = self.db.query(SearchHistory).join(StarredEntity).filter(
                SearchHistory.user_id == user_id,
                SearchHistory.created_at >= start_date
            ).distinct().count()
            
            # Compliance metrics
            high_risk_searches = base_query.filter(SearchHistory.risk_level == 'HIGH').count()
            
            return {
                "period_days": days,
                "total_searches": total_searches,
                "daily_activity": [
                    {"date": str(date), "searches": count} 
                    for date, count in daily_searches
                ],
                "risk_distribution": [
                    {"risk_level": level, "count": count} 
                    for level, count in risk_distribution
                ],
                "source_distribution": [
                    {"data_source": source, "count": count} 
                    for source, count in source_distribution
                ],
                "type_distribution": [
                    {"search_type": stype, "count": count} 
                    for stype, count in type_distribution
                ],
                "performance_metrics": {
                    "avg_execution_time_ms": round(avg_execution_time, 2) if avg_execution_time else 0,
                    "avg_results_count": round(avg_results_count, 2) if avg_results_count else 0
                },
                "top_queries": [
                    {"query": query, "count": count} 
                    for query, count in top_queries
                ],
                "engagement_metrics": {
                    "searches_with_notes": searches_with_notes,
                    "searches_with_starred": searches_with_starred,
                    "note_rate": round(searches_with_notes / total_searches * 100, 2) if total_searches > 0 else 0,
                    "starred_rate": round(searches_with_starred / total_searches * 100, 2) if total_searches > 0 else 0
                },
                "compliance_metrics": {
                    "high_risk_searches": high_risk_searches,
                    "high_risk_rate": round(high_risk_searches / total_searches * 100, 2) if total_searches > 0 else 0
                },
                "generated_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error generating search analytics: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to generate analytics: {str(e)}")
    
    def get_similar_searches(
        self,
        user_id: int,
        query: str,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Find similar searches based on query similarity
        
        Args:
            user_id: User ID to search within
            query: Query to find similar searches for
            limit: Maximum number of similar searches to return
            
        Returns:
            List of similar search history items
        """
        try:
            # Simple similarity search using LIKE and trigram similarity (if available)
            query_words = query.lower().split()
            
            # Build OR conditions for each word in the query
            conditions = []
            for word in query_words:
                if len(word) > 2:  # Only search for words longer than 2 characters
                    conditions.append(SearchHistory.query.ilike(f"%{word}%"))
            
            if not conditions:
                return []
            
            similar_searches = self.db.query(SearchHistory).filter(
                SearchHistory.user_id == user_id,
                or_(*conditions),
                SearchHistory.query != query  # Exclude exact match
            ).order_by(SearchHistory.created_at.desc()).limit(limit).all()
            
            # Format results
            results = []
            for search in similar_searches:
                results.append({
                    "id": search.id,
                    "query": search.query,
                    "search_type": search.search_type,
                    "results_count": search.results_count,
                    "risk_level": search.risk_level,
                    "created_at": search.created_at.isoformat(),
                    "data_source": search.data_source
                })
            
            return results
            
        except Exception as e:
            logger.error(f"Error finding similar searches: {str(e)}")
            return []
    
    def delete_search_history(
        self,
        user_id: int,
        search_history_id: int
    ) -> bool:
        """
        Delete a search history item (with all related notes and starred entities)
        
        Args:
            user_id: User ID (for authorization)
            search_history_id: Search history ID to delete
            
        Returns:
            True if deleted successfully, False otherwise
        """
        try:
            search_history = self.db.query(SearchHistory).filter(
                SearchHistory.id == search_history_id,
                SearchHistory.user_id == user_id
            ).first()
            
            if not search_history:
                raise HTTPException(status_code=404, detail="Search history not found")
            
            # Delete the search history (cascading will handle notes and starred entities)
            self.db.delete(search_history)
            self.db.commit()
            
            logger.info(f"Deleted search history {search_history_id} for user {user_id}")
            return True
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error deleting search history: {str(e)}")
            self.db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to delete search history: {str(e)}")
    
    def bulk_delete_search_history(
        self,
        user_id: int,
        search_history_ids: List[int]
    ) -> Dict[str, Any]:
        """
        Bulk delete multiple search history items
        
        Args:
            user_id: User ID (for authorization)
            search_history_ids: List of search history IDs to delete
            
        Returns:
            Dict with deletion results
        """
        try:
            deleted_count = 0
            failed_ids = []
            
            for search_id in search_history_ids:
                try:
                    if self.delete_search_history(user_id, search_id):
                        deleted_count += 1
                except:
                    failed_ids.append(search_id)
            
            return {
                "deleted_count": deleted_count,
                "total_requested": len(search_history_ids),
                "failed_ids": failed_ids,
                "success": len(failed_ids) == 0
            }
            
        except Exception as e:
            logger.error(f"Error in bulk delete: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to bulk delete: {str(e)}")

# Service factory function
def get_search_history_service(db: Session) -> AdvancedSearchHistoryService:
    """Get search history service instance"""
    return AdvancedSearchHistoryService(db)