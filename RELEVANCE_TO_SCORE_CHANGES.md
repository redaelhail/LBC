# Relevance to Score Label Changes

## Overview
Updated all user-facing labels from "Relevance" to "Score" to provide cleaner, more direct terminology while maintaining the same underlying functionality.

## Changes Made

### Frontend Changes (`/frontend/src/App.tsx`)

#### 1. Search Results Display
**Before:**
```tsx
<span>Relevance: {getRelevanceScore(result)}%</span>
```

**After:**
```tsx
<span>Score: {getRelevanceScore(result)}%</span>
```

#### 2. Search History Display
**Before:**
```tsx
<span className="text-gray-600 font-medium">Relevance:</span>
```

**After:**
```tsx
<span className="text-gray-600 font-medium">Score:</span>
```

#### 3. Starred Entities Display
**Before:**
```tsx
<span>Relevance: {entity.relevance_score || 0}%</span>
```

**After:**
```tsx
<span>Score: {entity.relevance_score || 0}%</span>
```

#### 4. Analytics Dashboard
**Before:**
```tsx
<p className="text-sm font-medium text-gray-600">Avg Relevance</p>
<p className="text-xs text-gray-500 mt-1">Search relevance</p>
```

**After:**
```tsx
<p className="text-sm font-medium text-gray-600">Avg Score</p>
<p className="text-xs text-gray-500 mt-1">Search score</p>
```

### Backend Changes (`/backend/app/api/v1/endpoints/search.py`)

#### 1. Sort Options
**Before:**
```python
{"name": "score", "label": "Relevance"}
```

**After:**
```python
{"name": "score", "label": "Score"}
```

#### 2. PDF Export Labels
**Before:**
```python
['Risk Score:', f"{entity.relevance_score or 0}%"]
```

**After:**
```python
['Score:', f"{entity.relevance_score or 0}%"]
```

#### 3. CSV Export Headers
**Before:**
```python
'Entity ID', 'Entity Name', 'Risk Score', 'Risk Level', 'Tags'
```

**After:**
```python
'Entity ID', 'Entity Name', 'Score', 'Risk Level', 'Tags'
```

## What Stayed the Same

### ✅ **Backend Data Structure**
- All database field names remain unchanged (`relevance_score`)
- All API response fields remain unchanged
- All calculations and scoring logic preserved
- Search history and starred entities data intact

### ✅ **Functionality Preserved**  
- Scoring algorithms unchanged
- Risk level calculations unchanged
- Search ranking logic unchanged
- All filtering and sorting capabilities preserved

### ✅ **API Compatibility**
- All API endpoints return same data structure
- Frontend-backend communication unchanged
- No breaking changes for integrations

## Impact

### 🎯 **User Experience**
- **Cleaner Labels**: "Score: 85%" instead of "Relevance: 85%"
- **Consistent Terminology**: All interfaces now use "Score" consistently
- **Simplified Language**: More direct and intuitive labeling

### 🎯 **Display Examples**

#### Search Results
```
Before: "Relevance: 85%"
After:  "Score: 85%"
```

#### Analytics Dashboard  
```
Before: "Avg Relevance: 72%"
After:  "Avg Score: 72%"
```

#### CSV Exports
```
Before: Entity ID, Entity Name, Risk Score, Risk Level...
After:  Entity ID, Entity Name, Score, Risk Level...
```

#### PDF Reports
```
Before: Risk Score: 85%
After:  Score: 85%
```

## Technical Details

### Files Modified
1. `/frontend/src/App.tsx` - Updated all UI labels
2. `/backend/app/api/v1/endpoints/search.py` - Updated sort options and export labels

### Functions Affected
- `getRelevanceScore()` - Function name unchanged but label usage updated
- Sort options API - Label updated from "Relevance" to "Score"
- PDF generation - Label formatting updated
- CSV export - Header updated

### Database Impact
- **No database changes required**
- All existing data remains valid
- Field names (`relevance_score`) preserved for backward compatibility

## Verification Steps

### Frontend Changes
- [x] Search results display "Score:" instead of "Relevance:"
- [x] Search history displays "Score:" label
- [x] Starred entities display "Score:" label  
- [x] Analytics dashboard shows "Avg Score" instead of "Avg Relevance"

### Backend Changes  
- [x] Sort options return "Score" label
- [x] PDF exports use "Score:" label
- [x] CSV exports use "Score" header
- [x] All syntax checks pass

### Functionality Tests
- [x] Scoring calculations work correctly
- [x] Search ranking preserved
- [x] Export functionality intact
- [x] Analytics calculations unchanged

## Summary

Successfully updated all user-facing terminology from "Relevance" to "Score" while maintaining:
- Complete backward compatibility
- All existing functionality
- Same scoring algorithms
- Same data structures

The changes provide cleaner, more direct terminology without any breaking changes to the underlying system.

---

**Status**: ✅ **COMPLETED** - All "Relevance" labels changed to "Score" throughout the application.