import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import { writeFileSync, unlinkSync } from "fs";
import { tmpdir } from "os";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { line1, line2, duration_min, step_min, name, source, claim_text } = body;

    if (!line1 || !line2) {
      return NextResponse.json(
        { success: false, error: "line1 and line2 (TLE) are required" },
        { status: 400 }
      );
    }

    const duration = duration_min || 100;
    const step = step_min || 1;

    // Write params to temp file to avoid shell string escaping issues
    const params = {
      line1,
      line2,
      duration_min: duration,
      step_min: step,
      name: name || "",
      source: source || "",
      claim_text: claim_text || "",
    };
    const tmpFile = `${tmpdir()}/orbitgate_prop_${Date.now()}.json`;
    writeFileSync(tmpFile, JSON.stringify(params), "utf-8");

    try {
      const useVerify = !!claim_text;
      const result = execSync(
        `python -c "
import json
with open('${tmpFile}') as f:
    p = json.load(f)
${useVerify
  ? `from orbitgate.orbit_propagator import propagate_and_verify
r = propagate_and_verify(p['line1'], p['line2'], p['claim_text'], p['duration_min'], p['step_min'], p['name'], p['source'])`
  : `from orbitgate.orbit_propagator import propagate_tle
r = propagate_tle(p['line1'], p['line2'], p['duration_min'], p['step_min'], p['name'], p['source'])
r = r.to_dict()`}
print(json.dumps(r))
"`,
        {
          cwd: "/home/z/my-project",
          timeout: 60000,
          encoding: "utf-8",
          maxBuffer: 50 * 1024 * 1024,
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