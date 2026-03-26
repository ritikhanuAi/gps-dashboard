from rest_framework.views import APIView
from rest_framework.response import Response
from dashboard.models.roadDetails import RoadDetails
from dashboard.models.roads import Road
from django.db.models import IntegerField
from django.db.models.functions import Cast
from django.db.models import IntegerField, Case, When, Value


class GetUniqueWards(APIView):
    def get(self, request):
        road_id = request.query_params.get("road_id")
        if not road_id:
            return Response({"error": "road_id parameter is required"}, status=400)

        try:
            road_id = int(road_id)
        except ValueError:
            return Response({"error": "road_id must be an integer"}, status=400)

        # Get the city from the given road_id
        road = Road.objects.filter(id=road_id).first()
        if not road:
            return Response(
                {"error": "Road with the given id does not exist"}, status=404
            )

        city = road.city

        # Get all road ids with that city
        road_ids = Road.objects.filter(city=city).values_list("id", flat=True)

        # Get distinct wards from road details for those road ids
        wards = (
            RoadDetails.objects.filter(road__id__in=road_ids)
            .annotate(
                ward_int=Case(
                    When(ward__regex=r"^\d+$", then=Cast("ward", IntegerField())),
                    default=Value(None),
                    output_field=IntegerField(),
                )
            )
            .order_by("ward_int", "ward")  # numeric first, then others
            .values_list("ward", flat=True)
            .distinct()
        )
        return Response({"wards": list(wards)})
