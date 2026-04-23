import json
import os
import re

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from django.contrib.gis.geos import GEOSGeometry, MultiLineString, LineString
from django.db import transaction

from dashboard.models.roads import Road
from dashboard.models.geometry import Geometry
from dashboard.models.geoDataSet import GeoDataset


class UploadGeo(APIView):

    @staticmethod
    def extract_city(filename):
        name = os.path.splitext(filename)[0]
        name = name.replace("_", " ")

        name = re.sub(r"\s*(lat|lng|lang)$", "", name, flags=re.IGNORECASE)
        name = re.sub(r"(lat|lng|lang)$", "", name, flags=re.IGNORECASE)

        return name.strip()

    @transaction.atomic
    def post(self, request):

        files = request.FILES.getlist("files")
        city_id = request.POST.get("city_id")  # Get city_id from form data

        if not files:
            return Response({"error": "No files uploaded"}, status=400)

        total_inserted = 0
        total_updated = 0

        try:
            # ✅ Handle city selection: either use provided city_id or extract from filename
            if city_id:
                # Mode: Update Existing City
                try:
                    dataset = GeoDataset.objects.get(id=city_id)
                except GeoDataset.DoesNotExist:
                    return Response(
                        {"error": f"City with ID {city_id} not found"},
                        status=status.HTTP_404_NOT_FOUND,
                    )
            else:
                # Mode: New City (extract from filename)
                dataset = None

            for file in files:

                if not file.name.endswith(".geojson"):
                    return Response(
                        {"error": f"{file.name} is not a GeoJSON file"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                # ✅ If no city_id provided, create/get dataset from filename
                if not city_id:
                    city_name = self.extract_city(file.name)
                    dataset, _ = GeoDataset.objects.get_or_create(name=city_name)

                geojson_data = json.load(file)

                inserted, updated = self.uploadData(geojson_data, dataset)
                total_inserted += inserted
                total_updated += updated

        except Exception as e:
            transaction.set_rollback(True)
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {
                "message": "GeoJSON uploaded successfully",
                "features_inserted": total_inserted,
                "features_updated": total_updated,
                "total_processed": total_inserted + total_updated,
                "city_id": dataset.id if dataset else None,
                "city_name": dataset.name if dataset else None,
            }
        )

    def build_road_fields(self, props, index):
        """Build road field dictionary from GeoJSON properties."""
        return {
            "temp_road_id": props.get("temp_road_id"),
            "gis_id": props.get("gisid"),
            "road_name": props.get("rd_name") or f"road_{index}",
            "r_temp_id": props.get("r_temp_id"),
            "start_point": props.get("start_pt"),
            "end_point": props.get("end_pt"),
            "width": props.get("width"),
            "carriage": props.get("carrriage"),
            "mla_constituency": props.get("mla_cons"),
            "district": props.get("district"),
            "vs_con": props.get("vs_con"),
            "circle": props.get("pwd_cir"),
            "division": props.get("pwd_div"),
            "circle_code": props.get("circleCode"),
            "div_code": props.get("divCode"),
            "dist_code": props.get("distCode"),
            "dept_code": props.get("deptCode"),
            "road_type": props.get("type"),
            "crust": props.get("crust"),
            "road_category": props.get("road_catog"),
            "status": props.get("status"),
            "road_status": props.get("road_status"),
            "harsac_status": props.get("harsac_status"),
            "gis_length": props.get("gis_length"),
            "shape_length": props.get("Shape__Length"),
            "length_doc": props.get("lengthdoc"),
            "ownership": props.get("ownership"),
            "department": props.get("department"),
            "source": props.get("source"),
            "ur_id": props.get("ur_id"),
            "dlp_from": props.get("dlp__from"),
            "dlp_to": props.get("dlp_to"),
            "survey_date": props.get("date"),
            "created_user": props.get("created_user"),
            "created_date": props.get("created_date"),
            "last_edited_user": props.get("last_edited_user"),
            "last_edited_date": props.get("last_edited_date"),
            "engineer_name": props.get("engineer_name"),
            "enc_userid": props.get("enc_userid"),
            "enccode": props.get("enccode"),
            "sector_number": props.get("sectorNumber"),
            "sector_name": props.get("sectorName"),
            "estate_code": props.get("estateCode"),
            "estate_name": props.get("estateName"),
            "h_creator_name": props.get("h_creator_name"),
            "h_creator_mob": props.get("h_creator_mob"),
            "v_eng_name": props.get("v_eng_name"),
            "v_eng_mob": props.get("v_eng_mob"),
            "is_retired": props.get("isRetired"),
            "remarks": props.get("remarks"),
            "global_id": props.get("GlobalID"),
            "tttt": props.get("tttt"),
        }

    def uploadData(self, geojson_data, dataset):
        """
        Upload and sync road data with existing dataset.
        
        - If road exists (by OBJECTID + dataset): Update it
        - If road is new: Create it
        - Always create/update geometry
        """
        features = geojson_data.get("features", [])
        inserted = 0
        updated = 0

        for i, feature in enumerate(features):

            props = feature.get("properties", {})
            geometry = feature.get("geometry")

            if not geometry:
                continue

            # ✅ Convert geometry safely
            try:
                geom = GEOSGeometry(json.dumps(geometry))
            except Exception:
                continue

            # ✅ Ensure MultiLineString
            if isinstance(geom, LineString):
                geom = MultiLineString(geom)

            elif not isinstance(geom, MultiLineString):
                continue

            # ✅ Build field dictionary
            road_fields = self.build_road_fields(props, i)
            object_id = props.get("OBJECTID")

            # ✅ Create or Update Road based on OBJECTID
            if object_id:
                # Try to find existing road by dataset + object_id
                road, created = Road.objects.update_or_create(
                    dataset=dataset,
                    object_id=object_id,
                    defaults=road_fields,
                )
                
                if created:
                    inserted += 1
                else:
                    updated += 1
            else:
                # No OBJECTID: always create new road
                road = Road.objects.create(
                    dataset=dataset,
                    **road_fields,
                )
                inserted += 1

            # ✅ Update or Create Geometry
            Geometry.objects.update_or_create(
                road=road,
                defaults={"geom": geom},
            )

        return inserted, updated
