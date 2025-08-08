"""
Moroccan Entities Service

This service provides access to a custom dataset of Moroccan politically exposed persons (PEPs)
and key entities for enhanced local screening.
"""

from typing import List, Dict, Any, Optional
import json
import re
import os
from datetime import datetime
from pathlib import Path
import logging

class MoroccanEntitiesService:
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.jsonl_file_path = self._find_jsonl_file()
        self.entities = []
        self.last_modified = None
        self._load_entities_from_file()
    
    def _find_jsonl_file(self) -> Optional[str]:
        """Find the moroccan-entities.jsonl file"""
        possible_paths = [
            "/app/custom-datasets/moroccan-entities.jsonl",  # Docker path
            "custom-datasets/moroccan-entities.jsonl",      # Relative path
            "../custom-datasets/moroccan-entities.jsonl",   # Parent dir
            "../../custom-datasets/moroccan-entities.jsonl" # Two levels up
        ]
        
        for path in possible_paths:
            if os.path.exists(path):
                self.logger.info(f"Found moroccan-entities.jsonl at: {path}")
                return path
        
        self.logger.warning("moroccan-entities.jsonl file not found, using fallback hardcoded data")
        return None
    
    def _load_entities_from_file(self):
        """Load entities from JSONL file or fallback to hardcoded data"""
        if not self.jsonl_file_path or not os.path.exists(self.jsonl_file_path):
            self.logger.warning("JSONL file not available, using hardcoded fallback data")
            self.entities = self._load_fallback_entities()
            return
        
        try:
            current_modified = os.path.getmtime(self.jsonl_file_path)
            
            # Only reload if file has been modified
            if self.last_modified is not None and current_modified <= self.last_modified:
                return
            
            self.logger.info(f"Loading entities from {self.jsonl_file_path}")
            entities = []
            
            with open(self.jsonl_file_path, 'r', encoding='utf-8') as f:
                for line_num, line in enumerate(f, 1):
                    line = line.strip()
                    if not line:  # Skip empty lines
                        continue
                        
                    try:
                        entity_data = json.loads(line)
                        enhanced_entity = self._enhance_jsonl_entity(entity_data)
                        entities.append(enhanced_entity)
                    except json.JSONDecodeError as e:
                        self.logger.error(f"Invalid JSON on line {line_num}: {e}")
                        continue
            
            self.entities = entities
            self.last_modified = current_modified
            self.logger.info(f"Successfully loaded {len(entities)} entities from JSONL file")
            
        except Exception as e:
            self.logger.error(f"Failed to load JSONL file: {e}")
            if not self.entities:  # Only use fallback if no entities loaded yet
                self.entities = self._load_fallback_entities()
    
    def _enhance_jsonl_entity(self, entity_data: Dict[str, Any]) -> Dict[str, Any]:
        """Convert JSONL entity to full FollowTheMoney structure"""
        properties = entity_data.get("properties", {})
        
        # Create caption from name and weakAlias
        names = properties.get("name", [])
        aliases = properties.get("weakAlias", [])
        primary_name = names[0] if names else entity_data.get("id", "")
        alias_text = f" ({aliases[0]})" if aliases else ""
        caption = f"{primary_name}{alias_text}"
        
        # Determine risk level and scores
        risk_level = properties.get("riskLevel", ["MEDIUM"])[0] if properties.get("riskLevel") else "MEDIUM"
        
        # Calculate scores based on risk level and entity type
        base_score = {"HIGH": 0.95, "MEDIUM": 0.75, "LOW": 0.60}.get(risk_level, 0.75)
        morocco_risk_score = {"HIGH": 85, "MEDIUM": 60, "LOW": 35}.get(risk_level, 60)
        
        # Enhanced entity structure
        enhanced = {
            "id": entity_data.get("id"),
            "schema": entity_data.get("schema", "Person"),
            "caption": caption,
            "properties": properties,
            "datasets": ["moroccan_entities"],
            "referents": [],
            "target": True,
            "first_seen": datetime.now().isoformat(),
            "last_seen": datetime.now().isoformat(),
            "last_change": datetime.now().isoformat(),
            "score": base_score,
            "risk_level": risk_level,
            "morocco_risk_score": morocco_risk_score,
            "recommended_action": self._get_recommended_action(risk_level, properties)
        }
        
        return enhanced
    
    def _get_recommended_action(self, risk_level: str, properties: Dict[str, Any]) -> str:
        """Generate recommended action based on risk level and entity properties"""
        if risk_level == "HIGH":
            return "Enhanced Due Diligence Required - High Risk Entity"
        elif risk_level == "MEDIUM":
            if "role.pep" in properties.get("topics", []):
                return "Enhanced Due Diligence Required - PEP"
            return "Standard Due Diligence Required - Medium Risk"
        else:
            return "Standard Processing - Low Risk Entity"
    
    def _load_fallback_entities(self) -> List[Dict[str, Any]]:
        """Fallback hardcoded entities when JSONL file is not available"""
        return [
            {
                "id": "ma-person-example",
                "schema": "Person",
                "caption": "مثال شخص (Example Person)",
                "properties": {
                    "name": ["مثال شخص", "Example Person"],
                    "birthDate": ["1980-01-01"],
                    "nationality": ["ma"],
                    "citizenship": ["ma"],
                    "country": ["ma"],
                    "topics": ["role.pep"],
                    "position": ["Sample Government Position"],
                    "notes": ["Example fallback entity"],
                    "sourceUrl": ["https://example.com"],
                    "classification": ["Example classification"]
                },
                "datasets": ["moroccan_entities"],
                "referents": [],
                "target": True,
                "first_seen": "2025-08-06T16:00:00",
                "last_seen": "2025-08-06T16:00:00",
                "last_change": "2025-08-06T16:00:00",
                "score": 0.75,
                "risk_level": "MEDIUM",
                "morocco_risk_score": 60,
                "recommended_action": "Enhanced Due Diligence Required - Example Entity"
            }
        ]
    
    def search_entities(self, query: str, schema_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Search Moroccan entities by query (legacy method)
        
        Args:
            query: Search query string
            schema_filter: Optional schema filter (Person, Company, etc.)
            
        Returns:
            List of matching entities with scores
        """
        return self.search_entities_enhanced(query, schema_filter=schema_filter)
    
    def search_entities_enhanced(self, query: str, schema_filter: Optional[str] = None, 
                               risk_level: Optional[List[str]] = None,
                               political_party: Optional[str] = None,
                               region: Optional[str] = None,
                               position_type: Optional[str] = None,
                               mandate_year: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Enhanced search with comprehensive filtering for Moroccan entities
        
        Args:
            query: Search query string
            schema_filter: Optional schema filter (Person, Company, etc.)
            risk_level: Filter by risk levels (HIGH, MEDIUM, LOW)
            political_party: Filter by political party
            region: Filter by region
            position_type: Filter by position type (parliament, regional, municipal)
            mandate_year: Filter by mandate year
            
        Returns:
            List of matching entities with scores
        """
        # Check for file updates before searching (hot-reload)
        self._load_entities_from_file()
        
        if not query or len(query.strip()) < 2:
            return []
        
        query = query.lower().strip()
        results = []
        
        for entity in self.entities:
            # Apply schema filter
            if schema_filter and entity.get("schema") != schema_filter:
                continue
            
            # Apply Morocco-specific filters
            if not self._passes_moroccan_filters(entity, risk_level, political_party, 
                                               region, position_type, mandate_year):
                continue
                
            # Calculate relevance score
            score = self._calculate_relevance_score(entity, query)
            if score > 0.3:  # Minimum relevance threshold
                entity_copy = entity.copy()
                entity_copy["score"] = score
                results.append(entity_copy)
        
        # Sort by relevance score (descending)
        results.sort(key=lambda x: x.get("score", 0), reverse=True)
        return results
    
    def _calculate_relevance_score(self, entity: Dict[str, Any], query: str) -> float:
        """Calculate relevance score for an entity against a query"""
        score = 0.0
        properties = entity.get("properties", {})
        
        # Check names and aliases
        names = properties.get("name", []) + properties.get("weakAlias", [])
        for name in names:
            name_lower = name.lower()
            if query in name_lower:
                # Exact substring match
                score += 0.8
            elif self._fuzzy_match(query, name_lower):
                # Fuzzy match
                score += 0.6
            # Also check individual words
            query_words = query.split()
            name_words = name_lower.split()
            for q_word in query_words:
                for n_word in name_words:
                    if q_word in n_word or n_word in q_word:
                        score += 0.3
        
        # Check caption
        caption = entity.get("caption", "").lower()
        if query in caption:
            score += 0.7
        elif self._fuzzy_match(query, caption):
            score += 0.5
        # Also check individual words in caption
        query_words = query.split()
        caption_words = caption.split()
        for q_word in query_words:
            for c_word in caption_words:
                if q_word in c_word or c_word in q_word:
                    score += 0.2
        
        # Check positions and notes  
        positions = properties.get("position", [])
        notes = properties.get("notes", [])
        
        for text_list in [positions, notes]:
            for text in text_list:
                text_lower = text.lower()
                if query in text_lower:
                    score += 0.4
                elif self._fuzzy_match(query, text_lower):
                    score += 0.2
        
        # Boost score for country match
        if query == "morocco" or query == "moroccan" or query == "ma":
            score += 0.3
            
        return min(score, 1.0)  # Cap at 1.0
    
    def _passes_moroccan_filters(self, entity: Dict[str, Any], 
                               risk_level: Optional[List[str]] = None,
                               political_party: Optional[str] = None,
                               region: Optional[str] = None,
                               position_type: Optional[str] = None,
                               mandate_year: Optional[str] = None) -> bool:
        """Check if entity passes Morocco-specific filters"""
        
        properties = entity.get("properties", {})
        
        # Risk level filter
        if risk_level and entity.get("risk_level") not in risk_level:
            return False
        
        # Political party filter
        if political_party:
            entity_parties = [p.lower() for p in properties.get("politicalParty", [])]
            party_search = political_party.lower()
            if not any(party_search in party or party in party_search for party in entity_parties):
                # Also check party abbreviations
                party_abbrevs = [abbrev for abbrev, full in self.party_mappings.items() 
                               if party_search in full.lower() or full.lower() in party_search]
                if not any(abbrev.lower() in entity_parties for abbrev in party_abbrevs):
                    return False
        
        # Region filter
        if region:
            entity_regions = [r.lower() for r in properties.get("region", [])]
            region_search = region.lower()
            if not any(region_search in reg or reg in region_search for reg in entity_regions):
                return False
        
        # Position type filter (parliament, regional, municipal)
        if position_type:
            datasets = entity.get("datasets", [])
            if position_type.lower() == "parliament":
                if not any("parliament" in ds for ds in datasets):
                    return False
            elif position_type.lower() == "regional":
                if not any("regional" in ds for ds in datasets):
                    return False
            elif position_type.lower() == "municipal" or position_type.lower() == "communal":
                if not any("communal" in ds for ds in datasets):
                    return False
        
        # Mandate year filter
        if mandate_year:
            entity_mandates = properties.get("mandate", [])
            if mandate_year not in entity_mandates:
                # Also check if year appears in dataset names
                datasets = entity.get("datasets", [])
                if not any(mandate_year in ds for ds in datasets):
                    return False
        
        return True
    
    def _fuzzy_match(self, query: str, text: str) -> bool:
        """Simple fuzzy matching for names"""
        # Remove common words and characters
        query_clean = re.sub(r'[^a-zA-Z0-9\u0600-\u06FF]', ' ', query).strip()
        text_clean = re.sub(r'[^a-zA-Z0-9\u0600-\u06FF]', ' ', text).strip()
        
        query_words = [w for w in query_clean.split() if len(w) > 2]
        text_words = [w for w in text_clean.split() if len(w) > 2]
        
        if not query_words or not text_words:
            return False
            
        matches = 0
        for qword in query_words:
            for tword in text_words:
                if qword in tword or tword in qword:
                    matches += 1
                    break
                    
        return matches >= len(query_words) * 0.6  # 60% of query words should match
    
    def get_entity_by_id(self, entity_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific entity by ID"""
        for entity in self.entities:
            if entity.get("id") == entity_id:
                return entity
        return None
    
    def get_all_entities(self) -> List[Dict[str, Any]]:
        """Get all Moroccan entities"""
        return self.entities.copy()

# Global instance
moroccan_entities_service = MoroccanEntitiesService()