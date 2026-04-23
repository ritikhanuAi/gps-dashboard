from django.db.models import Sum, Avg, Max, Min
from rest_framework.views import APIView
from rest_framework.response import Response
from dashboard.models import Road


class RoadStatsAPIView(APIView):
    def get(self, request):
        dataset_id = request.query_params.get("dataset_id")  # region filter

        # Base queryset
        queryset = Road.objects.all()

        # Apply filter if region selected
        if dataset_id:
            queryset = queryset.filter(dataset_id=dataset_id)

        # Total roads
        total_roads = queryset.count()

        # Length stats
        length_stats = queryset.aggregate(
            total_length=Sum("gis_length"),
            avg_length=Avg("gis_length"),
            max_length=Max("gis_length"),
            min_length=Min("gis_length"),
        )

        data = {
            "dataset_id": dataset_id if dataset_id else "all",
            "total_roads": total_roads,
            "length_stats": length_stats,
        }

        return Response(data)
