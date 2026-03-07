from ..schemas import DiscoveryItem


def fetch_fever() -> list[DiscoveryItem]:
    return [
        DiscoveryItem(
            external_id="fever-1",
            title="Jantar Calmo no Jardim com Menu Degustacao",
            description="Restaurante intimista e silencioso para casais.",
            category="restaurant",
            tags=["restaurant", "quiet", "romantic"],
            city="Sao Paulo",
            neighborhood="Campo Belo",
            start_at="2026-03-07T21:00:00-03:00",
            price_min=120,
            price_max=220,
            source="fever",
        )
    ]
