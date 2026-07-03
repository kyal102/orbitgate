"""OrbitGate TLE Fetcher — fetches real TLE data from CelesTrak public API."""

import json
import hashlib
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field, asdict
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError
import time
import os


CELESTRAK_BASE = "https://celestrak.org/NORAD/elements/gp.php"
CELESTRAK_CATALOG = "https://celestrak.org/satcat/satcat.csv"

# Pre-defined CelesTrak groups for quick access
CELESTRAK_GROUPS = {
    "active": "active",
    "space-station": "stations",
    "visual-bright": "visual",
    "starlink": "starlink",
    "gps-ops": "gps-ops",
    "glonass-ops": "glo-ops",
    "galileo": "galileo",
    "iridium": "iridium",
    "noaa": "noaa",
    "goes": "goes",
    "one-web": "oneweb",
    "resource": "resource",
    "science": "science",
    "weather": "weather",
    "cubesat": "cubesat",
    "education": "education",
    "amateur": "amateur",
    "radar": "radar",
    "x-comm": "x-comm",
    "other-comm": "other-comm",
    "geo": "geo",
    "tle-new": "tle-new",
}


# Popular satellites with their NORAD IDs for quick lookup
POPULAR_SATELLITES = [
    {"norad_id": "25544", "name": "ISS (ZARYA)", "group": "space-station"},
    {"norad_id": "48274", "name": "STARLINK-1007", "group": "starlink"},
    {"norad_id": "43205", "name": "HUBBLE", "group": "active"},
    {"norad_id": "25338", "name": "NOAA 19", "group": "noaa"},
    {"norad_id": "41866", "name": "NOAA 20", "group": "noaa"},
    {"norad_id": "33591", "name": "GOES 15", "group": "goes"},
    {"norad_id": "36411", "name": "GOES 16", "group": "goes"},
    {"norad_id": "41867", "name": "GOES 17", "group": "goes"},
    {"norad_id": "54224", "name": "GOES 18", "group": "goes"},
    {"norad_id": "29476", "name": "IRIDIUM 79", "group": "iridium"},
    {"norad_id": "37836", "name": "IRIDIUM 148", "group": "iridium"},
    {"norad_id": "48862", "name": "STARLINK-30000", "group": "starlink"},
    {"norad_id": "41765", "name": "GPS BIIR-2 (PRN 13)", "group": "gps-ops"},
    {"norad_id": "43010", "name": "GLONASS-M 44", "group": "glonass-ops"},
    {"norad_id": "40538", "name": "GALILEO-FOC FM11", "group": "galileo"},
    {"norad_id": "58070", "name": "TDRS 13", "group": "active"},
    {"norad_id": "37348", "name": "TIANGONG 1", "group": "active"},
    {"norad_id": "48274", "name": "STARLINK-1007", "group": "starlink"},
]


# Simple in-memory cache
_tle_cache: Dict[str, Dict[str, Any]] = {}
_cache_ttl_seconds = 300  # 5 minutes


@dataclass
class TLEEntry:
    """A single TLE entry with metadata."""
    name: str = ""
    line1: str = ""
    line2: str = ""
    norad_id: str = ""
    source: str = ""
    fetched_at: str = ""
    epoch: str = ""

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class TLEFetchResult:
    """Result of a TLE fetch operation."""
    success: bool = False
    entries: List[Dict[str, Any]] = field(default_factory=list)
    total_count: int = 0
    source: str = ""
    query: str = ""
    error: str = ""
    fetched_at: str = ""
    cache_hit: bool = False

    def to_dict(self) -> dict:
        d = asdict(self)
        d["_entry_count"] = len(self.entries)
        return d


def _http_get(url: str, timeout: int = 5) -> str:
    """Simple HTTP GET with user agent."""
    req = Request(url, headers={
        "User-Agent": "OrbitGate/0.2.0 (Research Prototype; orbit-verification-tool)"
    })
    with urlopen(req, timeout=timeout) as resp:
        return resp.read().decode("utf-8", errors="replace")


