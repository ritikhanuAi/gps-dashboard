from django.db import models
from dashboard.models.roads import Road


class RoadDetails(models.Model):
    road = models.ForeignKey(Road, on_delete=models.CASCADE, related_name="details")

    start_pt = models.CharField(max_length=200, blank=True, null=True)
    end_pt = models.CharField(max_length=200, blank=True, null=True)

    width = models.FloatField(null=True, blank=True)
    carriage = models.FloatField(null=True, blank=True)

    mla_cons = models.CharField(max_length=200, null=True, blank=True)
    pwd_cir = models.CharField(max_length=200, null=True, blank=True)
    pwd_div = models.CharField(max_length=200, null=True, blank=True)

    source = models.CharField(max_length=100, null=True, blank=True)

    gis_length = models.FloatField(null=True, blank=True)
    lengthdoc = models.FloatField(null=True, blank=True)

    remarks = models.TextField(null=True, blank=True)

    circleCode = models.IntegerField(null=True, blank=True)
    divCode = models.IntegerField(null=True, blank=True)
    distCode = models.IntegerField(null=True, blank=True)
    deptCode = models.IntegerField(null=True, blank=True)

    def __str__(self):
        return f"Details for {self.road.rd_name}"
