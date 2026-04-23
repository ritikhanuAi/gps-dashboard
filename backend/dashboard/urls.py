from dashboard.views.fileterRoads import GeoJSONFilter
from dashboard.views.regionOverview import RoadStatsAPIView
from dashboard.views.vectorFetch import RoadVectorTileView
from dashboard.views.uploadGeo import UploadGeo
from django.urls import path

# from dashboard.views.fetchRoadData import FetchRoadData
# from dashboard.views.returnWard import GetUniqueWards
from dashboard.views.fetchRoadDetails import GetRoadDetails
from dashboard.views.manageCities import (
    GetAllCitiesAPIView,
    UpdateCityRoadsAPIView,
    GetCityDetailsAPIView,
)

urlpatterns = [
    path("upload-geo", UploadGeo.as_view(), name="upload-geo"),
    # path("fetchRoadData", FetchRoadData.as_view(), name="fetch-road-data"),
    path(
        "tiles/<int:z>/<int:x>/<int:y>/",
        RoadVectorTileView.as_view(),
        name="road-tiles",
    ),
    # path("get-unique-wards", GetUniqueWards.as_view(), name="get-unique-wards"),
    path(
        "get-road-details/<int:road_id>/",
        GetRoadDetails.as_view(),
        name="get-road-details",
    ),
    path("filterRoads", GeoJSONFilter.as_view(), name="filter-roads"),
    path("region-overview", RoadStatsAPIView.as_view(), name="region-overview"),
    # City Management APIs
    path("cities/", GetAllCitiesAPIView.as_view(), name="get-all-cities"),
    path(
        "cities/<int:city_id>/",
        GetCityDetailsAPIView.as_view(),
        name="get-city-details",
    ),
    path(
        "cities/<int:city_id>/update-roads/",
        UpdateCityRoadsAPIView.as_view(),
        name="update-city-roads",
    ),
]
