from rest_framework.views import APIView
from rest_framework.response import Response


class FetchRoadData(APIView):

    def get():
        return Response({"message": "This is a placeholder for fetching road data"})
