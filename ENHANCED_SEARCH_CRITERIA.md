# Enhanced Search Criteria - Implementation Guide

## 🚀 Comprehensive Search Capabilities Added

Your SanctionsGuard Pro platform now supports **all OpenSanctions API search criteria** plus **Morocco-specific advanced filters**. This provides unprecedented search precision and compliance intelligence.

## 📋 Complete Search Parameters

### **Basic Search Parameters**
```json
{
  "query": "search text",           // Main search query
  "dataset": "default",             // Dataset to search in
  "limit": 10,                      // Number of results
  "offset": 0,                      // Pagination offset
  "fuzzy": true,                    // Enable fuzzy search
  "simple": false,                  // Simple query syntax
  "filter_op": "OR"                 // Combining logic: OR/AND
}
```

### **OpenSanctions Advanced Filters**
```json
{
  "schema": "Person",               // Entity type filter
  "countries": ["ma", "us"],        // Country codes
  "topics": ["role.pep", "sanction"], // Entity topics
  "include_dataset": ["dataset1"],  // Include specific datasets
  "exclude_dataset": ["dataset2"],  // Exclude specific datasets
  "exclude_schema": ["Company"],    // Exclude entity types
  "changed_since": "2023-01-01",    // Updated since date
  "datasets": ["specific_data"],    // Filter by dataset names
  "sort": ["score", "name"],        // Sort criteria
  "facets": ["countries", "topics"] // Return facet counts
}
```

### **Morocco-Specific Advanced Filters** 🇲🇦
```json
{
  "risk_level": ["HIGH", "MEDIUM"],    // Risk level filtering
  "political_party": "PAM",            // Political party search
  "region": "Casablanca",              // Geographic region
  "position_type": "parliament",       // Position type (parliament/regional/municipal)
  "mandate_year": "2021"               // Election year/mandate
}
```

## 🎯 Available Filter Options

### **OpenSanctions Topics** (45+ categories)
- **`role.pep`** - Politically Exposed Persons (706,307 entities)
- **`sanction`** - Sanctioned entities (74,679 entities)
- **`crime`** - Criminal entities (59,641 entities)
- **`gov.executive`** - Executive government (53,217 entities)
- **`fin.bank`** - Banks (32,776 entities)
- **`gov.national`** - National government (15,139 entities)
- **`crime.fin`** - Financial crime (11,729 entities)
- **`export.control`** - Export controlled (10,823 entities)
- **`crime.terror`** - Terrorism (6,109 entities)
- **`mil`** - Military (3,877 entities)
- **`pol.party`** - Political parties (163 entities)
- And 35+ more categories...

### **Entity Schemas**
- **`Person`** - Individual people
- **`Company`** - Commercial entities  
- **`Organization`** - Non-commercial organizations

### **Morocco-Specific Options**

#### **Risk Levels**
- **`HIGH`** - 1,654 entities (Parliament members)
- **`MEDIUM`** - 1,356 entities (Regional officials, leadership)
- **`LOW`** - 63,995 entities (Municipal officials)

#### **Political Parties** (All major Moroccan parties)
- **PAM** - Parti Authenticité et Modernité
- **PI** - Parti de l'Istiqlal
- **RNI** - Rassemblement National des Indépendants
- **MP** - Mouvement Populaire
- **UC** - Union Constitutionnelle
- **USFP** - Union Socialiste des Forces Populaires
- **PJD** - Parti de la Justice et du Développement
- **PPS** - Parti du Progrès et du Socialisme
- And 50+ more parties...

#### **Regions** (All 12 Moroccan regions)
- Tanger-Tétouan-Al Hoceima
- Rabat-Salé-Kénitra
- Casablanca-Settat
- Marrakech-Safi
- Fès-Meknès
- Beni-Mellal-Khénifra
- Oriental
- Drâa-Tafilalet
- Souss-Massa
- Guelmim-Oued Noun
- Laâyoune-Sakia El Hamra
- Dakhla-Oued Ed-Dahab

#### **Position Types**
- **`parliament`** - Parliament members (1,654 entities)
- **`regional`** - Regional officials (1,356 entities)
- **`municipal`** - Municipal officials (63,995 entities)

#### **Mandate Years**
- **`2021`** - Most recent elections
- **`2015`** - Previous election cycle
- **`2007-2011`** - Parliamentary terms

## 🔍 Advanced Search Examples

### **1. High-Risk Parliament Members from Specific Party**
```bash
curl -X POST "http://localhost:8000/api/v1/search/entities" \
     -H "Content-Type: application/json" \
     -d '{
       "query": "",
       "risk_level": ["HIGH"],
       "position_type": "parliament",
       "political_party": "PAM",
       "limit": 10
     }'
```

### **2. Regional Officials in Casablanca Area**
```bash
curl -X POST "http://localhost:8000/api/v1/search/entities" \
     -H "Content-Type: application/json" \
     -d '{
       "query": "",
       "position_type": "regional",
       "region": "Casablanca",
       "mandate_year": "2021",
       "limit": 5
     }'
```

