# backend/app/api/v1/endpoints/search.py - Updated with authentication and audit logging

from fastapi import APIRouter, HTTPException, Depends, Request
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from sqlalchemy.orm import Session
import httpx
import asyncio
import logging
from app.core.config import settings
from app.database import get_db
from app.models.search_history import SearchHistory
from app.models.search_notes import SearchNote
from app.models.starred_entity import StarredEntity
from app.models.user import User
from app.models.audit_log import AuditLog
from app.core.auth import get_current_user
from app.core.permissions import require_analyst_or_above, require_compliance_officer_or_above, can_search_entities
from app.services.moroccan_entities import moroccan_entities_service

logger = logging.getLogger(__name__)
router = APIRouter()

class SearchRequest(BaseModel):
    query: str
    dataset: str = "default"
    limit: int = 10
    offset: int = 0
    schema: Optional[str] = None
    countries: Optional[List[str]] = None
    topics: Optional[List[str]] = None
    # Enhanced search criteria based on OpenSanctions API
    include_dataset: Optional[List[str]] = None
    exclude_dataset: Optional[List[str]] = None
    exclude_schema: Optional[List[str]] = None
    changed_since: Optional[str] = None
    datasets: Optional[List[str]] = None
    sort: Optional[List[str]] = None
    fuzzy: bool = False
    simple: bool = False
    facets: Optional[List[str]] = ["countries", "topics", "datasets"]
    filter_op: str = "OR"  # OR or AND for combining filters
    # Morocco-specific filters
    risk_level: Optional[List[str]] = None
    political_party: Optional[str] = None
    region: Optional[str] = None
    position_type: Optional[str] = None  # parliament, regional, municipal
    mandate_year: Optional[str] = None

class NoteRequest(BaseModel):
    search_history_id: int
    entity_id: str
    entity_name: str
    note_text: str
    risk_assessment: Optional[str] = None
    action_taken: Optional[str] = None
    user_id: Optional[int] = 1

class StarEntityRequest(BaseModel):
    search_history_id: int
    entity_id: str
    entity_name: str
    entity_data: dict
    relevance_score: Optional[float] = 0.0
    risk_level: Optional[str] = "LOW"
    tags: Optional[str] = None
    user_id: Optional[int] = 1

class SearchNotesRequest(BaseModel):
    notes: str

class StarredEntityNotesRequest(BaseModel):
    notes: str

@router.post("/entities")
async def search_entities(
    request: SearchRequest, 
    http_request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst_or_above)
) -> Dict[str, Any]:
    """Search for entities using OpenSanctions API with better error handling"""
    
    opensanctions_url = settings.OPENSANCTIONS_BASE_URL
    
    # First, check if OpenSanctions is healthy
    opensanctions_status = await check_opensanctions_health()
    
    if opensanctions_status["status"] != "healthy":
        logger.warning(f"OpenSanctions not healthy: {opensanctions_status['message']}")
        return generate_fallback_response(request, opensanctions_status)
    
    try:
        # Prepare search parameters with enhanced criteria
        params = {
            "q": request.query,
            "limit": request.limit,
            "offset": request.offset,
            "filter_op": request.filter_op,
            "fuzzy": request.fuzzy,
            "simple": request.simple
        }
        
        # Add facets
        if request.facets:
            params["facets"] = request.facets
        
        # Basic filters
        if request.schema:
            params["schema"] = request.schema
        if request.countries:
            params["countries"] = request.countries
        if request.topics:
            params["topics"] = request.topics
            
        # Enhanced OpenSanctions filters
        if request.include_dataset:
            params["include_dataset"] = request.include_dataset
        if request.exclude_dataset:
            params["exclude_dataset"] = request.exclude_dataset
        if request.exclude_schema:
            params["exclude_schema"] = request.exclude_schema
        if request.changed_since:
            params["changed_since"] = request.changed_since
        if request.datasets:
            params["datasets"] = request.datasets
        if request.sort:
            params["sort"] = request.sort
            
        logger.info(f"Searching OpenSanctions API: {opensanctions_url}/search/{request.dataset}")
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{opensanctions_url}/search/{request.dataset}",
                params=params
            )
            
            logger.info(f"OpenSanctions response status: {response.status_code}")
            
            if response.status_code == 200:
                opensanctions_data = response.json()
                
                # Use OpenSanctions results as-is, maintaining original order and scores
                opensanctions_results = opensanctions_data.get("results", [])
                
                # Only add minimal risk assessment without changing OpenSanctions scores or order
                enhanced_results = []
                for entity in opensanctions_results:
                    # Keep original OpenSanctions entity completely intact
                    enhanced_entity = {
                        **entity,
                        # Only add minimal risk level assessment without affecting core data
                        "risk_level": get_risk_level_from_opensanctions_score(entity.get("score", 0)),
                    }
                    enhanced_results.append(enhanced_entity)

                # Add Moroccan entities only as supplementary data with very low priority
                moroccan_matches = []
                if len(enhanced_results) < request.limit:
                    moroccan_search_filters = {
                        "schema_filter": request.schema,
                        "risk_level": request.risk_level,
                        "political_party": request.political_party,
                        "region": request.region,
                        "position_type": request.position_type,
                        "mandate_year": request.mandate_year
                    }
                    
                    # Get moroccan entities but drastically reduce their influence
                    raw_moroccan = moroccan_entities_service.search_entities_enhanced(
                        request.query, 
                        **moroccan_search_filters
                    )
                    
                    # Mark moroccan entities as supplementary with very low scores
                    for entity in raw_moroccan:
                        # Ensure moroccan entities never outrank OpenSanctions
                        entity["score"] = min(entity.get("score", 0) * 0.1, 0.1)  # Cap at 0.1
                        entity["data_source"] = "moroccan_supplementary"
                        entity["supplementary"] = True
                    
                    # Only add a few moroccan results if OpenSanctions has few results
                    moroccan_matches = raw_moroccan[:2]  # Maximum 2 supplementary results
                
                # Keep OpenSanctions results first, exactly as returned by their API
                all_results = enhanced_results
                if moroccan_matches and len(enhanced_results) < 5:  # Only add if OS has <5 results
                    all_results.extend(moroccan_matches)
                
                # Apply pagination without any additional sorting - preserve OpenSanctions order
                start_idx = request.offset
                end_idx = start_idx + request.limit
                paginated_results = all_results[start_idx:end_idx]
                
                response_data = {
                    "results": paginated_results,
                    "total": {"value": len(all_results)},
                    "opensanctions_total": opensanctions_data.get("total", {"value": len(enhanced_results)}),
                    "opensanctions_results": len(enhanced_results),
                    "moroccan_supplementary": len(moroccan_matches),
                    "query": request.query,
                    "dataset": request.dataset,
                    "source": "opensanctions" if len(moroccan_matches) == 0 else "opensanctions+supplementary",
                    "api_url": f"{opensanctions_url}/search/{request.dataset}",
                    "status": "success",
                    "note": "Results ordered by OpenSanctions relevance with minimal supplementary data"
                }
                
                # Save search to history (using all results)
                history_source = "opensanctions" if len(moroccan_matches) == 0 else "opensanctions+supplementary"
                await save_search_to_history(db, request, paginated_results, history_source, current_user.id)
                
                # Log audit action
                audit_log = AuditLog(
                    user_id=current_user.id,
                    action="SEARCH_ENTITIES",
                    resource=f"query:{request.query}",
                    ip_address=http_request.client.host,
                    user_agent=http_request.headers.get("user-agent"),
                    extra_data={
                        "dataset": request.dataset,
                        "results_count": len(paginated_results),
                        "opensanctions_results": len(enhanced_results),
                        "moroccan_results": len(moroccan_matches)
                    }
                )
                db.add(audit_log)
                db.commit()
                
                return response_data
                
            elif response.status_code == 500:
                # Handle 500 errors specifically
                logger.warning("OpenSanctions returned 500 - likely still initializing")
                error_detail = "OpenSanctions API is still initializing (HTTP 500)"
                
                try:
                    error_response = response.json()
                    error_detail = error_response.get("detail", error_detail)
                except:
                    pass
                
                fallback_response = generate_fallback_response(request, {
                    "status": "initializing", 
                    "message": error_detail,
                    "http_status": 500
                })
                # Save fallback search to history
                mock_results = fallback_response["results"]
                await save_search_to_history(db, request, mock_results, "mock")
                return fallback_response
                
            elif response.status_code == 404:
                logger.warning(f"Dataset '{request.dataset}' not found")
                fallback_response = generate_fallback_response(request, {
                    "status": "dataset_not_found",
                    "message": f"Dataset '{request.dataset}' not available",
                    "http_status": 404
                })
                mock_results = fallback_response["results"]
                await save_search_to_history(db, request, mock_results, "mock")
                return fallback_response
                
            else:
                logger.warning(f"OpenSanctions API returned unexpected status {response.status_code}")
                fallback_response = generate_fallback_response(request, {
                    "status": "api_error",
                    "message": f"API returned status {response.status_code}",
                    "http_status": response.status_code
                })
                mock_results = fallback_response["results"]
                await save_search_to_history(db, request, mock_results, "mock")
                return fallback_response
                
    except httpx.TimeoutException:
        logger.error("OpenSanctions API timeout")
        fallback_response = generate_fallback_response(request, {
            "status": "timeout",
            "message": "OpenSanctions API timeout - service may be overloaded"
        })
        mock_results = fallback_response["results"]
        await save_search_to_history(db, request, mock_results, "mock")
        return fallback_response
        
    except httpx.ConnectError:
        logger.error("Cannot connect to OpenSanctions API")
        fallback_response = generate_fallback_response(request, {
            "status": "connection_error",
            "message": "Cannot connect to OpenSanctions API - service may be down"
        })
        mock_results = fallback_response["results"]
        await save_search_to_history(db, request, mock_results, "mock")
        return fallback_response
        
    except Exception as e:
        logger.error(f"Unexpected error calling OpenSanctions API: {str(e)}")
        fallback_response = generate_fallback_response(request, {
            "status": "unexpected_error",
            "message": str(e)
        })
        mock_results = fallback_response["results"]
        await save_search_to_history(db, request, mock_results, "mock")
        return fallback_response