def _parse_tle_text(text: str, source: str = "") -> List[TLEEntry]:
    """Parse 3-line TLE format (name, line1, line2)."""
    entries = []
    lines = [l.rstrip() for l in text.strip().splitlines() if l.strip()]
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    i = 0
    while i < len(lines):
        # Try 3-line format first (name + 2 TLE lines)
        if i + 2 < len(lines):
            l1 = lines[i + 1]
            l2 = lines[i + 2]
            if l1.startswith("1 ") and l2.startswith("2 "):
                name = lines[i]
                try:
                    norad = l1[2:7].strip()
                    epoch = l1[18:32].strip()
                except (IndexError, ValueError):
                    norad = ""
                    epoch = ""
                entries.append(TLEEntry(
                    name=name,
                    line1=l1,
                    line2=l2,
                    norad_id=norad,
                    source=source,
                    fetched_at=now,
                    epoch=epoch,
                ))
                i += 3
                continue

        # Try 2-line format (line1, line2)
        if i + 1 < len(lines):
            l1 = lines[i]
            l2 = lines[i + 1]
            if l1.startswith("1 ") and l2.startswith("2 "):
                try:
                    norad = l1[2:7].strip()
                    epoch = l1[18:32].strip()
                except (IndexError, ValueError):
                    norad = ""
                    epoch = ""
                entries.append(TLEEntry(
                    name="",
                    line1=l1,
                    line2=l2,
                    norad_id=norad,
                    source=source,
                    fetched_at=now,
                    epoch=epoch,
                ))
                i += 2
                continue

        i += 1

    return entries


def _cache_key(url: str) -> str:
    return hashlib.sha256(url.encode()).hexdigest()[:12]


def fetch_tle_group(group: str, format: str = "tle") -> TLEFetchResult:
    """Fetch TLE data for a CelesTrak group.

    Falls back to bundled data if CelesTrak is unreachable.

    Args:
        group: CelesTrak group name (e.g. 'active', 'stations', 'starlink')
        format: 'tle' for 3-line format, 'json' for JSON format

    Returns:
        TLEFetchResult with parsed TLE entries
    """
    group_key = CELESTRAK_GROUPS.get(group, group)
    url = f"{CELESTRAK_BASE}?GROUP={group_key}&FORMAT={format}"
    result = _fetch_tle_url(url, query=f"group:{group}", source="celestrak")

    # Fallback to bundled data if network failed
    if not result.success and result.error:
        from .orbit_bundled_tle import get_all_bundled, BUNDLED_CATALOG
        bundled = get_all_bundled()
        if bundled:
            now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            return TLEFetchResult(
                success=True,
                entries=bundled,
                total_count=len(bundled),
                source="bundled (CelesTrak unreachable)",
                query=f"group:{group}",
                fetched_at=now,
            )

    return result


def fetch_tle_by_norad(norad_id: str) -> TLEFetchResult:
    """Fetch TLE for a specific NORAD ID.

    Falls back to bundled data if CelesTrak is unreachable.

    Args:
        norad_id: NORAD catalog number (e.g. '25544' for ISS)

    Returns:
        TLEFetchResult with parsed TLE entries
    """
    url = f"{CELESTRAK_BASE}?CATNR={norad_id}&FORMAT=tle"
    result = _fetch_tle_url(url, query=f"norad:{norad_id}", source="celestrak")

    # Fallback to bundled data
    if not result.success:
        from .orbit_bundled_tle import get_bundled_tle
        bundled = get_bundled_tle(norad_id)
        if bundled:
            now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            return TLEFetchResult(
                success=True,
                entries=[bundled],
                total_count=1,
                source="bundled (CelesTrak unreachable)",
                query=f"norad:{norad_id}",
                fetched_at=now,
            )

    return result


def fetch_tle_by_name_search(name_query: str) -> TLEFetchResult:
    """Search for satellites by name.

    Searches bundled catalog first, then falls back to CelesTrak.

    Args:
        name_query: Search query (case-insensitive)

    Returns:
        TLEFetchResult with matching entries
    """
    query_lower = name_query.lower().strip()
    if not query_lower:
        return TLEFetchResult(query=name_query, error="Empty query")

    # Always search bundled first (fast, no network)
    from .orbit_bundled_tle import search_bundled
    bundled_results = search_bundled(name_query)

    if bundled_results:
        now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        return TLEFetchResult(
            success=True,
            entries=bundled_results,
            total_count=len(bundled_results),
            source="bundled",
            query=name_query,
            fetched_at=now,
        )

    # Try CelesTrak if no bundled match
    matches = [
        sat for sat in POPULAR_SATELLITES
        if query_lower in sat["name"].lower() or query_lower in sat.get("norad_id", "")
    ]

    if matches:
        group = matches[0].get("group", "active")
        group_result = fetch_tle_group(group)
        if group_result.success:
            filtered = [
                e for e in group_result.entries
                if query_lower in e["name"].lower() or query_lower in e.get("norad_id", "")
            ][:20]
            if filtered:
                return TLEFetchResult(
                    success=True,
                    entries=filtered,
                    total_count=len(filtered),
                    source=group_result.source,
                    query=name_query,
                    fetched_at=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                )

    return TLEFetchResult(
        query=name_query,
        error=f"No matches for '{name_query}' in bundled catalog."
    )


def get_available_groups() -> List[Dict[str, str]]:
    """Get list of available CelesTrak groups."""
    return [
        {"id": k, "label": k.replace("-", " ").title(), "key": v}
        for k, v in CELESTRAK_GROUPS.items()
    ]


