from rest_framework import serializers
from dashboard.models.geoDataSet import GeoDataset


class CitySerializer(serializers.ModelSerializer):
    """
    Serializer for listing all cities with their IDs and names.
    Used for city dropdown and city selection operations.
    """

    class Meta:
        model = GeoDataset
        fields = ["id", "name"]


class CityDetailSerializer(serializers.ModelSerializer):
    """
    Detailed serializer for city information including creation timestamp.
    """

    class Meta:
        model = GeoDataset
        fields = ["id", "name", "created_at"]
