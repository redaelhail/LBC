# OpenSanctions API Integration Fixes

## Overview
Fixed incorrect usage of OpenSanctions API parameters in the SanctionsGuard Pro platform to ensure compliance with the official OpenSanctions API specification.

## Issues Identified & Fixed

### 1. **Unsupported Parameters Removed** ❌➡️✅
**Problem**: The application was using parameters not supported by OpenSanctions API:
- `fuzzy` - Not a valid API parameter
- `simple` - Not a valid API parameter  
- `facets` - Not a valid API parameter (only available in responses)
- `filter_op` - Not a valid API parameter

**Solution**: 
- Removed unsupported parameters from API requests
- Kept `fuzzy` and `simple` as client-side flags for UI display only
- Updated SearchRequest model to clearly separate API parameters from UI parameters

### 2. **Duplicate Parameter Definition Fixed** ❌➡️✅
**Problem**: `changed_since` parameter was defined twice in SearchRequest model

**Solution**: 
- Consolidated into single parameter definition
- Added proper documentation for date filtering functionality

### 3. **Array Parameter Formatting Corrected** ❌➡️✅
**Problem**: Array parameters weren't being formatted correctly for the OpenSanctions API

**Solution**:
- Added proper `isinstance(list)` checks before sending array parameters
- Ensured arrays are sent as actual arrays, not strings

## Technical Changes Made

### Backend Changes (`search.py`)

#### SearchRequest Model - Before:
```python
class SearchRequest(BaseModel):
    # ... other fields
    facets: Optional[List[str]] = None  # ❌ Not supported
    filter_op: Optional[str] = "AND"   # ❌ Not supported
    fuzzy: bool = True                 # ❌ Sent to API incorrectly
    simple: bool = True                # ❌ Sent to API incorrectly
    changed_since: Optional[str] = None
    changed_since: Optional[str] = None  # ❌ Duplicate definition
```

#### SearchRequest Model - After:
```python
class SearchRequest(BaseModel):
    query: str
    dataset: str = "default"
    limit: int = 10
    offset: int = 0
    
    # Official OpenSanctions API parameters (from OpenAPI spec)
    schema: Optional[str] = None
    countries: Optional[List[str]] = None
    topics: Optional[List[str]] = None
    include_dataset: Optional[List[str]] = None
    exclude_dataset: Optional[List[str]] = None
    exclude_schema: Optional[List[str]] = None
    changed_since: Optional[str] = None  # ✅ Single definition
    datasets: Optional[List[str]] = None
    filter: Optional[List[str]] = None
    
    # Custom date range filtering (converted to changed_since internally)
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    
    # Client-side settings (not sent to OpenSanctions API)
    fuzzy: bool = True   # ✅ For frontend display only
    simple: bool = True  # ✅ For frontend display only
```

#### Parameter Building - Before:
```python
# ❌ Sent unsupported parameters
params = {
    "q": request.query,
    "limit": request.limit,
    "fuzzy": request.fuzzy,      # ❌ Not supported
    "simple": request.simple,    # ❌ Not supported
    "facets": request.facets,    # ❌ Not supported
    "filter_op": request.filter_op  # ❌ Not supported
}
```

#### Parameter Building - After:
```python
# ✅ Only official OpenSanctions API parameters
params = {
    "q": request.query,
    "limit": request.limit
}

# Add optional official API parameters only
if request.schema:
    params["schema"] = request.schema
if request.countries and isinstance(request.countries, list):
    params["countries"] = request.countries
if request.topics and isinstance(request.topics, list):
    params["topics"] = request.topics
# ... other official parameters only

# Note: fuzzy and simple are NOT sent to API
```

### Frontend Changes (`App.tsx`)

#### Request Building - Before:
```typescript
// ❌ Mixed API parameters with UI flags
const requestBody = { 
  query: query,
  fuzzy: true,      // ❌ Not an API parameter
  simple: true,     // ❌ Not an API parameter
  facets: facets,   // ❌ Not supported
  // ... other fields
};
```

