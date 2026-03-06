from django.db import models


class Road(models.Model):
    name = models.CharField(max_length=200)
    region = models.CharField(max_length=200)
    district = models.CharField(max_length=200)
    status = models.CharField(max_length=10)
    ownnership = models.CharField(max_length=10)

    def __str__(self):
        return self.name