async def check_opensanctions_health() -> Dict[str, Any]:
    """Check if OpenSanctions API is healthy"""
    
    try:
        opensanctions_url = settings.OPENSANCTIONS_BASE_URL
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Try the health endpoint first
            health_response = await client.get(f"{opensanctions_url}/healthz")
            
            if health_response.status_code == 200:
                return {
                    "status": "healthy",
                    "message": "OpenSanctions API is ready"
                }
            else:
                return {
                    "status": "unhealthy",
                    "message": f"Health check returned {health_response.status_code}",
                    "http_status": health_response.status_code
                }
                
    except httpx.TimeoutException:
        return {
            "status": "timeout",
            "message": "Health check timeout"
        }
    except httpx.ConnectError:
        return {
            "status": "connection_error", 
            "message": "Cannot connect to OpenSanctions API"
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Health check failed: {str(e)}"
        }

async def save_search_to_history(db: Session, request: SearchRequest, results: List[Dict], source: str, user_id: int):
    """Save search results to history database"""
    try:
        # Calculate risk metrics
        relevance_scores = [r.get("score", 0) * 100 if r.get("score") else 0 for r in results]
        avg_relevance = sum(relevance_scores) / len(relevance_scores) if relevance_scores else 0
        max_relevance = max(relevance_scores) if relevance_scores else 0
        
        risk_level = "HIGH" if max_relevance >= 80 else "MEDIUM" if max_relevance >= 50 else "LOW"
        
        # Determine search type
        search_type = determine_search_type(request.query)
        
        # Create history entry
        history_entry = SearchHistory(
            query=request.query,
            search_type=search_type,
            results_count=len(results),
            risk_level=risk_level,
            relevance_score=avg_relevance,
            data_source=source,
            results_data=results,  # Store full results for later reference
            user_id=user_id
        )
        
        db.add(history_entry)
        db.commit()
        db.refresh(history_entry)
        
        logger.info(f"Saved search to history: {history_entry.id}")
        
    except Exception as e:
        logger.error(f"Failed to save search to history: {e}")
        db.rollback()

def determine_search_type(query: str) -> str:
    """Determine if search is for Person or Company based on query"""
    company_indicators = ["ltd", "inc", "corp", "llc", "company", "bank", "group", "holdings"]
    query_lower = query.lower()
    
    if any(indicator in query_lower for indicator in company_indicators):
        return "Company"
    return "Person"

def generate_fallback_response(request: SearchRequest, error_info: Dict[str, Any]) -> Dict[str, Any]:
    """Generate fallback response with Moroccan entities and mock data"""
    
    # Always try to get Moroccan entities first
    moroccan_matches = moroccan_entities_service.search_entities(
        request.query, 
        schema_filter=request.schema
    )
    
    # If no Moroccan matches, use mock data
    if not moroccan_matches:
        mock_entities = generate_mock_results(request.query)
        all_results = mock_entities
        source = "mock"
    else:
        # Use Moroccan entities as primary results
        all_results = moroccan_matches
        source = "moroccan"
        
        # Optionally add some mock results to pad if needed
        if len(moroccan_matches) < request.limit:
            mock_entities = generate_mock_results(request.query)
            all_results.extend(mock_entities[:request.limit - len(moroccan_matches)])
            source = "moroccan+mock"
    
    # Apply pagination
    start_idx = request.offset
    end_idx = start_idx + request.limit
    paginated_results = all_results[start_idx:end_idx]
    
    return {
        "results": paginated_results,
        "total": {"value": len(all_results)},
        "moroccan_matches": len(moroccan_matches),
        "query": request.query,
        "dataset": request.dataset,
        "source": source,
        "status": "fallback",
        "opensanctions_status": error_info["status"],
        "opensanctions_message": error_info["message"],
        "note": f"Using {source} data - OpenSanctions {error_info['status']}",
        "error": error_info["message"],
        "http_status": error_info.get("http_status"),
        "troubleshooting": get_troubleshooting_tips(error_info["status"])
    }

def get_troubleshooting_tips(status: str) -> List[str]:
    """Get troubleshooting tips based on error status"""
    
    tips = {
        "initializing": [
            "OpenSanctions is still starting up (can take 10-15 minutes)",
            "Check logs: docker-compose logs opensanctions-api",
            "Wait for data indexing to complete"
        ],
        "connection_error": [
            "Check if OpenSanctions container is running: docker-compose ps",
            "Verify network connectivity between containers",
            "Try restarting: docker-compose restart opensanctions-api"
        ],
        "timeout": [
            "OpenSanctions may be overloaded or slow",
            "Check system resources (CPU/Memory)",
            "Try restarting the service"
        ],
        "unhealthy": [
            "OpenSanctions health check failed",
            "Check Elasticsearch status: curl http://localhost:9200/_cluster/health",
            "Check OpenSanctions logs for errors"
        ],
        "dataset_not_found": [
            "The requested dataset may not be available",
            "Try using 'default' dataset",
            "Check available datasets: curl http://localhost:9000/datasets"
        ]
    }
    
    return tips.get(status, ["Check OpenSanctions logs and documentation"])

