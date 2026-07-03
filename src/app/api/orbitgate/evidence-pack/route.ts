import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import { writeFileSync, unlinkSync } from "fs";
import { tmpdir } from "os";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { entries, include_propagation, duration_min, step_min } = body;

    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json(
        { success: false, error: "entries array is required" },
        { status: 400 }
      );
    }

    // Limit to 5 entries max for evidence pack generation (performance)
    const limitedEntries = entries.slice(0, 5);
    const includeProp = include_propagation !== false;
    const duration = duration_min || 100;
    const step = step_min || 2;

    // Write entries to temp file to avoid shell string escaping issues
    const tmpFile = `${tmpdir()}/orbitgate_ep_${Date.now()}.json`;
    writeFileSync(tmpFile, JSON.stringify(limitedEntries), "utf-8");

    try {
      const result = execSync(
        `python -c "
from orbitgate.orbit_tle_fetcher import generate_evidence_pack
import json
with open('${tmpFile}') as f:
    entries = json.load(f)
pack = generate_evidence_pack(
    entries=entries,
    include_propagation=${includeProp ? "True" : "False"},
    propagation_duration_min=${duration},
    propagation_step_min=${step},
)
print(json.dumps(pack))
"`,
        {
          cwd: "/home/z/my-project",
          timeout: 180000,
          encoding: "utf-8",
          maxBuffer: 100 * 1024 * 1024,
        }
      );

      return NextResponse.json({ success: true, data: JSON.parse(result) });
    } finally {
      try { unlinkSync(tmpFile); } catch {}
    }
  } catch (error: unknown) {
    const err = error as { stdout?: string; stderr?: string; message?: string };
    return NextResponse.json(
      { success: false, error: err.stderr || err.message || "Unknown error" },
      { status: 500 }
    );
  }
}