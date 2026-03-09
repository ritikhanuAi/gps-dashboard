from rest_framework.views import APIView
from rest_framework.response import Response
from dashboard.models.geometry import Geometry
from dashboard.models.roads import Road
from dashboard.models.roadDetails import RoadDetails
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

    def fetchMcByCity(self, id):

        # Step 1: Get city from the road id
        print("Road ID:", id)  # Debugging statement
        road = Road.objects.filter(id=id).values("city").first()

        if not road:
            return {"type": "FeatureCollection", "features": []}

        city_name = road["city"]

        # Step 2: Fetch all geometries with same city
        data = (
            Geometry.objects.select_related("road")
            .filter(road__city=city_name)
            .annotate(
                city=F("road__city"),
                municipal_council=F("road__municipal_council"),
                geojson=AsGeoJSON("geom"),
            )
            .values("road_id", "city", "municipal_council", "geojson")
        )

        features = []

        for row in data:
            geometry = json.loads(row["geojson"])

            feature = {
                "type": "Feature",
                "properties": {
                    "id": row["road_id"],
                    "city": row["city"],
                    "municipal_council": row["municipal_council"],
                },
                "geometry": geometry,
            }

            features.append(feature)

        return {
            "type": "FeatureCollection",
            "features": features,
        }

    def fetchRoadByWard(self, wardNo, roadId):

        # Step 1: Get city and municipal_council from the road id
        road = Road.objects.filter(id=roadId).values("city", "municipal_council").first()

        if not road:
            return {"type": "FeatureCollection", "features": []}

        city_name = road["city"]
        mc_name = road["municipal_council"]

        # Step 2: Get road IDs in this MC that have the matching ward
        road_ids_in_ward = (
            RoadDetails.objects.filter(
                road__city=city_name,
                road__municipal_council=mc_name,
                ward=wardNo,
            )
            .values_list("road_id", flat=True)
            .distinct()
        )

        if not road_ids_in_ward:
            return {"type": "FeatureCollection", "features": []}

        # Step 3: Fetch geometries for those roads
        data = (
            Geometry.objects.select_related("road")
            .filter(road_id__in=road_ids_in_ward)
            .annotate(
                city=F("road__city"),
                municipal_council=F("road__municipal_council"),
                road_name=F("road__name"),
                geojson=AsGeoJSON("geom"),
            )
            .values("road_id", "city", "municipal_council", "road_name", "geojson")
        )

        features = []

        for row in data:
            geometry = json.loads(row["geojson"])

            feature = {
                "type": "Feature",
                "properties": {
                    "id": row["road_id"],
                    "city": row["city"],
                    "municipal_council": row["municipal_council"],
                    "name": row["road_name"],
                    "ward": wardNo,
                },
                "geometry": geometry,
            }

            features.append(feature)

        return {
            "type": "FeatureCollection",
            "features": features,
        }


    def get(self, request):
        cityId = request.query_params.get("cityId")
        ward = request.query_params.get("ward")

        if cityId and ward:
            geojson_data = self.fetchRoadByWard(ward, cityId)
        elif cityId:
            geojson_data = self.fetchMcByCity(cityId)
        else:
            geojson_data = self.fetchAllcityGeo()

        return Response(
            {"message": "Fetched road geometries successfully", "data": geojson_data}
        )
