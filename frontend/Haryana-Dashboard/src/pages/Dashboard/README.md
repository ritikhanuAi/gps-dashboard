# Dashboard Structure

The Dashboard has been refactored into a modular, easy-to-maintain structure.

## Folder Structure

```
src/pages/Dashboard/
├── index.jsx                    # Main Dashboard component
├── constants.js                 # All constants and config
├── utils.js                     # Utility functions (filters, validation, etc)
├── hooks.js                     # Custom React hooks
└── components/
    ├── CitySelector.jsx         # City dropdown selector
    ├── FilterControls.jsx       # All filter dropdowns & buttons
    ├── FilterStatus.jsx         # Status messages & loaders
    └── FilterButtons.jsx        # Apply/Clear buttons
```

## File Descriptions

### `index.jsx` (Main Component)
The main Dashboard component that orchestrates all features:
- Imports and uses all custom hooks
- Manages filter logic and callbacks
- Renders the complete UI layout
- Handles map animations and feature clicks

### `constants.js`
Centralized configuration and constants:
- `MAP_LAYERS` - Tile layer configurations (OSM, Satellite, Terrain)
- `HARYANA_CENTER`, `HARYANA_DEFAULT_ZOOM` - Default map positioning
- `STATS_TEMPLATE` - Stats card template
- Dummy dropdown options (to be replaced with API responses)

### `utils.js`
Reusable utility functions:
- `extractUniqueCities()` - Parse cities from GeoJSON
- `filterGeoJsonByCities()` - Filter features by selected cities
- `getBoundsForCities()` - Calculate map bounds and zoom level
- `isValidGeoJSON()` - Validate GeoJSON structure
- `getFeatureStyle()` - Color roads based on quality

### `hooks.js`
Custom React hooks for state management:

#### `useRoadData()`
Manages road/GeoJSON data fetching and map state:
- Fetches data from API on mount
- Extracts city options
- Manages map center, zoom, and key
- Handles loading states

#### `useFilterCascade(geoJsonData)`
Implements step-by-step filter logic:
- **City selected** → Fetch municipal councils
- **Municipal council selected** → Fetch wards (future)
- **Ward selected** → Fetch roads with data
- Resets dependent selections when parent changes
- Returns loading states and options for each level

#### `useMapAnimation(selectedCities, geoJsonData, mapCenter, mapZoom, mapKey)`
Manages smooth map transitions:
- Zoom out to Haryana level (100ms)
- Smooth animation completes (~750ms)
- Zoom in to selected city (950ms total)

### Components

#### `CitySelector.jsx`
Custom city dropdown with radio buttons:
- City loading spinner
- Remove selection option
- Click-outside to close
- Smooth animations

#### `FilterControls.jsx`
All filter dropdowns in one component:
```
City → Municipal Council → Ward → Road
```
Each with:
- Greyed-out state when parent not selected
- Loading spinners during data fetch
- Dummy text overlays explaining requirement
- Cascading enable/disable logic

#### `FilterStatus.jsx`
Status messages below the filter controls:
- Loading city data message
- "Select city to enable filters" message
- Animated spinners

#### `FilterButtons.jsx`
Apply and Clear filter buttons

## Filter Cascade Logic

### Step 1: City Not Selected
- ✅ City: Enabled (loading or ready)
- ❌ Municipal Council: Greyed out with "Select city"
- ❌ Ward: Greyed out with "Select council"
- ❌ Road: Greyed out with "Select ward"

### Step 2: City Selected + Data Fetched
- ✅ City: Active with selection
- ✅ Municipal Council: Enabled (loading then options appear)
- ❌ Ward: Greyed out with "Select council"
- ❌ Road: Greyed out with "Select ward"

### Step 3: Municipal Council Selected
- ✅ City: Active
- ✅ Municipal Council: Active with selection
- ✅ Ward: Enabled (loading then options appear)
- ❌ Road: Greyed out with "Select ward"

### Step 4: Ward Selected + Data Fetched
- ✅ City: Active
- ✅ Municipal Council: Active
- ✅ Ward: Active with selection
- ✅ Road: Enabled with road options from API

## Adding New Features

### Add a new filter level
1. Add state to `useFilterCascade()` in `hooks.js`
2. Add useEffect to fetch data when parent selects
3. Add API call function to `RoadApi.js`
4. Add dropdown to `FilterControls.jsx` component
5. Update cascade logic with new enable/disable conditions

### Customize constants
Edit `constants.js` to:
- Change map layers
- Update default zoom levels
- Modify stats template
- Replace dummy options with real API endpoints

### Add new utility functions
Keep all helper functions in `utils.js`:
- Filtering logic
- Data transformation
- Validation functions
- Styling functions

## TODO Items

- [ ] Replace dummy options with actual API calls
- [ ] Implement ward API response handling
- [ ] Implement road API response handling
- [ ] Add municipal council data fetching based on city
- [ ] Calculate dynamic stats based on selected filters
- [ ] Add error handling and retry logic for API calls
- [ ] Add unit tests for utility functions
- [ ] Add integration tests for filter cascade logic

## Notes

- The component uses React hooks for all state management
- Leaflet animations are configured with 0.75s duration
- Zoom animation includes a zoom-out step for context
- All loading states have visual spinners
- Cascade logic prevents invalid state combinations
