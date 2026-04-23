from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.gis.geos import GEOSGeometry
from django.shortcuts import get_object_or_404

from dashboard.models.geometry import Geometry
from dashboard.models.roads import Road
from smoothening.services.smoothing import chaikin_smooth, douglas_peucker_simplify


ALGORITHM_CHOICES = ("chaikin", "douglas_peucker")


class SmoothGeometryView(APIView):
    """
    POST /smoothening/road/<road_id>/smooth/

    Smooth the road's existing geometry and save it back.

    Body:
    {
        "algorithm": "chaikin",          // "chaikin" | "douglas_peucker"
        "iterations": 3,                 // only for chaikin (default 3)
        "tolerance": 0.00001,            // only for douglas_peucker (default 0.00001)
        "preview": false                 // if true, return smoothed geom but don't save
    }

    Returns the smoothed GeoJSON geometry.
    """

    def post(self, request, road_id):
        road = get_object_or_404(Road, pk=road_id)
        geometry_obj = Geometry.objects.filter(road=road).first()

        if not geometry_obj:
            return Response(
                {"error": "No geometry found for this road."},
                status=status.HTTP_404_NOT_FOUND,
            )

        algorithm = request.data.get("algorithm", "chaikin")
        if algorithm not in ALGORITHM_CHOICES:
            return Response(
                {"error": f"algorithm must be one of {ALGORITHM_CHOICES}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        preview = request.data.get("preview", False)
        original_wkt = geometry_obj.geom.wkt

        try:
            if algorithm == "chaikin":
                iterations = int(request.data.get("iterations", 3))
                smoothed_wkt = chaikin_smooth(original_wkt, iterations=iterations)
            else:
                tolerance = float(request.data.get("tolerance", 0.00001))
                smoothed_wkt = douglas_peucker_simplify(
                    original_wkt, tolerance=tolerance
                )
        except Exception as e:
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        smoothed_geom = GEOSGeometry(smoothed_wkt)

        if not preview:
            geometry_obj.geom = smoothed_geom
            geometry_obj.save()

        return Response(
            {
                "message": "Smoothed geometry"
                + (" (preview — not saved)" if preview else " saved."),
                "algorithm": algorithm,
                "smoothed_geometry": smoothed_geom.geojson,
            },
            status=status.HTTP_200_OK,
        )
