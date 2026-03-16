from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from dashboard.models import RoadDetails


class GetRoadDetails(APIView):
    def get(self, request, detail_id):
        print(detail_id)
        try:
            details = (
                RoadDetails.objects.filter(id=detail_id)
                .values(
                    "id",
                    # "road_id",
                    "start_pt",
                    "end_pt",
                    "width",
                    "carriage",
                    "mla_cons",
                    "pwd_cir",
                    "ward",
                    "source",
                    "gis_length",
                    "lengthdoc",
                    "remarks",
                    "circleCode",
                    "divCode",
                    "distCode",
                    "deptCode",
                )
                .first()
            )

            if not details:
                return Response(
                    {"error": "Road detail not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )

            return Response(
                {
                    "message": "Road details fetched successfully",
                    "data": details,
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
