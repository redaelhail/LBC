# backend/app/api/v1/endpoints/search.py - Updated with better error handling

from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
import httpx
import asyncio
import logging
from app.core.config import settings

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

@router.post("/entities")
async def search_entities(request: SearchRequest) -> Dict[str, Any]:
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
                
                return {
                    "results": enhanced_results,
                    "total": opensanctions_data.get("total", {"value": len(enhanced_results)}),
                    "query": request.query,
                    "dataset": request.dataset,
                    "source": "opensanctions",
                    "api_url": f"{opensanctions_url}/search/{request.dataset}",
                    "status": "success"
                }
                
            elif response.status_code == 500:
                # Handle 500 errors specifically
                logger.warning("OpenSanctions returned 500 - likely still initializing")
                error_detail = "OpenSanctions API is still initializing (HTTP 500)"
                
                try:
                    error_response = response.json()
                    error_detail = error_response.get("detail", error_detail)
                except:
                    pass
                
                return generate_fallback_response(request, {
                    "status": "initializing",
                    "message": error_detail,
                    "http_status": 500
                })
                
            elif response.status_code == 404:
                logger.warning(f"Dataset '{request.dataset}' not found")
                return generate_fallback_response(request, {
                    "status": "dataset_not_found",
                    "message": f"Dataset '{request.dataset}' not available",
                    "http_status": 404
                })
                
            else:
                logger.warning(f"OpenSanctions API returned unexpected status {response.status_code}")
                return generate_fallback_response(request, {
                    "status": "api_error",
                    "message": f"API returned status {response.status_code}",
                    "http_status": response.status_code
                })
                
    except httpx.TimeoutException:
        logger.error("OpenSanctions API timeout")
        return generate_fallback_response(request, {
            "status": "timeout",
            "message": "OpenSanctions API timeout - service may be overloaded"
        })
        
    except httpx.ConnectError:
        logger.error("Cannot connect to OpenSanctions API")
        return generate_fallback_response(request, {
            "status": "connection_error",
            "message": "Cannot connect to OpenSanctions API - service may be down"
        })
        
    except Exception as e:
        logger.error(f"Unexpected error calling OpenSanctions API: {str(e)}")
        return generate_fallback_response(request, {
            "status": "unexpected_error",
            "message": str(e)
        })

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

@router.get("/history")
async def get_search_history():
    """Get search history - Mock implementation"""
    
    mock_history = [
        {
            "id": 1,
            "query": "Mohammed Hassan",
            "search_type": "Person",
            "results_count": 3,
            "risk_level": "Medium",
            "created_at": "2025-01-15T10:30:00Z",
            "data_source": "opensanctions"
        },
        {
            "id": 2,
            "query": "Atlas Bank",
            "search_type": "Company", 
            "results_count": 0,
            "risk_level": "Low",
            "created_at": "2025-01-14T15:20:00Z",
            "data_source": "mock"
        }
    ]
    
    return {
        "items": mock_history,
        "total": len(mock_history),
        "page": 1,
        "pages": 1,
        "source": "mock"
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