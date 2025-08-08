#!/usr/bin/env python3
"""
Test script to check Arabic political party extraction for a few councillors
"""
import sys
sys.path.append('/Users/redaelhail/Documents/sanctionsguard-pro/scripts')

from scrape_moroccan_councillors import MoroccanCouncillorscraper
import json

def test_arabic_parties():
    scraper = MoroccanCouncillorscraper()
    
    # Test with a few known profile URLs that have clear political parties
    test_urls = [
        "https://dev.chambredesconseillers.xyz/en/mi/10130",  # Constitutional Union party
        "https://dev.chambredesconseillers.xyz/en/mi/10121",  # Justice and Development Party
        "https://dev.chambredesconseillers.xyz/en/mi/10028",  # Authenticity and Modernity Party
    ]
    
    for url in test_urls:
        print(f"\nTesting profile: {url}")
        
        # Extract detailed profile
        details = scraper.extract_detailed_profile(url)
        
        print("Political information extracted:")
        for key, value in details.items():
            if 'political' in key.lower() or 'party' in key.lower():
                print(f"  {key}: {value}")
        
        print("All extracted details:")
        print(json.dumps(details, indent=2, ensure_ascii=False)[:500] + "...")
        
        # Test the merge function
        merged = scraper._merge_profile_data(details)
        print("Merged political info:")
        for key, value in merged.items():
            if 'political' in key.lower() or 'party' in key.lower():
                print(f"  {key}: {value}")
        
        # Show all merged data for debugging
        print("All merged data:")
        print(json.dumps(merged, indent=2, ensure_ascii=False))
        print("-" * 50)

if __name__ == "__main__":
    test_arabic_parties()