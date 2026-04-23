# GeoJSON Upload Functionality Guide

## Overview
The GeoJSON Upload module provides a flexible, two-step workflow for managing city road networks. 
Users can either create entirely **New City** datastructures or **Update Existing City** networks by appending or modifying data through GeoJSON files.

---

## 1. User Interface Flow

### Step 1: Mode Selection
When navigating to the Upload GeoJSON page, users are immediately presented with two cards to determine their goal:
- **Upload New City:** Intended for uploading raw GeoJSON files that establish a completely new city boundary and road network.
- **Update Existing City:** Used for patching or adding missing road structures to a previously imported city context.

### Step 2: Mode-Specific Actions
- **New City Branch:** The user is taken straight to the Drag-and-Drop file zone.
- **Update City Branch:** The user is presented with a **City Selection Dropdown**. The frontend automatically fetches the list of available cities from the backend. The user *must* select a target city before the "Upload Files" action is unlocked.

### Step 3: File Selection
Beneath the initial prompts lies a sturdy **Drag-and-Drop** zone:
- **Formats Accepted:** `.geojson`, `.json`
- **Batching:** Users can drop multiple files simultaneously.
- **Deduplication:** Dropping files with identical names strips out duplicates automatically to ensure only distinct files are uploaded.
- **Staging UI:** Each file gets represented in a list with its name, calculated storage size, and a "Ready" / "Uploading" / "Success" / "Failed" badge. Individual pending files can be removed using the trash UI.

### Step 4: Execution
When the user clicks "Upload Files", backend execution begins:
1. Files are uploaded **sequentially** to minimize server/database connection flooding.
2. The UI tracks real-time progress, marking items as ticked (Success) or flagged (Error).
3. If errors occur on specific files (e.g. malformed GeoJSON), those files are flagged red with error details, while the rest complete properly.
4. An actionable summary banner dynamically populates at the bottom displaying how many succeeded and failed, offering a built-in **"Retry Failed"** button.

---

## 2. API Architecture

The upload component interacts with two distinct endpoints exposed through the `axiosInstance`. All actual file streaming happens within `src/api/uploadApi.js`.

### A. Fetching Cities (`GET /cities/`)
Used to populate the dropdown in the 'Update Existing City' UI mode.
- **Function:** `getCities()`
- **Returns:** `{ success: true, cities: [{ id, name }, ...] }`

### B. GeoJSON Upload (`POST /upload-geo`)
Used to safely transmit files and their optional city association.
- **Function:** `uploadGeoJsonFile(file, cityId)`
- **Payload Format (FormData):** 
  - `files`: Contains the binary payload of the `.geojson` / `.json` file.
  - `city_id` *(Optional)*: Injected dynamically if the user uploaded the file through the "Update Existing City" flow.

#### Sequential Processor Utility (Frontend)
To elegantly process multiple files, `uploadGeoJsonFiles(files, onProgress, cityId)` handles the looping:
- Transmits files strictly one by one.
- Invokes an `onProgress` callback reporting the exact status, allowing the UI to instantly display spinners over currently uploading items and green checkmarks over completed ones. 
- Gracefully handles HTTP 400/500 errors by safely extracting nested API exception messages and binding them to the individual file logs without breaking the subsequent items in the batch.

---

## 3. Component Details (`UploadGeoJson.jsx`)

The logic inside `src/pages/UploadGeoJson/UploadGeoJson.jsx` handles state robustly:

**Key State Hooks:**
- `uploadMode` *('new' | 'update' | null)*: Defines the current active UI panel flow.
- `cities` *(Array)*: Active storage for cities fetched via API.
- `selectedCityId` *(String/Number)*: Ties the `onChange` logic of the dropdown.
- `entries` *(Array of Objects)*: Complex state array mapping out `{ file, status, error }` for every valid file dropped in. Handles transition logic across `pending` -> `uploading` -> `success` / `error`.

**CSS Implementations:**
Features modern BEM-styled implementations found within `UploadGeoJson.css` containing variables for gradients, border-radius shadows, custom file animations, spinner graphics, and transition flex delays prioritizing a clean, non-blocking UI feel.
