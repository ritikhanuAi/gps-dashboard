from rest_framework.views import APIView
from rest_framework.response import Response
from dashboard.models.geometry import Geometry
from django.contrib.gis.db.models.functions import AsGeoJSON
import json
from django.db.models import F


class FetchRoadData(APIView):

    def fetchAllcityGeo(self):
        data = (
            Geometry.objects.select_related("road")
            .annotate(city=F("road__city"), geojson=AsGeoJSON("geom"))
            .values("id", "city", "geojson")
        )

        features = []

        for row in data:
            geometry = json.loads(row["geojson"])

            feature = {
                "type": "Feature",
                "properties": {
                    "id": row["id"],
                    "city": row["city"],
                },
                "geometry": geometry,
            }

            features.append(feature)

        return {
            "type": "FeatureCollection",
            "features": features,
        }

    def get(self, request):
        geojson_data = self.fetchAllcityGeo()

        return Response(
            {"message": "Fetched road geometries successfully", "data": geojson_data}
        )
