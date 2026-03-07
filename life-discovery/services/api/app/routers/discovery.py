import httpx
from fastapi import APIRouter

from ..config import settings

router = APIRouter(prefix="", tags=["discovery"])


@router.post("/discovery/run")
async def run_discovery():
    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(f"{settings.discovery_engine_url}/crawl/run")
    return response.json()
