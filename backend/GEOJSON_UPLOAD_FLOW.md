# GeoJSON Upload Functionality - Backend Integration Guide

## Overview

The GeoJSON Upload module provides a flexible, two-step workflow for managing city road networks. Users can either create entirely **New City** data structures or **Update Existing City** networks by appending or modifying data through GeoJSON files.

---

## 1. Upload Modes

### Mode 1: Upload New City
**When to use:** Creating a completely new city with roads data from a GeoJSON file

**Flow:**
1. User selects "Upload New City" card
2. User drags and drops GeoJSON files
3. Backend extracts city name from filename
4. Creates new GeoDataset (if not exists) based on filename
5. Uploads roads to this new city

**Backend Behavior:**
- No `city_id` parameter in request
- City name extracted from filename using `extract_city()` method
- City name is sanitized (underscores → spaces, removes lat/lng/lang suffixes)
- New GeoDataset created via `get_or_create(name=city_name)`

**Example Filenames:**
- `bangalore_roads.geojson` → City: "bangalore roads"
- `delhi_lat_lng.geojson` → City: "delhi"
- `Bangalore_City_Roads.geojson` → City: "Bangalore City Roads"

---

### Mode 2: Update Existing City
**When to use:** Adding or updating roads in an already existing city

**Flow:**
1. User selects "Update Existing City" card
2. Frontend fetches cities from `/api/cities/` endpoint
3. User selects a city from dropdown (gets city_id)
4. User drags and drops GeoJSON files
5. Frontend passes `city_id` to backend
6. Backend updates roads in the selected city

**Backend Behavior:**
- `city_id` parameter received from request form data
- Backend validates city exists in database
- All roads from uploaded files are added to the specified city
- If city doesn't exist → 404 error

---

## 2. API Endpoint: Upload GeoJSON

### Endpoint
**POST** `/api/upload-geo`

### Request Format
**Content-Type:** `multipart/form-data`

#### Request Body Parameters:
- **files** (required): Array of `.geojson` files
- **city_id** (optional): ID of existing city for update mode

#### Request Examples:

**Mode 1: New City Upload**
```bash
curl -X POST http://localhost:8000/api/upload-geo \
  -F "files=@bangalore_roads.geojson" \
  -F "files=@bangalore_wards.geojson"
```

**Mode 2: Update Existing City**
```bash
curl -X POST http://localhost:8000/api/upload-geo \
  -F "files=@new_roads.geojson" \
  -F "city_id=1"
```

### Response Format (Success)

**Mode 1: New City - Response**
```json
{
  "message": "GeoJSON uploaded successfully",
  "features_inserted": 250,
  "features_updated": 0,
  "total_processed": 250,
  "city_id": 3,
  "city_name": "bangalore roads"
}
```

**Mode 2: Update Existing City - Response**
```json
{
  "message": "GeoJSON uploaded successfully",
  "features_inserted": 45,
  "features_updated": 12,
  "total_processed": 57,
  "city_id": 1,
  "city_name": "Bangalore"
}
```

### Error Responses

**Missing files**
```json
{
  "error": "No files uploaded"
}
```
Status: `400 Bad Request`

---

**Invalid file format**
```json
{
  "error": "new_roads.csv is not a GeoJSON file"
}
```
Status: `400 Bad Request`

---

**City not found (Update Mode)**
```json
{
  "error": "City with ID 999 not found"
}
```
Status: `404 Not Found`

---

**Database or processing error**
```json
{
  "error": "Invalid GeoJSON structure: missing geometry"
}
```
Status: `400 Bad Request`

---

## 3. Backend Processing Logic

### Step 1: Validate Inputs
```python
# Check for files
if not files:
    return error "No files uploaded"

# Check for city_id if provided
if city_id:
    try:
        dataset = GeoDataset.objects.get(id=city_id)
    except GeoDataset.DoesNotExist:
        return error 404
```

### Step 2: Process Each File
```python
for file in files:
    # Validate file extension
    if not file.name.endswith(".geojson"):
        return error
    
    # Create/Get dataset based on mode
    if no city_id:
        city_name = extract_city(file.name)
        dataset, _ = GeoDataset.objects.get_or_create(name=city_name)
    
    # Load and process GeoJSON
    geojson_data = json.load(file)
    inserted, updated = uploadData(geojson_data, dataset)
```

