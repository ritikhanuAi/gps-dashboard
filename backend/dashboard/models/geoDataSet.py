from django.db import models


class GeoDataset(models.Model):
    name = models.CharField(max_length=255, db_index=True)  # city name (dropdown)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "geo_dataset"

    def __str__(self):
        return self.name
