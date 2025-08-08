#!/usr/bin/env python3
"""
TafraData to OpenSanctions Integration Script

This script converts Excel files from TafraData into JSONL format compatible with 
the OpenSanctions API structure, including all relevant political information.
"""

import pandas as pd
import json
import os
import sys
from typing import List, Dict, Any, Optional
from datetime import datetime
import hashlib
import logging
import argparse
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class TafraDataConverter:
    """Convert TafraData Excel files to OpenSanctions JSONL format"""
    
    def __init__(self, tafra_data_dir: str = "TafraData", output_dir: str = "custom-datasets"):
        self.tafra_data_dir = Path(tafra_data_dir)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        
        # Create comprehensive mappings for different entity types
        self.risk_classifications = {
            "parlement": "HIGH",      # Parliament members - highest risk PEPs
            "regions": "MEDIUM",      # Regional officials - medium risk
            "communes": "LOW"         # Municipal officials - lower risk but still PEPs
        }
        
        # Political party mappings for better identification
        self.party_mappings = {
            # Major Moroccan political parties
            "PAM": "Parti Authenticité et Modernité",
            "PI": "Parti de l'Istiqlal", 
            "RNI": "Rassemblement National des Indépendants",
            "MP": "Mouvement Populaire",
            "UC": "Union Constitutionnelle",
            "USFP": "Union Socialiste des Forces Populaires",
            "PJD": "Parti de la Justice et du Développement",
            "PPS": "Parti du Progrès et du Socialisme",
            "FFD": "Front des Forces Démocratiques",
            "MDS": "Mouvement Démocratique et Social",
            "CNI": "Congrès National Ittihadi",
            "PT": "Parti du Travail"
        }
    
    def generate_entity_id(self, name: str, type_prefix: str, additional_info: str = "") -> str:
        """Generate a unique entity ID"""
        combined = f"{name}_{type_prefix}_{additional_info}".lower()
        hash_obj = hashlib.md5(combined.encode('utf-8'))
        return f"ma-{type_prefix}-{hash_obj.hexdigest()[:12]}"
    
    def clean_text(self, text: Any) -> str:
        """Clean and normalize text data"""
        if pd.isna(text) or text is None:
            return ""
        return str(text).strip()
    
    def extract_names(self, full_name: str) -> Dict[str, List[str]]:
        """Extract different name components from full name"""
        if not full_name:
            return {"name": [], "firstName": [], "lastName": []}
        
        names = {
            "name": [full_name],
            "firstName": [],
            "lastName": [],
            "weakAlias": []
        }
        
        # Try to split names (this is basic - could be enhanced)
        name_parts = full_name.split()
        if len(name_parts) >= 2:
            names["firstName"] = [name_parts[0]]
            names["lastName"] = [' '.join(name_parts[1:])]
        
        return names
    
    def determine_schema(self, entity_type: str) -> str:
        """Determine OpenSanctions schema based on entity type"""
        # All political figures are considered Persons in OpenSanctions
        return "Person"
    
    def convert_parliament_data(self, file_path: Path) -> List[Dict[str, Any]]:
        """Convert parliament Excel data to OpenSanctions format"""
        logger.info(f"Converting parliament data from {file_path}")
        
        try:
            df = pd.read_excel(file_path)
            logger.info(f"Loaded {len(df)} parliament members from {file_path}")
            
            entities = []
            for index, row in df.iterrows():
                try:
                    # Extract basic information
                    full_name = self.clean_text(row.get('prenomNom', ''))
                    if not full_name:
                        continue
                    
                    # Generate entity ID
                    entity_id = self.generate_entity_id(full_name, "parliament", str(index))
                    
                    # Extract name components
                    names = self.extract_names(full_name)
                    
                    # Build comprehensive properties
                    properties = {
                        **names,
                        "birthDate": [],
                        "gender": [],
                        "nationality": ["ma"],
                        "citizenship": ["ma"],
                        "country": ["ma"],
                        "topics": ["role.pep", "gov.national"],
                        "classification": ["Parliamentarian", "Politically Exposed Person"],
                        "position": ["Member of Parliament"],
                        "politicalParty": [],
                        "constituency": [],
                        "chamber": [],
                        "mandate": [],
                        "notes": [],
                        "sourceUrl": ["https://tafra.ma"],
                        "riskLevel": ["HIGH"],
                        "createdAt": [datetime.now().isoformat()],
                        "modifiedAt": [datetime.now().isoformat()]
                    }
                    
                    # Add specific parliament information
                    if 'parti' in row and not pd.isna(row['parti']):
                        party = self.clean_text(row['parti'])
                        full_party_name = self.party_mappings.get(party, party)
                        properties["politicalParty"] = [full_party_name]
                        if party != full_party_name:
                            properties["weakAlias"].append(f"{full_name} ({party})")
                    
                    if 'circonscription' in row and not pd.isna(row['circonscription']):
                        properties["constituency"] = [self.clean_text(row['circonscription'])]
                    
                    if 'parlement' in row and not pd.isna(row['parlement']):
                        chamber = self.clean_text(row['parlement'])
                        properties["chamber"] = [chamber]
                        properties["mandate"] = [chamber]
                    
                    # Add gender information
                    if 'femme' in row and not pd.isna(row['femme']):
                        if int(row['femme']) == 1:
                            properties["gender"] = ["female"]
                        else:
                            properties["gender"] = ["male"]
                    
                    # Add gender if available
                    if 'genre' in row and not pd.isna(row['genre']):
                        gender = self.clean_text(row['genre']).lower()
                        if gender in ['m', 'male', 'masculin']:
                            properties["gender"] = ["male"]
                        elif gender in ['f', 'female', 'féminin']:
                            properties["gender"] = ["female"]
                    
                    # Add birth date if available
                    if 'date_naissance' in row and not pd.isna(row['date_naissance']):
                        birth_date = self.clean_text(row['date_naissance'])
                        properties["birthDate"] = [birth_date]
                    
                    # Add any additional notes
                    notes = []
                    if 'bio' in row and not pd.isna(row['bio']):
                        notes.append(f"Biography: {self.clean_text(row['bio'])}")
                    if 'fonction' in row and not pd.isna(row['fonction']):
                        function = self.clean_text(row['fonction'])
                        notes.append(f"Function: {function}")
                        if function not in properties["position"]:
                            properties["position"].append(function)
                    
                    properties["notes"] = notes
                    
                    # Create entity
                    entity = {
                        "id": entity_id,
                        "schema": "Person",
                        "properties": properties,
                        "datasets": ["tafra_parliament"],
                        "referents": [],
                        "target": True
                    }
                    
                    entities.append(entity)
                    
                except Exception as e:
                    logger.error(f"Error processing parliament row {index}: {e}")
                    continue
            
            logger.info(f"Successfully converted {len(entities)} parliament entities")
            return entities
            
        except Exception as e:
            logger.error(f"Error reading parliament file {file_path}: {e}")
            return []
    
    def convert_regional_data(self, file_path: Path, year: str) -> List[Dict[str, Any]]:
        """Convert regional Excel data to OpenSanctions format"""
        logger.info(f"Converting regional data from {file_path} for year {year}")
        
        try:
            df = pd.read_excel(file_path)
            logger.info(f"Loaded {len(df)} regional officials from {file_path}")
            
            entities = []
            for index, row in df.iterrows():
                try:
                    # Extract basic information
                    full_name = self.clean_text(row.get('prenomNom', ''))
                    if not full_name:
                        continue
                    
                    # Generate entity ID
                    entity_id = self.generate_entity_id(full_name, f"regional-{year}", str(index))
                    
                    # Extract name components
                    names = self.extract_names(full_name)
                    
                    # Build comprehensive properties
                    properties = {
                        **names,
                        "birthDate": [],
                        "gender": [],
                        "nationality": ["ma"],
                        "citizenship": ["ma"],
                        "country": ["ma"],
                        "topics": ["role.pep", "gov.regional"],
                        "classification": ["Regional Official", "Politically Exposed Person"],
                        "position": ["Regional Council Member"],
                        "politicalParty": [],
                        "region": [],
                        "province": [],
                        "mandate": [year],
                        "notes": [],
                        "sourceUrl": ["https://tafra.ma"],
                        "riskLevel": ["MEDIUM"],
                        "createdAt": [datetime.now().isoformat()],
                        "modifiedAt": [datetime.now().isoformat()]
                    }
                    
                    # Add specific regional information
                    if 'parti' in row and not pd.isna(row['parti']):
                        party = self.clean_text(row['parti'])
                        full_party_name = self.party_mappings.get(party, party)
                        properties["politicalParty"] = [full_party_name]
                    
                    if 'region' in row and not pd.isna(row['region']):
                        region = self.clean_text(row['region'])
                        properties["region"] = [region]
                        properties["notes"].append(f"Regional representative for {region}")
                    
                    if 'province' in row and not pd.isna(row['province']):
                        properties["province"] = [self.clean_text(row['province'])]
                    
                    if 'role' in row and not pd.isna(row['role']):
                        function = self.clean_text(row['role'])
                        if function:
                            properties["position"] = [function]
                            properties["notes"].append(f"Position: {function}")
                    
                    # Check if this person is a list leader
                    if 'teteDeListe' in row and not pd.isna(row['teteDeListe']):
                        if row['teteDeListe'] == True or str(row['teteDeListe']).lower() == 'true':
                            properties["notes"].append("List leader (tête de liste)")
                            properties["topics"].append("gov.executive")
                    
                    # Add election information
                    properties["notes"].append(f"Elected in {year} regional elections")
                    
                    # Create entity
                    entity = {
                        "id": entity_id,
                        "schema": "Person",
                        "properties": properties,
                        "datasets": [f"tafra_regional_{year}"],
                        "referents": [],
                        "target": True
                    }
                    
                    entities.append(entity)
                    
                except Exception as e:
                    logger.error(f"Error processing regional row {index}: {e}")
                    continue
            
            logger.info(f"Successfully converted {len(entities)} regional entities")
            return entities
            
        except Exception as e:
            logger.error(f"Error reading regional file {file_path}: {e}")
            return []
    
    def convert_communal_data(self, file_path: Path, year: str) -> List[Dict[str, Any]]:
        """Convert communal Excel data to OpenSanctions format"""
        logger.info(f"Converting communal data from {file_path} for year {year}")
        
        try:
            df = pd.read_excel(file_path)
            logger.info(f"Loaded {len(df)} communal officials from {file_path}")
            
            entities = []
            for index, row in df.iterrows():
                try:
                    # Extract basic information
                    full_name = self.clean_text(row.get('prenomNom', ''))
                    if not full_name:
                        continue
                    
                    # Generate entity ID
                    entity_id = self.generate_entity_id(full_name, f"communal-{year}", str(index))
                    
                    # Extract name components
                    names = self.extract_names(full_name)
                    
                    # Build comprehensive properties
                    properties = {
                        **names,
                        "birthDate": [],
                        "gender": [],
                        "nationality": ["ma"],
                        "citizenship": ["ma"],
                        "country": ["ma"],
                        "topics": ["role.pep", "gov.municipal"],
                        "classification": ["Municipal Official", "Politically Exposed Person"],
                        "position": ["Municipal Council Member"],
                        "politicalParty": [],
                        "region": [],
                        "province": [],
                        "commune": [],
                        "mandate": [year],
                        "notes": [],
                        "sourceUrl": ["https://tafra.ma"],
                        "riskLevel": ["LOW"],
                        "createdAt": [datetime.now().isoformat()],
                        "modifiedAt": [datetime.now().isoformat()]
                    }
                    
                    # Add specific communal information
                    if 'parti' in row and not pd.isna(row['parti']):
                        party = self.clean_text(row['parti'])
                        full_party_name = self.party_mappings.get(party, party)
                        properties["politicalParty"] = [full_party_name]
                    
                    if 'region' in row and not pd.isna(row['region']):
                        properties["region"] = [self.clean_text(row['region'])]
                    
                    if 'province' in row and not pd.isna(row['province']):
                        properties["province"] = [self.clean_text(row['province'])]
                    
                    if 'commune' in row and not pd.isna(row['commune']):
                        commune = self.clean_text(row['commune'])
                        properties["commune"] = [commune]
                        properties["notes"].append(f"Municipal representative for {commune}")
                    
                    if 'role' in row and not pd.isna(row['role']):
                        function = self.clean_text(row['role'])
                        if function:
                            properties["position"] = [function]
                            if 'maire' in function.lower() or 'mayor' in function.lower() or 'président' in function.lower():
                                properties["topics"].append("gov.executive")
                                properties["riskLevel"] = ["MEDIUM"]  # Mayors/presidents have higher risk
                    
                    # Check if this person is a list leader
                    if 'teteDeListe' in row and not pd.isna(row['teteDeListe']):
                        if row['teteDeListe'] == True or str(row['teteDeListe']).lower() == 'true':
                            properties["notes"].append("List leader (tête de liste)")
                            properties["topics"].append("gov.executive")
                            properties["riskLevel"] = ["MEDIUM"]  # List leaders have higher risk
                    
                    # Add election information
                    properties["notes"].append(f"Elected in {year} municipal elections")
                    
                    # Create entity
                    entity = {
                        "id": entity_id,
                        "schema": "Person",
                        "properties": properties,
                        "datasets": [f"tafra_communal_{year}"],
                        "referents": [],
                        "target": True
                    }
                    
                    entities.append(entity)
                    
                except Exception as e:
                    logger.error(f"Error processing communal row {index}: {e}")
                    continue
            
            logger.info(f"Successfully converted {len(entities)} communal entities")
            return entities
            
        except Exception as e:
            logger.error(f"Error reading communal file {file_path}: {e}")
            return []
    
    def convert_all_files(self) -> Dict[str, int]:
        """Convert all TafraData files and create comprehensive JSONL"""
        logger.info("Starting TafraData conversion process...")
        
        all_entities = []
        conversion_stats = {}
        
        # File mapping
        file_mappings = [
            ("parlement-elus-tafra-1-6-0.xlsx", "parliament", None),
            ("regions-elus-2015-1-0.xlsx", "regional", "2015"),
            ("regions-elus-2021-1-0.xlsx", "regional", "2021"),
            ("communes-elus-2015-1-0.xlsx", "communal", "2015"),
            ("communes-elus-2021-1-1.xlsx", "communal", "2021")
        ]
        
        for filename, entity_type, year in file_mappings:
            file_path = self.tafra_data_dir / filename
            
            if not file_path.exists():
                logger.warning(f"File not found: {file_path}")
                conversion_stats[filename] = 0
                continue
            
            try:
                if entity_type == "parliament":
                    entities = self.convert_parliament_data(file_path)
                elif entity_type == "regional":
                    entities = self.convert_regional_data(file_path, year)
                elif entity_type == "communal":
                    entities = self.convert_communal_data(file_path, year)
                else:
                    logger.error(f"Unknown entity type: {entity_type}")
                    continue
                
                all_entities.extend(entities)
                conversion_stats[filename] = len(entities)
                logger.info(f"Converted {len(entities)} entities from {filename}")
                
            except Exception as e:
                logger.error(f"Failed to convert {filename}: {e}")
                conversion_stats[filename] = 0
        
        # Write combined JSONL file
        output_file = self.output_dir / "tafra-moroccan-entities.jsonl"
        logger.info(f"Writing {len(all_entities)} entities to {output_file}")
        
        try:
            with open(output_file, 'w', encoding='utf-8') as f:
                for entity in all_entities:
                    f.write(json.dumps(entity, ensure_ascii=False) + '\n')
            
            logger.info(f"Successfully wrote {len(all_entities)} entities to {output_file}")
            
            # Also create backup of existing moroccan-entities.jsonl
            existing_file = self.output_dir / "moroccan-entities.jsonl"
            if existing_file.exists():
                backup_file = self.output_dir / "moroccan-entities-backup.jsonl"
                os.rename(existing_file, backup_file)
                logger.info(f"Backed up existing file to {backup_file}")
            
            # Replace with new comprehensive file
            os.rename(output_file, existing_file)
            logger.info(f"New comprehensive dataset available at {existing_file}")
            
        except Exception as e:
            logger.error(f"Failed to write output file: {e}")
        
        return conversion_stats
    
    def generate_summary_report(self, stats: Dict[str, int]) -> Dict[str, Any]:
        """Generate summary report of conversion process"""
        total_entities = sum(stats.values())
        
        report = {
            "conversion_timestamp": datetime.now().isoformat(),
            "total_entities_converted": total_entities,
            "files_processed": len(stats),
            "file_breakdown": stats,
            "entity_types": {
                "parliament_members": stats.get("parlement-elus-tafra-1-6-0.xlsx", 0),
                "regional_2015": stats.get("regions-elus-2015-1-0.xlsx", 0),
                "regional_2021": stats.get("regions-elus-2021-1-0.xlsx", 0),
                "communal_2015": stats.get("communes-elus-2015-1-0.xlsx", 0),
                "communal_2021": stats.get("communes-elus-2021-1-1.xlsx", 0)
            },
            "risk_distribution": {
                "HIGH": stats.get("parlement-elus-tafra-1-6-0.xlsx", 0),
                "MEDIUM": (stats.get("regions-elus-2015-1-0.xlsx", 0) + 
                          stats.get("regions-elus-2021-1-0.xlsx", 0)),
                "LOW": (stats.get("communes-elus-2015-1-0.xlsx", 0) + 
                       stats.get("communes-elus-2021-1-1.xlsx", 0))
            }
        }
        
        return report

