import { NextResponse } from "next/server";
import { execSync } from "child_process";

export async function GET() {
  try {
    const result = execSync(
      `python -c "
try:
    from sgp4.api import Satrec
    sgp4 = True
except ImportError:
    sgp4 = False

try:
    from orbitgate.orbit_tle_fetcher import get_available_groups
    groups = True
except Exception:
    groups = False

import json
print(json.dumps({
    'status': 'ready',
    'version': 'v0.2',
    'phase': 'Phase 2 - SGP4 Real Propagation + Public TLE Evidence Pack',
    'sgp4_available': sgp4,
    'tle_fetcher_available': groups,
    'gates': [
        'TLEGate', 'SGP4Gate', 'DeltaVGate', 'CollisionGate',
        'PowerGate', 'ThermalGate', 'CommsGate', 'DeorbitGate', 'CommandGate'
    ],
    'new_features': [
        'Real SGP4 propagation with ground track',
        'CelesTrak public TLE fetching',
        'TLE Evidence Pack generation',
        'Propagation visualizer',
        'Altitude profile charts',
        'Orbital element extraction',
    ],
    'benchmark_cases': 160,
    'flight_certified': False,
    'real_spacecraft_control': False,
}))"`,
      { cwd: "/home/z/my-project", timeout: 15000, encoding: "utf-8" }
    );
    return NextResponse.json(JSON.parse(result));
  } catch {
    return NextResponse.json({
      status: "degraded",
      version: "v0.2",
      sgp4_available: false,
      tle_fetcher_available: false,
      gates: [
        "TLEGate", "SGP4Gate", "DeltaVGate", "CollisionGate",
        "PowerGate", "ThermalGate", "CommsGate", "DeorbitGate", "CommandGate"
      ],
      benchmark_cases: 160,
      flight_certified: false,
      real_spacecraft_control: false,
    });
  }
}