### Step 3: Road Creation/Update Logic

**For each feature in GeoJSON:**

1. **Extract properties and geometry**
   ```python
   props = feature.get("properties", {})
   geometry = feature.get("geometry")
   ```

2. **Validate geometry**
   ```python
   geom = GEOSGeometry(json.dumps(geometry))
   # Ensure MultiLineString format
   if isinstance(geom, LineString):
       geom = MultiLineString(geom)
   ```

3. **Check for existing road (OBJECTID)**
   ```python
   object_id = props.get("OBJECTID")
   
   if object_id:
       # Update or Create: matching by dataset + object_id
       road, created = Road.objects.update_or_create(
           dataset=dataset,
           object_id=object_id,
           defaults=road_fields
       )
   else:
       # No OBJECTID: always create new road
       road = Road.objects.create(
           dataset=dataset,
           **road_fields
       )
   ```

4. **Create/Update Geometry**
   ```python
   Geometry.objects.update_or_create(
       road=road,
       defaults={"geom": geom}
   )
   ```

---

## 4. Frontend Integration

### 4.1 Fetch Cities (Mode Selection)
**Endpoint:** `GET /api/cities/`

**Frontend Code:**
```javascript
// In UploadGeoJson.jsx - useEffect or mount
const fetchCities = async () => {
  try {
    const response = await axiosInstance.get('/cities/');
    if (response.data.success) {
      setCities(response.data.cities);
    }
  } catch (error) {
    console.error('Failed to fetch cities:', error);
  }
};

// Calls when "Update Existing City" is selected
useEffect(() => {
  if (uploadMode === 'update') {
    fetchCities();
  }
}, [uploadMode]);
```

### 4.2 Upload GeoJSON (With City ID)
**Endpoint:** `POST /api/upload-geo`

**Frontend Code:**
```javascript
const uploadGeoJsonFile = async (file, cityId) => {
  const formData = new FormData();
  formData.append('files', file);
  
  if (cityId) {
    formData.append('city_id', cityId);  // ✅ Pass city_id for update mode
  }
  
  const response = await axiosInstance.post('/upload-geo', formData);
  return response.data;
};

// Upload handler
const handleUpload = async () => {
  for (const entry of pendingEntries) {
    try {
      const result = await uploadGeoJsonFile(
        entry.file,
        uploadMode === 'update' ? selectedCityId : null
      );
      
      // Update UI with results
      onProgress({
        fileName: entry.file.name,
        status: 'success',
        result: result
      });
    } catch (error) {
      // Handle error
      onProgress({
        fileName: entry.file.name,
        status: 'error',
        error: error.message
      });
    }
  }
};
```

---

## 5. Database Operations

### Create New City During Upload
```python
# When mode = New City (no city_id)
city_name = "bangalore"
dataset, created = GeoDataset.objects.get_or_create(name=city_name)
# Result:
# - If first time: dataset created with id=1, name="bangalore"
# - If exists: dataset retrieved with existing id
```

### Update Existing City During Upload
```python
# When mode = Update City (city_id provided)
dataset = GeoDataset.objects.get(id=1)  # ✅ Use provided city_id

# All roads from file are added to dataset with id=1
# If road has OBJECTID: updates existing road
# If road has no OBJECTID: creates new road
```

### Road Update or Create Logic
```python
# Matching key: (dataset_id + object_id)
road, created = Road.objects.update_or_create(
    dataset=dataset,           # Links to city
    object_id=object_id,       # Unique road identifier
    defaults={                 # Fields to update/set
        'road_name': props.get("rd_name"),
        'road_status': props.get("road_status"),
        # ... other fields
    }
)

if created:
    inserted_count += 1
else:
    updated_count += 1
```

---

## 6. Data Mapping

### GeoJSON Properties → Road Model Fields

