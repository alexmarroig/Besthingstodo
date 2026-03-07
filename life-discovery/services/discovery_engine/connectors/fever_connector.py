from playwright.sync_api import sync_playwright

from ..normalize import normalize_event


def fetch_events() -> list[dict]:
    url = "https://feverup.com/en/sao-paulo"
    events: list[dict] = []

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto(url, wait_until="domcontentloaded", timeout=45000)
            anchors = page.query_selector_all("a")
            for a in anchors[:150]:
                txt = (a.inner_text() or "").strip()
                href = a.get_attribute("href") or ""
                if len(txt) < 16:
                    continue
                if "/sao-paulo" not in href and "feverup.com" not in href:
                    continue
                events.append(
                    normalize_event(
                        {
                            "title": txt[:140],
                            "description": "Evento encontrado no Fever Sao Paulo",
                            "venue": "Sao Paulo",
                            "city": "Sao Paulo",
                            "date": None,
                            "price": None,
                            "category": "cultural",
                            "tags": ["fever", "event", "experience"],
                            "url": href if href.startswith("http") else f"https://feverup.com{href}",
                        },
                        source="fever",
                    )
                )
                if len(events) >= 25:
                    break
            browser.close()
    except Exception:
        return []

    return events
