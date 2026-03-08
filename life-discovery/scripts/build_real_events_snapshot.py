import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.append(str(ROOT))

from services.discovery_engine.service import fetch_all_events  # noqa: E402


OUT_FILE = ROOT / "apps" / "web" / "public" / "real-events.json"


def _clean(text: str) -> str:
    base = " ".join((text or "").strip().split())
    if "Ã" in base:
        try:
            base = base.encode("latin1").decode("utf-8")
        except Exception:
            pass
    return base


def _valid_title(title: str) -> bool:
    t = _clean(title)
    if len(t) < 6:
        return False
    lower = t.lower()
    blocked = [
        "event marketing platform",
        "find your tickets",
        "contact your event organizer",
        "popular in",
        "explore more events",
        "pular para o conteudo",
    ]
    return not any(x in lower for x in blocked)


def _normalize_url(url: str, source: str) -> str:
    u = _clean(url)
    if not u:
        return ""
    if u.startswith("/"):
        if source == "masp":
            return f"https://masp.org.br{u}"
        return u
    if "eventbrite" in u and "?" in u:
        return u.split("?", 1)[0]
    return u


def _category(source: str, title: str) -> str:
    lower = title.lower()
    if source == "masp":
        return "exhibition"
    if "cinema" in lower or "filme" in lower or "movie" in lower:
        return "movie"
    if "show" in lower:
        return "show"
    return "event"


def build_snapshot() -> list[dict]:
    raw = fetch_all_events()
    results: list[dict] = []
    seen: set[str] = set()

    for row in raw:
        title = _clean(row.get("title", ""))
        source = _clean(row.get("source", ""))
        url = _normalize_url(row.get("url", ""), source)
        if not title or not source or not url:
            continue
        if not _valid_title(title):
            continue
        if source not in {"masp", "eventbrite", "sympla"}:
            continue

        key = f"{source}|{title.lower()}|{url.lower()}"
        if key in seen:
            continue
        seen.add(key)

        tags = row.get("tags") or []
        if isinstance(tags, str):
            tags = [x.strip() for x in tags.split(",") if x.strip()]

        results.append(
            {
                "id": f"{source}-{abs(hash(key))}",
                "title": title,
                "description": _clean(row.get("description", "")) or f"Evento real encontrado em {source}",
                "category": _category(source, title),
                "city": _clean(row.get("city", "")) or "Sao Paulo",
                "location": _clean(row.get("venue", "")) or "Sao Paulo",
                "start_time": str(row.get("start_time") or "") or None,
                "price": row.get("price", None),
                "tags": tags[:6],
                "source": source,
                "url": url,
                "latitude": row.get("latitude"),
                "longitude": row.get("longitude"),
            }
        )

    results.sort(key=lambda x: (x["source"], x["title"]))
    return results


def main() -> None:
    events = build_snapshot()
    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUT_FILE.write_text(json.dumps(events, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"saved {len(events)} real events -> {OUT_FILE}")


if __name__ == "__main__":
    main()
