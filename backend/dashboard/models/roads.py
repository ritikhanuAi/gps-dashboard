from django.db import models


class Road(models.Model):
    name = models.CharField(max_length=200, null=True, blank=True)
    # region = models.CharField(max_length=200, null=True, blank=True)
    # district = models.CharField(max_length=200, null=True, blank=True)
    city = models.CharField(max_length=200, null=True, blank=True)
    municipal_council = models.CharField(max_length=200, null=True, blank=True)

    status = models.CharField(max_length=10, null=True, blank=True)
    ownership = models.CharField(max_length=50, null=True, blank=True)

    class Meta:
        db_table = "road"

    def __str__(self):
        return self.name
