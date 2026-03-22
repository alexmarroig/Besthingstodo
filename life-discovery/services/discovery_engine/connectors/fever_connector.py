import json
import re

from playwright.sync_api import sync_playwright

from ..normalize import normalize_event, enrich_tags_from_title


def _parse_price(text: str) -> float | None:
    if not text:
        return None
    if re.search(r"gratu[ií]to|free|gratuita", text, re.IGNORECASE):
        return 0.0
    m = re.search(r"R\$\s*(\d+[\.,]?\d*)", text)
    if m:
        return float(m.group(1).replace(",", "."))
    # Handle "from $X" style
    m2 = re.search(r"\$\s*(\d+[\.,]?\d*)", text)
    if m2:
        return float(m2.group(1).replace(",", "."))
    return None


def fetch_events() -> list[dict]:
    url = "https://feverup.com/en/sao-paulo"
    events: list[dict] = []

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(
                extra_http_headers={
                    "Accept-Language": "pt-BR,pt;q=0.9",
                    "User-Agent": (
                        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                    ),
                }
            )
            page.goto(url, wait_until="networkidle", timeout=60000)

            # Try to extract JSON-LD first
            ld_events = []
            try:
                ld_content = page.evaluate("""
                    () => {
                        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
                        return Array.from(scripts).map(s => s.textContent);
                    }
                """)
                for raw in (ld_content or []):
                    try:
                        data = json.loads(raw)
                        items = data if isinstance(data, list) else [data]
                        for item in items:
                            if isinstance(item, dict) and item.get("@type") == "Event":
                                ld_events.append(item)
                    except Exception:
                        pass
            except Exception:
                pass

            if ld_events:
                for item in ld_events[:25]:
                    title = (item.get("name") or "").strip()
                    if len(title) < 12:
                        continue
                    href = item.get("url", "")
                    if not href.startswith("http"):
                        href = f"https://feverup.com{href}"
                    date_str = item.get("startDate") or item.get("startTime")
                    offers = item.get("offers", {})
                    price = None
                    if isinstance(offers, dict):
                        price = _parse_price(str(offers.get("price", "")))
                    description = item.get("description", f"Experiência no Fever São Paulo – {title}")[:300]
                    location = item.get("location", {})
                    venue = ""
                    if isinstance(location, dict):
                        venue = location.get("name", "")
                    tags = enrich_tags_from_title(title, ["fever", "event", "experience"])
                    events.append(
                        normalize_event(
                            {
                                "title": title[:140],
                                "description": description,
                                "venue": venue or "Sao Paulo",
                                "city": "Sao Paulo",
                                "date": date_str,
                                "price": price,
                                "category": "cultural",
                                "tags": tags,
                                "url": href,
                            },
                            source="fever",
                        )
                    )
            else:
                # Fallback: extract from rendered event cards
                # Wait for cards to render
                try:
                    page.wait_for_selector("a[href*='/sao-paulo']", timeout=10000)
                except Exception:
                    pass

                anchors = page.query_selector_all("a")
                seen: set[str] = set()
                for a in anchors[:200]:
                    txt = (a.inner_text() or "").strip()
                    href = a.get_attribute("href") or ""
                    if len(txt) < 16:
                        continue
                    if "/sao-paulo" not in href and "feverup.com" not in href:
                        continue
                    full_href = href if href.startswith("http") else f"https://feverup.com{href}"
                    if full_href in seen:
                        continue
                    seen.add(full_href)

                    # Try to get price from aria-label or data attributes
                    aria = a.get_attribute("aria-label") or ""
                    price = _parse_price(aria) or _parse_price(txt)

                    # Extract date from aria-label or nearby text
                    date_str = None
                    date_m = re.search(r"\d{1,2}/\d{1,2}/\d{2,4}", aria + " " + txt)
                    if date_m:
                        date_str = date_m.group(0)

                    # Clean title: first line / sentence only
                    title = txt.split("\n")[0].strip()[:140]

                    tags = enrich_tags_from_title(title, ["fever", "event", "experience"])

                    events.append(
                        normalize_event(
                            {
                                "title": title,
                                "description": f"Experiência no Fever São Paulo – {title}",
                                "venue": "Sao Paulo",
                                "city": "Sao Paulo",
                                "date": date_str,
                                "price": price,
                                "category": "cultural",
                                "tags": tags,
                                "url": full_href,
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
