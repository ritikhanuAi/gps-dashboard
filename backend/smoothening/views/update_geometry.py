from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.gis.geos import GEOSGeometry
from django.shortcuts import get_object_or_404

from dashboard.models.geometry import Geometry
from dashboard.models.roads import Road


class UpdateGeometryView(APIView):
    """
    PATCH /smoothening/road/<road_id>/geometry/

    Replace the MultiLineString geometry of a road.

    Body (GeoJSON MultiLineString):
    {
        "type": "MultiLineString",
        "coordinates": [
            [[lon, lat], [lon, lat], ...],
            ...
        ]
    }
    """

    def patch(self, request, road_id):
        road = get_object_or_404(Road, pk=road_id)
        geometry_obj = Geometry.objects.filter(road=road).first()

        geojson_str = request.data.get("geometry")
        if not geojson_str:
            return Response(
                {
                    "error": "Field 'geometry' with a GeoJSON MultiLineString is required."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            import json

            if isinstance(geojson_str, dict):
                geojson_str = json.dumps(geojson_str)
            new_geom = GEOSGeometry(geojson_str)
            if new_geom.geom_type != "MultiLineString":
                raise ValueError("Geometry must be MultiLineString.")
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        if geometry_obj:
            geometry_obj.geom = new_geom
            geometry_obj.save()
        else:
            geometry_obj = Geometry.objects.create(road=road, geom=new_geom)

        return Response(
            {
                "message": "Geometry updated successfully.",
                "geometry_id": geometry_obj.id,
            },
            status=status.HTTP_200_OK,
        )
