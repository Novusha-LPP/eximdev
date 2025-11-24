# Search Performance Optimization Plan

## Current Performance Issues Identified

### 1. **Critical Database Index Problem** ⚠️
**Severity: HIGH**
- Only 2 indexes exist in JobModel:
  - `importerURL + year + status`
  - `year + job_no` (unique)
- Search queries use `$regex` on unindexed fields: `job_no`, `importer`, `custom_house`, `awb_bl_no`, `vessel_berthing`, `be_no`, `supply_exporter`, etc.
- Without indexes, MongoDB must scan ENTIRE collection for each search
- With thousands of jobs, this causes exponential slowdown

**Impact**: Search queries scan 100% of documents instead of indexed subset

---

### 2. **Inefficient Regex Query Pattern** ⚠️
**Severity: HIGH**
```javascript
// Current: Scans all fields with OR conditions
{ $or: [ 
  { job_no: { $regex: escapeRegex(search), $options: "i" } },
  { importer: { $regex: escapeRegex(search), $options: "i" } },
  // ... 15+ more unindexed fields
]}
```
- MongoDB must evaluate ALL fields for EACH document
- No query optimizer benefit from indexes
- Gets slower as collection grows

**Impact**: Query time increases linearly with number of jobs

---

### 3. **Frontend Debounce Insufficiency** ⚠️
**Severity: MEDIUM**
- Current debounce: 300ms
- No request cancellation: old search requests are not aborted
- If user types "test", then clears to "te", both requests fire and may return out-of-order
- Multiple dependency array triggers cause redundant fetches

**Impact**: UI shows stale results, unnecessary API calls

---

### 4. **Fetching Too Many Fields** ⚠️
**Severity: MEDIUM**
- Default field selection includes 50+ fields
- Transmitted data is large, causing network latency
- MongoDB must retrieve all fields even when only displaying 10-15

**Impact**: Increases response size and deserialization time

---

### 5. **No Text Search Index** ⚠️
**Severity: HIGH**
- Using character-by-character regex instead of full-text search
- MongoDB Text Search is 100x+ faster for keyword searches
- Supports fuzzy matching, relevance scoring, language analysis

**Impact**: Slow keyword matching performance

---

## Performance Optimization Solutions

### IMMEDIATE WINS (High Impact, Low Effort)

#### Solution 1: Add Compound Indexes
**File**: `server/model/jobModel.mjs`

Add indexes for all searchable fields:
```javascript
jobSchema.index({ year: 1, job_no: 1, status: 1 });
jobSchema.index({ year: 1, importer: 1, status: 1 });
jobSchema.index({ year: 1, custom_house: 1, status: 1 });
jobSchema.index({ year: 1, awb_bl_no: 1, status: 1 });
jobSchema.index({ year: 1, supplier_exporter: 1, status: 1 });
jobSchema.index({ year: 1, be_no: 1, status: 1 });
jobSchema.index({ year: 1, detailed_status: 1, status: 1 });
// Text search indexes
jobSchema.index({ job_no: "text", importer: "text", awb_bl_no: "text", supplier_exporter: "text" });
```

**Expected Improvement**: 10-100x faster for indexed fields
**Effort**: 5 minutes

---

#### Solution 2: Implement Request Cancellation (Frontend)
**File**: `client/src/customHooks/useFetchJobList.js`

Use AbortController to cancel previous requests:
```javascript
const abortControllerRef = useRef(null);

const fetchJobs = async (page, unresolved = unresolvedOnly) => {
  // Cancel previous request if still pending
  if (abortControllerRef.current) {
    abortControllerRef.current.abort();
  }
  
  abortControllerRef.current = new AbortController();
  
  try {
    const response = await axios.get(apiUrl, {
      signal: abortControllerRef.current.signal,
      // ... other config
    });
    // Handle response
  } catch (error) {
    if (error.code !== 'ECONNABORTED') {
      // Only handle non-cancelled errors
      console.error("Error fetching job list:", error);
    }
  }
};
```

**Expected Improvement**: Reduces wasted API calls by 40-60%
**Effort**: 10 minutes

---

#### Solution 3: Reduce Default Fields Fetched
**File**: `server/routes/import-dsr/getJobList.mjs`

Split fields into critical and extended:
```javascript
const criticalFields = `
  job_no cth_no year importer custom_house awb_bl_no be_no 
  vessel_berthing detailed_status row_color do_doc_recieved_date 
  gateway_igm_date discharge_date shipping_line_airline
`;

const extendedFields = `
  ... (50+ additional fields)
`;

const getSelectedFields = (status) => {
  // Return only critical fields by default
  // Load extended fields only on job detail view
  return criticalFields;
};
```

**Expected Improvement**: 30-50% smaller response size, faster transmission
**Effort**: 15 minutes

