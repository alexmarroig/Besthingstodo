import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CURATED_PATH = ROOT / "packages" / "catalog" / "data" / "curated-editorial.sao-paulo.json"
EXTENSIONS_PATH = ROOT / "packages" / "catalog" / "data" / "editorial-extensions.sao-paulo.json"
OFFICIAL_PATH = ROOT / "packages" / "catalog" / "data" / "official-sources.json"
COMPAT_PATH = ROOT / "scripts" / "curated_sao_paulo_catalog.json"

VALID_DOMAINS = {"dining_out", "delivery", "movies_series", "events_exhibitions"}
VALID_TIERS = {"signature", "curated", "discovery"}
VALID_AVAILABILITY = {"venue", "delivery", "streaming", "event"}
VALID_INDOOR = {"indoor", "outdoor", "mixed"}


def _read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def _normalize(value: str) -> str:
    return " ".join((value or "").strip().lower().split())


def _fingerprint(row: dict) -> str:
    slug = _normalize(str(row.get("slug", "")))
    title = _normalize(str(row.get("title", "")))
    location = _normalize(str(row.get("location", "")))
    return f"{slug}::{title}::{location}"


def load_curated_catalog() -> list[dict]:
    rows = []
    for path in [CURATED_PATH, EXTENSIONS_PATH]:
        payload = _read_json(path)
        if not isinstance(payload, list):
            raise ValueError(f"Curated catalog file must be a list: {path}")
        rows.extend(payload)
    return rows


def load_official_sources() -> list[dict]:
    rows = _read_json(OFFICIAL_PATH)
    if not isinstance(rows, list):
        raise ValueError("Official sources must be a list")
    return rows


def dedupe_catalog(rows: list[dict]) -> list[dict]:
    deduped: list[dict] = []
    seen: set[str] = set()
    for row in rows:
        key = _fingerprint(row)
        if not key or key in seen:
            continue
        seen.add(key)
        deduped.append(row)
    return deduped


def validate_catalog(rows: list[dict], sources: list[dict]) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    official_names = {_normalize(str(source.get("name", ""))) for source in sources}
    official_editorial_sources = {_normalize(str(source.get("editorial_source", ""))) for source in sources}
    seen: dict[str, int] = {}

    for index, row in enumerate(rows, start=1):
        label = row.get("title") or f"row-{index}"
        for field in ["title", "slug", "description", "category", "domain", "city", "location", "tags"]:
            if row.get(field) in (None, "", []):
                errors.append(f"{label}: missing required field '{field}'")

        domain = str(row.get("domain", ""))
        if domain not in VALID_DOMAINS:
            errors.append(f"{label}: invalid domain '{domain}'")

        tier = row.get("content_tier")
        if tier and tier not in VALID_TIERS:
            errors.append(f"{label}: invalid content_tier '{tier}'")

        availability = row.get("availability_kind")
        if availability and availability not in VALID_AVAILABILITY:
            errors.append(f"{label}: invalid availability_kind '{availability}'")

        indoor = row.get("indoor_outdoor")
        if indoor and indoor not in VALID_INDOOR:
            errors.append(f"{label}: invalid indoor_outdoor '{indoor}'")

        quality = row.get("quality_score")
        if quality is not None and not (0 <= float(quality) <= 100):
            errors.append(f"{label}: quality_score must stay between 0 and 100")

        if not isinstance(row.get("tags", []), list):
            errors.append(f"{label}: tags must be a list")

        editorial_source = _normalize(str(row.get("editorial_source", "")))
        if editorial_source and editorial_source not in official_names and editorial_source not in official_editorial_sources:
            warnings.append(f"{label}: editorial_source '{row['editorial_source']}' is not listed in official-sources.json")

        key = _fingerprint(row)
        seen[key] = seen.get(key, 0) + 1

    for key, count in seen.items():
        if count > 1:
            errors.append(f"duplicate catalog fingerprint '{key}' appears {count} times")

    return errors, warnings


def refresh_catalog() -> None:
    rows = dedupe_catalog(load_curated_catalog())
    COMPAT_PATH.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"refreshed_compat_catalog rows={len(rows)} path={COMPAT_PATH}")


def print_stats(rows: list[dict]) -> None:
    by_domain: dict[str, int] = {}
    for row in rows:
        domain = str(row.get("domain", "unknown"))
        by_domain[domain] = by_domain.get(domain, 0) + 1
    print(f"catalog_rows={len(rows)}")
    for domain, total in sorted(by_domain.items()):
        print(f"domain[{domain}]={total}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate and refresh the canonical Sao Paulo catalog")
    parser.add_argument("command", choices=["validate", "refresh"])
    args = parser.parse_args()

    rows = load_curated_catalog()
    sources = load_official_sources()
    errors, warnings = validate_catalog(rows, sources)

    for warning in warnings:
        print(f"warning: {warning}")

    if errors:
        for error in errors:
            print(f"error: {error}")
        raise SystemExit(1)

    if args.command == "refresh":
        refresh_catalog()

    print_stats(dedupe_catalog(rows))


if __name__ == "__main__":
    main()
