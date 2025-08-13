"""
Fuzzy Matching Service for Enhanced Name Screening
Implements multiple matching algorithms for sanctions and PEP screening
"""
import re
import logging
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
from unidecode import unidecode
from fuzzywuzzy import fuzz
from phonetics import soundex, metaphone
import Levenshtein

logger = logging.getLogger(__name__)

@dataclass
class MatchResult:
    """Result of a fuzzy match operation"""
    score: float  # Confidence score 0-100
    match_type: str  # exact, fuzzy, phonetic, alias
    normalized_query: str
    normalized_target: str
    algorithm_scores: Dict[str, float]
    
class FuzzyMatchingService:
    """Enhanced fuzzy matching service for sanctions screening"""
    
    def __init__(self, min_score_threshold=75.0, exact_match_threshold=95.0, phonetic_threshold=80.0):
        self.min_score_threshold = min_score_threshold  # Minimum confidence score
        self.exact_match_threshold = exact_match_threshold
        self.phonetic_threshold = phonetic_threshold
        
    def normalize_name(self, name: str) -> str:
        """
        Normalize name for matching:
        - Convert to lowercase
        - Remove accents and diacritics
        - Remove common prefixes/suffixes
        - Standardize spacing
        """
        if not name:
            return ""
            
        # Convert to ASCII, remove accents
        normalized = unidecode(name).lower()
        
        # Remove common titles and prefixes
        prefixes_to_remove = [
            r'\b(mr|mrs|miss|ms|dr|prof|professor|sir|lady|lord|count|prince|princess)\b\.?',
            r'\b(al|el|ibn|bin|abu|abd|ahmed)\b',  # Arabic prefixes
            r'\b(von|van|de|da|del|della|di|du)\b',  # European prefixes
        ]
        
        for prefix_pattern in prefixes_to_remove:
            normalized = re.sub(prefix_pattern, '', normalized)
        
        # Remove common suffixes
        suffixes_to_remove = [
            r'\b(jr|sr|ii|iii|iv)\b\.?$',
            r'\b(inc|corp|ltd|llc|sa|sarl)\b\.?$',
        ]
        
        for suffix_pattern in suffixes_to_remove:
            normalized = re.sub(suffix_pattern, '', normalized)
        
        # Clean up spacing and punctuation
        normalized = re.sub(r'[^\w\s]', ' ', normalized)  # Remove punctuation
        normalized = re.sub(r'\s+', ' ', normalized)  # Normalize spacing
        normalized = normalized.strip()
        
        return normalized
    
    def extract_name_variations(self, name: str) -> List[str]:
        """
        Extract common name variations for better matching
        """
        variations = [name]
        
        # Add original name
        normalized = self.normalize_name(name)
        if normalized != name:
            variations.append(normalized)
        
        # Split compound names
        parts = normalized.split()
        if len(parts) > 2:
            # First + Last
            variations.append(f"{parts[0]} {parts[-1]}")
            # Middle names combinations
            for i in range(1, len(parts)):
                variations.append(" ".join(parts[:i] + parts[i+1:]))
        
        # Reverse order for some cultures
        if len(parts) >= 2:
            variations.append(" ".join(reversed(parts)))
        
        return list(set(variations))  # Remove duplicates
    
    def calculate_levenshtein_score(self, s1: str, s2: str) -> float:
        """Calculate normalized Levenshtein distance score (0-100)"""
        if not s1 or not s2:
            return 0.0
        
        max_len = max(len(s1), len(s2))
        if max_len == 0:
            return 100.0
            
        distance = Levenshtein.distance(s1, s2)
        score = (1 - distance / max_len) * 100
        return max(0.0, score)
    
    def calculate_phonetic_score(self, s1: str, s2: str) -> float:
        """Calculate phonetic similarity score using Soundex and Metaphone"""
        if not s1 or not s2:
            return 0.0
        
        try:
            # Soundex comparison - handle empty results
            soundex1 = soundex(s1) or ""
            soundex2 = soundex(s2) or ""
            soundex_match = soundex1 and soundex2 and soundex1 == soundex2
            
            # Metaphone comparison - handle empty results
            metaphone1 = metaphone(s1) or ""
            metaphone2 = metaphone(s2) or ""
            metaphone_match = metaphone1 and metaphone2 and metaphone1 == metaphone2
            
            # Combined score
            if soundex_match and metaphone_match:
                return 95.0
            elif soundex_match or metaphone_match:
                return 75.0
            else:
                return 0.0
        except Exception as e:
            logger.error(f"Error in phonetic matching: {str(e)}")
            return 0.0
    
    def calculate_fuzzy_score(self, s1: str, s2: str) -> Dict[str, float]:
        """Calculate various fuzzy matching scores"""
        if not s1 or not s2:
            return {
                'ratio': 0.0,
                'partial_ratio': 0.0,
                'token_sort_ratio': 0.0,
                'token_set_ratio': 0.0
            }
        
        return {
            'ratio': float(fuzz.ratio(s1, s2)),
            'partial_ratio': float(fuzz.partial_ratio(s1, s2)),
            'token_sort_ratio': float(fuzz.token_sort_ratio(s1, s2)),
            'token_set_ratio': float(fuzz.token_set_ratio(s1, s2))
        }
    
    def match_names(self, query_name: str, target_name: str, target_aliases: Optional[List[str]] = None) -> MatchResult:
        """
        Perform comprehensive fuzzy matching between query and target names
        
        Args:
            query_name: The name being searched for
            target_name: The primary name to match against
            target_aliases: Additional aliases/alternative names
            
        Returns:
            MatchResult with confidence score and match details
        """
        try:
            # Normalize names
            normalized_query = self.normalize_name(query_name)
            normalized_target = self.normalize_name(target_name)
            
            if not normalized_query or not normalized_target:
                return MatchResult(
                    score=0.0,
                    match_type="no_match",
                    normalized_query=normalized_query,
                    normalized_target=normalized_target,
                    algorithm_scores={}
                )
            
            # Get name variations
            query_variations = self.extract_name_variations(query_name)
            target_variations = self.extract_name_variations(target_name)
            
            # Add aliases to target variations
            if target_aliases:
                for alias in target_aliases:
                    target_variations.extend(self.extract_name_variations(alias))
            
            # Find best match across all variations
            best_score = 0.0
            best_match_type = "no_match"
            best_algorithms = {}
            best_query = normalized_query
            best_target = normalized_target
            
            for q_var in query_variations:
                norm_q = self.normalize_name(q_var)
                for t_var in target_variations:
                    norm_t = self.normalize_name(t_var)
                    
                    # Skip empty variations
                    if not norm_q or not norm_t:
                        continue
                    
                    # Check for exact match first
                    if norm_q == norm_t:
                        return MatchResult(
                            score=100.0,
                            match_type="exact",
                            normalized_query=norm_q,
                            normalized_target=norm_t,
                            algorithm_scores={"exact": 100.0}
                        )
                    
                    # Calculate various similarity scores
                    levenshtein_score = self.calculate_levenshtein_score(norm_q, norm_t)
                    phonetic_score = self.calculate_phonetic_score(norm_q, norm_t)
                    fuzzy_scores = self.calculate_fuzzy_score(norm_q, norm_t)
                    
                    # Combined algorithm scores
                    algorithm_scores = {
                        'levenshtein': levenshtein_score,
                        'phonetic': phonetic_score,
                        **fuzzy_scores
                    }
                    
                    # Calculate weighted final score with safe access
                    try:
                        final_score = max(
                            levenshtein_score * 0.3,
                            phonetic_score * 0.2,
                            fuzzy_scores.get('ratio', 0) * 0.2,
                            fuzzy_scores.get('token_sort_ratio', 0) * 0.15,
                            fuzzy_scores.get('token_set_ratio', 0) * 0.15
                        )
                    except Exception as score_error:
                        logger.error(f"Error calculating final score: {str(score_error)}")
                        final_score = max(levenshtein_score, phonetic_score)
                    
                    # Determine match type
                    match_type = "no_match"
                    if final_score >= self.exact_match_threshold:
                        match_type = "exact"
                    elif phonetic_score >= self.phonetic_threshold:
                        match_type = "phonetic"
                    elif final_score >= self.min_score_threshold:
                        match_type = "fuzzy"
                    
                    # Update best match if this is better
                    if final_score > best_score:
                        best_score = final_score
                        best_match_type = match_type
                        best_algorithms = algorithm_scores
                        best_query = norm_q
                        best_target = norm_t
            
            return MatchResult(
                score=best_score,
                match_type=best_match_type,
                normalized_query=best_query,
                normalized_target=best_target,
                algorithm_scores=best_algorithms
            )
            
        except Exception as e:
            logger.error(f"Error in fuzzy matching: {str(e)}")
            return MatchResult(
                score=0.0,
                match_type="error",
                normalized_query=normalized_query if 'normalized_query' in locals() else "",
                normalized_target=normalized_target if 'normalized_target' in locals() else "",
                algorithm_scores={}
            )
    
    def batch_match_names(self, query_name: str, targets: List[Dict]) -> List[Tuple[Dict, MatchResult]]:
        """
        Perform batch fuzzy matching against multiple targets
        
        Args:
            query_name: The name to search for
            targets: List of target entities with 'name' and optional 'aliases' keys
            
        Returns:
            List of (target_entity, MatchResult) tuples sorted by confidence score
        """
        results = []
        
        for target in targets:
            target_name = target.get('name', '')
            target_aliases = target.get('aliases', [])
            
            match_result = self.match_names(query_name, target_name, target_aliases)
            results.append((target, match_result))
        
        # Sort by confidence score (descending)
        results.sort(key=lambda x: x[1].score, reverse=True)
        
        return results
    
    def is_potential_match(self, query_name: str, target_name: str, threshold: Optional[float] = None) -> bool:
        """
        Quick check if two names are potentially matching
        
        Args:
            query_name: Query name
            target_name: Target name  
            threshold: Custom threshold (default: class threshold)
            
        Returns:
            True if names potentially match above threshold
        """
        threshold = threshold or self.min_score_threshold
        match_result = self.match_names(query_name, target_name)
        return match_result.score >= threshold

# Global instance
fuzzy_matching_service = FuzzyMatchingService()