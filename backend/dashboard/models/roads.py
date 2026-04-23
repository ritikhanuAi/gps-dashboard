from django.db import models
from dashboard.models.geoDataSet import GeoDataset


class Road(models.Model):
    dataset = models.ForeignKey(
        GeoDataset,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="roads",
    )

    # IDs
    object_id = models.IntegerField(null=True, blank=True)
    temp_road_id = models.CharField(max_length=500, null=True, blank=True)
    gis_id = models.CharField(max_length=500, null=True, blank=True)

    # Names
    road_name = models.CharField(max_length=500, null=True, blank=True)
    r_temp_id = models.CharField(max_length=500, null=True, blank=True)

    # Points
    start_point = models.CharField(max_length=500, null=True, blank=True)
    end_point = models.CharField(max_length=500, null=True, blank=True)

    # Dimensions
    width = models.FloatField(null=True, blank=True)
    carriage = models.FloatField(null=True, blank=True)

    # Location / Admin
    mla_constituency = models.CharField(max_length=500, null=True, blank=True)
    district = models.CharField(max_length=500, null=True, blank=True)
    vs_con = models.CharField(max_length=500, null=True, blank=True)

    circle = models.CharField(max_length=500, null=True, blank=True)  # pwd_cir
    division = models.CharField(max_length=500, null=True, blank=True)  # pwd_div

    circle_code = models.IntegerField(null=True, blank=True)
    div_code = models.IntegerField(null=True, blank=True)
    dist_code = models.IntegerField(null=True, blank=True)
    dept_code = models.IntegerField(null=True, blank=True)

    # Classification
    road_type = models.CharField(max_length=500, null=True, blank=True)
    crust = models.CharField(max_length=500, null=True, blank=True)
    road_category = models.CharField(max_length=500, null=True, blank=True)

    # Status
    status = models.CharField(max_length=500, null=True, blank=True)
    road_status = models.CharField(max_length=500, null=True, blank=True)
    harsac_status = models.CharField(max_length=500, null=True, blank=True)

    # Lengths
    gis_length = models.FloatField(null=True, blank=True)
    shape_length = models.FloatField(null=True, blank=True)
    length_doc = models.FloatField(null=True, blank=True)

    # Ownership / Department
    ownership = models.CharField(max_length=500, null=True, blank=True)
    department = models.CharField(max_length=500, null=True, blank=True)

    # Survey Info
    source = models.CharField(max_length=500, null=True, blank=True)
    ur_id = models.CharField(max_length=500, null=True, blank=True)

    # Dates (keeping both raw + parsed option later)
    dlp_from = models.CharField(max_length=500, null=True, blank=True)
    dlp_to = models.CharField(max_length=500, null=True, blank=True)
    survey_date = models.CharField(max_length=500, null=True, blank=True)

    # Audit
    created_user = models.CharField(max_length=500, null=True, blank=True)
    created_date = models.BigIntegerField(null=True, blank=True)

    last_edited_user = models.CharField(max_length=500, null=True, blank=True)
    last_edited_date = models.BigIntegerField(null=True, blank=True)

    # Engineer / misc
    engineer_name = models.CharField(max_length=500, null=True, blank=True)
    enc_userid = models.CharField(max_length=500, null=True, blank=True)
    enccode = models.CharField(max_length=500, null=True, blank=True)

    # Sector / estate
    sector_number = models.CharField(max_length=500, null=True, blank=True)
    sector_name = models.CharField(max_length=500, null=True, blank=True)

    estate_code = models.CharField(max_length=500, null=True, blank=True)
    estate_name = models.CharField(max_length=500, null=True, blank=True)

    # Extra people info
    h_creator_name = models.CharField(max_length=500, null=True, blank=True)
    h_creator_mob = models.CharField(max_length=500, null=True, blank=True)

    v_eng_name = models.CharField(max_length=500, null=True, blank=True)
    v_eng_mob = models.CharField(max_length=500, null=True, blank=True)

    # Flags
    is_retired = models.CharField(max_length=500, null=True, blank=True)

    # Misc
    remarks = models.TextField(null=True, blank=True)
    global_id = models.CharField(max_length=500, null=True, blank=True)

    tttt = models.CharField(max_length=500, null=True, blank=True)

    class Meta:
        db_table = "road"

    def __str__(self):
        return self.road_name or f"Road {self.id}"
