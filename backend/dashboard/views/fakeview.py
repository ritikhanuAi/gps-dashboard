from rest_framework.views import APIView
from rest_framework.response import Response
from dashboard.models.geometry import Geometry
from dashboard.models.roads import Road
from django.contrib.gis.db.models.functions import AsGeoJSON
import json
from django.db.models import F


class FetchRoadData(APIView):

    def fetchAllcityGeo(self):
        data = (
            Geometry.objects.select_related("road")
            .annotate(city=F("road__city"), geojson=AsGeoJSON("geom"))
            .values("road_id", "city", "geojson")  # use existing road_id
        )

        features = []

        for row in data:
            geometry = json.loads(row["geojson"])

            feature = {
                "type": "Feature",
                "properties": {
                    "id": row["road_id"],  # road id
                    "city": row["city"],
                },
                "geometry": geometry,
            }

            features.append(feature)

        return {
            "type": "FeatureCollection",
            "features": features,
        }

    def fetchMcByCity(self, road_id):

        data = (
            Geometry.objects.select_related("road")
            .filter(road__city=Road.objects.filter(id=road_id).values("city")[:1])
            .annotate(
                city=F("road__city"),
                municipal_council=F("road__municipal_council"),
                ward=F("road__details__ward"),
                roadDetailId=F("road__details__id"),
                geojson=AsGeoJSON("geom"),
            )
            .values(
                "road_id",
                "city",
                "municipal_council",
                "ward",
                "roadDetailId",
                "geojson",
            )
        )

        features = []

        for row in data:
            feature = {
                "type": "Feature",
                "properties": {
                    "id": row["road_id"],
                    "city": row["city"],
                    "municipal_council": row["municipal_council"],
                    "ward": row["ward"],
                    "roadDetailId": row["roadDetailId"],
                },
                "geometry": json.loads(row["geojson"]),
            }

            features.append(feature)

        return {
            "type": "FeatureCollection",
            "features": features,
        }

    def get(self, request):
        cityId = request.query_params.get("cityId")

        if cityId:
            geojson_data = self.fetchMcByCity(cityId)
        else:
            geojson_data = self.fetchAllcityGeo()

        return Response(
            {"message": "Fetched road geometries successfully", "data": geojson_data}
        )
