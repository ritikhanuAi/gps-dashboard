from rest_framework.views import APIView
from rest_framework.response import Response

from django.contrib.gis.db.models.functions import AsGeoJSON
from django.db.models import F

from dashboard.models.geometry import Geometry

import json


class GeoJSONFilter(APIView):

    def get(self, request):
        city_id = request.GET.get("city_id")
        circle = request.GET.get("circle")
        ward = request.GET.get("ward")
        road_id = request.GET.get("road_id")

        queryset = Geometry.objects.select_related("road", "road__dataset")

        # 🔹 Apply filters
        if city_id:
            queryset = queryset.filter(road__dataset_id=city_id)

        if circle:
            queryset = queryset.filter(road__circle=circle)

        if ward:
            queryset = queryset.filter(road__div_code=ward)

        if road_id:
            queryset = queryset.filter(road_id=road_id)

        # 🔹 Annotate everything needed
        data = queryset.annotate(
            geojson=AsGeoJSON("geom"),
            # city
            city_id=F("road__dataset_id"),
            city_name=F("road__dataset__name"),
            # road info
            road_name=F("road__road_name"),
            r_temp_id=F("road__r_temp_id"),
            width=F("road__width"),
            # hierarchy
            circle=F("road__circle"),
            ward=F("road__div_code"),
        ).values(
            "road_id",
            "geojson",
            "city_id",
            "city_name",
            "road_name",
            "r_temp_id",
            "width",
            "circle",
            "ward",
        )

        # 🔹 Build FeatureCollection
        features = []

        for row in data:
            features.append(
                {
                    "type": "Feature",
                    "properties": {
                        "road_id": row["road_id"],
                        "road_name": row["road_name"],
                        "r_temp_id": row["r_temp_id"],
                        "city_id": row["city_id"],
                        "city_name": row["city_name"],
                        "circle": row["circle"],
                        "ward": row["ward"],
                        "width": row["width"],
                    },
                    "geometry": json.loads(row["geojson"]),
                }
            )

        return Response({"type": "FeatureCollection", "features": features})
