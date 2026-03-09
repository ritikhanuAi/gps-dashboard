from django.db import models
from django.contrib.gis.db import models as gis_models


class Geometry(models.Model):
    road = models.ForeignKey("Road", on_delete=models.CASCADE)
    geom = gis_models.MultiLineStringField()

    class Meta:
        db_table = "road_geometry"

    def __str__(self):
        return f"Coordinates for {self.road.name}"