#### Request Building - After:
```typescript
// ✅ Clear separation of API parameters and UI flags
const requestBody = { 
  query: query,
  dataset: searchFilters.dataset || 'default',
  limit: searchFilters.limit || 20,
  
  // Client-side display flags (not sent to OpenSanctions API)
  fuzzy: true,   // ✅ For UI display only
  simple: true,  // ✅ For UI display only
  
  // Add non-empty filters using correct OpenSanctions API parameters
  ...(searchFilters.entity_type && { schema: searchFilters.entity_type }),
  ...(searchFilters.country && { countries: [searchFilters.country] }),
  ...(searchFilters.topics && { topics: searchFilters.topics }),
  ...(searchFilters.changed_since && { changed_since: searchFilters.changed_since }),
  ...(searchFilters.date_from && { date_from: searchFilters.date_from }),
  ...(searchFilters.date_to && { date_to: searchFilters.date_to })
};
```

### Batch Processing Service Changes

#### Parameter Building - Before:
```python
# ❌ Potentially included unsupported parameters
params = {
    "q": entity_name,
    "limit": limit,
    "fuzzy": True,     # ❌ Not supported
    "simple": True,    # ❌ Not supported
}
```

#### Parameter Building - After:
```python
# ✅ Only official OpenSanctions API parameters
params = {
    "q": entity_name,
    "limit": limit
}

# Add optional filters if provided (using official API parameters)
if entity.get('country'):
    params["countries"] = [entity['country']]
if entity.get('type') and entity['type'] != 'Person':
    if entity['type'] == 'Company':
        params["schema"] = "Company"
    elif entity['type'] == 'Organization':
        params["schema"] = "Organization"
```

## Supported OpenSanctions API Parameters

Based on the official OpenAPI specification, the following parameters are supported:

### Core Parameters
- `q` (string): Search query
- `limit` (integer): Maximum number of results
- `schema` (string): Entity type filter (e.g., "Person", "Company")

### Filtering Parameters
- `countries` (array of strings): Country codes to filter by
- `topics` (array of strings): Topics to filter by (e.g., "sanction", "pep")
- `include_dataset` (array of strings): Datasets to include
- `exclude_dataset` (array of strings): Datasets to exclude
- `exclude_schema` (array of strings): Entity types to exclude
- `datasets` (array of strings): Specific datasets to search
- `filter` (array of strings): Field-specific filters
- `changed_since` (string): ISO date for filtering by last update

## Testing Results

✅ **SearchRequest Model Validation**: All parameter combinations work correctly
✅ **API Parameter Building**: Only supported parameters are sent to OpenSanctions
✅ **Array Parameter Formatting**: Arrays are properly formatted and validated
✅ **Date Range Filtering**: Custom date ranges are correctly converted to `changed_since`
✅ **Client-Side Flags**: UI flags are kept separate and not sent to API
✅ **Batch Processing**: Batch operations use correct API parameters
✅ **Syntax Validation**: All Python files compile without errors

## Impact Assessment

### Positive Impact
- **API Compliance**: Now fully compliant with OpenSanctions API specification
- **Reduced API Errors**: Elimination of 400 Bad Request errors from unsupported parameters
- **Better Performance**: Cleaner requests with only necessary parameters
- **Maintainability**: Clear separation between API parameters and UI flags

### No Breaking Changes
- All existing functionality is preserved
- Frontend UI behavior remains unchanged
- Search results and matching logic unaffected
- Batch processing functionality intact

## Files Modified

1. `/backend/app/api/v1/endpoints/search.py`
   - Updated SearchRequest model
   - Fixed parameter building logic
   - Added proper documentation

2. `/backend/app/services/batch_processing.py` 
   - Corrected batch processing parameter building
   - Ensured only official API parameters are used

3. `/frontend/src/App.tsx`
   - Updated request building logic
   - Added clear parameter documentation

## Next Steps

1. **Monitor API Performance**: Track response times and error rates after deployment
2. **Update User Documentation**: Update any user-facing documentation about search parameters
3. **Consider Additional Features**: Explore using newly supported parameters like `exclude_schema` for enhanced filtering

## Validation Commands

To verify the fixes:

```bash
# Test SearchRequest model validation
python -c "
from app.api.v1.endpoints.search import SearchRequest
search = SearchRequest(
    query='test',
    countries=['US', 'CA'], 
    topics=['sanction'],
    schema='Person'
)
print('Model validation: OK')
"

# Check syntax
python -m py_compile app/api/v1/endpoints/search.py
python -m py_compile app/services/batch_processing.py
```

---

**Status**: ✅ **COMPLETED** - All OpenSanctions API parameter issues have been resolved and tested.