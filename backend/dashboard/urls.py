from dashboard.views.uploadGeo import UploadGeo
from django.urls import path

urlpatterns = [
    path("upload-geo", UploadGeo.as_view(), name="upload-geo"),
]
