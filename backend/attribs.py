import json
from collections import defaultdict

# Input & Output paths
input_file = "ratia.geojson"
output_file = "unique_values.json"

# Load GeoJSON
with open(input_file, "r", encoding="utf-8") as f:
    data = json.load(f)

# Store unique values
unique_values = defaultdict(set)

# Process features
for feature in data.get("features", []):
    properties = feature.get("properties", {})

    for key, value in properties.items():
        # Clean string values
        if isinstance(value, str):
            value = value.strip()

        # Skip empty/null values
        if value not in [None, "", " "]:
            unique_values[key].add(value)

# Convert sets → lists (JSON doesn't support sets)
output_data = {
    k: sorted(list(v), key=lambda x: str(x)) for k, v in unique_values.items()
}

# Write to file
with open(output_file, "w", encoding="utf-8") as f:
    json.dump(output_data, f, indent=2)

print(f"✅ Unique values saved to {output_file}")