| GeoJSON Property | Road Field | Notes |
|------------------|-----------|-------|
| OBJECTID | object_id | Primary key for uniqueness |
| rd_name | road_name | Display name |
| road_status | road_status | Current status |
| type | road_type | Classification |
| pwd_cir | circle | Administrative division |
| pwd_div | division | Administrative subdivision |
| gisid | gis_id | GIS identifier |
| district | district | District name |
| mla_cons | mla_constituency | Political constituency |
| width | width | Road width (meters) |
| carrriage | carriage | Carriage width |
| Shape__Length | shape_length | Calculated length |
| gis_length | gis_length | GIS calculated length |
| crust | crust | Road surface type |
| ownership | ownership | Ownership type |
| department | department | Managing department |
| (multiple) | (geometry) | GeoJSON geometry → LineString/MultiLineString |

---

## 7. Complete Workflow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Frontend: UploadGeoJson.jsx                                 │
└─────────────────────────────────────────────────────────────┘
           │
           ├─→ [Step 1] User selects mode
           │   ├─ Upload New City
           │   └─ Update Existing City
           │
           ├─ If "Update Existing City":
           │   ├─ Fetch cities: GET /api/cities/
           │   ├─ Display dropdown with cities
           │   └─ User selects city (gets city_id)
           │
           ├─→ [Step 2] User drops files
           │   └─ UI shows file staging area
           │
           ├─→ [Step 3] User clicks "Upload Files"
           │   ▼
           │  POST /api/upload-geo
           │  ├─ files (binary)
           │  └─ city_id (if update mode, else null)
           │
           ▼────────────────────────────────────────────────────
┌─────────────────────────────────────────────────────────────┐
│ Backend: UploadGeo.post() in uploadGeo.py                   │
└─────────────────────────────────────────────────────────────┘
           │
           ├─→ [Step 4] Validate Request
           │   ├─ Check files exist
           │   ├─ If city_id: verify city exists
           │   └─ Return 404 if city not found
           │
           ├─→ [Step 5] Determine Dataset
           │   ├─ If city_id provided:
           │   │   └─ Use GeoDataset.objects.get(id=city_id)
           │   └─ Else (new city mode):
           │       └─ Extract city name from filename
           │       └─ GeoDataset.objects.get_or_create(name)
           │
           ├─→ [Step 6] Process Each File
           │   ├─ Validate file extension (.geojson)
           │   ├─ Parse JSON
           │   └─ Loop through features
           │
           ├─→ [Step 7] Process Each Road Feature
           │   ├─ Extract properties and geometry
           │   ├─ Validate geometry
           │   ├─ Check OBJECTID:
           │   │   ├─ If exists: update_or_create
           │   │   └─ Else: create new Road
           │   ├─ Create/Update Geometry record
           │   └─ Increment counter (inserted/updated)
           │
           ├─→ [Step 8] Return Response
           │   ├─ Success: 200 OK
           │   ├─ Include city_id and city_name
           │   ├─ Include counts (inserted, updated)
           │   └─ Failure: Error status code
           │
           ▼────────────────────────────────────────────────────
           │
           ├─→ [Step 9] Frontend Processes Response
           │   ├─ Update file status indicators
           │   ├─ Display success/error counts
           │   └─ Show city confirmation
           │
           └─→ Done
```

---

## 8. Usage Examples

### Example 1: New City Upload

**Frontend:**
```javascript
// User selects "Upload New City"
uploadMode = 'new';
selectedCityId = null;

// User drops files: ["bangalore_roads.geojson", "bangalore_wards.geojson"]
// Frontend sends request without city_id

await uploadGeoJsonFile(file, null);
```

**Backend Processing:**
```python
# city_id not provided
city_id = None

for file in files:
    # Extract city name from filename
    city_name = extract_city("bangalore_roads.geojson")  # → "bangalore roads"
    
    # Create/get dataset
    dataset, created = GeoDataset.objects.get_or_create(name="bangalore roads")
    # Result: GeoDataset(id=1, name="bangalore roads")
    
    # Process roads
    # → Roads added to dataset with id=1

# Response
{
  "city_id": 1,
  "city_name": "bangalore roads",
  "features_inserted": 250
}
```

---

### Example 2: Update Existing City

**Frontend:**
```javascript
// User selects "Update Existing City"
uploadMode = 'update';

// Fetch cities
cities = [
  { id: 1, name: "Bangalore" },
  { id: 2, name: "Delhi" }
];

// User selects Bangalore (id=1)
selectedCityId = 1;

// User drops file: "new_roads_update.geojson"
// Frontend sends request WITH city_id

