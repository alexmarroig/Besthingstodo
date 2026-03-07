from ..schemas import DiscoveryItem


def fetch_eventbrite() -> list[DiscoveryItem]:
    return [
        DiscoveryItem(
            external_id="eventbrite-1",
            title="Exposicao Imersiva Arte e Mente - Pinheiros",
            description="Experiencia contemplativa em arte contemporanea.",
            category="exhibition",
            tags=["museum", "exhibition", "contemplative"],
            city="Sao Paulo",
            neighborhood="Pinheiros",
            start_at="2026-03-08T18:30:00-03:00",
            price_min=40,
            price_max=80,
            source="eventbrite",
        )
    ]
