from django.db import connection
from django.http import HttpResponse
from rest_framework.views import APIView


class RoadVectorTileView(APIView):

    def get(self, request, z, x, y):

        sql = """
        SELECT ST_AsMVT(tile, 'roads', 4096, 'geom')
        FROM (
            SELECT
                g.id,
                r.city,
                ST_AsMVTGeom(
                    g.geom,
                    ST_TileEnvelope(%s,%s,%s),
                    4096,
                    256,
                    true
                ) AS geom
            FROM road_geometry g
            JOIN road r ON g.road_id = r.id
            WHERE g.geom && ST_TileEnvelope(%s,%s,%s)
        ) AS tile;
        """

        with connection.cursor() as cursor:
            cursor.execute(sql, [z, x, y, z, x, y])
            tile = cursor.fetchone()[0]

        return HttpResponse(tile, content_type="application/x-protobuf")
