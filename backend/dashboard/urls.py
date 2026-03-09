from dashboard.views.vectorFetch import RoadVectorTileView
from dashboard.views.uploadGeo import UploadGeo
from django.urls import path
from dashboard.views.fetchRoadData import FetchRoadData
from dashboard.views.returnWard import GetUniqueWards


urlpatterns = [
    path("upload-geo", UploadGeo.as_view(), name="upload-geo"),
    path("fetchRoadData", FetchRoadData.as_view(), name="fetch-road-data"),
    path(
        "tiles/<int:z>/<int:x>/<int:y>/",
        RoadVectorTileView.as_view(),
        name="road-tiles",
    ),
    path("get-unique-wards", GetUniqueWards.as_view(), name="get-unique-wards"),
]
