// Map layer configurations
export const MAP_LAYERS = {
  default: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    name: "Default",
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
    name: "Satellite",
  },
  terrain: {
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution:
      "Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap",
    name: "Terrain",
  },
};

// Default Haryana center
export const HARYANA_CENTER = [29.0588, 75.8507];
export const HARYANA_DEFAULT_ZOOM = 9;
export const HARYANA_ZOOM_OUT_LEVEL = 8;

// Stats template
export const STATS_TEMPLATE = [
  {
    label: "Total Roads",
    value: "45645",
    unit: "",
    icon: "",
    borderColor: "border-l-blue-500",
  },
  {
    label: "Total Length",
    value: "54645",
    unit: "km",
    icon: "",
    borderColor: "border-l-blue-500",
  },
  {
    label: "Avg Quality",
    value: "48856",
    unit: "%",
    icon: "",
    borderColor: "border-l-blue-500",
  },
];

// Dummy options (will be replaced with API responses)
export const DUMMY_MUNICIPAL_COUNCIL_OPTIONS = [
  { label: "Municipal Council 1", value: "mc_1" },
  { label: "Municipal Council 2", value: "mc_2" },
  { label: "Municipal Council 3", value: "mc_3" },
  { label: "Municipal Council 4", value: "mc_4" },
];

export const DUMMY_WARD_OPTIONS = [
  { label: "Ward 1", value: "ward_1" },
  { label: "Ward 2", value: "ward_2" },
  { label: "Ward 3", value: "ward_3" },
  { label: "Ward 4", value: "ward_4" },
];

export const DUMMY_ROAD_OPTIONS = [
  { label: "Road A", value: "road_a" },
  { label: "Road B", value: "road_b" },
  { label: "Road C", value: "road_c" },
  { label: "Road D", value: "road_d" },
];
