from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from dashboard.models.roads import Road


class GetRoadDetails(APIView):

    def get(self, request, road_id):
        try:
            road = (
                Road.objects.filter(id=road_id)
                .values(
                    "id",
                    "dataset_id",
                    # IDs
                    "object_id",
                    "temp_road_id",
                    "gis_id",
                    # Names
                    "road_name",
                    "r_temp_id",
                    # Points
                    "start_point",
                    "end_point",
                    # Dimensions
                    "width",
                    "carriage",
                    # Location / Admin
                    "mla_constituency",
                    "district",
                    "vs_con",
                    "circle",
                    "division",
                    "circle_code",
                    "div_code",
                    "dist_code",
                    "dept_code",
                    # Classification
                    "road_type",
                    "crust",
                    "road_category",
                    # Status
                    "status",
                    "road_status",
                    "harsac_status",
                    # Lengths
                    "gis_length",
                    "shape_length",
                    "length_doc",
                    # Ownership / Department
                    "ownership",
                    "department",
                    # Survey Info
                    "source",
                    "ur_id",
                    # Dates
                    "dlp_from",
                    "dlp_to",
                    "survey_date",
                    # Audit
                    "created_user",
                    "created_date",
                    "last_edited_user",
                    "last_edited_date",
                    # Engineer
                    "engineer_name",
                    "enc_userid",
                    "enccode",
                    # Sector / Estate
                    "sector_number",
                    "sector_name",
                    "estate_code",
                    "estate_name",
                    # Extra
                    "h_creator_name",
                    "h_creator_mob",
                    "v_eng_name",
                    "v_eng_mob",
                    # Flags
                    "is_retired",
                    # Misc
                    "remarks",
                    "global_id",
                    "tttt",
                )
                .first()
            )

            if not road:
                return Response(
                    {"error": "Road not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )

            return Response(
                {
                    "message": "Road details fetched successfully",
                    "data": road,
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
