# 🗺️ Home Module — Haryana GPS Dashboard

> **Location:** `src/pages/Dashboard/`
> **Entry Point:** `src/pages/Dashboard/index.jsx`
> **Route:** `/` (via `App.jsx` → React Router)

---

## 📁 Module File Structure

```
src/
├── App.jsx                          # Root router — renders Dashboard at "/"
├── main.jsx                         # React entry point
├── index.css                        # Global styles (fonts, animations, utilities)
│
├── api/
│   ├── axiosInstance.js             # Axios base config (baseURL, interceptors)
│   ├── RoadApi.js                   # Road-specific API functions
│   └── apiService.js                # Generic CRUD API helpers (fetchData, postData…)
│
├── component/
│   ├── InputDropdown/
│   │   ├── InputDropdown.jsx        # Reusable searchable single-select dropdown
│   │   └── InputDropdown.scss       # Dropdown styles (custom CSS variables)
│   └── InputBox/
│       ├── InputBox.jsx             # Reusable text input component
│       └── InputBox.scss            # InputBox styles
│
└── pages/
    └── Dashboard/
        ├── index.jsx                # Main dashboard page (root component)
        ├── hooks.js                 # Custom React hooks
        ├── utils.js                 # Pure helper functions
        ├── constants.js             # Static config & template data
        └── components/
            ├── RoadSelector.jsx     # Multi-select road checkbox dropdown
            ├── RoadDetailsDialog.jsx# Modal dialog for clicked road details
            ├── CitySelector.jsx     # (legacy) City selector component
            ├── FilterButtons.jsx    # Apply / Clear filter buttons
            ├── FilterControls.jsx   # Filter row wrapper
            ├── FilterStatus.jsx     # Breadcrumb/status display
            └── WardSelector.jsx     # (legacy) Ward selector component
```

---

## 🧩 Core Components

### 1. `Dashboard` — `index.jsx`
The top-level page component. Orchestrates all sub-components, hooks, and state.

**Sections rendered:**
| Section | Description |
|---|---|
| **Header** | Sticky top bar with `RoadAthena` logo/wordmark |
| **Filter Row** | Card with 4 cascading dropdowns + Apply/Clear Filter buttons |
| **Map Panel** | Leaflet map with tile layer switcher and full-screen GeoJSON overlay |
| **Region Overview** | Breadcrumb context info + 5 stat cards |
| **Road Details Dialog** | Modal popup on map feature click |

**Key state managed here:**
- `mapLayer` — currently selected tile layer (`"default"` / `"satellite"` / `"terrain"`)
- `isFilterApplied` — controls whether stat cards show real values or `"NA"`
- `selectedRoadId` — ID of the road clicked on map (opens `RoadDetailsDialog`)

**Handlers:**
| Handler | Purpose |
|---|---|
| `handleCityChange` | Selects city, filters GeoJSON |
| `handleClearSelection` | Resets all filters and flies map back to Haryana |
| `handleMunicipalCouncilChange` | Cascades down to ward/road reset |
| `handleWardChange` | Stores ward value + label |
| `handleRoadToggle` | Toggles a road in multi-select array |
| `handleClearRoads` | Empties road selection |
| `handleSelectAllRoads` | Selects all roads from `roadOptions` |
| `handleApplyFilter` | Sets `isFilterApplied = true` |
| `handleResetFilter` | Resets MC/Ward/Roads without touching city |
| `onEachFeature` | Attaches click listener to each Leaflet feature |

---

### 2. `InputDropdown` — `component/InputDropdown/InputDropdown.jsx`
Generic single-select dropdown used for **City**, **Municipal Council**, and **Ward** filters.

**Props:**
| Prop | Type | Description |
|---|---|---|
| `value` | any | Currently selected value |
| `onChange` | func | Called with synthetic event `{ selectedItem }` |
| `onClear` | func | Optional — shows ✕ clear button |
| `optionList` | array | `{ label, value }` objects |
| `isSearchable` | bool | Enables search input inside dropdown |
| `disabled` | bool | Greys out the control |
| `icon` | node | SVG icon rendered inside the header |
| `placeholder` | string | Ghost text when nothing selected |

---

### 3. `RoadSelector` — `components/RoadSelector.jsx`
Custom multi-select checkbox dropdown for road selection. Not based on `InputDropdown`.

**Features:**
- Search bar inside the dropdown
- Select All / Clear All bar
- Checkbox per road with blue highlight on selection
- Badge count shown in header
- "Clear Roads (n)" button above the trigger when roads are selected

**Props:**
| Prop | Type | Description |
|---|---|---|
| `selectedRoads` | array | Array of `{ label, value }` selected roads |
| `roadOptions` | array | All road options for the selected ward |
| `isLoadingRoad` | bool | Shows spinner while roads are loading |
| `onRoadToggle` | func | Toggle a road in/out of selection |
| `onClearRoads` | func | Clear all selected roads |
| `onSelectAllRoads` | func | Select all road options |
| `disabled` | bool | Disabled until a ward is selected |
| `icon` | node | Road SVG icon |

---

### 4. `RoadDetailsDialog` — `components/RoadDetailsDialog.jsx`
Modal dialog that appears when a road is clicked on the Leaflet map.

**Triggers:** `onEachFeature` in `index.jsx` → sets `selectedRoadId` → passed as `roadId` prop.

**Fields displayed:**
- Road ID, Path (start_pt → end_pt)
- Ward, Source, Width, Carriage, GIS Length, Doc Length
- MLA Constituency (if present)

**API call:** `GET /api/get-road-details/{roadId}/`

---

## 🪝 Custom Hooks — `hooks.js`

