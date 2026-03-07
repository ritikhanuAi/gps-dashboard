import json
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from django.contrib.gis.geos import (
    GEOSGeometry,
    MultiLineString,
    LineString,
)
from django.db import transaction

from dashboard.models.roads import Road
from dashboard.models.roadDetails import RoadDetails
from dashboard.models.geometry import Geometry
import os, re


class UploadGeo(APIView):

    @staticmethod
    def extract_city(filename):
        name = os.path.splitext(filename)[0]  # remove extension
        name = name.replace("_", " ")  # convert underscores to space

        # remove trailing lat/lng/lang if present
        name = re.sub(r"\s*(lat|lng|lang)$", "", name, flags=re.IGNORECASE)

        # handle cases like newlat
        name = re.sub(r"(lat|lng|lang)$", "", name, flags=re.IGNORECASE)

        return name.strip()

    @transaction.atomic
    def post(self, request):

        files = request.FILES.getlist("files")

        if not files:
            return Response({"error": "No files uploaded"}, status=400)

        total_features = 0

        try:
            for file in files:

                if not file.name.endswith(".geojson"):
                    return Response(
                        {"error": f"{file.name} is not a GeoJSON file"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                city = self.extract_city(
                    filename=file.name
                )  # Assuming filename format: cityname_something.geojson
                geojson_data = json.load(file)

                count = self.uploadData(geojson_data, cityName=city)
                total_features += count

        except Exception as e:
            transaction.set_rollback(True)
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {
                "message": "GeoJSON uploaded successfully",
                "features_inserted": total_features,
            }
        )

    def uploadData(self, geojson_data, cityName):

        features = geojson_data.get("features", [])
        inserted = 0

        for i, feature in enumerate(features):

            properties = feature.get("properties", {})
            geometry = feature.get("geometry")

            # Skip if no geometry
            if not geometry:
                continue

            try:
                geom = GEOSGeometry(json.dumps(geometry))
            except Exception:
                continue

            # Ensure geometry type
            if isinstance(geom, LineString):
                geom = MultiLineString(geom)

            elif not isinstance(geom, MultiLineString):
                continue

            # Fix missing road name
            road_name = properties.get("rd_name")
            if not road_name:
                road_name = f"road_{i}"

            # Create road
            road, created = Road.objects.get_or_create(
                name=road_name,
                city=cityName,
                defaults={
                    "status": properties.get("status"),
                    "ownership": properties.get("ownership"),
                    "municipal_council": properties.get("pwd_cir"),
                },
            )

            # Create road details
            ward_value = properties.get("pwd_div") or ""
            ward_number = ward_value.split()[1] if len(ward_value.split()) > 1 else None

            RoadDetails.objects.create(
                road=road,
                start_pt=properties.get("start_pt"),
                end_pt=properties.get("end_pt"),
                width=properties.get("width"),
                carriage=properties.get("carrriage"),
                mla_cons=properties.get("mla_cons"),
                ward=ward_number,
                source=properties.get("source"),
                gis_length=properties.get("gis_length"),
                lengthdoc=properties.get("lengthdoc"),
                remarks=properties.get("remarks"),
                circleCode=properties.get("circleCode"),
                divCode=properties.get("divCode"),
                distCode=properties.get("distCode"),
                deptCode=properties.get("deptCode"),
            )

            # Save geometry
            Geometry.objects.create(road=road, geom=geom)

            inserted += 1

        return inserted
