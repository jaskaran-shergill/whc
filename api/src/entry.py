from workers import Response, WorkerEntrypoint
from functions.fetch import tm_fetch


class Default(WorkerEntrypoint):
    async def fetch(self, request):
        coords = await request.json()
        return Response.json(
            await tm_fetch(
                float(coords["userLat"]),
                float(coords["userLng"]),
            )
        )
