from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404

from dashboard.models.roads import Road
from smoothening.serializers.road_serializer import RoadUpdateSerializer


class UpdateRoadView(APIView):
    """
    PATCH /smoothening/road/<road_id>/update/

    Partially update any attribute of a Road record.
    Send only the fields you want to change.

    Example body:
    {
        "road_name": "New Name",
        "status": "Active",
        "width": 7.5
    }
    """

    def patch(self, request, road_id):
        road = get_object_or_404(Road, pk=road_id)
        serializer = RoadUpdateSerializer(road, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(
                {"message": "Road updated successfully.", "data": serializer.data},
                status=status.HTTP_200_OK,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