def main():
    """Main conversion function"""
    parser = argparse.ArgumentParser(description="Convert TafraData Excel files to OpenSanctions JSONL format")
    parser.add_argument("--tafra-dir", default="TafraData", help="Directory containing TafraData Excel files")
    parser.add_argument("--output-dir", default="custom-datasets", help="Output directory for JSONL files")
    parser.add_argument("--verbose", "-v", action="store_true", help="Enable verbose logging")
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Create converter
    converter = TafraDataConverter(args.tafra_dir, args.output_dir)
    
    # Convert all files
    print("🔄 Starting TafraData conversion...")
    stats = converter.convert_all_files()
    
    # Generate report
    report = converter.generate_summary_report(stats)
    
    # Save report
    report_file = Path(args.output_dir) / "tafra-conversion-report.json"
    with open(report_file, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    
    # Print summary
    print("\n📊 CONVERSION SUMMARY")
    print("=" * 50)
    print(f"Total entities converted: {report['total_entities_converted']}")
    print(f"Files processed: {report['files_processed']}")
    print("\nFile breakdown:")
    for filename, count in stats.items():
        print(f"  • {filename}: {count} entities")
    
    print("\nEntity type breakdown:")
    for entity_type, count in report['entity_types'].items():
        print(f"  • {entity_type}: {count} entities")
    
    print("\nRisk level distribution:")
    for risk_level, count in report['risk_distribution'].items():
        print(f"  • {risk_level}: {count} entities")
    
    print(f"\n✅ Conversion completed successfully!")
    print(f"📄 Report saved to: {report_file}")
    print(f"📊 Data available at: {args.output_dir}/moroccan-entities.jsonl")

if __name__ == "__main__":
    main()