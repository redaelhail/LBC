import httpx
import json
import logging
from typing import Dict, Any, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

class ElasticsearchService:
    def __init__(self):
        # Use the OpenSanctions Elasticsearch URL from settings
        self.es_url = "http://opensanctions-index:9200"
        self.index_name = "sanctionsguard_entities"
    
    async def index_entity(self, entity: Dict[str, Any]) -> bool:
        """Index an entity in Elasticsearch for searching"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Create the index if it doesn't exist
                await self._ensure_index_exists(client)
                
                # Index the entity
                entity_id = entity.get("id")
                index_url = f"{self.es_url}/{self.index_name}/_doc/{entity_id}"
                
                # Prepare entity data for indexing
                indexed_data = self._prepare_entity_for_index(entity)
                
                response = await client.put(
                    index_url,
                    headers={"Content-Type": "application/json"},
                    json=indexed_data
                )
                
                if response.status_code in [200, 201]:
                    logger.info(f"Successfully indexed entity {entity_id}")
                    return True
                else:
                    logger.error(f"Failed to index entity {entity_id}: {response.status_code} - {response.text}")
                    return False
                    
        except Exception as e:
            logger.error(f"Error indexing entity: {str(e)}")
            return False
    
    async def update_entity(self, entity: Dict[str, Any]) -> bool:
        """Update an entity in Elasticsearch"""
        return await self.index_entity(entity)
    
    async def delete_entity(self, entity_id: int) -> bool:
        """Delete an entity from Elasticsearch"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                delete_url = f"{self.es_url}/{self.index_name}/_doc/{entity_id}"
                
                response = await client.delete(delete_url)
                
                if response.status_code in [200, 404]:  # 404 is OK - entity not found
                    logger.info(f"Successfully deleted entity {entity_id} from index")
                    return True
                else:
                    logger.error(f"Failed to delete entity {entity_id}: {response.status_code}")
                    return False
                    
        except Exception as e:
            logger.error(f"Error deleting entity from index: {str(e)}")
            return False
    
    async def _ensure_index_exists(self, client: httpx.AsyncClient) -> bool:
        """Ensure the entities index exists with proper mapping"""
        try:
            # Check if index exists
            check_url = f"{self.es_url}/{self.index_name}"
            response = await client.head(check_url)
            
            if response.status_code == 200:
                return True
            
            # Create index with mapping
            mapping = {
                "mappings": {
                    "properties": {
                        "id": {"type": "integer"},
                        "denomination": {
                            "type": "text",
                            "analyzer": "standard",
                            "fields": {
                                "keyword": {"type": "keyword"},
                                "suggest": {"type": "completion"}
                            }
                        },
                        "commercial_name": {
                            "type": "text",
                            "analyzer": "standard",
                            "fields": {"keyword": {"type": "keyword"}}
                        },
                        "category": {"type": "keyword"},
                        "status": {"type": "keyword"},
                        "registration_number": {"type": "keyword"},
                        "license_number": {"type": "keyword"},
                        "address": {
                            "type": "text",
                            "analyzer": "standard"
                        },
                        "city": {"type": "keyword"},
                        "country": {"type": "keyword"},
                        "risk_level": {"type": "keyword"},
                        "pep_exposure": {"type": "boolean"},
                        "created_at": {"type": "date"},
                        "updated_at": {"type": "date"},
                        "directors": {
                            "type": "nested",
                            "properties": {
                                "full_name": {
                                    "type": "text",
                                    "analyzer": "standard",
                                    "fields": {"keyword": {"type": "keyword"}}
                                },
                                "position": {"type": "keyword"},
                                "nationality": {"type": "keyword"}
                            }
                        },
                        "search_text": {
                            "type": "text",
                            "analyzer": "standard"
                        }
                    }
                }
            }
            
            create_response = await client.put(
                check_url,
                headers={"Content-Type": "application/json"},
                json=mapping
            )
            
            if create_response.status_code in [200, 201]:
                logger.info(f"Created Elasticsearch index: {self.index_name}")
                return True
            else:
                logger.error(f"Failed to create index: {create_response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Error ensuring index exists: {str(e)}")
            return False
    
    def _prepare_entity_for_index(self, entity: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare entity data for Elasticsearch indexing"""
        # Extract basic fields
        indexed_data = {
            "id": entity.get("id"),
            "denomination": entity.get("denomination", ""),
            "commercial_name": entity.get("commercial_name", ""),
            "category": entity.get("category", ""),
            "status": entity.get("status", ""),
            "registration_number": entity.get("registration_number", ""),
            "license_number": entity.get("license_number", ""),
            "address": entity.get("address", ""),
            "city": entity.get("city", ""),
            "country": entity.get("country", ""),
            "pep_exposure": entity.get("pep_exposure", False),
            "created_at": entity.get("created_at"),
            "updated_at": entity.get("updated_at")
        }
        
        # Add risk level from current risk score
        current_risk = entity.get("current_risk_score")
        if current_risk:
            indexed_data["risk_level"] = current_risk.get("risk_level")
        
        # Add directors information
        directors = entity.get("directors", [])
        indexed_data["directors"] = [
            {
                "full_name": director.get("full_name", ""),
                "position": director.get("position", ""),
                "nationality": director.get("nationality", "")
            }
            for director in directors
        ]
        
        # Create searchable text field combining all relevant text
        search_terms = [
            entity.get("denomination", ""),
            entity.get("commercial_name", ""),
            entity.get("registration_number", ""),
            entity.get("license_number", "")
        ]
        
        # Add director names to search terms
        for director in directors:
            search_terms.append(director.get("full_name", ""))
        
        indexed_data["search_text"] = " ".join(filter(None, search_terms))
        
        return indexed_data

# Global instance
elasticsearch_service = ElasticsearchService()