---

### MEDIUM TERM IMPROVEMENTS (Significant Impact)

#### Solution 4: Implement Full-Text Search
**File**: `server/routes/import-dsr/getJobList.mjs`

Replace regex searches with MongoDB text search:
```javascript
// For text searches (user-provided search terms)
if (search) {
  // Use text search instead of regex $or
  query.$text = { $search: search };
  projectionWithScore = { score: { $meta: "textScore" } };
  sortBy = { score: { $meta: "textScore" } };
} else {
  // For non-search queries, use compound indexes
  sortBy = { detailed_status: 1, "container_nos.0.detention_from": 1 };
}
```

**Expected Improvement**: 50-200x faster for text searches
**Effort**: 30 minutes

---

#### Solution 5: Implement Smart Query Caching
**File**: `client/src/customHooks/useFetchJobList.js`

Cache recent searches to avoid re-fetching:
```javascript
const queryCache = useRef(new Map());

const getCacheKey = () => 
  `${selectedYearState}|${status}|${detailedStatus}|${selectedICD}|${searchQuery}`;

const fetchJobs = async (page) => {
  const cacheKey = getCacheKey();
  
  if (page === 1 && queryCache.current.has(cacheKey)) {
    const cachedData = queryCache.current.get(cacheKey);
    setRows(cachedData.data);
    setTotal(cachedData.total);
    return;
  }
  
  // Fetch and cache results
  const response = await axios.get(apiUrl);
  queryCache.current.set(cacheKey, response.data);
};
```

**Expected Improvement**: Instant response for repeated searches
**Effort**: 20 minutes

---

#### Solution 6: Add Server-Side Search Optimization Query
**File**: `server/routes/import-dsr/getJobList.mjs`

Create optimized search query builder:
```javascript
const buildOptimizedQuery = (search, filters) => {
  // If search is simple (no special chars), use text search
  if (!/[*+\-^~()[\]{}|\\]/g.test(search)) {
    return {
      $text: { $search: search },
      ...filters
    };
  }
  
  // For exact match searches, use index-friendly queries
  if (search.length > 3) {
    return {
      $or: [
        { job_no: { $regex: `^${escapeRegex(search)}`, $options: "i" } },
        { importer: { $regex: `^${escapeRegex(search)}`, $options: "i" } },
        // Limit to most important fields only
      ],
      ...filters
    };
  }
  
  return filters;
};
```

**Expected Improvement**: 20-50% faster for common searches
**Effort**: 25 minutes

---

### ADVANCED OPTIMIZATIONS (Long-term)

#### Solution 7: Implement Elasticsearch Integration
- For massive datasets (100k+ jobs)
- Provides advanced search capabilities: fuzzy search, synonyms, ranking
- Effort: 2-3 hours

#### Solution 8: Add Search Analytics & Query Optimization
- Track slow queries with MongoDB's profiler
- Identify most common searches and pre-optimize
- Effort: 1 hour

---

## Implementation Priority

### Phase 1 (TODAY - 30 mins total)
1. ✅ Add database indexes (5 mins)
2. ✅ Implement request cancellation (10 mins)
3. ✅ Reduce default fields (15 mins)

**Expected Result**: 30-100x faster search

### Phase 2 (THIS WEEK - 1-2 hours total)
1. Implement full-text search
2. Add query caching
3. Create optimized query builder

**Expected Result**: 50-500x faster search, near-instant repeated searches

### Phase 3 (OPTIONAL - Advanced)
1. Elasticsearch integration
2. Search analytics dashboard

---

## Monitoring & Validation

### Metrics to Track
```javascript
// Add timing to frontend
const startTime = performance.now();
const response = await axios.get(apiUrl);
const endTime = performance.now();
console.log(`Search took ${endTime - startTime}ms`);

// Add MongoDB query profiling
db.setProfilingLevel(1); // Log slow queries (>100ms)
```

### Performance Targets
- Single search: < 200ms (currently ~1000ms+)
- Repeated search: < 50ms (cached)
- Type-ahead search: < 100ms

---

## Files to Modify

1. **Backend**:
   - `server/model/jobModel.mjs` - Add indexes
   - `server/routes/import-dsr/getJobList.mjs` - Optimize queries, reduce fields

2. **Frontend**:
   - `client/src/customHooks/useFetchJobList.js` - Add cancellation, caching
   - `client/src/components/import-dsr/JobList.js` - Optional: increase debounce

---

## Risk Assessment

✅ **Low Risk**: Index additions won't break existing code
✅ **Low Risk**: Field reduction uses existing field selection logic
✅ **Low Risk**: Request cancellation is standard pattern
⚠️ **Medium Risk**: Full-text search requires text index creation
✅ **Low Risk**: Query caching is client-side only

All changes are backward compatible.
