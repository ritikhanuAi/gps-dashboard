from rest_framework import serializers
from rest_framework_gis.serializers import GeoFeatureModelSerializer
from dashboard.models.geometry import Geometry


class GeometryUpdateSerializer(serializers.ModelSerializer):
    """
    Accepts raw WKT or GeoJSON MultiLineString for the `geom` field.
    """

    class Meta:
        model = Geometry
        fields = ["id", "geom"]
        extra_kwargs = {"geom": {"required": True}}