### `useRoadData()`
Fetches all road GeoJSON on mount. Manages:
- `geoJsonData` — full GeoJSON FeatureCollection
- `filteredGeoJsonData` — currently displayed subset
- `cityOptions` — `{ label, value }` list derived from GeoJSON
- `isLoadingCityData` — shows blurred loading overlay during initial fetch
- `mapCenter`, `mapZoom`, `mapKey` — Leaflet map position state
- `flyTarget` — `{ center, zoom, bounds }` for smooth map transitions

### `useFilterCascade()`
Manages the 4-level filter cascade: **City → Municipal Council → Ward → Roads**

| useEffect trigger | Action |
|---|---|
| `selectedCities` changes | Fetch MC options via `/fetchRoadData?cityId=` |
| `selectedMunicipalCouncilOption` changes | Fetch wards via `/get-unique-wards?road_id=` |
| `selectedWard` changes | Fetch roads via `/fetchRoadData?cityId=&ward=`, update map |
| `selectedRoads` changes | Filter `wardGeoJsonData` to selected roads, fly to bounds |

### `MapFlyTo({ flyTarget })`
A Leaflet inner component (rendered inside `<MapContainer>`) that calls `map.flyToBounds()` or `map.flyTo()` when `flyTarget` changes. Prevents duplicate flights via `prevTargetRef`.

### `useMapAnimation()`
Triggers `setFlyTarget` when city selection changes, to fly smoothly to city bounds.

---

## 🛠️ Utility Functions — `utils.js`

| Function | Purpose |
|---|---|
| `extractUniqueCities(geoData)` | Pulls unique `{ label, value }` cities from GeoJSON properties |
| `filterGeoJsonByCities(geoData, cities)` | Returns features matching selected city IDs |
| `getBoundsForCities(geoData, cities)` | Computes center + zoom for city extent |
| `getBoundsForGeoJson(geoData)` | General bounds calculator with smart zoom by feature count |
| `isValidGeoJSON(data)` | Validates data has `type` and `features` |
| `getFeatureStyle(feature)` | Returns Leaflet style object: green (>80), amber (>50), red (≤50) quality |
| `extractUniqueMunicipalCouncils(geoData)` | Pulls unique councils; attaches `road_id` for ward fetching |
| `extractUniqueRoads(geoData)` | Pulls unique roads; labels unnamed roads as `No Name (ID: X)` |

---

## 📐 Constants — `constants.js`

| Constant | Value / Purpose |
|---|---|
| `MAP_LAYERS` | Object with `default`, `satellite`, `terrain` tile configs |
| `HARYANA_CENTER` | `[29.0588, 75.8507]` — default map center |
| `HARYANA_DEFAULT_ZOOM` | `9` |
| `HARYANA_ZOOM_OUT_LEVEL` | `8` |
| `STATS_TEMPLATE` | Array of stat card definitions: Total Roads, Total Length, Avg Quality |
| `DUMMY_*_OPTIONS` | Placeholder option arrays (not used in production) |

---

## 🌐 API Layer — `src/api/`

### `axiosInstance.js`
- **Base URL:** `http://127.0.0.1:8000/api`
- **Timeout:** 10,000ms
- Request/response interceptors with error logging

### `RoadApi.js` — Active Endpoints

| Function | Method | Endpoint | Params |
|---|---|---|---|
| `fetchRoadData()` | GET | `/fetchRoadData` | — |
| `fetchFilteredRoadData(filters)` | GET | `/fetchRoadData` | `filters` |
| `fetchRoadDataByCity(cityId)` | GET | `/fetchRoadData` | `cityId` |
| `fetchRoadsByWard(cityId, ward)` | GET | `/fetchRoadData` | `cityId`, `ward` |
| `fetchUniqueWards(roadId)` | GET | `/get-unique-wards` | `road_id` |
| `fetchRoadDetailsById(roadId)` | GET | `/get-road-details/{roadId}/` | — |

### `apiService.js` — Generic Helpers
Generic `fetchData`, `postData`, `updateData`, `deleteData` wrappers (not directly used by the dashboard currently).

---

## 🗺️ Map Configuration

- **Library:** `react-leaflet` + `leaflet`
- **Container:** `<MapContainer>` re-uses the same instance (key only changes when explicitly set)
- **Smooth transitions:** `MapFlyTo` component calls `flyToBounds` / `flyTo` with `duration: 1.2`
- **GeoJSON overlay:** Styled per road quality; re-renders via `key={geoJsonKey}` (based on data length)
- **Feature click:** `onEachFeature` → sets `selectedRoadId` → `RoadDetailsDialog` opens

### Tile Layers
| Key | Name | Source |
|---|---|---|
| `default` | Default | OpenStreetMap |
| `satellite` | Satellite | ArcGIS World Imagery |
| `terrain` | Terrain | OpenTopoMap |

---

## 🎨 Styling

- **CSS Framework:** Tailwind CSS (v3, via `tailwind.config.js`)
- **Custom fonts:** `myriad-pro-semibold`, `myriad-pro-regular` (applied via className)
- **Animations:** `animate-spin` (loaders), `animate-fade-in-up` (dialog), hover transitions
- **SCSS:** `InputDropdown.scss`, `InputBox.scss` use CSS custom properties for theming

---

## ⚡ Data Flow Summary

```
App loads
  └── useRoadData() fetches all GeoJSON → sets geoJsonData, cityOptions
        └── User picks City
              └── fetchRoadDataByCity() → municipalCouncilOptions
                    └── User picks Municipal Council
                          └── fetchUniqueWards() → wardOptions
                                └── User picks Ward
                                      └── fetchRoadsByWard() → roadOptions + map update
                                            └── User picks Roads (multi-select)
                                                  └── Filter wardGeoJsonData → map update
                                                        └── User clicks road on map
                                                              └── fetchRoadDetailsById() → RoadDetailsDialog
```
