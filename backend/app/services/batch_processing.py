"""
Batch Processing Service for Excel Upload and Screening
Handles Excel file upload, validation, and batch screening operations
"""
import pandas as pd
import logging
import asyncio
import httpx
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
from dataclasses import dataclass
from io import BytesIO
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.user import User
from app.models.audit_log import AuditLog
from app.models.search_history import SearchHistory
from app.services.fuzzy_matching import fuzzy_matching_service

logger = logging.getLogger(__name__)

@dataclass
class BatchJobResult:
    """Result of a batch processing job"""
    job_id: str
    total_records: int
    processed_records: int
    successful_records: int
    failed_records: int
    results: List[Dict[str, Any]]
    errors: List[Dict[str, Any]]
    processing_time_ms: int
    status: str  # 'completed', 'failed', 'processing'

class BatchProcessingService:
    """Service for handling batch processing operations"""
    
    def __init__(self):
        self.max_batch_size = 1000  # Maximum records per batch
        self.timeout_per_record = 5.0  # Timeout per record in seconds
        
    def validate_excel_template(self, file_content: bytes, template_type: str = "screening") -> Dict[str, Any]:
        """
        Validate uploaded Excel file against expected template
        
        Args:
            file_content: Raw Excel file content
            template_type: Type of template ('screening', 'pep', 'sanctions')
            
        Returns:
            Dict with validation results
        """
        try:
            # Read Excel file
            df = pd.read_excel(BytesIO(file_content))
            
            # Define required columns for different templates
            required_columns = {
                "screening": [
                    "name",  # Full name (required)
                    "type"   # Person/Company (required)
                ],
                "enhanced_screening": [
                    "name",           # Full name (required) 
                    "type",           # Person/Company (required)
                    "date_of_birth",  # Optional
                    "place_of_birth", # Optional
                    "nationality",    # Optional
                    "country",        # Optional
                    "reference_id"    # Optional internal reference
                ]
            }
            
            # Get expected columns
            template_cols = required_columns.get(template_type, required_columns["screening"])
            required_cols = ["name", "type"]  # Always required
            optional_cols = [col for col in template_cols if col not in required_cols]
            
            # Check for required columns
            missing_required = [col for col in required_cols if col not in df.columns]
            if missing_required:
                return {
                    "valid": False,
                    "error": f"Missing required columns: {missing_required}",
                    "required_columns": required_cols,
                    "optional_columns": optional_cols,
                    "found_columns": list(df.columns),
                    "records_count": 0
                }
            
            # Validate data types and content
            validation_errors = []
            
            # Check for empty names
            empty_names = df[df['name'].isna() | (df['name'].str.strip() == '')].index.tolist()
            if empty_names:
                validation_errors.append(f"Empty names found in rows: {[i+2 for i in empty_names[:10]]}")  # +2 for Excel row numbers
            
            # Validate type column
            valid_types = ['Person', 'Company', 'Organization']
            if 'type' in df.columns:
                invalid_types = df[~df['type'].isin(valid_types)]['type'].unique().tolist()
                if invalid_types:
                    validation_errors.append(f"Invalid entity types found: {invalid_types}. Valid types: {valid_types}")
            
            # Check batch size
            if len(df) > self.max_batch_size:
                validation_errors.append(f"File contains {len(df)} records. Maximum allowed: {self.max_batch_size}")
            
            # Remove empty rows
            df_clean = df.dropna(subset=['name']).copy()
            df_clean['name'] = df_clean['name'].str.strip()
            df_clean = df_clean[df_clean['name'] != '']
            
            return {
                "valid": len(validation_errors) == 0,
                "errors": validation_errors,
                "warnings": [],
                "template_type": template_type,
                "records_count": len(df_clean),
                "total_rows": len(df),
                "empty_rows_removed": len(df) - len(df_clean),
                "required_columns": required_cols,
                "optional_columns": optional_cols,
                "found_columns": list(df.columns),
                "sample_data": df_clean.head(3).to_dict('records') if len(df_clean) > 0 else []
            }
            
        except Exception as e:
            logger.error(f"Error validating Excel template: {str(e)}")
            return {
                "valid": False,
                "error": f"Failed to process Excel file: {str(e)}",
                "template_type": template_type,
                "records_count": 0
            }
    
    def parse_excel_data(self, file_content: bytes) -> List[Dict[str, Any]]:
        """
        Parse Excel file and extract screening data
        
        Args:
            file_content: Raw Excel file content
            
        Returns:
            List of entities to screen
        """
        try:
            df = pd.read_excel(BytesIO(file_content))
            
            # Clean and prepare data
            df_clean = df.dropna(subset=['name']).copy()
            df_clean['name'] = df_clean['name'].str.strip()
            df_clean = df_clean[df_clean['name'] != '']
            
            # Convert to list of dictionaries
            entities = []
            for idx, row in df_clean.iterrows():
                entity = {
                    "row_number": idx + 1,  # Excel row number (1-based)
                    "name": str(row['name']).strip(),
                    "type": str(row.get('type', 'Person')).strip(),
                    "date_of_birth": str(row.get('date_of_birth', '')).strip() if pd.notna(row.get('date_of_birth')) else '',
                    "place_of_birth": str(row.get('place_of_birth', '')).strip() if pd.notna(row.get('place_of_birth')) else '',
                    "nationality": str(row.get('nationality', '')).strip() if pd.notna(row.get('nationality')) else '',
                    "country": str(row.get('country', '')).strip() if pd.notna(row.get('country')) else '',
                    "reference_id": str(row.get('reference_id', '')).strip() if pd.notna(row.get('reference_id')) else '',
                    "original_row": row.to_dict()  # Keep original data
                }
                entities.append(entity)
            
            return entities
            
        except Exception as e:
            logger.error(f"Error parsing Excel data: {str(e)}")
            raise Exception(f"Failed to parse Excel file: {str(e)}")
    
    async def process_batch_screening(
        self, 
        entities: List[Dict[str, Any]], 
        dataset: str = "default",
        user_id: int = 1
    ) -> BatchJobResult:
        """
        Process batch screening for multiple entities
        
        Args:
            entities: List of entities to screen
            dataset: OpenSanctions dataset to use
            user_id: ID of user performing the screening
            
        Returns:
            BatchJobResult with processing results
        """
        job_id = f"batch_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{len(entities)}"
        start_time = datetime.utcnow()
        
        logger.info(f"Starting batch processing job {job_id} for {len(entities)} entities")
        
        results = []
        errors = []
        processed = 0
        successful = 0
        
        try:
            # Process entities in parallel batches
            batch_size = min(50, len(entities))  # Process up to 50 entities at once
            
            for i in range(0, len(entities), batch_size):
                batch_entities = entities[i:i + batch_size]
                batch_results = await self._process_entity_batch(batch_entities, dataset, job_id)
                
                for entity_result in batch_results:
                    processed += 1
                    if entity_result.get("status") == "success":
                        successful += 1
                        results.append(entity_result)
                    else:
                        errors.append(entity_result)
                
                # Log progress
                logger.info(f"Batch job {job_id}: Processed {processed}/{len(entities)} entities")
        
        except Exception as e:
            logger.error(f"Batch processing job {job_id} failed: {str(e)}")
            return BatchJobResult(
                job_id=job_id,
                total_records=len(entities),
                processed_records=processed,
                successful_records=successful,
                failed_records=len(entities) - successful,
                results=results,
                errors=errors + [{"error": str(e), "entity": "batch_processing"}],
                processing_time_ms=int((datetime.utcnow() - start_time).total_seconds() * 1000),
                status="failed"
            )
        
        processing_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)
        
        logger.info(f"Batch job {job_id} completed: {successful}/{len(entities)} successful in {processing_time}ms")
        
        return BatchJobResult(
            job_id=job_id,
            total_records=len(entities),
            processed_records=processed,
            successful_records=successful,
            failed_records=len(errors),
            results=results,
            errors=errors,
            processing_time_ms=processing_time,
            status="completed"
        )
    
    async def _process_entity_batch(
        self, 
        entities: List[Dict[str, Any]], 
        dataset: str,
        job_id: str
    ) -> List[Dict[str, Any]]:
        """
        Process a single batch of entities
        
        Args:
            entities: Batch of entities to process
            dataset: OpenSanctions dataset
            job_id: Batch job identifier
            
        Returns:
            List of results for this batch
        """
        batch_results = []
        opensanctions_url = settings.OPENSANCTIONS_BASE_URL
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Create tasks for parallel processing
            tasks = []
            for entity in entities:
                task = self._screen_single_entity(client, entity, dataset, opensanctions_url, job_id)
                tasks.append(task)
            
            # Process all entities in parallel
            batch_results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Handle exceptions
            final_results = []
            for i, result in enumerate(batch_results):
                if isinstance(result, Exception):
                    logger.error(f"Error processing entity {entities[i]['name']}: {str(result)}")
                    final_results.append({
                        "entity_name": entities[i]['name'],
                        "row_number": entities[i]['row_number'],
                        "status": "error",
                        "error": str(result),
                        "results_count": 0,
                        "matches": []
                    })
                else:
                    final_results.append(result)
        
        return final_results
    
    async def _screen_single_entity(
        self, 
        client: httpx.AsyncClient, 
        entity: Dict[str, Any], 
        dataset: str,
        opensanctions_url: str,
        job_id: str
    ) -> Dict[str, Any]:
        """
        Screen a single entity against OpenSanctions
        
        Args:
            client: HTTP client
            entity: Entity data to screen
            dataset: Dataset to search
            opensanctions_url: OpenSanctions API URL
            job_id: Job identifier
            
        Returns:
            Screening result for this entity
        """
        entity_name = entity['name']
        row_number = entity['row_number']
        
        try:
            # Prepare search parameters
            params = {
                "q": entity_name,
                "limit": 20,
                "fuzzy": True,
                "simple": True,
                "facets": ["countries", "topics", "datasets"]
            }
            
            # Add optional filters if provided
            if entity.get('country'):
                params["countries"] = [entity['country']]
            if entity.get('type') and entity['type'] != 'Person':
                if entity['type'] == 'Company':
                    params["schema"] = "Company"
                elif entity['type'] == 'Organization':
                    params["schema"] = "Organization"
            
            # Make request to OpenSanctions
            response = await client.get(
                f"{opensanctions_url}/search/{dataset}",
                params=params
            )
            
            if response.status_code == 200:
                opensanctions_data = response.json()
                opensanctions_results = opensanctions_data.get("results", [])
                
                # Enhance results with fuzzy matching
                enhanced_matches = []
                for os_result in opensanctions_results[:10]:  # Limit to top 10 matches
                    # Calculate fuzzy match confidence
                    os_entity_name = os_result.get("caption", "")
                    os_aliases = []
                    
                    if os_result.get("properties") and os_result["properties"].get("alias"):
                        os_aliases = os_result["properties"]["alias"]
                    
                    fuzzy_result = fuzzy_matching_service.match_names(
                        entity_name, 
                        os_entity_name, 
                        os_aliases
                    )
                    
                    # Create enhanced match result
                    enhanced_match = {
                        **os_result,
                        "match_confidence": round(fuzzy_result.score, 2),
                        "match_type": fuzzy_result.match_type,
                        "risk_level": self._get_risk_level_from_score(os_result.get("score", 0)),
                        "match_details": {
                            "normalized_query": fuzzy_result.normalized_query,
                            "normalized_target": fuzzy_result.normalized_target,
                            "algorithm_scores": {
                                k: round(v, 2) for k, v in fuzzy_result.algorithm_scores.items()
                            }
                        }
                    }
                    enhanced_matches.append(enhanced_match)
                
                # Sort by combined score (OpenSanctions score + fuzzy confidence)
                enhanced_matches.sort(
                    key=lambda x: (x.get("score", 0) * 0.7 + x.get("match_confidence", 0) * 0.003),
                    reverse=True
                )
                
                return {
                    "entity_name": entity_name,
                    "entity_type": entity.get('type', 'Person'),
                    "row_number": row_number,
                    "reference_id": entity.get('reference_id', ''),
                    "additional_info": {
                        "date_of_birth": entity.get('date_of_birth', ''),
                        "place_of_birth": entity.get('place_of_birth', ''),
                        "nationality": entity.get('nationality', ''),
                        "country": entity.get('country', '')
                    },
                    "status": "success",
                    "results_count": len(enhanced_matches),
                    "matches": enhanced_matches,
                    "opensanctions_total": opensanctions_data.get("total", {"value": 0})["value"],
                    "highest_risk_match": enhanced_matches[0] if enhanced_matches else None,
                    "processing_timestamp": datetime.utcnow().isoformat()
                }
                
            else:
                logger.warning(f"OpenSanctions returned {response.status_code} for entity {entity_name}")
                return {
                    "entity_name": entity_name,
                    "row_number": row_number,
                    "status": "api_error",
                    "error": f"OpenSanctions API returned {response.status_code}",
                    "results_count": 0,
                    "matches": []
                }
                
        except asyncio.TimeoutError:
            return {
                "entity_name": entity_name,
                "row_number": row_number,
                "status": "timeout",
                "error": "Request timeout",
                "results_count": 0,
                "matches": []
            }
        except Exception as e:
            logger.error(f"Error screening entity {entity_name}: {str(e)}")
            return {
                "entity_name": entity_name,
                "row_number": row_number,
                "status": "error",
                "error": str(e),
                "results_count": 0,
                "matches": []
            }
    
    def _get_risk_level_from_score(self, score: float) -> str:
        """Convert OpenSanctions score to risk level"""
        score_percent = score * 100
        if score_percent >= 80: return "HIGH"
        elif score_percent >= 50: return "MEDIUM"
        else: return "LOW"
    
    def generate_results_excel(self, batch_result: BatchJobResult) -> bytes:
        """
        Generate Excel file with batch screening results
        
        Args:
            batch_result: Results from batch processing
            
        Returns:
            Excel file content as bytes
        """
        try:
            # Prepare summary data
            summary_data = {
                "Job ID": [batch_result.job_id],
                "Total Records": [batch_result.total_records],
                "Successful": [batch_result.successful_records],
                "Failed": [batch_result.failed_records],
                "Processing Time (ms)": [batch_result.processing_time_ms],
                "Status": [batch_result.status]
            }
            
            # Prepare detailed results
            detailed_results = []
            for result in batch_result.results:
                entity_data = {
                    "Row Number": result.get("row_number", ""),
                    "Entity Name": result.get("entity_name", ""),
                    "Entity Type": result.get("entity_type", ""),
                    "Reference ID": result.get("reference_id", ""),
                    "Status": result.get("status", ""),
                    "Matches Found": result.get("results_count", 0),
                    "Highest Risk Level": "",
                    "Highest Match Score": 0,
                    "Highest Match Name": "",
                    "Highest Match Type": "",
                    "Date of Birth": result.get("additional_info", {}).get("date_of_birth", ""),
                    "Place of Birth": result.get("additional_info", {}).get("place_of_birth", ""),
                    "Nationality": result.get("additional_info", {}).get("nationality", ""),
                    "Country": result.get("additional_info", {}).get("country", "")
                }
                
                # Add highest risk match details
                if result.get("highest_risk_match"):
                    highest_match = result["highest_risk_match"]
                    entity_data.update({
                        "Highest Risk Level": highest_match.get("risk_level", ""),
                        "Highest Match Score": round(highest_match.get("score", 0) * 100, 2),
                        "Highest Match Name": highest_match.get("caption", ""),
                        "Highest Match Type": highest_match.get("match_type", "")
                    })
                
                detailed_results.append(entity_data)
            
            # Add error records
            for error in batch_result.errors:
                error_data = {
                    "Row Number": error.get("row_number", ""),
                    "Entity Name": error.get("entity_name", ""),
                    "Entity Type": "",
                    "Reference ID": "",
                    "Status": error.get("status", "error"),
                    "Matches Found": 0,
                    "Highest Risk Level": "",
                    "Highest Match Score": 0,
                    "Highest Match Name": "",
                    "Highest Match Type": "",
                    "Date of Birth": "",
                    "Place of Birth": "",
                    "Nationality": "",
                    "Country": "",
                    "Error": error.get("error", "")
                }
                detailed_results.append(error_data)
            
            # Create Excel file in memory
            output = BytesIO()
            with pd.ExcelWriter(output, engine='openpyxl') as writer:
                # Write summary sheet
                summary_df = pd.DataFrame(summary_data)
                summary_df.to_excel(writer, sheet_name='Summary', index=False)
                
                # Write detailed results
                results_df = pd.DataFrame(detailed_results)
                results_df.to_excel(writer, sheet_name='Results', index=False)
                
                # Write matches details (first 100 matches)
                if batch_result.results:
                    matches_data = []
                    for result in batch_result.results[:100]:  # Limit to first 100 entities
                        for match in result.get("matches", [])[:5]:  # Top 5 matches per entity
                            match_data = {
                                "Entity Name": result.get("entity_name", ""),
                                "Row Number": result.get("row_number", ""),
                                "Match Name": match.get("caption", ""),
                                "Match Score": round(match.get("score", 0) * 100, 2),
                                "Match Confidence": match.get("match_confidence", 0),
                                "Match Type": match.get("match_type", ""),
                                "Risk Level": match.get("risk_level", ""),
                                "Entity Type": match.get("schema", ""),
                                "Countries": ", ".join(match.get("properties", {}).get("country", [])),
                                "Topics": ", ".join(match.get("properties", {}).get("topics", [])),
                                "OpenSanctions ID": match.get("id", "")
                            }
                            matches_data.append(match_data)
                    
                    if matches_data:
                        matches_df = pd.DataFrame(matches_data)
                        matches_df.to_excel(writer, sheet_name='Matches', index=False)
            
            output.seek(0)
            return output.getvalue()
            
        except Exception as e:
            logger.error(f"Error generating results Excel: {str(e)}")
            raise Exception(f"Failed to generate results Excel: {str(e)}")

# Global instance
batch_processing_service = BatchProcessingService()