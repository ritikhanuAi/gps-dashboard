from django.db import models


class Geometry(models.Model):
    road = models.ForeignKey("Road", on_delete=models.CASCADE)
    geom = models.LineStringField()

    def __str__(self):
        return f"Coordinates for {self.road.name}"
