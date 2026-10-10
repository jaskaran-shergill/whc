from workers import Response, WorkerEntrypoint
from functions.fetch import tm_fetch
import json

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}


class Default(WorkerEntrypoint):
    async def fetch(self, request):
        if request.method == "OPTIONS":
            return Response(None, status=204, headers=CORS)

        coords = await request.json()
        result = await tm_fetch(
            float(coords["userLat"]),
            float(coords["userLng"]),
        )

        return Response(
            json.dumps(result),
            headers={
                **CORS,
                "Content-Type": "application/json",
                "Cache-Control": "public, max-age=3600",
            },
        )