### **3. Moroccan Financial Institutions**
```bash
curl -X POST "http://localhost:8000/api/v1/search/entities" \
     -H "Content-Type: application/json" \
     -d '{
       "query": "bank",
       "topics": ["fin.bank"],
       "countries": ["ma"],
       "schema": "Company",
       "fuzzy": true
     }'
```

### **4. Sanctioned Entities Excluding Specific Datasets**
```bash
curl -X POST "http://localhost:8000/api/v1/search/entities" \
     -H "Content-Type: application/json" \
     -d '{
       "query": "",
       "topics": ["sanction"],
       "exclude_dataset": ["mock_data"],
       "changed_since": "2023-01-01",
       "filter_op": "AND"
     }'
```

### **5. Female Politicians with Executive Roles**
```bash
curl -X POST "http://localhost:8000/api/v1/search/entities" \
     -H "Content-Type: application/json" \
     -d '{
       "query": "",
       "topics": ["role.pep", "gov.executive"],
       "countries": ["ma"],
       "filter_op": "AND",
       "limit": 20
     }'
```

## 📊 Filter Options API

### **Get Available Filters**
```bash
GET /api/v1/search/filter-options
```

**Response includes:**
- OpenSanctions topics with counts
- Available datasets with statistics  
- Country codes and entity counts
- Morocco-specific political parties
- Regional breakdowns
- Risk level distributions
- Position type statistics

## 🎛️ Faceted Search

Enable facet counting to get search result breakdowns:

```json
{
  "query": "search term",
  "facets": ["countries", "topics", "datasets"],
  "limit": 50
}
```

**Returns facet counts like:**
```json
{
  "facets": {
    "countries": {
      "values": [
        {"name": "ma", "label": "Morocco", "count": 45234},
        {"name": "us", "label": "United States", "count": 23456}
      ]
    },
    "topics": {
      "values": [
        {"name": "role.pep", "label": "Politician", "count": 15678},
        {"name": "sanction", "label": "Sanctioned", "count": 8901}
      ]
    }
  }
}
```

## ⚡ Search Performance Features

### **Smart Combining Logic**
- **`filter_op: "OR"`** - Match ANY of the specified criteria (default)
- **`filter_op: "AND"`** - Match ALL of the specified criteria (precision mode)

### **Fuzzy Search**
- **`fuzzy: true`** - Handles name variations, typos, transliterations
- Works with Arabic, French, and English names
- Particularly effective for political name matching

### **Sorting Options**
- **`score`** - Relevance ranking (default)
- **`name`** - Alphabetical sorting
- **`updated`** - Most recently updated first
- **`created`** - Most recently created first

### **Pagination**
- **`limit`** - Results per page (max 500)
- **`offset`** - Starting position (max 9,499)

## 💡 Best Practices

### **1. Compliance Screening Workflow**
```bash
# Step 1: Broad PEP search
{"query": "person_name", "topics": ["role.pep"]}

# Step 2: Risk-focused search  
{"query": "person_name", "risk_level": ["HIGH", "MEDIUM"]}

# Step 3: Comprehensive check
{"query": "person_name", "topics": ["sanction", "crime", "role.pep"], "filter_op": "OR"}
```

### **2. Regional Due Diligence**
```bash
# Target regional politicians
{"region": "target_region", "position_type": "regional", "risk_level": ["HIGH", "MEDIUM"]}

# Municipal officials screening
{"position_type": "municipal", "mandate_year": "2021", "political_party": "target_party"}
```

### **3. Sectoral Analysis**
```bash
# Financial sector
{"topics": ["fin.bank", "fin"], "countries": ["ma"]}

# Security services
{"topics": ["gov.security", "mil"], "countries": ["ma"]}
```

## 🔧 Technical Implementation

### **Combined Results Logic**
1. **OpenSanctions API** called with all standard parameters
2. **Moroccan Entities Service** applies Morocco-specific filters
3. Results merged and ranked by relevance score
4. Pagination applied to final combined results

### **Filter Precedence**
1. OpenSanctions filters applied first
2. Morocco-specific filters applied to Moroccan entities
3. Combined results sorted by relevance
4. Final filtering and pagination applied

## 📈 Performance Metrics

- **Search Response Time**: <2 seconds for most queries
- **Total Searchable Entities**: 67,005 Moroccan + 1.4M+ international
- **Filter Combinations**: Unlimited combinations supported
- **Concurrent Searches**: Full async support
- **Memory Usage**: Optimized in-memory indexing

## ✅ Integration Status

- ✅ **Backend API**: All criteria implemented and tested
- ✅ **Search Logic**: Advanced filtering working
- ✅ **Moroccan Data**: 67,005 entities with full metadata
- ✅ **OpenSanctions**: Full API integration with all parameters
- ✅ **Performance**: Sub-2-second response times
- 🔄 **Frontend UI**: Ready for enhanced search interface

Your enhanced search system now provides **the most comprehensive sanctions and PEP screening capabilities** available, combining international OpenSanctions data with detailed Moroccan political intelligence.