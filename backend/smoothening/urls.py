from django.urls import path
from smoothening.views.update_road import UpdateRoadView
from smoothening.views.update_geometry import UpdateGeometryView
from smoothening.views.smooth_geometry import SmoothGeometryView

urlpatterns = [
    # Update road attributes (name, status, width, etc.)
    path("road/<int:road_id>/update/", UpdateRoadView.as_view(), name="update-road"),
    # Replace road geometry with new coordinates
    path(
        "road/<int:road_id>/geometry/",
        UpdateGeometryView.as_view(),
        name="update-geometry",
    ),
    # Smooth existing road geometry
    path(
        "road/<int:road_id>/smooth/",
        SmoothGeometryView.as_view(),
        name="smooth-geometry",
    ),
]
