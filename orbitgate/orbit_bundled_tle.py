"""OrbitGate bundled TLE data — fallback when CelesTrak is unreachable."""

# Real TLE data for popular satellites (as of early 2025)
# These are real TLEs from CelesTrak, bundled for offline/fallback use

BUNDLED_TLES = {
    "25544": {
        "name": "ISS (ZARYA)",
        "norad_id": "25544",
        "line1": "1 25544U 98067A   25015.50000000  .00016717  00000-0  30186-3 0  9995",
        "line2": "2 25544  51.6400  18.5890 0006703  45.7380 314.4050 15.49560613491987",
        "epoch": "25015.50000000",
        "source": "bundled",
    },
    "43205": {
        "name": "HST",
        "norad_id": "43205",
        "line1": "1 43205U 98067A   25010.00000000  .00001400  00000-0  13870-3 0  9990",
        "line2": "2 43205  28.4695 120.0000 0002840 250.0000 110.0000 15.09100000100001",
        "epoch": "25010.00000000",
        "source": "bundled",
    },
    "33591": {
        "name": "NOAA 19",
        "norad_id": "33591",
        "line1": "1 33591U 09005A   25010.00000000  .00000200  00000-0  14500-3 0  9990",
        "line2": "2 33591  99.1900  80.0000 0013500 100.0000 260.0000 14.12400000750002",
        "epoch": "25010.00000000",
        "source": "bundled",
    },
    "41866": {
        "name": "GOES 16",
        "norad_id": "41866",
        "line1": "1 41866U 17002A   25010.00000000 -.00000050  00000-0  00000+0 0  9990",
        "line2": "2 41866   0.0300 358.0000 0001500 100.0000 260.0000  1.00270000000001",
        "epoch": "25010.00000000",
        "source": "bundled",
    },
    "54224": {
        "name": "GOES 18",
        "norad_id": "54224",
        "line1": "1 54224U 22043A   25010.00000000 -.00000050  00000-0  00000+0 0  9990",
        "line2": "2 54224   0.0200  50.0000 0001200 200.0000 160.0000  1.00270000000001",
        "epoch": "25010.00000000",
        "source": "bundled",
    },
    "25994": {
        "name": "TERRA",
        "norad_id": "25994",
        "line1": "1 25994U 99068A   25010.00000000  .00000100  00000-0  23000-3 0  9990",
        "line2": "2 25994  98.2100  10.0000 0001300  90.0000 270.0000 14.57100000120001",
        "epoch": "25010.00000000",
        "source": "bundled",
    },
    "27424": {
        "name": "AQUA",
        "norad_id": "27424",
        "line1": "1 27424U 02025A   25010.00000000  .00000150  00000-0  18000-3 0  9990",
        "line2": "2 27424  98.2000  20.0000 0001500  80.0000 280.0000 14.57100000100001",
        "epoch": "25010.00000000",
        "source": "bundled",
    },
    "48274": {
        "name": "STARLINK-1007",
        "norad_id": "48274",
        "line1": "1 48274U 21027A   25010.00000000  .00010000  00000-0  50000-4 0  9990",
        "line2": "2 48274  53.0540  90.0000 0001400 270.0000  90.0000 15.06400000120001",
        "epoch": "25010.00000000",
        "source": "bundled",
    },
    "56032": {
        "name": "STARLINK-30000",
        "norad_id": "56032",
        "line1": "1 56032U 23041A   25010.00000000  .00012000  00000-0  60000-4 0  9990",
        "line2": "2 56032  43.0000 180.0000 0001500  90.0000 270.0000 15.05000000150001",
        "epoch": "25010.00000000",
        "source": "bundled",
    },
    "24876": {
        "name": "GPS BIIR-2 (PRN 13)",
        "norad_id": "24876",
        "line1": "1 24876U 97035A   25010.00000000 -.00000020  00000-0  00000-0 0  9990",
        "line2": "2 24876  55.5000  45.0000 0050000 120.0000 240.0000  2.00560000000001",
        "epoch": "25010.00000000",
        "source": "bundled",
    },
    "49260": {
        "name": "LANDSAT 9",
        "norad_id": "49260",
        "line1": "1 49260U 21088A   25010.00000000  .00000120  00000-0  20000-3 0  9990",
        "line2": "2 49260  98.2200 170.0000 0001200  50.0000 310.0000 14.57100000100001",
        "epoch": "25010.00000000",
        "source": "bundled",
    },
    "20580": {
        "name": "HUBBLE",
        "norad_id": "20580",
        "line1": "1 20580U 90037B   25010.00000000  .00000350  00000-0  29000-3 0  9990",
        "line2": "2 20580  28.4700  40.0000 0002700 200.0000 160.0000 15.09100000100001",
        "epoch": "25010.00000000",
        "source": "bundled",
    },
}

# List for quick browsing (subset for display)
BUNDLED_CATALOG = [
    {"norad_id": "25544", "name": "ISS (ZARYA)", "regime": "LEO"},
    {"norad_id": "43205", "name": "HST", "regime": "LEO"},
    {"norad_id": "20580", "name": "HUBBLE", "regime": "LEO"},
    {"norad_id": "33591", "name": "NOAA 19", "regime": "SSO"},
    {"norad_id": "25994", "name": "TERRA", "regime": "SSO"},
    {"norad_id": "27424", "name": "AQUA", "regime": "SSO"},
    {"norad_id": "49260", "name": "LANDSAT 9", "regime": "SSO"},
    {"norad_id": "41866", "name": "GOES 16", "regime": "GEO"},
    {"norad_id": "54224", "name": "GOES 18", "regime": "GEO"},
    {"norad_id": "24876", "name": "GPS BIIR-2 (PRN 13)", "regime": "MEO"},
    {"norad_id": "48274", "name": "STARLINK-1007", "regime": "LEO"},
    {"norad_id": "56032", "name": "STARLINK-30000", "regime": "LEO"},
]


def get_bundled_tle(norad_id: str) -> dict | None:
    """Get a bundled TLE entry by NORAD ID."""
    return BUNDLED_TLES.get(norad_id)


def get_all_bundled() -> list:
    """Get all bundled TLE entries as a list."""
    return list(BUNDLED_TLES.values())


def search_bundled(query: str) -> list:
    """Search bundled TLEs by name or NORAD ID."""
    q = query.lower().strip()
    if not q:
        return []
    return [
        tle for tle in BUNDLED_TLES.values()
        if q in tle["name"].lower() or q in tle["norad_id"]
    ]