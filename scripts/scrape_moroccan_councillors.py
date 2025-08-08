#!/usr/bin/env python3
"""
Morocco House of Councillors Scraper
Scrapes all counselors/advisors from the Moroccan House of Councillors website
and generates JSONL entries for the sanctions screening database.
"""

import requests
from bs4 import BeautifulSoup
import json
import re
import time
from urllib.parse import urljoin, urlparse
from datetime import datetime
import logging

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class MoroccanCouncillorscraper:
    def __init__(self):
        self.base_url = "https://dev.chambredesconseillers.xyz"
        self.councillors_base_url = "https://dev.chambredesconseillers.xyz/en/المستشارات-و-المستشارين"
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
        self.councillors = []
        self.processed_urls = set()  # Track processed URLs to avoid duplicates
        
    def get_page(self, url, retries=3):
        """Fetch a page with retries"""
        for attempt in range(retries):
            try:
                response = self.session.get(url, timeout=30)
                response.raise_for_status()
                return response
            except requests.RequestException as e:
                logger.warning(f"Attempt {attempt + 1} failed for {url}: {e}")
                if attempt < retries - 1:
                    time.sleep(2 ** attempt)  # Exponential backoff
                else:
                    logger.error(f"Failed to fetch {url} after {retries} attempts")
                    raise
                    
    def extract_councillor_basic_info(self, councillor_element):
        """Extract basic info from a councillor card/element"""
        info = {}
        
        try:
            # Extract name
            name_element = councillor_element.find(['h3', 'h4', 'h5', 'strong', 'b']) or \
                          councillor_element.find(text=re.compile(r'^[A-Za-z\u0600-\u06FF\s]+$'))
            if name_element:
                if hasattr(name_element, 'get_text'):
                    info['name'] = name_element.get_text(strip=True)
                else:
                    info['name'] = str(name_element).strip()
            
            # Extract group/party affiliation
            group_element = councillor_element.find(text=re.compile(r'Group|Groupe|مجموعة'))
            if group_element:
                parent = group_element.parent if hasattr(group_element, 'parent') else None
                if parent:
                    info['political_group'] = parent.get_text(strip=True)
            
            # Look for any links to detailed profile
            profile_link = councillor_element.find('a', href=True)
            if profile_link:
                info['profile_url'] = urljoin(self.base_url, profile_link['href'])
                
            # Extract any additional visible text that might contain useful info
            text_content = councillor_element.get_text(separator=' ', strip=True)
            info['raw_text'] = text_content
            
        except Exception as e:
            logger.warning(f"Error extracting basic info: {e}")
            
        return info
        
    def extract_detailed_profile(self, profile_url):
        """Extract detailed information from both English and Arabic versions of councillor's profile page"""
        details = {}
        
        try:
            # Extract from English version
            en_details = self._extract_single_profile(profile_url, 'en')
            details.update(en_details)
            
            # Extract from Arabic version
            ar_url = profile_url.replace('/en/', '/ar/')
            ar_details = self._extract_single_profile(ar_url, 'ar')
            details.update(ar_details)
            
            # Merge and clean up the data
            details = self._merge_profile_data(details)
            
        except Exception as e:
            logger.warning(f"Error extracting detailed profile from {profile_url}: {e}")
            
        return details
    
    def _extract_single_profile(self, profile_url, lang='en'):
        """Extract detailed information from a single profile page"""
        details = {}
        
        try:
            response = self.get_page(profile_url)
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Extract structured profile information
            profile_data = {}
            
            # Look for profile cards or info sections
            profile_sections = soup.find_all(['div', 'section'], 
                class_=re.compile(r'profile|info|bio|detail', re.I))
            
            # Extract key-value pairs from various structures
            for section in profile_sections:
                # Look for definition lists
                for dt in section.find_all('dt'):
                    dd = dt.find_next_sibling('dd')
                    if dd:
                        key = dt.get_text(strip=True)
                        value = dd.get_text(strip=True)
                        profile_data[key] = value
                
                # Look for labeled spans or divs
                for label in section.find_all(text=re.compile(r':|：')):
                    parent = label.parent
                    if parent:
                        full_text = parent.get_text(strip=True)
                        if ':' in full_text or '：' in full_text:
                            parts = re.split(r'[:：]', full_text, 1)
                            if len(parts) == 2:
                                key = parts[0].strip()
                                value = parts[1].strip()
                                profile_data[key] = value
            
            # Look for tables with profile information
            tables = soup.find_all('table')
            for table in tables:
                rows = table.find_all('tr')
                for row in rows:
                    cells = row.find_all(['td', 'th'])
                    if len(cells) >= 2:
                        key = cells[0].get_text(strip=True)
                        value = cells[1].get_text(strip=True)
                        if key and value:
                            profile_data[key] = value
            
            # Extract specific fields we're interested in
            field_mappings = {
                # English fields
                'Political Party': f'{lang}_political_party',
                'Electoral Constituency': f'{lang}_constituency',
                'Region': f'{lang}_region',
                'Date of Election': f'{lang}_election_date',
                'Legislative Term': f'{lang}_term',
                'Committee': f'{lang}_committee',
                'Group Membership': f'{lang}_group',
                'Group': f'{lang}_parliamentary_group',
                'Parliamentary Group': f'{lang}_parliamentary_group',
                'Elected': f'{lang}_elected',
                'Electorate': f'{lang}_electorate',
                'Committee Role': f'{lang}_committee_role',
                
                # Arabic fields - exact matches
                'الولاية التشريعية': f'{lang}_legislative_term',
                'الهيئة الناخبة': f'{lang}_electoral_body',
                'الدائرة الانتخابية': f'{lang}_constituency',
                'تاريخ الانتخاب': f'{lang}_election_date',
                'الفترة التشريعية': f'{lang}_term',
                'المجالس الجماعية ومجالس العمالات والأقاليم': f'{lang}_electorate',
                'طنجة - تطوان - الحسيمة': f'{lang}_constituency_region',
                'المجموعة البرلمانية': f'{lang}_parliamentary_group',
                'الحزب السياسي': f'{lang}_political_party',
                
                # Political party variations
                'حزب الاتحاد الدستوري': f'{lang}_political_party',
                'حزب الاستقلال': f'{lang}_political_party',
                'حزب العدالة والتنمية': f'{lang}_political_party',
                'حزب الأصالة والمعاصرة': f'{lang}_political_party',
                'لجنة القطاعات الانتاجية': f'{lang}_committee',
                'مجموعة الدستوري الديمقراطي الاجتماعي': f'{lang}_parliamentary_group',
                'مجموعة الأصالة والمعاصرة': f'{lang}_parliamentary_group',
                'مجموعة الاتحاد العام لمقاولات المغرب': f'{lang}_parliamentary_group',
                'مجموعة الاتحاد المغربي للشغل': f'{lang}_parliamentary_group'
            }
            
            # Map the extracted data to standardized fields
            for key, value in profile_data.items():
                standardized_key = field_mappings.get(key, f'{lang}_{key.lower().replace(" ", "_")}')
                details[standardized_key] = value
            
            # Additional extraction for specific fields by text pattern matching
            full_text = soup.get_text()
            lines = full_text.split('\n')
            
            # Look for specific patterns in Arabic version
            if lang == 'ar':
                for i, line in enumerate(lines):
                    line = line.strip()
                    
                    # Legislative term pattern: "الولاية التشريعية 2027-2021"
                    if 'الولاية التشريعية' in line and i + 1 < len(lines):
                        term_line = lines[i + 1].strip()
                        if re.match(r'\d{4}-\d{4}', term_line):
                            details[f'{lang}_legislative_term'] = term_line
                        elif re.match(r'\d{4}-\d{4}', line.replace('الولاية التشريعية', '').strip()):
                            details[f'{lang}_legislative_term'] = line.replace('الولاية التشريعية', '').strip()
                    
                    # Electoral body pattern
                    if 'الهيئة الناخبة' in line and i + 1 < len(lines):
                        body_line = lines[i + 1].strip()
                        if body_line and len(body_line) > 5:
                            details[f'{lang}_electoral_body'] = body_line
                    
                    # Electoral constituency pattern
                    if 'الدائرة الانتخابية' in line and i + 1 < len(lines):
                        constituency_line = lines[i + 1].strip()
                        if constituency_line and len(constituency_line) > 3:
                            details[f'{lang}_constituency'] = constituency_line
                    
                    # Election date pattern
                    if 'تاريخ الانتخاب' in line and i + 1 < len(lines):
                        date_line = lines[i + 1].strip()
                        if re.match(r'\d{2}/\d{2}/\d{4}', date_line):
                            details[f'{lang}_election_date'] = date_line
                        elif re.match(r'\d{2}/\d{2}/\d{4}', line.replace('تاريخ الانتخاب', '').strip()):
                            details[f'{lang}_election_date'] = line.replace('تاريخ الانتخاب', '').strip()
                
                # Also look for patterns in same line
                for line in lines:
                    # Look for patterns like "الولاية التشريعية 2027-2021" in single line
                    if 'الولاية التشريعية' in line:
                        match = re.search(r'(\d{4}-\d{4})', line)
                        if match:
                            details[f'{lang}_legislative_term'] = match.group(1)
                    
                    if 'تاريخ الانتخاب' in line:
                        match = re.search(r'(\d{2}/\d{2}/\d{4})', line)
                        if match:
                            details[f'{lang}_election_date'] = match.group(1)
            
            # Extract political party and parliamentary group information more aggressively
            if lang == 'en':
                # Look for political party patterns in English
                political_patterns = [
                    r'Political Party[:\s]*([^<>\n]+)',
                    r'Party[:\s]*([^<>\n]+)',
                    r'Constitutional Union party',
                    r'Justice and Development Party',
                    r'Authenticity and Modernity Party',
                    r'Independence Party'
                ]
                
                for pattern in political_patterns:
                    matches = re.findall(pattern, full_text, re.IGNORECASE)
                    for match in matches:
                        cleaned_match = match.strip()
                        if cleaned_match and len(cleaned_match) < 100:
                            details[f'{lang}_political_party'] = cleaned_match
                            break
                
                # Look for parliamentary group information
                group_links = soup.find_all('a', href=re.compile(r'/groups/\d+'))
                for link in group_links:
                    group_name = link.get_text(strip=True)
                    if group_name and 'Group' in group_name:
                        details[f'{lang}_parliamentary_group'] = group_name
                        break
                        
                # Also look for group patterns in text
                group_patterns = [
                    r'Group[:\s]*([^<>\n]+Group[^<>\n]*)',
                    r'Parliamentary Group[:\s]*([^<>\n]+)',
                    r'(.*?Group[^<>\n]*)'
                ]
                
                for pattern in group_patterns:
                    matches = re.findall(pattern, full_text, re.IGNORECASE)
                    for match in matches:
                        cleaned_match = match.strip()
                        if cleaned_match and len(cleaned_match) < 100 and 'Group' in cleaned_match:
                            details[f'{lang}_parliamentary_group'] = cleaned_match
                            break
            
            elif lang == 'ar':
                # Look for political party patterns in Arabic
                political_patterns = [
                    r'الحزب السياسي[:\s]*([^<>\n]+)',
                    r'حزب[:\s]*([^<>\n]+)',
                    r'(حزب الاتحاد الدستوري)',
                    r'(حزب الاستقلال)',
                    r'(حزب العدالة والتنمية)',
                    r'(حزب الأصالة والمعاصرة)',
                    r'(الحزب الشعبي)',
                    r'(الحزب الاشتراكي الموحد)',
                    r'(حزب التقدم والاشتراكية)',
                    r'(حزب الحركة الشعبية)'
                ]
                
                for pattern in political_patterns:
                    matches = re.findall(pattern, full_text)
                    for match in matches:
                        cleaned_match = match.strip()
                        if cleaned_match and len(cleaned_match) < 100 and self._is_valid_political_party(cleaned_match):
                            details[f'{lang}_political_party'] = cleaned_match
                            break
                
                # Look for parliamentary group information in Arabic
                group_patterns = [
                    r'المجموعة البرلمانية[:\s]*([^<>\n]+)',
                    r'مجموعة[:\s]*([^<>\n]+)',
                    r'(مجموعة [^<>\n]+)'
                ]
                
                for pattern in group_patterns:
                    matches = re.findall(pattern, full_text)
                    for match in matches:
                        cleaned_match = match.strip()
                        if cleaned_match and len(cleaned_match) < 100 and 'مجموعة' in cleaned_match:
                            details[f'{lang}_parliamentary_group'] = cleaned_match
                            break
            
            # Extract friendship groups
            friendship_groups = []
            for text in soup.find_all(string=re.compile(r'Morocco.*?-.*?|المغرب.*?-.*?')):
                friendship_groups.append(text.strip())
            
            if friendship_groups:
                details[f'{lang}_friendship_groups'] = friendship_groups
            
            # Extract full name in appropriate script
            if lang == 'ar':
                # Look for Arabic name - multiple strategies
                arabic_names = []
                
                # Strategy 1: Look for name in profile data we already extracted
                for key, value in profile_data.items():
                    if ('اسم' in key or 'الاسم' in key) and re.search(r'[\u0600-\u06FF]', value):
                        if self._is_valid_arabic_name(value):
                            arabic_names.append(value)
                            break
                
                # Strategy 2: Look for elements that might contain actual names
                if not arabic_names:
                    # Look for spans or divs with class attributes that suggest names
                    name_elements = soup.find_all(['span', 'div', 'h1', 'h2', 'h3', 'h4'], 
                                                 class_=re.compile(r'name|title|header', re.I))
                    for element in name_elements:
                        text = element.get_text(strip=True)
                        if self._is_valid_arabic_name(text):
                            arabic_names.append(text)
                            break
                
                # Strategy 3: Look for Arabic text patterns in page content
                if not arabic_names:
                    # Find all text nodes and look for name patterns
                    all_text = soup.get_text()
                    # Look for patterns like names after colons or in specific contexts
                    arabic_text_chunks = re.findall(r'[\u0600-\u06FF\s]{10,60}', all_text)
                    for chunk in arabic_text_chunks:
                        words = chunk.strip().split()
                        if len(words) >= 2 and len(words) <= 4:
                            if self._is_valid_arabic_name(chunk.strip()):
                                arabic_names.append(chunk.strip())
                                break
                
                if arabic_names:
                    details['arabic_name'] = arabic_names[0]
            
        except Exception as e:
            logger.warning(f"Error extracting profile from {profile_url}: {e}")
            
        return details
    
    def _is_valid_arabic_name(self, text):
        """Check if Arabic text is likely a person's name"""
        if not text or not re.search(r'[\u0600-\u06FF]', text):
            return False
            
        # Filter out common page elements and institutional names
        excluded_terms = [
            'المملكة', 'البرلمان', 'مجلس', 'المستشارين', 'بطاقة', 'البيانات', 
            'الشخصية', 'صفحة', 'موقع', 'الرئيسية', 'المغربية', 'الولاية',
            'التشريعية', 'الهيئة', 'الناخبة', 'الدائرة', 'الانتخابية', 'تاريخ',
            'الانتخاب', 'لجنة', 'مجموعة', 'نشاط', 'دبلوماسي', 'استقبالات'
        ]
        
        for term in excluded_terms:
            if term in text:
                return False
        
        # Check length constraints
        words = text.split()
        if len(words) < 2 or len(words) > 4:
            return False
            
        # Should be mostly Arabic characters
        arabic_chars = len(re.findall(r'[\u0600-\u06FF]', text))
        if arabic_chars < len(text) * 0.7:  # At least 70% Arabic characters
            return False
            
        return True
    
    def _is_valid_political_party(self, text):
        """Check if Arabic text is likely a political party name"""
        if not text or not re.search(r'[\u0600-\u06FF]', text):
            return False
            
        # Filter out generic terms that aren't party names
        excluded_terms = [
            'المملكة', 'البرلمان', 'مجلس', 'المستشارين', 'بطاقة', 'البيانات',
            'الشخصية', 'صفحة', 'موقع', 'الرئيسية', 'نشاط', 'دبلوماسي'
        ]
        
        for term in excluded_terms:
            if term in text:
                return False
        
        # Should contain "حزب" (party) or be a known party name
        known_parties = [
            'الاتحاد الدستوري', 'الاستقلال', 'العدالة والتنمية', 'الأصالة والمعاصرة',
            'الشعبي', 'الاشتراكي الموحد', 'التقدم والاشتراكية', 'الحركة الشعبية'
        ]
        
        if 'حزب' in text:
            return True
            
        for party in known_parties:
            if party in text:
                return True
                
        return False
    
    def _get_arabic_party_name(self, english_name):
        """Map English party names to Arabic equivalents"""
        party_mappings = {
            'Constitutional Union party': 'حزب الاتحاد الدستوري',
            'Justice and Development Party': 'حزب العدالة والتنمية',
            'Authenticity and Modernity Party': 'حزب الأصالة والمعاصرة',
            'Independence Party': 'حزب الاستقلال',
            'Popular Movement': 'حزب الحركة الشعبية',
            'Socialist Union of Popular Forces': 'الاتحاد الاشتراكي للقوات الشعبية',
            'Party of Progress and Socialism': 'حزب التقدم والاشتراكية',
            'Popular Party': 'الحزب الشعبي'
        }
        return party_mappings.get(english_name, '')
    
    def _merge_profile_data(self, details):
        """Merge and clean profile data from both languages"""
        merged = {}
        
        # Combine names
        names = []
        if 'arabic_name' in details:
            names.append(details['arabic_name'])
        
        # Combine political information with bilingual support
        en_political_party = details.get('en_political_party', '')
        ar_political_party = details.get('ar_political_party', '')
        
        # Use English as primary, Arabic as additional info
        if en_political_party or ar_political_party:
            merged['political_party'] = en_political_party or ar_political_party
            
            # If we have English but no Arabic, try to map it
            if en_political_party and not ar_political_party:
                mapped_arabic = self._get_arabic_party_name(en_political_party)
                if mapped_arabic:
                    merged['political_party_ar'] = mapped_arabic
            # If we have both and they're different, use the Arabic one
            elif en_political_party and ar_political_party and en_political_party != ar_political_party:
                merged['political_party_ar'] = ar_political_party
            # If we only have Arabic, use it as primary
            elif ar_political_party and not en_political_party:
                merged['political_party'] = ar_political_party
                
        # Combine parliamentary group information with bilingual support
        en_parliamentary_group = details.get('en_parliamentary_group', '')
        ar_parliamentary_group = details.get('ar_parliamentary_group', '')
        
        if en_parliamentary_group or ar_parliamentary_group:
            merged['parliamentary_group'] = en_parliamentary_group or ar_parliamentary_group
            if en_parliamentary_group and ar_parliamentary_group and en_parliamentary_group != ar_parliamentary_group:
                merged['parliamentary_group_ar'] = ar_parliamentary_group
            elif ar_parliamentary_group and not en_parliamentary_group:
                merged['parliamentary_group'] = ar_parliamentary_group
        
        constituency = details.get('en_constituency') or details.get('ar_constituency')  
        if constituency:
            merged['constituency'] = constituency
            
        election_date = details.get('en_election_date') or details.get('ar_election_date')
        if election_date:
            merged['election_date'] = election_date
            
        committee = details.get('en_committee') or details.get('ar_committee')
        if committee:
            merged['committee'] = committee
            
        committee_role = details.get('en_committee_role')
        if committee_role:
            merged['committee_role'] = committee_role
            
        # Combine friendship groups
        friendship_groups = []
        if 'en_friendship_groups' in details:
            friendship_groups.extend(details['en_friendship_groups'])
        if 'ar_friendship_groups' in details:
            friendship_groups.extend(details['ar_friendship_groups'])
        
        if friendship_groups:
            merged['friendship_groups'] = list(set(friendship_groups))  # Remove duplicates
            
        # Add Arabic name if found
        if 'arabic_name' in details:
            merged['arabic_name'] = details['arabic_name']
            
        return merged
        
    def scrape_all_councillors(self):
        """Scrape all councillors using A-Z alphabetical directory structure"""
        logger.info("Starting to scrape councillors using A-Z directory structure...")
        
        # Define the alphabet
        alphabet_letters = [
            'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 
            'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'
        ]
        
        total_councillors_found = 0
        
        for letter in alphabet_letters:
            try:
                # Construct URL for each letter
                letter_url = f"{self.councillors_base_url}/{letter}"
                logger.info(f"Scraping letter '{letter.upper()}': {letter_url}")
                
                response = self.get_page(letter_url)
                soup = BeautifulSoup(response.content, 'html.parser')
                
                letter_councillors_found = 0
                
                # Look for councillor profile links and names
                profile_links = []
                
                # Strategy 1: Look for text patterns that contain names + group names
                name_pattern = re.compile(r'([A-Z][a-z]+ [A-Z ]+?)([A-Z][a-z].*Group|.*مجموعة)')
                
                for element in soup.find_all(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'div', 'span']):
                    text = element.get_text(strip=True)
                    if name_pattern.search(text) and len(text) < 200:
                        # Try to extract name from the combined text
                        match = name_pattern.match(text)
                        if match:
                            potential_name = match.group(1).strip()
                            # Find associated link
                            link = element.find('a') or element.find_parent('a')
                            if link and '/mi/' in str(link.get('href', '')):
                                full_url = urljoin(self.base_url, link['href'])
                                if full_url not in self.processed_urls:
                                    profile_links.append((potential_name, full_url))
                                    self.processed_urls.add(full_url)
                
                # Strategy 2: Also look for direct profile links containing /mi/ as fallback
                for link in soup.find_all('a', href=True):
                    href = link['href']
                    if '/mi/' in href:  # Profile links contain /mi/
                        full_url = urljoin(self.base_url, href)
                        if full_url not in self.processed_urls:
                            link_text = link.get_text(strip=True)
                            profile_links.append((link_text, full_url))
                            self.processed_urls.add(full_url)
                
                # Process profile links
                for name_text, profile_url in profile_links:
                    try:
                        councillor_info = {
                            'profile_url': profile_url
                        }
                        
                        # Extract detailed profile information first
                        details = self.extract_detailed_profile(profile_url)
                        councillor_info.update(details)
                        
                        # Try to determine the best Latin name
                        latin_name = None
                        
                        # 1. Check if we have a valid Arabic name and can use that as primary
                        arabic_name = councillor_info.get('arabic_name', '')
                        
                        # 2. Clean the link text as potential Latin name
                        clean_link_name = self.clean_name(name_text) if name_text else ''
                        
                        # 3. Extract Latin name from profile URL pattern or content
                        if clean_link_name and len(clean_link_name) > 3:
                            # Check if link name looks like a person's name (has at least 2 words)
                            words = clean_link_name.split()
                            if len(words) >= 2 and all(word.isalpha() for word in words):
                                latin_name = clean_link_name
                        
                        # 4. If no good Latin name, try to extract from details or use Arabic
                        if not latin_name:
                            # Look for any other names in the extracted details
                            for key, value in details.items():
                                if 'name' in key.lower() and isinstance(value, str):
                                    cleaned_val = self.clean_name(value)
                                    if cleaned_val and len(cleaned_val.split()) >= 2:
                                        latin_name = cleaned_val
                                        break
                        
                        # 5. Final fallback to Arabic name if we have it
                        if not latin_name and arabic_name:
                            latin_name = arabic_name
                        elif not latin_name:
                            latin_name = f"Councillor {profile_url.split('/')[-1]}"
                        
                        councillor_info['name'] = latin_name
                        
                        if councillor_info.get('name') and len(councillor_info['name']) > 3:
                            self.councillors.append(councillor_info)
                            letter_councillors_found += 1
                            logger.info(f"Found: {councillor_info['name']}")
                        
                        time.sleep(0.5)  # Rate limiting
                        
                    except Exception as e:
                        logger.warning(f"Error processing profile {profile_url}: {e}")
                        continue
                
                total_councillors_found += letter_councillors_found
                logger.info(f"Letter '{letter.upper()}': Found {letter_councillors_found} councillors")
                
                # Pause between letters to be respectful
                time.sleep(1)
                
            except Exception as e:
                logger.error(f"Error scraping letter '{letter}': {e}")
                continue
        
        logger.info(f"Total scraped: {len(self.councillors)} councillors from A-Z directory")
        return self.councillors
        
    def clean_name(self, name):
        """Clean and standardize names"""
        if not name:
            return ""
            
        # Remove extra whitespace
        name = re.sub(r'\s+', ' ', name.strip())
        
        # Remove common titles
        titles = ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.', 'M.', 'Mme.', 'السيد', 'السيدة', 'دكتور']
        for title in titles:
            name = re.sub(f'^{re.escape(title)}\\s*', '', name, flags=re.IGNORECASE)
            
        return name.strip()
        
    def generate_jsonl_entries(self):
        """Convert scraped data to JSONL format for sanctions database"""
        jsonl_entries = []
        
        for i, councillor in enumerate(self.councillors, 1):
            # Extract names
            raw_name = self.clean_name(councillor.get('name', ''))
            if not raw_name:
                continue
                
            # Check if we have Arabic name from detailed extraction
            arabic_name = councillor.get('arabic_name', '')
            
            # Build comprehensive names list
            all_names = [raw_name]  # Latin name as primary
            aliases = []
            
            # Add Arabic name as both main name and weakAlias if found and valid
            if arabic_name:
                # Simple validation - just check it's not a page header
                excluded_terms = ['المملكة', 'البرلمان', 'مجلس', 'المستشارين', 'بطاقة', 'البيانات', 'الشخصية']
                if not any(term in arabic_name for term in excluded_terms):
                    all_names.append(arabic_name)  # Add to main names
                    aliases.append(arabic_name)    # Also keep as weakAlias for compatibility
            
            primary_name = raw_name
                
            # Determine political group/party
            political_group = councillor.get('political_group', 'Unknown')
            
            # Enhanced political information
            political_party = councillor.get('political_party', '')
            political_party_ar = councillor.get('political_party_ar', '')
            parliamentary_group = councillor.get('parliamentary_group', '')
            parliamentary_group_ar = councillor.get('parliamentary_group_ar', '')
            constituency = councillor.get('constituency', '')
            election_date = councillor.get('election_date', '')
            committee = councillor.get('committee', '')
            committee_role = councillor.get('committee_role', '')
            friendship_groups = councillor.get('friendship_groups', [])
            
            # Extract additional official details
            legislative_term = councillor.get('ar_legislative_term', '') or councillor.get('en_legislative_term', '')
            electoral_body = councillor.get('ar_electoral_body', '') or councillor.get('en_electoral_body', '')
            constituency_region = councillor.get('ar_constituency_region', '') or councillor.get('en_constituency_region', '')
            electorate = councillor.get('ar_electorate', '') or councillor.get('en_electorate', '')
            
            # Generate comprehensive notes
            notes_parts = []
            
            # Add official institution context
            notes_parts.append("Member of House of Councillors (مجلس المستشارين), Parliament of Morocco (البرلمان المغربي)")
            
            # Add official details
            if legislative_term:
                notes_parts.append(f"Legislative Term: {legislative_term}")
            if electoral_body:
                notes_parts.append(f"Electoral Body: {electoral_body}")
            if constituency_region:
                notes_parts.append(f"Electoral Constituency: {constituency_region}")
            if electorate:
                notes_parts.append(f"Electorate: {electorate}")
            if election_date:
                notes_parts.append(f"Election Date: {election_date}")
            
            if parliamentary_group:
                if parliamentary_group_ar:
                    notes_parts.append(f"Parliamentary Group: {parliamentary_group} ({parliamentary_group_ar})")
                else:
                    notes_parts.append(f"Parliamentary Group: {parliamentary_group}")
            elif political_group and political_group != 'Unknown':
                notes_parts.append(f"Parliamentary Group: {political_group}")
            if political_party:
                if political_party_ar:
                    notes_parts.append(f"Political Party: {political_party} ({political_party_ar})")
                else:
                    notes_parts.append(f"Political Party: {political_party}")
            if constituency and constituency != constituency_region:
                notes_parts.append(f"Constituency: {constituency}")
            if committee:
                notes_parts.append(f"Committee: {committee}")
            if committee_role:
                notes_parts.append(f"Committee Role: {committee_role}")
            if friendship_groups:
                notes_parts.append(f"International Parliamentary Friendship Groups: {', '.join(friendship_groups[:3])}")  # Limit to first 3
                
            # Build comprehensive positions list
            positions = ["Member of House of Councillors", "عضو مجلس المستشارين"]
            
            # Add parliamentary group position if available
            if parliamentary_group and parliamentary_group != 'Unknown':
                positions.append(f"Member of {parliamentary_group}")
            
            # Add committee positions if available
            if committee:
                positions.append(f"Committee Member: {committee}")
            if committee_role:
                positions.append(f"Committee Role: {committee_role}")
                
            # Generate entry
            entry = {
                "id": f"ma-councillor-{str(i).zfill(3)}",
                "schema": "Person",
                "properties": {
                    "name": all_names,  # Include both Latin and Arabic names
                    "nationality": ["ma"],
                    "citizenship": ["ma"],
                    "country": ["ma"],
                    "topics": ["role.pep"],
                    "position": positions,  # Enhanced positions list
                    "notes": ["; ".join(notes_parts) if notes_parts else f"Member of {political_group}"],
                    "sourceUrl": [councillor.get('profile_url', self.councillors_base_url)],
                    "classification": ["National government (current)"],
                    "riskLevel": ["MEDIUM"]
                }
            }
            
            # Add aliases if available
            if aliases:
                entry["properties"]["weakAlias"] = aliases
                
            # Add detailed political and official information
            if political_party:
                entry["properties"]["politicalParty"] = [political_party]
                if political_party_ar:
                    entry["properties"]["politicalPartyArabic"] = [political_party_ar]
            if parliamentary_group:
                entry["properties"]["politicalGroup"] = [parliamentary_group]
                if parliamentary_group_ar:
                    entry["properties"]["politicalGroupArabic"] = [parliamentary_group_ar]
            elif political_group and political_group != 'Unknown':
                entry["properties"]["politicalGroup"] = [political_group]
            if constituency:
                entry["properties"]["constituency"] = [constituency]
            if constituency_region:
                entry["properties"]["constituencyRegion"] = [constituency_region]
            if election_date:
                entry["properties"]["electionDate"] = [election_date]
            if legislative_term:
                entry["properties"]["legislativeTerm"] = [legislative_term]
            if electoral_body:
                entry["properties"]["electoralBody"] = [electoral_body]
            if electorate:
                entry["properties"]["electorate"] = [electorate]
            if committee:
                entry["properties"]["committee"] = [committee]
            if committee_role:
                entry["properties"]["committeeRole"] = [committee_role]
            if friendship_groups:
                entry["properties"]["friendshipGroups"] = friendship_groups
                
            # Add any additional details found (excluding processed ones)
            excluded_keys = [
                'name', 'political_group', 'profile_url', 'raw_text', 'arabic_name',
                'political_party', 'constituency', 'election_date', 'committee',
                'committee_role', 'friendship_groups'
            ]
            
            for key, value in councillor.items():
                if key not in excluded_keys and value:
                    # Clean up key name
                    clean_key = key.replace('_', ' ').title().replace(' ', '')
                    clean_key = clean_key[0].lower() + clean_key[1:]  # camelCase
                    entry["properties"][clean_key] = [str(value)]
                    
            jsonl_entries.append(entry)
            
        return jsonl_entries
        
    def save_results(self, output_file="moroccan_councillors.jsonl"):
        """Save results to JSONL file"""
        jsonl_entries = self.generate_jsonl_entries()
        
        with open(output_file, 'w', encoding='utf-8') as f:
            for entry in jsonl_entries:
                f.write(json.dumps(entry, ensure_ascii=False) + '\n')
                
        logger.info(f"Saved {len(jsonl_entries)} entries to {output_file}")
        
        # Also save raw data for debugging
        debug_file = output_file.replace('.jsonl', '_raw.json')
        with open(debug_file, 'w', encoding='utf-8') as f:
            json.dump(self.councillors, f, ensure_ascii=False, indent=2)
            
        return jsonl_entries