def get_popular_satellites() -> List[Dict[str, str]]:
    """Get list of popular satellites for quick access. Includes bundled catalog."""
    from .orbit_bundled_tle import BUNDLED_CATALOG
    seen = set()
    result = []
    for s in POPULAR_SATELLITES + BUNDLED_CATALOG:
        nid = s.get("norad_id", "")
        if nid not in seen:
            seen.add(nid)
            result.append({
                "norad_id": nid,
                "name": s["name"],
                "group": s.get("group", ""),
                "regime": s.get("regime", ""),
            })
    return result


def _fetch_tle_url(url: str, query: str = "", source: str = "") -> TLEFetchResult:
    """Fetch TLE data from a URL with caching."""
    ck = _cache_key(url)

    # Check cache
    if ck in _tle_cache:
        cached = _tle_cache[ck]
        if time.time() - cached["_ts"] < _cache_ttl_seconds:
            result = TLEFetchResult(
                success=True,
                entries=cached["entries"],
                total_count=len(cached["entries"]),
                source=source,
                query=query,
                fetched_at=cached["fetched_at"],
                cache_hit=True,
            )
            return result

    try:
        text = _http_get(url)
        entries = _parse_tle_text(text, source)

        now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

        # Update cache
        _tle_cache[ck] = {
            "entries": [e.to_dict() for e in entries],
            "fetched_at": now,
            "_ts": time.time(),
        }

        return TLEFetchResult(
            success=len(entries) > 0,
            entries=[e.to_dict() for e in entries],
            total_count=len(entries),
            source=source,
            query=query,
            fetched_at=now,
        )

    except HTTPError as exc:
        return TLEFetchResult(
            query=query,
            error=f"HTTP {exc.code}: {exc.reason}"
        )
    except URLError as exc:
        return TLEFetchResult(
            query=query,
            error=f"Network error: {exc.reason}"
        )
    except Exception as exc:
        return TLEFetchResult(
            query=query,
            error=f"Fetch failed: {exc}"
        )


def generate_evidence_pack(
    entries: List[Dict[str, Any]],
    include_propagation: bool = True,
    propagation_duration_min: float = 100.0,
    propagation_step_min: float = 1.0,
) -> Dict[str, Any]:
    """Generate a complete TLE Evidence Pack.

    Args:
        entries: List of TLE entry dicts (from TLEFetchResult)
        include_propagation: Whether to include SGP4 propagation data
        propagation_duration_min: Duration for each propagation
        propagation_step_min: Step size for propagation

    Returns:
        Evidence pack dict
    """
    from .orbit_propagator import propagate_tle
    from .orbit_parser import parse_tle

    pack = {
        "pack_type": "OrbitGate_TLE_Evidence_Pack",
        "version": "0.2.0",
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "disclaimer": "RESEARCH PROTOTYPE — Not flight certified. Not for mission-critical decisions.",
        "total_entries": len(entries),
        "sgp4_available": _sgp4_status(),
        "entries": [],
    }

    for entry in entries:
        pack_entry = {
            "name": entry.get("name", ""),
            "norad_id": entry.get("norad_id", ""),
            "source": entry.get("source", ""),
            "tle": {
                "line1": entry.get("line1", ""),
                "line2": entry.get("line2", ""),
                "epoch": entry.get("epoch", ""),
            },
            "tle_validation": parse_tle(
                entry.get("line1", "") + "\n" + entry.get("line2", "")
            ),
            "propagation": None,
        }

        if include_propagation and entry.get("line1") and entry.get("line2"):
            prop = propagate_tle(
                entry["line1"],
                entry["line2"],
                duration_min=propagation_duration_min,
                step_min=propagation_step_min,
                name=entry.get("name", ""),
                source=entry.get("source", ""),
            )
            # Include summary + first/last 10 points for display
            prop_dict = prop.to_dict()
            if prop_dict.get("points") and len(prop_dict["points"]) > 20:
                prop_dict["_display_points"] = {
                    "first_10": prop_dict["points"][:10],
                    "last_10": prop_dict["points"][-10:],
                }
            pack_entry["propagation"] = prop_dict

        pack["entries"].append(pack_entry)

    # Compute pack hash
    pack_str = json.dumps({
        "entries": len(entries),
        "generated_at": pack["generated_at"],
        "sgp4_available": pack["sgp4_available"],
    }, sort_keys=True)
    pack["pack_hash"] = hashlib.sha256(pack_str.encode()).hexdigest()[:24]

    return pack


def _sgp4_status() -> bool:
    try:
        from sgp4.api import Satrec
        return True
    except ImportError:
        return False
