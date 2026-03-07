from ..schemas import DiscoveryItem


def fetch_sympla() -> list[DiscoveryItem]:
    return [
        DiscoveryItem(
            external_id="sympla-1",
            title="Mostra de Cinema de Suspense - Vila Mariana",
            description="Sessao especial com debate sobre thriller psicologico.",
            category="cinema",
            tags=["cinema", "suspense", "cultural", "quiet"],
            city="Sao Paulo",
            neighborhood="Vila Mariana",
            start_at="2026-03-07T20:00:00-03:00",
            price_min=35,
            price_max=55,
            source="sympla",
        )
    ]