def main():
    scraper = MoroccanCouncillorscraper()
    
    # Scrape all councillors
    councillors = scraper.scrape_all_councillors()
    
    if councillors:
        # Generate and save JSONL
        entries = scraper.save_results("../custom-datasets/moroccan_councillors.jsonl")
        
        print(f"\n✅ Successfully scraped {len(councillors)} councillors")
        print(f"✅ Generated {len(entries)} JSONL entries")
        print(f"✅ Saved to moroccan_councillors.jsonl")
        
        # Show sample entries with enhanced info
        print("\n📋 Sample entries:")
        for i, entry in enumerate(entries[:3], 1):
            names = entry["properties"]["name"]
            positions = entry["properties"]["position"]
            group = entry["properties"].get("politicalGroup", ["Unknown"])[0]
            party = entry["properties"].get("politicalParty", ["Unknown"])[0]
            party_ar = entry["properties"].get("politicalPartyArabic", [""])[0]
            
            print(f"{i}. Names: {' / '.join(names)}")
            print(f"   Positions: {', '.join(positions[:2])}")  # Show first 2 positions
            print(f"   Parliamentary Group: {group}")
            if party_ar:
                print(f"   Political Party: {party} ({party_ar})")
            else:
                print(f"   Political Party: {party}")
            print()
            
    else:
        print("❌ No councillors found. Please check the website structure.")
        
if __name__ == "__main__":
    main()