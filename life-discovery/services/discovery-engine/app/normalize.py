from dateutil import parser


def normalize_city(city: str) -> str:
    return city.strip().title().replace("Sao", "Sao")


def classify_category(title: str, description: str, raw_category: str) -> str:
    text = f"{title} {description} {raw_category}".lower()
    if "museu" in text or "expos" in text:
        return "exhibition"
    if "cinema" in text or "filme" in text:
        return "cinema"
    if "restaurant" in text or "restaurante" in text or "cafe" in text:
        return "restaurant"
    if "curso" in text or "talk" in text or "palestra" in text:
        return "course"
    return "event"


def parse_datetime(value: str | None):
    if not value:
        return None
    return parser.parse(value)


def cultural_profile(tags: list[str]) -> list[str]:
    tags_low = [x.lower() for x in tags]
    profile = ["cultural"]
    if any(x in tags_low for x in ["quiet", "contemplative", "museum"]):
        profile.append("calm")
    if any(x in tags_low for x in ["debate", "philosophy", "cinema"]):
        profile.append("intellectual")
    return profile