await uploadGeoJsonFile(file, 1);
```

**Backend Processing:**
```python
# city_id provided
city_id = 1

# Validate city exists
dataset = GeoDataset.objects.get(id=1)  # ✅ Returns Bangalore

for file in files:
    # NO filename extraction - use existing dataset
    
    # Process roads
    # → Roads added to dataset with id=1 (Bangalore)

# Response
{
  "city_id": 1,
  "city_name": "Bangalore",
  "features_inserted": 45,
  "features_updated": 12
}
```

---

## 9. Error Handling

### Scenario 1: Invalid City ID
```javascript
// Frontend
selectedCityId = 999;
await uploadGeoJsonFile(file, 999);

// Backend Response (404)
{
  "error": "City with ID 999 not found"
}

// Frontend
onProgress({
  status: 'error',
  error: 'City with ID 999 not found'
});
```

---

### Scenario 2: Invalid File Format
```javascript
// Frontend
files = ["data.csv"];  // Wrong format

// Backend Response (400)
{
  "error": "data.csv is not a GeoJSON file"
}
```

---

### Scenario 3: Partial Success
```javascript
// Upload with mixed results
files = ["file1.geojson", "file2.geojson", "file3.geojson"];

// file1.geojson → Success (250 roads)
// file2.geojson → Error (malformed GeoJSON)
// file3.geojson → Success (120 roads)

// Backend Response (400 - stops on first error in sequential processing)
{
  "error": "Invalid GeoJSON: missing geometry in file2.geojson"
}

// Frontend
onProgress({
  fileName: 'file1.geojson',
  status: 'success'  // ✅ Uploaded
});
onProgress({
  fileName: 'file2.geojson',
  status: 'error',    // ❌ Failed
  error: 'Invalid GeoJSON...'
});
// file3.geojson not processed due to error in file2
```

---

## 10. Key Changes from Previous Version

| Aspect | Before | After |
|--------|--------|-------|
| City Selection | Always from filename | From filename OR database ID |
| Update Mode | Created duplicate cities | Uses existing city ID |
| City ID Handling | Ignored | Respected and validated |
| Response | No city info returned | Returns city_id and city_name |
| Validation | Filename only | Filename + City existence check |

---

## 11. Migration Guide

### For Existing Frontend Code:

**Old Code (New City Mode):**
```javascript
const formData = new FormData();
formData.append('files', file);
await axiosInstance.post('/upload-geo', formData);
```

**Still Works**: No changes needed for new city uploads.

---

**Old Code (Trying to update, but creates new):**
```javascript
const formData = new FormData();
formData.append('files', file);
await axiosInstance.post('/upload-geo', formData);
// ❌ Problem: Created new city instead of updating
```

**New Code (Update Existing City):**
```javascript
const formData = new FormData();
formData.append('files', file);
formData.append('city_id', selectedCityId);  // ✅ Add this
await axiosInstance.post('/upload-geo', formData);
// ✅ Now updates the selected city
```

---

## 12. Testing

### Test Case 1: New City Upload
```bash
# Test with new filename
curl -X POST http://localhost:8000/api/upload-geo \
  -F "files=@new_city_roads.geojson"

# Expected: New city created with name extracted from filename
```

---

### Test Case 2: Update Existing City
```bash
# Test with city_id
curl -X POST http://localhost:8000/api/upload-geo \
  -F "files=@update_roads.geojson" \
  -F "city_id=1"

# Expected: Roads added/updated in city with id=1
```

---

### Test Case 3: Multiple Files (New City)
```bash
curl -X POST http://localhost:8000/api/upload-geo \
  -F "files=@roads_part1.geojson" \
  -F "files=@roads_part2.geojson"

# Expected: All roads from both files added to same city
```

---

### Test Case 4: Invalid City ID
```bash
curl -X POST http://localhost:8000/api/upload-geo \
  -F "files=@roads.geojson" \
  -F "city_id=9999"

# Expected: 404 error "City with ID 9999 not found"
```

---

## 13. Summary

✅ **Fixed**: Update mode now properly uses `city_id` from frontend  
✅ **Preserved**: New city mode still works by extracting from filename  
✅ **Added**: City existence validation in update mode  
✅ **Added**: City ID and name in response for confirmation  
✅ **Workflow**: Two-mode support with proper data handling
