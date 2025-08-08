#!/usr/bin/env python3
"""
Test script to check political party extraction for a few councillors
"""
import sys
sys.path.append('/Users/redaelhail/Documents/sanctionsguard-pro/scripts')

from scrape_moroccan_councillors import MoroccanCouncillorscraper
import json

def test_single_profile():
    scraper = MoroccanCouncillorscraper()
    
    # Test with a known profile URL
    test_url = "https://dev.chambredesconseillers.xyz/en/mi/10130"
    
    print(f"Testing profile: {test_url}")
    
    # Extract detailed profile
    details = scraper.extract_detailed_profile(test_url)
    
    print("\nExtracted details:")
    for key, value in details.items():
        if 'political' in key.lower() or 'party' in key.lower() or 'group' in key.lower():
            print(f"{key}: {value}")
    
    print("\nAll extracted fields:")
    print(json.dumps(details, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    test_single_profile()