@router.get("/history")
async def get_search_history(
    limit: int = 50, 
    offset: int = 0, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get search history with pagination"""
    
    try:
        # Filter by current user only
        total = db.query(SearchHistory).filter(SearchHistory.user_id == current_user.id).count()
        searches = db.query(SearchHistory)\
            .filter(SearchHistory.user_id == current_user.id)\
            .order_by(SearchHistory.created_at.desc())\
            .offset(offset)\
            .limit(limit)\
            .all()
        
        items = [
            {
                "id": search.id,
                "query": search.query,
                "search_type": search.search_type,
                "results_count": search.results_count,
                "risk_level": search.risk_level,
                "relevance_score": search.relevance_score,
                "created_at": search.created_at.isoformat(),
                "data_source": search.data_source,
                "execution_time_ms": search.execution_time_ms,
                "is_starred": getattr(search, 'is_starred', False),
                "tags": getattr(search, 'tags', None)
            }
            for search in searches
        ]
        
        return {
            "items": items,
            "total": total,
            "page": (offset // limit) + 1,
            "pages": (total + limit - 1) // limit,
            "limit": limit,
            "offset": offset,
            "source": "database"
        }
        
    except Exception as e:
        logger.error(f"Failed to get search history: {e}")
        return {
            "items": [],
            "total": 0,
            "page": 1,
            "pages": 0,
            "limit": limit,
            "offset": offset,
            "source": "error",
            "error": str(e)
        }

@router.post("/notes")
async def add_note(
    note_request: NoteRequest, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Add a note to a specific search result entity"""
    try:
        # Verify search history exists and belongs to current user
        search_history = db.query(SearchHistory).filter(
            SearchHistory.id == note_request.search_history_id,
            SearchHistory.user_id == current_user.id
        ).first()
        if not search_history:
            raise HTTPException(status_code=404, detail="Search history not found")
        
        # Create note
        note = SearchNote(
            search_history_id=note_request.search_history_id,
            entity_id=note_request.entity_id,
            entity_name=note_request.entity_name,
            note_text=note_request.note_text,
            risk_assessment=note_request.risk_assessment,
            action_taken=note_request.action_taken,
            user_id=current_user.id  # Use authenticated user's ID
        )
        
        db.add(note)
        db.commit()
        db.refresh(note)
        
        return {
            "id": note.id,
            "message": "Note added successfully",
            "entity_name": note.entity_name
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to add note: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to add note")

@router.get("/notes/{search_history_id}")
async def get_notes(
    search_history_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get all notes for a specific search history"""
    try:
        # Verify search belongs to current user and get notes from that search
        search_history = db.query(SearchHistory).filter(
            SearchHistory.id == search_history_id,
            SearchHistory.user_id == current_user.id
        ).first()
        if not search_history:
            raise HTTPException(status_code=404, detail="Search history not found")
        
        notes = db.query(SearchNote).filter(
            SearchNote.search_history_id == search_history_id,
            SearchNote.user_id == current_user.id
        ).all()
        
        return {
            "notes": [
                {
                    "id": note.id,
                    "entity_id": note.entity_id,
                    "entity_name": note.entity_name,
                    "note_text": note.note_text,
                    "risk_assessment": note.risk_assessment,
                    "action_taken": note.action_taken,
                    "created_at": note.created_at.isoformat(),
                    "updated_at": note.updated_at.isoformat()
                }
                for note in notes
            ],
            "total": len(notes)
        }
        
    except Exception as e:
        logger.error(f"Failed to get notes: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve notes")

@router.get("/history/{history_id}/details")
async def get_search_details(
    history_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get detailed search results with notes"""
    try:
        search_history = db.query(SearchHistory).filter(
            SearchHistory.id == history_id,
            SearchHistory.user_id == current_user.id
        ).first()
        if not search_history:
            raise HTTPException(status_code=404, detail="Search history not found")
        
        # Get notes for this search
        notes = db.query(SearchNote).filter(SearchNote.search_history_id == history_id).all()
        
        # Group notes by entity_id
        notes_by_entity = {}
        for note in notes:
            if note.entity_id not in notes_by_entity:
                notes_by_entity[note.entity_id] = []
            notes_by_entity[note.entity_id].append({
                "id": note.id,
                "note_text": note.note_text,
                "risk_assessment": note.risk_assessment,
                "action_taken": note.action_taken,
                "created_at": note.created_at.isoformat(),
                "updated_at": note.updated_at.isoformat()
            })
        
        return {
            "search_history": {
                "id": search_history.id,
                "query": search_history.query,
                "search_type": search_history.search_type,
                "results_count": search_history.results_count,
                "risk_level": search_history.risk_level,
                "relevance_score": search_history.relevance_score,
                "data_source": search_history.data_source,
                "created_at": search_history.created_at.isoformat(),
                "results_data": search_history.results_data or []
            },
            "notes_by_entity": notes_by_entity,
            "total_notes": len(notes)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get search details: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve search details")


@router.post("/entities/star")
async def star_entity(
    request: StarEntityRequest, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Star an individual entity from search results"""
    
    try:
        # Check if entity is already starred by this user in this search
        existing = db.query(StarredEntity).filter(
            StarredEntity.entity_id == request.entity_id,
            StarredEntity.search_history_id == request.search_history_id,
            StarredEntity.user_id == current_user.id
        ).first()
        
        if existing:
            return {
                "id": existing.id,
                "entity_id": existing.entity_id,
                "already_starred": True,
                "message": "Entity is already starred"
            }
        
        # Verify search history exists and belongs to current user
        search_history = db.query(SearchHistory).filter(
            SearchHistory.id == request.search_history_id,
            SearchHistory.user_id == current_user.id
        ).first()
        if not search_history:
            raise HTTPException(status_code=404, detail="Search history not found")
        
        # Create starred entity
        starred_entity = StarredEntity(
            search_history_id=request.search_history_id,
            entity_id=request.entity_id,
            entity_name=request.entity_name,
            entity_data=request.entity_data,
            relevance_score=request.relevance_score,
            risk_level=request.risk_level,
            tags=request.tags,
            user_id=current_user.id  # Use authenticated user's ID
        )
        
        db.add(starred_entity)
        db.commit()
        db.refresh(starred_entity)
        
        return {
            "id": starred_entity.id,
            "entity_id": starred_entity.entity_id,
            "entity_name": starred_entity.entity_name,
            "starred": True,
            "message": "Entity starred successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to star entity: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to star entity")

@router.delete("/entities/star/{entity_id}/search/{search_history_id}")
async def unstar_entity(
    entity_id: str, 
    search_history_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Remove star from an entity"""
    
    try:
        starred_entity = db.query(StarredEntity).filter(
            StarredEntity.entity_id == entity_id,
            StarredEntity.search_history_id == search_history_id,
            StarredEntity.user_id == current_user.id
        ).first()
        
        if not starred_entity:
            raise HTTPException(status_code=404, detail="Starred entity not found")
        
        db.delete(starred_entity)
        db.commit()
        
        return {
            "entity_id": entity_id,
            "starred": False,
            "message": "Entity unstarred successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to unstar entity: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to unstar entity")

@router.get("/entities/starred")
async def get_starred_entities(
    limit: int = 50, 
    offset: int = 0, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get all starred entities with search context"""
    
    try:
        from sqlalchemy.orm import joinedload
        
        total = db.query(StarredEntity).filter(StarredEntity.user_id == current_user.id).count()
        starred_entities = db.query(StarredEntity)\
            .filter(StarredEntity.user_id == current_user.id)\
            .options(joinedload(StarredEntity.search_history))\
            .order_by(StarredEntity.starred_at.desc())\
            .offset(offset)\
            .limit(limit)\
            .all()
        
        items = [
            {
                "id": entity.id,
                "entity_id": entity.entity_id,
                "entity_name": entity.entity_name,
                "entity_data": entity.entity_data,
                "relevance_score": entity.relevance_score,
                "risk_level": entity.risk_level,
                "tags": entity.tags,
                "notes": entity.notes,  # Include starred entity notes
                "starred_at": entity.starred_at.isoformat(),
                "search_context": {
                    "search_id": entity.search_history.id,
                    "query": entity.search_history.query,
                    "search_type": entity.search_history.search_type,
                    "created_at": entity.search_history.created_at.isoformat(),
                    "data_source": entity.search_history.data_source
                }
            }
            for entity in starred_entities
        ]
        
        return {
            "items": items,
            "total": total,
            "page": (offset // limit) + 1,
            "pages": (total + limit - 1) // limit,
            "limit": limit,
            "offset": offset
        }
        
    except Exception as e:
        logger.error(f"Failed to get starred entities: {e}")
        return {
            "items": [],
            "total": 0,
            "page": 1,
            "pages": 0,
            "limit": limit,
            "offset": offset,
            "error": str(e)
        }

@router.get("/entities/starred/search/{search_history_id}")
async def get_starred_entities_for_search(
    search_history_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get starred entities for a specific search"""
    
    try:
        starred_entities = db.query(StarredEntity)\
            .filter(
                StarredEntity.search_history_id == search_history_id,
                StarredEntity.user_id == current_user.id
            )\
            .all()
        
        # Return a set of entity_ids for quick lookup
        starred_entity_ids = {entity.entity_id for entity in starred_entities}
        
        return {
            "search_id": search_history_id,
            "starred_entity_ids": list(starred_entity_ids),
            "count": len(starred_entity_ids)
        }
        
    except Exception as e:
        logger.error(f"Failed to get starred entities for search: {e}")
        return {
            "search_id": search_history_id,
            "starred_entity_ids": [],
            "count": 0,
            "error": str(e)
        }

@router.put("/entities/star/{starred_entity_id}/notes")
async def update_starred_entity_notes(
    starred_entity_id: int,
    request: StarredEntityNotesRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Add or update notes for a starred entity"""
    
    try:
        # Check if starred entity exists and belongs to current user
        starred_entity = db.query(StarredEntity).filter(
            StarredEntity.id == starred_entity_id,
            StarredEntity.user_id == current_user.id
        ).first()
        if not starred_entity:
            raise HTTPException(status_code=404, detail="Starred entity not found")
        
        # Update starred entity with notes
        starred_entity.notes = request.notes
        db.commit()
        
        return {
            "success": True,
            "message": "Notes updated successfully",
            "starred_entity_id": starred_entity_id,
            "entity_name": starred_entity.entity_name,
            "notes": request.notes
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update starred entity notes: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to update notes")

@router.get("/reports/starred-entities")
async def generate_starred_entities_report(
    format: str = "json",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Generate comprehensive report of all starred entities"""
    
    try:
        from datetime import datetime
        from sqlalchemy.orm import joinedload
        
        # Get current user's starred entities with search context
        starred_entities = db.query(StarredEntity)\
            .filter(StarredEntity.user_id == current_user.id)\
            .options(joinedload(StarredEntity.search_history))\
            .order_by(StarredEntity.starred_at.desc())\
            .all()
        
        # Compile report data
        report_items = []
        risk_distribution = {"HIGH": 0, "MEDIUM": 0, "LOW": 0}
        
        for entity in starred_entities:
            risk_distribution[entity.risk_level] += 1
            
            # Get notes for this entity
            entity_notes = db.query(SearchNote)\
                .filter(
                    SearchNote.search_history_id == entity.search_history_id,
                    SearchNote.entity_id == entity.entity_id
                )\
                .all()
            
            notes_data = [
                {
                    "note_text": note.note_text,
                    "risk_assessment": note.risk_assessment,
                    "action_taken": note.action_taken,
                    "created_at": note.created_at.isoformat()
                }
                for note in entity_notes
            ]
            
            report_items.append({
                "starred_entity_id": entity.id,
                "entity_id": entity.entity_id,
                "entity_name": entity.entity_name,
                "entity_data": entity.entity_data,
                "relevance_score": entity.relevance_score,
                "risk_level": entity.risk_level,
                "tags": entity.tags,
                "starred_at": entity.starred_at.isoformat(),
                "search_context": {
                    "search_id": entity.search_history.id,
                    "query": entity.search_history.query,
                    "search_type": entity.search_history.search_type,
                    "created_at": entity.search_history.created_at.isoformat(),
                    "data_source": entity.search_history.data_source
                },
                "notes": notes_data,
                "notes_count": len(notes_data)
            })
        
        # Generate summary
        report_summary = {
            "total_starred_entities": len(starred_entities),
            "risk_distribution": risk_distribution,
            "avg_risk_score": sum(e.relevance_score or 0 for e in starred_entities) / len(starred_entities) if starred_entities else 0,
            "date_range": {
                "earliest": starred_entities[-1].starred_at.isoformat() if starred_entities else None,
                "latest": starred_entities[0].starred_at.isoformat() if starred_entities else None
            },
            "report_generated_at": datetime.utcnow().isoformat()
        }
        
        return {
            "report_type": "starred_entities_detailed",
            "format": format,
            "summary": report_summary,
            "starred_entities": report_items,
            "status": "success"
        }
        
    except Exception as e:
        logger.error(f"Failed to generate starred entities report: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate report")

@router.get("/analytics")
async def get_search_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get comprehensive search analytics"""
    try:
        from sqlalchemy import func, text
        from datetime import datetime, timedelta
        
        # Basic stats - filtered by current user
        total_searches = db.query(SearchHistory).filter(SearchHistory.user_id == current_user.id).count()
        starred_entities_count = db.query(StarredEntity).filter(StarredEntity.user_id == current_user.id).count()
        
        # Risk level distribution - filtered by current user
        risk_stats = db.query(
            SearchHistory.risk_level,
            func.count(SearchHistory.id).label('count')
        ).filter(SearchHistory.user_id == current_user.id).group_by(SearchHistory.risk_level).all()
        
        # Data source stats - filtered by current user
        source_stats = db.query(
            SearchHistory.data_source,
            func.count(SearchHistory.id).label('count')
        ).filter(SearchHistory.user_id == current_user.id).group_by(SearchHistory.data_source).all()
        
        # Recent activity (last 7 days) - filtered by current user
        week_ago = datetime.utcnow() - timedelta(days=7)
        recent_activity = db.query(
            func.date(SearchHistory.created_at).label('date'),
            func.count(SearchHistory.id).label('count')
        ).filter(
            SearchHistory.created_at >= week_ago,
            SearchHistory.user_id == current_user.id
        ).group_by(func.date(SearchHistory.created_at)).all()
        
        # Top queries - filtered by current user
        top_queries = db.query(
            SearchHistory.query,
            func.count(SearchHistory.id).label('count'),
            func.max(SearchHistory.created_at).label('last_searched')
        ).filter(SearchHistory.user_id == current_user.id).group_by(SearchHistory.query).order_by(func.count(SearchHistory.id).desc()).limit(10).all()
        
        # Average risk scores - filtered by current user
        avg_risk_score = db.query(func.avg(SearchHistory.risk_score)).filter(SearchHistory.user_id == current_user.id).scalar() or 0
        
        # Performance stats - filtered by current user
        avg_execution_time = db.query(func.avg(SearchHistory.execution_time_ms)).filter(SearchHistory.user_id == current_user.id).scalar() or 0
        
        return {
            "summary": {
                "total_searches": total_searches,
                "starred_entities": starred_entities_count,
                "avg_risk_score": round(float(avg_risk_score), 2),
                "avg_execution_time_ms": round(float(avg_execution_time), 2)
            },
            "risk_distribution": [
                {"level": r.risk_level, "count": r.count}
                for r in risk_stats
            ],
            "data_sources": [
                {"source": s.data_source, "count": s.count}
                for s in source_stats
            ],
            "recent_activity": [
                {"date": str(a.date), "count": a.count}
                for a in recent_activity
            ],
            "top_queries": [
                {
                    "query": q.query,
                    "count": q.count,
                    "last_searched": q.last_searched.isoformat()
                }
                for q in top_queries
            ]
        }
        
    except Exception as e:
        logger.error(f"Failed to get analytics: {e}")
        return {
            "summary": {"total_searches": 0, "starred_entities": 0, "avg_risk_score": 0, "avg_execution_time_ms": 0},
            "risk_distribution": [],
            "data_sources": [],
            "recent_activity": [],
            "top_queries": []
        }

@router.get("/datasets")
async def get_available_datasets():
    """Get available datasets from OpenSanctions with fallback"""
    
    try:
        opensanctions_url = settings.OPENSANCTIONS_BASE_URL
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{opensanctions_url}/datasets")
            
            if response.status_code == 200:
                datasets_data = response.json()
                return {
                    **datasets_data,
                    "source": "opensanctions",
                    "status": "success"
                }
            else:
                raise Exception(f"Datasets API returned status {response.status_code}")
                
    except Exception as e:
        logger.error(f"Error fetching datasets: {str(e)}")
        
        return {
            "datasets": [
                {"name": "default", "title": "All Datasets", "description": "Combined sanctions and PEP data"},
                {"name": "sanctions", "title": "Sanctions Lists", "description": "International sanctions lists"},
                {"name": "pep", "title": "Politically Exposed Persons", "description": "PEP databases"},
                {"name": "crime", "title": "Criminal Lists", "description": "Criminal databases"}
            ],
            "source": "mock",
            "status": "fallback",
            "error": str(e),
            "note": "OpenSanctions datasets API unavailable - showing default options"
        }

@router.get("/status")
async def get_opensanctions_status():
    """Get detailed OpenSanctions status for debugging"""
    
    # Check OpenSanctions health
    opensanctions_health = await check_opensanctions_health()
    
    # Check Elasticsearch health
    elasticsearch_health = await check_elasticsearch_health()
    
    return {
        "opensanctions": opensanctions_health,
        "elasticsearch": elasticsearch_health,
        "backend": {
            "status": "healthy",
            "message": "Backend API is operational"
        },
        "overall_status": "healthy" if opensanctions_health["status"] == "healthy" else "degraded"
    }

async def check_elasticsearch_health() -> Dict[str, Any]:
    """Check Elasticsearch health"""
    
    try:
        # Try to connect to Elasticsearch through the OpenSanctions network
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get("http://opensanctions-index:9200/_cluster/health")
            
            if response.status_code == 200:
                es_data = response.json()
                return {
                    "status": "healthy" if es_data.get("status") in ["green", "yellow"] else "unhealthy",
                    "cluster_status": es_data.get("status"),
                    "message": f"Elasticsearch cluster is {es_data.get('status')}"
                }
            else:
                return {
                    "status": "unhealthy",
                    "message": f"Elasticsearch returned {response.status_code}"
                }
                
    except Exception as e:
        return {
            "status": "error",
            "message": f"Cannot connect to Elasticsearch: {str(e)}"
        }


# Keep the existing helper functions (enhance_entity_for_morocco, generate_mock_results, etc.)
def enhance_entity_for_morocco(entity: Dict[str, Any]) -> Dict[str, Any]:
    """Enhance entity data with Morocco-specific risk assessment"""
    
    base_score = entity.get("score", 0.5) * 100
    morocco_risk_factors = 0
    
    properties = entity.get("properties", {})
    
    # High risk countries according to FATF and Morocco
    high_risk_countries = ["IR", "KP", "MM", "AF"]
    if any(country in high_risk_countries for country in properties.get("country", [])):
        morocco_risk_factors += 20
        
    # PEP status
    if "pep" in properties.get("topics", []):
        morocco_risk_factors += 15
        
    # Sanctions
    if "sanction" in properties.get("topics", []):
        morocco_risk_factors += 25
        
    # Criminal activity
    if "crime" in properties.get("topics", []):
        morocco_risk_factors += 20
    
    return {
        **entity,
        "morocco_risk_score": min(base_score + morocco_risk_factors, 100),
        "risk_level": get_risk_level(base_score + morocco_risk_factors),
        "recommended_action": get_recommended_action(base_score + morocco_risk_factors)
    }

def get_risk_level(score: float) -> str:
    if score >= 80: return "HIGH"
    elif score >= 50: return "MEDIUM"
    else: return "LOW"

def get_risk_level_from_opensanctions_score(score: float) -> str:
    """Convert OpenSanctions score (0.0-1.0) to risk level without modification"""
    score_percent = score * 100
    if score_percent >= 80: return "HIGH"
    elif score_percent >= 50: return "MEDIUM"
    else: return "LOW"

def get_recommended_action(score: float) -> str:
    if score >= 80:
        return "Enhanced Due Diligence Required - Consider blocking transaction"
    elif score >= 50:
        return "Standard Due Diligence Required - Additional verification recommended"
    else:
        return "Standard Processing - Low risk entity"

def generate_mock_results(query: str) -> List[Dict[str, Any]]:
    """Generate mock results when OpenSanctions is unavailable"""
    
    mock_entities = [
        {
            "id": f"mock-1-{hash(query) % 1000}",
            "caption": query or "Sample Entity",
            "schema": "Person",
            "score": 0.85,
            "properties": {
                "name": [query or "Sample Entity"],
                "country": ["Morocco"],
                "topics": ["sanction"],
                "sourceUrl": ["https://mock.source/entity1"]
            },
            "morocco_risk_score": 85,
            "risk_level": "HIGH",
            "recommended_action": "Enhanced Due Diligence Required"
        },
        {
            "id": f"mock-2-{hash(query) % 1000}",
            "caption": f"{query} Trading LLC" if query else "Sample Company",
            "schema": "Company",
            "score": 0.65,
            "properties": {
                "name": [f"{query} Trading LLC" if query else "Sample Company"],
                "country": ["UAE"],
                "topics": ["pep"],
                "sourceUrl": ["https://mock.source/entity2"]
            },
            "morocco_risk_score": 65,
            "risk_level": "MEDIUM", 
            "recommended_action": "Standard Due Diligence Required"
        }
    ]
    
    return mock_entities

# Enhanced Report Management Endpoints

@router.delete("/history/{search_id}")
async def delete_search_history(
    search_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Delete a search history entry and all associated data"""
    
    try:
        # Check if search exists and belongs to current user
        search = db.query(SearchHistory).filter(
            SearchHistory.id == search_id,
            SearchHistory.user_id == current_user.id
        ).first()
        if not search:
            raise HTTPException(status_code=404, detail="Search not found")
        
        # Delete will cascade to starred_entities and search_notes due to foreign key constraints
        db.delete(search)
        db.commit()
        
        logger.info(f"Deleted search history: {search_id}")
        return {
            "success": True,
            "message": f"Search {search_id} deleted successfully",
            "deleted_search_id": search_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete search: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete search")

@router.put("/history/{search_id}/notes")
async def update_search_notes(
    search_id: int,
    request: SearchNotesRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Add or update notes for a search history entry"""
    
    try:
        # Check if search exists and belongs to current user
        search = db.query(SearchHistory).filter(
            SearchHistory.id == search_id,
            SearchHistory.user_id == current_user.id
        ).first()
        if not search:
            raise HTTPException(status_code=404, detail="Search not found")
        
        # Update search with notes
        search.notes = request.notes
        db.commit()
        
        return {
            "success": True,
            "message": "Notes updated successfully",
            "search_id": search_id,
            "notes": request.notes
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update search notes: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to update notes")

@router.get("/reports/starred-entities/enhanced")
async def generate_enhanced_starred_report(
    format: str = "json",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Generate enhanced report with full OpenSanctions details"""
    
    try:
        from sqlalchemy.orm import joinedload
        
        # Get current user's starred entities with full context
        starred_entities = db.query(StarredEntity)\
            .filter(StarredEntity.user_id == current_user.id)\
            .options(joinedload(StarredEntity.search_history))\
            .order_by(StarredEntity.starred_at.desc())\
            .all()
        
        # Get current user's search history with full data
        search_histories = db.query(SearchHistory)\
            .filter(SearchHistory.user_id == current_user.id)\
            .order_by(SearchHistory.created_at.desc())\
            .all()
        
        report_data = {
            "report_metadata": {
                "generated_at": datetime.now().isoformat(),
                "total_starred_entities": len(starred_entities),
                "total_searches": len(search_histories),
                "report_type": "enhanced_starred_entities"
            },
            "starred_entities": [],
            "search_histories": [],
            "risk_analysis": {
                "risk_distribution": {"HIGH": 0, "MEDIUM": 0, "LOW": 0},
                "average_risk_score": 0,
                "highest_risk_entity": None
            }
        }
        
        highest_risk_score = 0
        total_risk_score = 0
        
        # Process starred entities with full details
        for entity in starred_entities:
            risk_level = entity.risk_level or "LOW"
            report_data["risk_analysis"]["risk_distribution"][risk_level] += 1
            
            risk_score = entity.relevance_score or 0
            total_risk_score += risk_score
            
            if risk_score > highest_risk_score:
                highest_risk_score = risk_score
                report_data["risk_analysis"]["highest_risk_entity"] = {
                    "entity_id": entity.entity_id,
                    "entity_name": entity.entity_name,
                    "risk_score": risk_score
                }
            
            # Get all notes for this entity
            entity_notes = db.query(SearchNote)\
                .filter(
                    SearchNote.search_history_id == entity.search_history_id,
                    SearchNote.entity_id == entity.entity_id
                )\
                .all()
            
            # Extract and structure comprehensive entity information
            entity_info = entity.entity_data or {}
            properties = entity_info.get('properties', {})
            
            # Structure the entity data with all important OpenSanctions information
            entity_data = {
                "id": entity.id,
                "entity_id": entity.entity_id,
                "entity_name": entity.entity_name,
                "relevance_score": entity.relevance_score,
                "risk_level": entity.risk_level,
                "tags": entity.tags,
                "starred_at": entity.starred_at.isoformat(),
                "search_context": {
                    "search_id": entity.search_history_id,
                    "query": entity.search_history.query,
                    "search_date": entity.search_history.created_at.isoformat(),
                    "data_source": entity.search_history.data_source,
                    "notes": getattr(entity.search_history, 'notes', None)
                },
                "entity_details": {
                    "schema": entity_info.get('schema'),
                    "personal_information": {
                        "birth_date": properties.get('birthDate', []),
                        "birth_place": properties.get('birthPlace', []),
                        "birth_country": properties.get('birthCountry', []),
                        "gender": properties.get('gender', []),
                        "nationality": properties.get('nationality', []),
                        "citizenship": properties.get('citizenship', []),
                        "ethnicity": properties.get('ethnicity', []),
                        "religion": properties.get('religion', [])
                    },
                    "identification": {
                        "names": properties.get('name', []),
                        "aliases": properties.get('alias', []),
                        "weak_aliases": properties.get('weakAlias', []),
                        "first_name": properties.get('firstName', []),
                        "last_name": properties.get('lastName', []),
                        "father_name": properties.get('fatherName', []),
                        "middle_name": properties.get('middleName', []),
                        "second_name": properties.get('secondName', []),
                        "tax_number": properties.get('taxNumber', []),
                        "wikidata_id": properties.get('wikidataId', []),
                        "unique_entity_id": properties.get('uniqueEntityId', [])
                    },
                    "professional_information": {
                        "classification": properties.get('classification', []),
                        "positions": properties.get('position', []),
                        "titles": properties.get('title', []),
                        "education": properties.get('education', [])
                    },
                    "location_and_contact": {
                        "countries": properties.get('country', []),
                        "addresses": properties.get('address', []),
                        "websites": properties.get('website', []),
                        "source_urls": properties.get('sourceUrl', [])
                    },
                    "sanctions_information": {
                        "topics": properties.get('topics', []),
                        "descriptions": properties.get('description', []),
                        "opensanctions_notes": properties.get('notes', []),
                        "created_at": properties.get('createdAt', []),
                        "modified_at": properties.get('modifiedAt', [])
                    }
                },
                "full_raw_data": entity.entity_data,  # Complete original OpenSanctions data
                "starred_entity_notes": entity.notes,  # Direct notes on the starred entity
                "compliance_notes": [
                    {
                        "note_text": note.note_text,
                        "risk_assessment": note.risk_assessment,
                        "action_taken": note.action_taken,
                        "created_at": note.created_at.isoformat()
                    } for note in entity_notes
                ]
            }
            
            report_data["starred_entities"].append(entity_data)
        
        # Calculate average risk score
        if len(starred_entities) > 0:
            report_data["risk_analysis"]["average_risk_score"] = total_risk_score / len(starred_entities)
        
        # Process search histories with full results data
        for search in search_histories:
            search_data = {
                "id": search.id,
                "query": search.query,
                "search_type": search.search_type,
                "results_count": search.results_count,
                "risk_level": search.risk_level,
                "relevance_score": search.relevance_score,
                "data_source": search.data_source,
                "execution_time_ms": search.execution_time_ms,
                "created_at": search.created_at.isoformat(),
                "notes": getattr(search, 'notes', None),
                "full_results_data": search.results_data  # Complete search results
            }
            
            report_data["search_histories"].append(search_data)
        
        return report_data
        
    except Exception as e:
        logger.error(f"Failed to generate enhanced report: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate enhanced report")

@router.get("/reports/starred-entities/csv")
async def export_starred_entities_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Export starred entities report as CSV"""
    
    try:
        from fastapi.responses import StreamingResponse
        import csv
        import io
        from sqlalchemy.orm import joinedload
        
        # Get current user's starred entities
        starred_entities = db.query(StarredEntity)\
            .filter(StarredEntity.user_id == current_user.id)\
            .options(joinedload(StarredEntity.search_history))\
            .order_by(StarredEntity.starred_at.desc())\
            .all()
        
        # Create CSV in memory
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write comprehensive headers
        writer.writerow([
            'Entity ID', 'Entity Name', 'Risk Score', 'Risk Level', 'Tags',
            'Search Query', 'Search Date', 'Data Source', 'Starred Date',
            'Entity Type', 'Countries', 'Birth Country', 'Nationality', 'Citizenship',
            'Birth Date', 'Birth Place', 'Gender', 'Classification', 
            'Current Positions', 'All Names/Aliases', 'First Name', 'Last Name', 'Father Name',
            'Topics', 'Source URLs', 'Address', 'Tax Number', 'Title',
            'Education', 'Religion', 'Ethnicity', 'Website', 'Wikidata ID',
            'Description', 'Notes from OpenSanctions', 'Starred Entity Notes', 'Notes Count', 'Created At', 'Modified At'
        ])
        
        # Write data rows with all available information
        for entity in starred_entities:
            # Extract comprehensive data from entity_data
            entity_info = entity.entity_data or {}
            properties = entity_info.get('properties', {})
            
            # Basic entity information
            entity_type = entity_info.get('schema', '')
            countries = '; '.join(properties.get('country', []))
            birth_country = '; '.join(properties.get('birthCountry', []))
            nationality = '; '.join(properties.get('nationality', []))
            citizenship = '; '.join(properties.get('citizenship', []))
            
            # Personal information
            birth_date = '; '.join(properties.get('birthDate', []))
            birth_place = '; '.join(properties.get('birthPlace', []))
            gender = '; '.join(properties.get('gender', []))
            classification = '; '.join(properties.get('classification', []))
            
            # Names and identification
            all_names = '; '.join(properties.get('name', []) + properties.get('alias', []) + properties.get('weakAlias', []))
            first_name = '; '.join(properties.get('firstName', []))
            last_name = '; '.join(properties.get('lastName', []))
            father_name = '; '.join(properties.get('fatherName', []))
            
            # Professional and political information
            positions = '; '.join(properties.get('position', []))
            
            # Contact and location information
            topics = '; '.join(properties.get('topics', []))
            source_urls = '; '.join(properties.get('sourceUrl', []))
            addresses = '; '.join(properties.get('address', []))
            tax_number = '; '.join(properties.get('taxNumber', []))
            titles = '; '.join(properties.get('title', []))
            
            # Additional information
            education = '; '.join(properties.get('education', []))
            religion = '; '.join(properties.get('religion', []))
            ethnicity = '; '.join(properties.get('ethnicity', []))
            website = '; '.join(properties.get('website', []))
            wikidata_id = '; '.join(properties.get('wikidataId', []))
            
            # OpenSanctions metadata
            description = '; '.join(properties.get('description', []))
            os_notes = '; '.join(properties.get('notes', []))
            created_at = '; '.join(properties.get('createdAt', []))
            modified_at = '; '.join(properties.get('modifiedAt', []))
            
            # Count notes
            notes_count = db.query(SearchNote).filter(
                SearchNote.search_history_id == entity.search_history_id,
                SearchNote.entity_id == entity.entity_id
            ).count()
            
            writer.writerow([
                entity.entity_id,
                entity.entity_name,
                entity.relevance_score or 0,
                entity.risk_level or 'LOW',
                entity.tags or '',
                entity.search_history.query,
                entity.search_history.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                entity.search_history.data_source,
                entity.starred_at.strftime('%Y-%m-%d %H:%M:%S'),
                entity_type,
                countries,
                birth_country,
                nationality,
                citizenship,
                birth_date,
                birth_place,
                gender,
                classification,
                positions,
                all_names,
                first_name,
                last_name,
                father_name,
                topics,
                source_urls,
                addresses,
                tax_number,
                titles,
                education,
                religion,
                ethnicity,
                website,
                wikidata_id,
                description,
                os_notes,
                entity.notes or '',  # Starred entity notes
                notes_count,
                created_at,
                modified_at
            ])
        
        output.seek(0)
        
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode()),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=starred_entities_report.csv"}
        )
        
    except Exception as e:
        logger.error(f"Failed to export CSV: {e}")
        raise HTTPException(status_code=500, detail="Failed to export CSV")

@router.get("/reports/starred-entities/pdf")
async def export_starred_entities_pdf(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Export starred entities report as PDF"""
    
    try:
        from fastapi.responses import StreamingResponse
        from datetime import datetime
        import io
        
        try:
            from reportlab.lib.pagesizes import letter, A4
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib.units import inch
            from reportlab.lib import colors
        except ImportError:
            raise HTTPException(status_code=500, detail="PDF generation library not available. Please install reportlab.")
        
        from sqlalchemy.orm import joinedload
        
        # Get current user's starred entities
        starred_entities = db.query(StarredEntity)\
            .filter(StarredEntity.user_id == current_user.id)\
            .options(joinedload(StarredEntity.search_history))\
            .order_by(StarredEntity.starred_at.desc())\
            .all()
        
        # Create PDF in memory
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        styles = getSampleStyleSheet()
        story = []
        
        # Title
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=20,
            spaceAfter=30,
            alignment=1  # Center alignment
        )
        story.append(Paragraph("Sanctions Screening Report", title_style))
        story.append(Spacer(1, 20))
        
        # Summary
        summary_data = [
            ['Report Generated:', datetime.now().strftime('%Y-%m-%d %H:%M:%S')],
            ['Total Starred Entities:', str(len(starred_entities))],
            ['Risk Distribution:', '']
        ]
        
        risk_dist = {"HIGH": 0, "MEDIUM": 0, "LOW": 0}
        for entity in starred_entities:
            risk_dist[entity.risk_level or "LOW"] += 1
        
        for risk_level, count in risk_dist.items():
            summary_data.append([f'  {risk_level} Risk:', str(count)])
        
        summary_table = Table(summary_data, colWidths=[3*inch, 2*inch])
        summary_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(summary_table)
        story.append(Spacer(1, 30))
        
        # Starred entities details
        if starred_entities:
            story.append(Paragraph("Starred Entities Details", styles['Heading2']))
            story.append(Spacer(1, 15))
            
            for entity in starred_entities:
                # Entity header
                entity_title = f"{entity.entity_name} ({entity.entity_id})"
                story.append(Paragraph(entity_title, styles['Heading3']))
                
                # Comprehensive entity details
                entity_info = entity.entity_data or {}
                properties = entity_info.get('properties', {})
                
                # Basic information
                entity_details = [
                    ['Risk Score:', f"{entity.relevance_score or 0}%"],
                    ['Risk Level:', entity.risk_level or 'LOW'],
                    ['Entity Type:', entity_info.get('schema', 'Unknown')],
                    ['Search Query:', entity.search_history.query],
                    ['Search Date:', entity.search_history.created_at.strftime('%Y-%m-%d')],
                    ['Starred Date:', entity.starred_at.strftime('%Y-%m-%d')],
                ]
                
                if entity.tags:
                    entity_details.append(['Tags:', entity.tags])
                
                # Personal information
                if properties.get('birthDate'):
                    entity_details.append(['Birth Date:', ', '.join(properties.get('birthDate', []))])
                if properties.get('birthPlace'):
                    entity_details.append(['Birth Place:', ', '.join(properties.get('birthPlace', []))])
                if properties.get('gender'):
                    entity_details.append(['Gender:', ', '.join(properties.get('gender', []))])
                if properties.get('nationality'):
                    entity_details.append(['Nationality:', ', '.join(properties.get('nationality', []))])
                if properties.get('citizenship'):
                    entity_details.append(['Citizenship:', ', '.join(properties.get('citizenship', []))])
                
                # Names
                if properties.get('firstName'):
                    entity_details.append(['First Name:', ', '.join(properties.get('firstName', []))])
                if properties.get('lastName'):
                    entity_details.append(['Last Name:', ', '.join(properties.get('lastName', []))])
                if properties.get('fatherName'):
                    entity_details.append(['Father Name:', ', '.join(properties.get('fatherName', []))])
                
                # Location and identification
                if properties.get('country'):
                    entity_details.append(['Countries:', ', '.join(properties.get('country', []))])
                if properties.get('address'):
                    entity_details.append(['Address:', ', '.join(properties.get('address', [])[:3])])  # Limit to first 3 addresses
                if properties.get('taxNumber'):
                    entity_details.append(['Tax Number:', ', '.join(properties.get('taxNumber', []))])
                if properties.get('wikidataId'):
                    entity_details.append(['Wikidata ID:', ', '.join(properties.get('wikidataId', []))])
                
                # Professional information
                if properties.get('classification'):
                    entity_details.append(['Classification:', ', '.join(properties.get('classification', []))])
                if properties.get('topics'):
                    entity_details.append(['Topics:', ', '.join(properties.get('topics', []))])
                if properties.get('title'):
                    entity_details.append(['Title:', ', '.join(properties.get('title', []))])
                
                # Additional information
                if properties.get('education'):
                    entity_details.append(['Education:', ', '.join(properties.get('education', [])[:2])])  # Limit to first 2
                if properties.get('religion'):
                    entity_details.append(['Religion:', ', '.join(properties.get('religion', []))])
                if properties.get('ethnicity'):
                    entity_details.append(['Ethnicity:', ', '.join(properties.get('ethnicity', []))])
                if properties.get('website'):
                    entity_details.append(['Website:', ', '.join(properties.get('website', []))])
                
                detail_table = Table(entity_details, colWidths=[2*inch, 4*inch])
                detail_table.setStyle(TableStyle([
                    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                    ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                    ('FONTSIZE', (0, 0), (-1, -1), 9),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                    ('GRID', (0, 0), (-1, -1), 1, colors.lightgrey),
                ]))
                story.append(detail_table)
                
                # Positions section
                positions = properties.get('position', [])
                if positions:
                    story.append(Spacer(1, 10))
                    story.append(Paragraph("Positions Held:", styles['Heading4']))
                    for i, position in enumerate(positions[:5]):  # Limit to first 5 positions
                        story.append(Paragraph(f"• {position}", styles['Normal']))
                    if len(positions) > 5:
                        story.append(Paragraph(f"... and {len(positions) - 5} more positions", styles['Normal']))
                
                # All names/aliases section
                all_names = properties.get('name', []) + properties.get('alias', [])
                if all_names and len(all_names) > 1:
                    story.append(Spacer(1, 10))
                    story.append(Paragraph("Known Names and Aliases:", styles['Heading4']))
                    for i, name in enumerate(all_names[:10]):  # Limit to first 10 names
                        story.append(Paragraph(f"• {name}", styles['Normal']))
                    if len(all_names) > 10:
                        story.append(Paragraph(f"... and {len(all_names) - 10} more names", styles['Normal']))
                
                # OpenSanctions descriptions and notes
                descriptions = properties.get('description', [])
                os_notes = properties.get('notes', [])
                if descriptions or os_notes:
                    story.append(Spacer(1, 10))
                    story.append(Paragraph("OpenSanctions Information:", styles['Heading4']))
                    
                    if descriptions:
                        story.append(Paragraph("Description:", styles['Heading5']))
                        for desc in descriptions[:2]:  # Limit to first 2 descriptions
                            story.append(Paragraph(f"• {desc}", styles['Normal']))
                    
                    if os_notes:
                        story.append(Paragraph("Additional Notes:", styles['Heading5']))
                        for note in os_notes[:3]:  # Limit to first 3 notes
                            # Truncate very long notes
                            truncated_note = note[:500] + "..." if len(note) > 500 else note
                            story.append(Paragraph(f"• {truncated_note}", styles['Normal']))
                
                # Starred Entity Notes
                if entity.notes:
                    story.append(Spacer(1, 10))
                    story.append(Paragraph("Compliance Notes:", styles['Heading4']))
                    story.append(Paragraph(f"• {entity.notes}", styles['Normal']))
                
                # Additional Entity Notes (from search_notes table)
                notes = db.query(SearchNote).filter(
                    SearchNote.search_history_id == entity.search_history_id,
                    SearchNote.entity_id == entity.entity_id
                ).all()
                
                if notes:
                    story.append(Spacer(1, 10))
                    story.append(Paragraph("Additional Notes:", styles['Heading4']))
                    for note in notes:
                        note_text = f"• {note.note_text}"
                        if note.risk_assessment:
                            note_text += f" (Risk: {note.risk_assessment})"
                        if note.action_taken:
                            note_text += f" (Action: {note.action_taken})"
                        story.append(Paragraph(note_text, styles['Normal']))
                
                story.append(Spacer(1, 20))
        
        # Build PDF
        doc.build(story)
        buffer.seek(0)
        
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=starred_entities_report.pdf"}
        )
        
    except Exception as e:
        logger.error(f"Failed to export PDF: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to export PDF: {str(e)}")

@router.get("/filter-options")
async def get_filter_options() -> Dict[str, Any]:
    """Get available filter options for enhanced search"""
    
    try:
        # Get available topics and datasets from OpenSanctions
        opensanctions_status = await check_opensanctions_health()
        
        if opensanctions_status["status"] == "healthy":
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{settings.OPENSANCTIONS_BASE_URL}/search/default?q=&limit=1")
                if response.status_code == 200:
                    data = response.json()
                    facets = data.get("facets", {})
                else:
                    facets = {}
        else:
            facets = {}
        
        # Get Moroccan-specific options
        moroccan_options = get_moroccan_filter_options()
        
        return {
            "opensanctions": {
                "topics": facets.get("topics", {}).get("values", []),
                "datasets": facets.get("datasets", {}).get("values", []),
                "countries": facets.get("countries", {}).get("values", [])
            },
            "moroccan": moroccan_options,
            "schemas": [
                {"name": "Person", "label": "Person", "count": 0},
                {"name": "Company", "label": "Company", "count": 0},
                {"name": "Organization", "label": "Organization", "count": 0}
            ],
            "sort_options": [
                {"name": "score", "label": "Relevance"},
                {"name": "name", "label": "Name"},
                {"name": "updated", "label": "Last Updated"},
                {"name": "created", "label": "Created"}
            ],
            "filter_operators": [
                {"name": "OR", "label": "Any (OR)"},
                {"name": "AND", "label": "All (AND)"}
            ]
        }
        
    except Exception as e:
        logger.error(f"Error getting filter options: {e}")
        return {
            "opensanctions": {"topics": [], "datasets": [], "countries": []},
            "moroccan": get_moroccan_filter_options(),
            "schemas": [],
            "sort_options": [],
            "filter_operators": []
        }

def get_moroccan_filter_options() -> Dict[str, Any]:
    """Get Morocco-specific filter options"""
    
    # Get statistics from Moroccan entities service
    service = moroccan_entities_service
    all_entities = service.get_all_entities()
    
    # Collect unique values
    parties = set()
    regions = set()
    risk_levels = {"HIGH": 0, "MEDIUM": 0, "LOW": 0}
    position_types = {"parliament": 0, "regional": 0, "municipal": 0}
    mandate_years = set()
    
    for entity in all_entities:
        properties = entity.get("properties", {})
        
        # Collect political parties
        for party in properties.get("politicalParty", []):
            if party:
                parties.add(party)
        
        # Collect regions
        for region in properties.get("region", []):
            if region:
                regions.add(region)
        
        # Count risk levels
        risk = entity.get("risk_level", "LOW")
        if risk in risk_levels:
            risk_levels[risk] += 1
        
        # Count position types
        datasets = entity.get("datasets", [])
        if any("parliament" in ds for ds in datasets):
            position_types["parliament"] += 1
        elif any("regional" in ds for ds in datasets):
            position_types["regional"] += 1
        elif any("communal" in ds for ds in datasets):
            position_types["municipal"] += 1
        
        # Collect mandate years
        for mandate in properties.get("mandate", []):
            if mandate and len(mandate) == 4 and mandate.isdigit():
                mandate_years.add(mandate)
    
    return {
        "political_parties": [
            {"name": party, "label": party, "count": 0} 
            for party in sorted(parties)
        ],
        "regions": [
            {"name": region, "label": region, "count": 0} 
            for region in sorted(regions)
        ],
        "risk_levels": [
            {"name": level, "label": level, "count": count} 
            for level, count in risk_levels.items()
        ],
        "position_types": [
            {"name": "parliament", "label": "Parliament Members", "count": position_types["parliament"]},
            {"name": "regional", "label": "Regional Officials", "count": position_types["regional"]},
            {"name": "municipal", "label": "Municipal Officials", "count": position_types["municipal"]}
        ],
        "mandate_years": [
            {"name": year, "label": year, "count": 0} 
            for year in sorted(mandate_years, reverse=True)
        ]
    }

from datetime import datetime