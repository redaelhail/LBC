# backend/app/api/v1/endpoints/search.py - Updated with better error handling

from fastapi import APIRouter, HTTPException, Depends
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

class NoteRequest(BaseModel):
    search_history_id: int
    entity_id: str
    entity_name: str
    note_text: str
    risk_assessment: Optional[str] = None
    action_taken: Optional[str] = None
    user_id: Optional[int] = 1

@router.post("/entities")
async def search_entities(request: SearchRequest, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Search for entities using OpenSanctions API with better error handling"""
    
    opensanctions_url = settings.OPENSANCTIONS_BASE_URL
    
    # First, check if OpenSanctions is healthy
    opensanctions_status = await check_opensanctions_health()
    
    if opensanctions_status["status"] != "healthy":
        logger.warning(f"OpenSanctions not healthy: {opensanctions_status['message']}")
        return generate_fallback_response(request, opensanctions_status)
    
    try:
        # Prepare search parameters
        params = {
            "q": request.query,
            "limit": request.limit,
            "offset": request.offset,
        }
        
        if request.schema:
            params["schema"] = request.schema
        if request.countries:
            params["countries"] = request.countries
        if request.topics:
            params["topics"] = request.topics
            
        logger.info(f"Searching OpenSanctions API: {opensanctions_url}/search/{request.dataset}")
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{opensanctions_url}/search/{request.dataset}",
                params=params
            )
            
            logger.info(f"OpenSanctions response status: {response.status_code}")
            
            if response.status_code == 200:
                opensanctions_data = response.json()
                
                # Enhance results with Morocco-specific scoring
                enhanced_results = []
                for entity in opensanctions_data.get("results", []):
                    enhanced_entity = enhance_entity_for_morocco(entity)
                    enhanced_results.append(enhanced_entity)
                
                response_data = {
                    "results": enhanced_results,
                    "total": opensanctions_data.get("total", {"value": len(enhanced_results)}),
                    "query": request.query,
                    "dataset": request.dataset,
                    "source": "opensanctions",
                    "api_url": f"{opensanctions_url}/search/{request.dataset}",
                    "status": "success"
                }
                
                # Save search to history
                await save_search_to_history(db, request, enhanced_results, "opensanctions")
                
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

async def save_search_to_history(db: Session, request: SearchRequest, results: List[Dict], source: str):
    """Save search results to history database"""
    try:
        # Calculate risk metrics
        risk_scores = [r.get("morocco_risk_score", 0) for r in results]
        avg_risk = sum(risk_scores) / len(risk_scores) if risk_scores else 0
        max_risk = max(risk_scores) if risk_scores else 0
        
        risk_level = "HIGH" if max_risk >= 80 else "MEDIUM" if max_risk >= 50 else "LOW"
        
        # Determine search type
        search_type = determine_search_type(request.query)
        
        # Create history entry
        history_entry = SearchHistory(
            query=request.query,
            search_type=search_type,
            results_count=len(results),
            risk_level=risk_level,
            risk_score=avg_risk,
            data_source=source,
            results_data=results,  # Store full results for later reference
            user_id=1  # Default user for now
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
    """Generate fallback response with mock data and error information"""
    
    mock_entities = generate_mock_results(request.query)
    
    return {
        "results": mock_entities,
        "total": {"value": len(mock_entities)},
        "query": request.query,
        "dataset": request.dataset,
        "source": "mock",
        "status": "fallback",
        "opensanctions_status": error_info["status"],
        "opensanctions_message": error_info["message"],
        "note": f"Using mock data - OpenSanctions {error_info['status']}",
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
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Get search history with pagination"""
    
    try:
        # Try to get from database
        total = db.query(SearchHistory).count()
        searches = db.query(SearchHistory)\
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
                "risk_score": search.risk_score,
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
async def add_note(note_request: NoteRequest, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Add a note to a specific search result entity"""
    try:
        # Verify search history exists
        search_history = db.query(SearchHistory).filter(SearchHistory.id == note_request.search_history_id).first()
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
            user_id=note_request.user_id
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
async def get_notes(search_history_id: int, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Get all notes for a specific search history"""
    try:
        notes = db.query(SearchNote).filter(SearchNote.search_history_id == search_history_id).all()
        
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
async def get_search_details(history_id: int, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Get detailed search results with notes"""
    try:
        search_history = db.query(SearchHistory).filter(SearchHistory.id == history_id).first()
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
                "risk_score": search_history.risk_score,
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

@router.put("/history/{history_id}/star")
async def toggle_star_search(history_id: int, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Toggle star status of a search"""
    try:
        search_history = db.query(SearchHistory).filter(SearchHistory.id == history_id).first()
        if not search_history:
            raise HTTPException(status_code=404, detail="Search history not found")
        
        # Toggle starred status
        search_history.is_starred = not getattr(search_history, 'is_starred', False)
        db.commit()
        db.refresh(search_history)
        
        return {
            "id": search_history.id,
            "is_starred": search_history.is_starred,
            "message": "Starred" if search_history.is_starred else "Unstarred"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to toggle star: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to update star status")

@router.get("/analytics")
async def get_search_analytics(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Get comprehensive search analytics"""
    try:
        from sqlalchemy import func, text
        from datetime import datetime, timedelta
        
        # Basic stats
        total_searches = db.query(SearchHistory).count()
        starred_searches = db.query(SearchHistory).filter(SearchHistory.is_starred == True).count()
        
        # Risk level distribution
        risk_stats = db.query(
            SearchHistory.risk_level,
            func.count(SearchHistory.id).label('count')
        ).group_by(SearchHistory.risk_level).all()
        
        # Data source stats
        source_stats = db.query(
            SearchHistory.data_source,
            func.count(SearchHistory.id).label('count')
        ).group_by(SearchHistory.data_source).all()
        
        # Recent activity (last 7 days)
        week_ago = datetime.utcnow() - timedelta(days=7)
        recent_activity = db.query(
            func.date(SearchHistory.created_at).label('date'),
            func.count(SearchHistory.id).label('count')
        ).filter(
            SearchHistory.created_at >= week_ago
        ).group_by(func.date(SearchHistory.created_at)).all()
        
        # Top queries
        top_queries = db.query(
            SearchHistory.query,
            func.count(SearchHistory.id).label('count'),
            func.max(SearchHistory.created_at).label('last_searched')
        ).group_by(SearchHistory.query).order_by(func.count(SearchHistory.id).desc()).limit(10).all()
        
        # Average risk scores
        avg_risk_score = db.query(func.avg(SearchHistory.risk_score)).scalar() or 0
        
        # Performance stats
        avg_execution_time = db.query(func.avg(SearchHistory.execution_time_ms)).scalar() or 0
        
        return {
            "summary": {
                "total_searches": total_searches,
                "starred_searches": starred_searches,
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
            "summary": {"total_searches": 0, "starred_searches": 0, "avg_risk_score": 0, "avg_execution_time_ms": 0},
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