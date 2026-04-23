from rest_framework import serializers
from dashboard.models.roads import Road


class RoadUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Road
        # List every field that callers are allowed to update.
        # Keep geometry OUT of this serializer — it lives in Geometry model.
        fields = [
            "road_name",
            "start_point",
            "end_point",
            "width",
            "carriage",
            "status",
            "road_status",
            "crust",
            "road_type",
            "road_category",
            "ownership",
            "department",
            "remarks",
            "harsac_status",
            "source",
            "dlp_from",
            "dlp_to",
        ]
        # Allow partial updates (PATCH) — no field is required
        extra_kwargs = {field: {"required": False} for field in fields}
