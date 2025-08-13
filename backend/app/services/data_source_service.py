# backend/app/services/data_source_service.py
"""
Data Source Integration Service
Handles integration with multiple sanctions and PEP data sources
"""

import aiohttp
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from sqlalchemy.orm import Session
from dataclasses import dataclass
from abc import ABC, abstractmethod
import hashlib
import json

from app.core.config import settings
from app.services.audit_service import get_audit_service

logger = logging.getLogger(__name__)

@dataclass
class DataSourceConfig:
    """Configuration for a data source"""
    name: str
    url: str
    api_key: Optional[str] = None
    headers: Optional[Dict[str, str]] = None
    update_frequency: int = 24  # hours
    enabled: bool = True
    priority: int = 1  # 1 = highest priority
    source_type: str = "sanctions"  # sanctions, pep, watchlist, etc.
    format: str = "json"  # json, xml, csv
    authentication_method: str = "none"  # none, api_key, oauth, basic

@dataclass
class DataSourceStatus:
    """Status information for a data source"""
    name: str
    last_update: Optional[datetime]
    last_success: Optional[datetime]
    last_error: Optional[str]
    total_records: int
    new_records: int
    updated_records: int
    is_healthy: bool
    next_update: Optional[datetime]

class DataSourceAdapter(ABC):
    """Abstract base class for data source adapters"""
    
    def __init__(self, config: DataSourceConfig):
        self.config = config
        
    @abstractmethod
    async def fetch_data(self, since: Optional[datetime] = None) -> List[Dict[str, Any]]:
        """Fetch data from the source"""
        pass
        
    @abstractmethod
    def normalize_entity(self, raw_entity: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize raw entity data to standard format"""
        pass
        
    @abstractmethod
    async def validate_connection(self) -> bool:
        """Test connection to the data source"""
        pass

class CNASNUAdapter(DataSourceAdapter):
    """Adapter for CNASNU (Moroccan National Committee) sanctions lists"""
    
    async def fetch_data(self, since: Optional[datetime] = None) -> List[Dict[str, Any]]:
        """Fetch CNASNU sanctions data"""
        try:
            async with aiohttp.ClientSession() as session:
                headers = self.config.headers or {}
                if self.config.api_key:
                    headers['Authorization'] = f'Bearer {self.config.api_key}'
                
                params = {}
                if since:
                    params['modified_since'] = since.isoformat()
                    
                async with session.get(
                    self.config.url,
                    headers=headers,
                    params=params
                ) as response:
                    response.raise_for_status()
                    data = await response.json()
                    return data.get('results', [])
                    
        except Exception as e:
            logger.error(f"Failed to fetch CNASNU data: {str(e)}")
            raise
    
    def normalize_entity(self, raw_entity: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize CNASNU entity format"""
        return {
            'id': raw_entity.get('id'),
            'name': raw_entity.get('name'),
            'schema': raw_entity.get('type', 'Person'),
            'properties': {
                'nationality': raw_entity.get('nationality', []),
                'birth_date': raw_entity.get('birth_date'),
                'passport_numbers': raw_entity.get('passport_numbers', []),
                'addresses': raw_entity.get('addresses', []),
                'sanctions': {
                    'type': 'UN_SANCTIONS',
                    'authority': 'CNASNU',
                    'date_added': raw_entity.get('date_added'),
                    'reference': raw_entity.get('reference_number')
                }
            },
            'datasets': ['cnasnu_sanctions'],
            'topics': ['sanction'],
            'last_seen': raw_entity.get('last_modified', datetime.utcnow().isoformat())
        }
    
    async def validate_connection(self) -> bool:
        """Test CNASNU API connection"""
        try:
            async with aiohttp.ClientSession() as session:
                headers = self.config.headers or {}
                if self.config.api_key:
                    headers['Authorization'] = f'Bearer {self.config.api_key}'
                
                async with session.get(
                    f"{self.config.url}/health",
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    return response.status == 200
        except:
            return False

class EUSanctionsAdapter(DataSourceAdapter):
    """Adapter for EU sanctions lists"""
    
    async def fetch_data(self, since: Optional[datetime] = None) -> List[Dict[str, Any]]:
        """Fetch EU sanctions data"""
        try:
            async with aiohttp.ClientSession() as session:
                # EU sanctions are typically in XML format
                async with session.get(self.config.url) as response:
                    response.raise_for_status()
                    # Parse XML and convert to entities
                    # This would need proper XML parsing implementation
                    return []  # Placeholder
        except Exception as e:
            logger.error(f"Failed to fetch EU sanctions data: {str(e)}")
            raise
    
    def normalize_entity(self, raw_entity: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize EU sanctions entity format"""
        return {
            'id': f"eu_{raw_entity.get('id')}",
            'name': raw_entity.get('name'),
            'schema': 'Person',
            'properties': {
                'nationality': raw_entity.get('nationality', []),
                'sanctions': {
                    'type': 'EU_SANCTIONS',
                    'authority': 'European Union',
                    'regulation': raw_entity.get('regulation'),
                    'date_added': raw_entity.get('date_added')
                }
            },
            'datasets': ['eu_sanctions'],
            'topics': ['sanction'],
            'last_seen': datetime.utcnow().isoformat()
        }
    
    async def validate_connection(self) -> bool:
        """Test EU sanctions API connection"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    self.config.url,
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    return response.status == 200
        except:
            return False

class PEPDataAdapter(DataSourceAdapter):
    """Adapter for Politically Exposed Persons (PEP) data sources"""
    
    async def fetch_data(self, since: Optional[datetime] = None) -> List[Dict[str, Any]]:
        """Fetch PEP data"""
        try:
            async with aiohttp.ClientSession() as session:
                headers = self.config.headers or {}
                if self.config.api_key:
                    headers['X-API-Key'] = self.config.api_key
                
                params = {'country': 'MA'}  # Morocco focus
                if since:
                    params['updated_since'] = since.isoformat()
                    
                async with session.get(
                    self.config.url,
                    headers=headers,
                    params=params
                ) as response:
                    response.raise_for_status()
                    data = await response.json()
                    return data.get('persons', [])
        except Exception as e:
            logger.error(f"Failed to fetch PEP data: {str(e)}")
            raise
    
    def normalize_entity(self, raw_entity: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize PEP entity format"""
        return {
            'id': f"pep_{raw_entity.get('id')}",
            'name': raw_entity.get('full_name'),
            'schema': 'Person',
            'properties': {
                'nationality': raw_entity.get('nationality', []),
                'birth_date': raw_entity.get('date_of_birth'),
                'political_positions': raw_entity.get('positions', []),
                'pep_status': {
                    'type': 'PEP',
                    'level': raw_entity.get('risk_level', 'medium'),
                    'positions': raw_entity.get('current_positions', []),
                    'family_members': raw_entity.get('family_members', []),
                    'associates': raw_entity.get('known_associates', [])
                }
            },
            'datasets': ['moroccan_pep'],
            'topics': ['pep'],
            'last_seen': datetime.utcnow().isoformat()
        }
    
    async def validate_connection(self) -> bool:
        """Test PEP data source connection"""
        try:
            async with aiohttp.ClientSession() as session:
                headers = self.config.headers or {}
                if self.config.api_key:
                    headers['X-API-Key'] = self.config.api_key
                
                async with session.get(
                    f"{self.config.url}/status",
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    return response.status == 200
        except:
            return False

class DataSourceManager:
    """Manages multiple data sources and their synchronization"""
    
    def __init__(self, db: Session):
        self.db = db
        self.audit_service = get_audit_service(db)
        self.adapters: Dict[str, DataSourceAdapter] = {}
        self.initialize_default_sources()
    
    def initialize_default_sources(self):
        """Initialize default data source configurations"""
        
        # CNASNU - Moroccan National Committee for UN Sanctions
        cnasnu_config = DataSourceConfig(
            name="CNASNU",
            url="https://api.cnasnu.ma/v1/sanctions",  # Placeholder URL
            source_type="sanctions",
            priority=1,
            update_frequency=6,  # Update every 6 hours
            enabled=True
        )
        self.adapters["cnasnu"] = CNASNUAdapter(cnasnu_config)
        
        # EU Sanctions
        eu_config = DataSourceConfig(
            name="EU_Sanctions",
            url="https://webgate.ec.europa.eu/fsd/fsf/public/files/xmlFullSanctionsList_1_1/content",
            source_type="sanctions", 
            priority=2,
            format="xml",
            update_frequency=24,
            enabled=True
        )
        self.adapters["eu_sanctions"] = EUSanctionsAdapter(eu_config)
        
        # Moroccan PEP Database
        pep_config = DataSourceConfig(
            name="Moroccan_PEP",
            url="https://api.transparency.ma/v1/pep",  # Placeholder URL
            source_type="pep",
            priority=3,
            update_frequency=168,  # Weekly updates
            enabled=True
        )
        self.adapters["moroccan_pep"] = PEPDataAdapter(pep_config)
    
    async def sync_all_sources(self, force: bool = False) -> Dict[str, DataSourceStatus]:
        """Synchronize all enabled data sources"""
        results = {}
        
        for name, adapter in self.adapters.items():
            if not adapter.config.enabled:
                continue
            
            try:
                # Check if update is needed
                if not force and not self._needs_update(adapter):
                    continue
                
                logger.info(f"Starting sync for data source: {name}")
                status = await self._sync_source(adapter)
                results[name] = status
                
                # Log audit event
                self.audit_service.log_action(
                    user_id=None,  # System action
                    action="DATA_SOURCE_SYNC",
                    resource=name,
                    resource_type="DATA_SOURCE",
                    success=status.is_healthy,
                    extra_data={
                        "total_records": status.total_records,
                        "new_records": status.new_records,
                        "updated_records": status.updated_records
                    }
                )
                
            except Exception as e:
                logger.error(f"Failed to sync {name}: {str(e)}")
                results[name] = DataSourceStatus(
                    name=name,
                    last_update=datetime.utcnow(),
                    last_success=None,
                    last_error=str(e),
                    total_records=0,
                    new_records=0,
                    updated_records=0,
                    is_healthy=False,
                    next_update=None
                )
        
        return results
    
    async def _sync_source(self, adapter: DataSourceAdapter) -> DataSourceStatus:
        """Synchronize a single data source"""
        start_time = datetime.utcnow()
        
        try:
            # Test connection first
            if not await adapter.validate_connection():
                raise Exception("Connection validation failed")
            
            # Fetch data
            last_update = self._get_last_update(adapter.config.name)
            raw_entities = await adapter.fetch_data(since=last_update)
            
            # Process and normalize entities
            processed_count = 0
            new_count = 0
            updated_count = 0
            
            for raw_entity in raw_entities:
                try:
                    normalized_entity = adapter.normalize_entity(raw_entity)
                    
                    # Here you would typically save to database
                    # For now, we'll just count
                    entity_hash = self._calculate_entity_hash(normalized_entity)
                    
                    # Check if entity exists (simplified)
                    if self._entity_exists(entity_hash):
                        updated_count += 1
                    else:
                        new_count += 1
                    
                    processed_count += 1
                    
                except Exception as e:
                    logger.warning(f"Failed to process entity: {str(e)}")
                    continue
            
            # Update last sync time
            self._update_last_sync(adapter.config.name, start_time)
            
            return DataSourceStatus(
                name=adapter.config.name,
                last_update=start_time,
                last_success=start_time,
                last_error=None,
                total_records=processed_count,
                new_records=new_count,
                updated_records=updated_count,
                is_healthy=True,
                next_update=start_time + timedelta(hours=adapter.config.update_frequency)
            )
            
        except Exception as e:
            return DataSourceStatus(
                name=adapter.config.name,
                last_update=start_time,
                last_success=None,
                last_error=str(e),
                total_records=0,
                new_records=0,
                updated_records=0,
                is_healthy=False,
                next_update=None
            )
    
    def _needs_update(self, adapter: DataSourceAdapter) -> bool:
        """Check if a data source needs updating"""
        last_update = self._get_last_update(adapter.config.name)
        if not last_update:
            return True
        
        next_update = last_update + timedelta(hours=adapter.config.update_frequency)
        return datetime.utcnow() >= next_update
    
    def _get_last_update(self, source_name: str) -> Optional[datetime]:
        """Get last update timestamp for a data source"""
        # This would typically query a database table
        # For now, return None to force updates
        return None
    
    def _update_last_sync(self, source_name: str, timestamp: datetime):
        """Update last sync timestamp for a data source"""
        # This would typically update a database table
        pass
    
    def _calculate_entity_hash(self, entity: Dict[str, Any]) -> str:
        """Calculate hash for entity deduplication"""
        # Create a hash based on key entity fields
        key_data = {
            'name': entity.get('name', ''),
            'schema': entity.get('schema', ''),
            'id': entity.get('id', '')
        }
        return hashlib.md5(json.dumps(key_data, sort_keys=True).encode()).hexdigest()
    
    def _entity_exists(self, entity_hash: str) -> bool:
        """Check if entity already exists in database"""
        # This would typically check the database
        return False
    
    async def get_source_status(self, source_name: Optional[str] = None) -> Dict[str, DataSourceStatus]:
        """Get status of data sources"""
        if source_name:
            if source_name in self.adapters:
                # Return status for specific source
                pass
            else:
                return {}
        
        # Return status for all sources
        statuses = {}
        for name, adapter in self.adapters.items():
            statuses[name] = DataSourceStatus(
                name=name,
                last_update=self._get_last_update(name),
                last_success=self._get_last_update(name),
                last_error=None,
                total_records=0,  # Would come from database
                new_records=0,
                updated_records=0,
                is_healthy=adapter.config.enabled,
                next_update=None
            )
        
        return statuses
    
    async def test_all_connections(self) -> Dict[str, bool]:
        """Test connections to all data sources"""
        results = {}
        
        for name, adapter in self.adapters.items():
            try:
                results[name] = await adapter.validate_connection()
            except Exception as e:
                logger.error(f"Connection test failed for {name}: {str(e)}")
                results[name] = False
        
        return results

def get_data_source_manager(db: Session) -> DataSourceManager:
    """Factory function to get data source manager instance"""
    return DataSourceManager(db)