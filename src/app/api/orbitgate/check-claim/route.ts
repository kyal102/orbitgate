import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import { writeFileSync, unlinkSync } from "fs";
import { tmpdir } from "os";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const claim = body.claim;

    if (!claim || typeof claim !== "string" || claim.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Claim text is required" },
        { status: 400 }
      );
    }

    // Write claim to temp file to avoid shell escaping issues
    const tmpFile = `${tmpdir()}/orbitgate_claim_${Date.now()}.txt`;
    writeFileSync(tmpFile, claim.trim(), "utf-8");

    try {
      const result = execSync(
        `python -c "
import json, sys
sys.path.insert(0, '.')
from orbitgate.orbit_router import OrbitRouter
from orbitgate.orbit_types import GateResult
router = OrbitRouter()
with open('${tmpFile}') as f:
    claim_text = f.read().strip()
result = router.route(claim_text)
# Convert to dict
if hasattr(result, 'model_dump'):
    d = result.model_dump()
elif hasattr(result, '__dict__'):
    d = result.__dict__
else:
    d = {'decision': str(result)}
d['claim'] = claim_text
# Normalize evidence to array of strings
ev = d.get('evidence', [])
if isinstance(ev, dict):
    d['evidence'] = [k + ': ' + (', '.join(str(x) for x in v) if isinstance(v, list) else str(v)) for k, v in ev.items()]
elif not isinstance(ev, list):
    d['evidence'] = []
# Normalize missing_evidence
me = d.get('missing_evidence', [])
if not isinstance(me, list):
    d['missing_evidence'] = []
# Remove internal fields not needed by frontend
for key in ['passing', 'total', 'claim_type', 'risk_label', 'limitations']:
    d.pop(key, None)
if 'timestamp' not in d:
    from datetime import datetime, timezone
    d['timestamp'] = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
if 'evidence' not in d:
    d['evidence'] = []
if 'missing_evidence' not in d:
    d['missing_evidence'] = []
print(json.dumps(d))
"`,
        {
          cwd: "/home/z/my-project",
          timeout: 30000,
          encoding: "utf-8",
          stdio: ["pipe", "pipe", "pipe"],
          maxBuffer: 10 * 1024 * 1024,
        }
      );

      const data = JSON.parse(result.trim());
      return NextResponse.json({ success: true, data });
    } catch (error: unknown) {
      const err = error as { stderr?: string; message?: string; stdout?: string };
      const stderr = (err.stderr || "").trim();
      const msg = stderr || err.message || "Unknown error";

      // Log the error for debugging but don't expose internals
      console.error("[check-claim] Python error:", msg.slice(0, 500));

      // Return a meaningful fallback instead of mock
      return NextResponse.json({
        success: true,
        data: {
          claim: claim.trim(),
          decision: "NEEDS_REVIEW",
          gate: "RouterError",
          risk_label: "INSUFFICIENT_DATA",
          reason: "Verification pipeline encountered an error. Claim requires manual review.",
          evidence: [],
          missing_evidence: ["Automated gate evaluation failed"],
          timestamp: new Date().toISOString(),
        },
        error_fallback: true,
        error_detail: msg.slice(0, 200),
      });
    } finally {
      try { unlinkSync(tmpFile); } catch {}
    }
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request" },
      { status: 400 }
    );
  }
}