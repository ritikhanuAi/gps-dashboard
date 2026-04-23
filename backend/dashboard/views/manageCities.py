from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.core.paginator import Paginator

from dashboard.models.geoDataSet import GeoDataset
from dashboard.models.roads import Road
from dashboard.serializers.city_serializer import CitySerializer, CityDetailSerializer


class GetAllCitiesAPIView(APIView):
    """
    API endpoint to retrieve all available cities.

    GET /api/cities/
    Returns a list of all cities with their IDs and names for use in dropdowns
    and city selection operations.

    Response:
    {
        "cities": [
            {"id": 1, "name": "City Name 1"},
            {"id": 2, "name": "City Name 2"},
            ...
        ]
    }
    """

    def get(self, request):
        try:
            cities = GeoDataset.objects.all().order_by("name")
            serializer = CitySerializer(cities, many=True)
            return Response(
                {"success": True, "count": cities.count(), "cities": serializer.data},
                status=status.HTTP_200_OK,
            )
        except Exception as e:
            return Response(
                {"success": False, "error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class UpdateCityRoadsAPIView(APIView):
    """
    API endpoint to update roads belonging to a specific city.

    PUT/PATCH /api/cities/<city_id>/update-roads/
    Updates road information for all roads in a specific city (GeoDataset).

    Request Body:
    {
        "road_updates": [
            {
                "road_id": 123,
                "road_name": "Updated Road Name",
                "road_status": "Active",
                ... other fields to update ...
            },
            ...
        ]
    }

    Response:
    {
        "success": true,
        "city_id": 1,
        "city_name": "City Name",
        "updated_count": 5,
        "failed_count": 0,
        "updated_roads": [...]
    }
    """

    def put(self, request, city_id):
        """Update roads for a specific city"""
        return self._update_roads(request, city_id)

    def patch(self, request, city_id):
        """Partially update roads for a specific city"""
        return self._update_roads(request, city_id)

    def _update_roads(self, request, city_id):
        try:
            # Verify city exists
            city = get_object_or_404(GeoDataset, id=city_id)

            # Get the road updates from request
            road_updates = request.data.get("road_updates", [])

            if not road_updates:
                return Response(
                    {
                        "success": False,
                        "error": "No road updates provided. Expected 'road_updates' key in request body.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            updated_roads = []
            failed_updates = []

            for road_update in road_updates:
                road_id = road_update.get("road_id")

                if not road_id:
                    failed_updates.append(
                        {"error": "road_id is required", "data": road_update}
                    )
                    continue

                try:
                    # Get the road and verify it belongs to this city
                    road = Road.objects.get(id=road_id, dataset_id=city_id)

                    # Update the road with provided fields
                    for field, value in road_update.items():
                        if field != "road_id" and hasattr(road, field):
                            setattr(road, field, value)

                    road.save()
                    updated_roads.append(
                        {
                            "road_id": road.id,
                            "road_name": road.road_name,
                            "status": "updated",
                        }
                    )

                except Road.DoesNotExist:
                    failed_updates.append(
                        {
                            "road_id": road_id,
                            "error": f"Road {road_id} not found in city {city.name}",
                        }
                    )
                except Exception as e:
                    failed_updates.append(
                        {
                            "road_id": road_id,
                            "error": str(e),
                        }
                    )

            return Response(
                {
                    "success": True,
                    "city_id": city.id,
                    "city_name": city.name,
                    "updated_count": len(updated_roads),
                    "failed_count": len(failed_updates),
                    "updated_roads": updated_roads,
                    "failed_updates": failed_updates if failed_updates else None,
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            return Response(
                {"success": False, "error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class GetCityDetailsAPIView(APIView):
    """
    API endpoint to retrieve details of a specific city.

    GET /api/cities/<city_id>/
    Returns city information along with statistics about roads in that city.

    Response:
    {
        "city": {
            "id": 1,
            "name": "City Name",
            "created_at": "2024-01-01T12:00:00Z"
        },
        "roads_count": 50,
        "roads_by_status": {...}
    }
    """

    def get(self, request, city_id):
        try:
            city = get_object_or_404(GeoDataset, id=city_id)
            serializer = CityDetailSerializer(city)

            # Get road statistics for this city
            roads_count = Road.objects.filter(dataset_id=city_id).count()
            road_statuses = (
                Road.objects.filter(dataset_id=city_id)
                .values("road_status")
                .distinct()
                .count()
            )

            return Response(
                {
                    "success": True,
                    "city": serializer.data,
                    "roads_count": roads_count,
                    "unique_statuses": road_statuses,
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            return Response(
                {"success": False, "error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
