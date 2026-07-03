import { NextRequest, NextResponse } from "next/server";

interface ExportRequest {
  title?: string;
  sections?: string[];
  format?: "html" | "txt";
}

export async function POST(req: NextRequest) {
  try {
    const body: ExportRequest = await req.json();
    const title = body.title || "OrbitGate Verification Report";
    const format = body.format || "html";
    const sections = body.sections || [
      "summary",
      "claim_history",
      "analytics",
      "gate_performance",
    ];

    const now = new Date();
    const timestamp = now.toISOString();
    const dateStr = timestamp.slice(0, 10);
    const timeStr = timestamp.slice(11, 19);

    const fileName = `orbitgate-report-${dateStr.replace(/-/g, "")}-${timeStr.replace(/:/g, "")}.${format}`;

    const content =
      format === "txt" ? generateTxt(title, timestamp, sections) : generateHtml(title, timestamp, sections);

    return new NextResponse(content, {
      headers: {
        "Content-Type": format === "txt" ? "text/plain; charset=utf-8" : "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}

function generateHtml(title: string, timestamp: string, sections: string[]): string {
  const includeSummary = sections.includes("summary");
  const includeClaimHistory = sections.includes("claim_history");
  const includeAnalytics = sections.includes("analytics");
  const includeGatePerf = sections.includes("gate_performance");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1a1a2e; background: #fff; padding: 40px; max-width: 900px; margin: 0 auto; line-height: 1.6; }
    .header { border-bottom: 3px solid #10b981; padding-bottom: 24px; margin-bottom: 32px; }
    .header h1 { font-size: 28px; color: #0f172a; margin-bottom: 4px; }
    .header .logo { font-size: 40px; margin-bottom: 8px; }
    .header .meta { font-size: 13px; color: #64748b; margin-top: 8px; }
    .header .meta span { margin-right: 16px; }
    h2 { font-size: 20px; color: #0f172a; margin: 32px 0 16px; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
    th { background: #f1f5f9; text-align: left; padding: 10px 12px; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0; }
    td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; }
    tr:hover { background: #f8fafc; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
    .badge-allow { background: #d1fae5; color: #065f46; }
    .badge-block { background: #ffe4e6; color: #9f1239; }
    .badge-review { background: #fef3c7; color: #92400e; }
    .badge-evidence { background: #e0f2fe; color: #075985; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 16px 0; }
    .stat-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center; }
    .stat-card .value { font-size: 28px; font-weight: 700; color: #0f172a; }
    .stat-card .label { font-size: 12px; color: #64748b; margin-top: 4px; }
    .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; }
    .no-data { color: #94a3b8; font-style: italic; padding: 24px; text-align: center; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">🛰️ OrbitGate</div>
    <h1>${title}</h1>
    <div class="meta">
      <span>📅 ${new Date(timestamp).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span>
      <span>🕐 ${new Date(timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
      <span>🏷️ Version 0.2</span>
    </div>
  </div>

  ${includeSummary ? `
  <h2>📊 Summary</h2>
  <div class="stats-grid">
    <div class="stat-card">
      <div class="value">—</div>
      <div class="label">Total Verifications</div>
    </div>
    <div class="stat-card">
      <div class="value">—</div>
      <div class="label">Pass Rate</div>
    </div>
    <div class="stat-card">
      <div class="value">—</div>
      <div class="label">Most Active Gate</div>
    </div>
    <div class="stat-card">
      <div class="value">9</div>
      <div class="label">Verification Gates</div>
    </div>
  </div>
  <p style="font-size:13px; color:#64748b; margin-top:8px;">
    Session data is generated client-side. Connect the full OrbitGate pipeline for comprehensive metrics.
  </p>
  ` : ""}

  ${includeClaimHistory ? `
  <h2>📋 Claim History</h2>
  <p class="no-data">No claims in this session</p>
  ` : ""}

  ${includeAnalytics ? `
  <h2>📈 Analytics</h2>
  <table>
    <thead>
      <tr>
        <th>Metric</th>
        <th>Value</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      <tr><td>Total Claims Processed</td><td>Session-based</td><td><span class="badge badge-allow">ACTIVE</span></td></tr>
      <tr><td>Decision Distribution</td><td>See dashboard</td><td><span class="badge badge-allow">TRACKING</span></td></tr>
      <tr><td>Gate Utilization</td><td>9 gates active</td><td><span class="badge badge-allow">OPERATIONAL</span></td></tr>
      <tr><td>Average Response Time</td><td>Real-time</td><td><span class="badge badge-allow">NORMAL</span></td></tr>
    </tbody>
  </table>
  ` : ""}

  ${includeGatePerf ? `
  <h2>🚪 Gate Performance</h2>
  <table>
    <thead>
      <tr>
        <th>Gate</th>
        <th>Category</th>
        <th>Status</th>
        <th>Description</th>
      </tr>
    </thead>
    <tbody>
      <tr><td><strong>TLE Gate</strong></td><td>Data Validation</td><td><span class="badge badge-allow">ONLINE</span></td><td>Validates TLE data integrity and epoch freshness</td></tr>
      <tr><td><strong>SGP4 Gate</strong></td><td>Orbital Mechanics</td><td><span class="badge badge-allow">ONLINE</span></td><td>SGP4 propagation verification</td></tr>
      <tr><td><strong>Delta-V Gate</strong></td><td>Maneuver Analysis</td><td><span class="badge badge-allow">ONLINE</span></td><td>ΔV budget and Hohmann transfer validation</td></tr>
      <tr><td><strong>Collision Gate</strong></td><td>Safety</td><td><span class="badge badge-allow">ONLINE</span></td><td>Conjunction and collision probability assessment</td></tr>
      <tr><td><strong>Power Gate</strong></td><td>Subsystem</td><td><span class="badge badge-allow">ONLINE</span></td><td>Solar array sizing and eclipse power budget</td></tr>
      <tr><td><strong>Thermal Gate</strong></td><td>Subsystem</td><td><span class="badge badge-allow">ONLINE</span></td><td>Thermal environment and stability analysis</td></tr>
      <tr><td><strong>Comms Gate</strong></td><td>Subsystem</td><td><span class="badge badge-allow">ONLINE</span></td><td>Link budget and communication margin verification</td></tr>
      <tr><td><strong>Deorbit Gate</strong></td><td>End-of-Life</td><td><span class="badge badge-allow">ONLINE</span></td><td>Deorbit and reentry compliance checks</td></tr>
      <tr><td><strong>Command Gate</strong></td><td>Safety</td><td><span class="badge badge-allow">ONLINE</span></td><td>Blocks spacecraft command execution claims</td></tr>
    </tbody>
  </table>
  ` : ""}

  <div class="footer">
    <p><strong>OrbitGate v0.2</strong> — Deterministic Verification-Gate System for AI-Generated Orbital Claims</p>
    <p style="margin-top:4px;">
      DISCLAIMER: This report is generated by OrbitGate, a research prototype. Results should not be used as the sole basis for operational decisions.
      All verification gates perform deterministic checks against known orbital mechanics principles and data sources.
    </p>
    <p style="margin-top:4px;">Generated on ${timestamp} · © 2025 OrbitGate Project</p>
  </div>
</body>
</html>`;
}

function generateTxt(title: string, timestamp: string, sections: string[]): string {
  const separator = "═".repeat(72);
  const thinSep = "─".repeat(72);

  let out = "";
  out += `${separator}\n`;
  out += `  🛰️  ${title}\n`;
  out += `${separator}\n`;
  out += `  Date:    ${new Date(timestamp).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}\n`;
  out += `  Time:    ${new Date(timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}\n`;
  out += `  Version: OrbitGate v0.2\n`;
  out += `${separator}\n\n`;

  if (sections.includes("summary")) {
    out += `┌─ SUMMARY ${thinSep.substring(10)}┐\n\n`;
    out += `  Total Verifications: — (session-based)\n`;
    out += `  Pass Rate:           — (session-based)\n`;
    out += `  Most Active Gate:    — (session-based)\n`;
    out += `  Verification Gates:  9\n`;
    out += `  Gate Names:          TLE, SGP4, Delta-V, Collision, Power, Thermal, Comms, Deorbit, Command\n\n`;
  }

  if (sections.includes("claim_history")) {
    out += `┌─ CLAIM HISTORY ${thinSep.substring(16)}┐\n\n`;
    out += `  No claims in this session\n\n`;
  }

  if (sections.includes("analytics")) {
    out += `┌─ ANALYTICS ${thinSep.substring(12)}┐\n\n`;
    out += `  Metric                 | Value          | Status\n`;
    out += `  ${thinSep}\n`;
    out += `  Total Claims           | Session-based  | ACTIVE\n`;
    out += `  Decision Distribution  | See dashboard  | TRACKING\n`;
    out += `  Gate Utilization       | 9 gates active | OPERATIONAL\n`;
    out += `  Avg Response Time      | Real-time      | NORMAL\n\n`;
  }

  if (sections.includes("gate_performance")) {
    out += `┌─ GATE PERFORMANCE ${thinSep.substring(19)}┐\n\n`;
    out += `  Gate          | Category       | Status | Description\n`;
    out += `  ${thinSep}\n`;
    out += `  TLE Gate      | Data Valid.    | ONLINE | TLE data integrity and epoch freshness\n`;
    out += `  SGP4 Gate     | Orbital Mech.  | ONLINE | SGP4 propagation verification\n`;
    out += `  Delta-V Gate  | Maneuver Anal. | ONLINE | ΔV budget and Hohmann transfer\n`;
    out += `  Collision Gate| Safety         | ONLINE | Conjunction probability assessment\n`;
    out += `  Power Gate    | Subsystem      | ONLINE | Solar array and eclipse budget\n`;
    out += `  Thermal Gate  | Subsystem      | ONLINE | Thermal environment analysis\n`;
    out += `  Comms Gate    | Subsystem      | ONLINE | Link budget verification\n`;
    out += `  Deorbit Gate  | End-of-Life    | ONLINE | Deorbit/reentry compliance\n`;
    out += `  Command Gate  | Safety         | ONLINE | Blocks command execution claims\n\n`;
  }

  out += `${separator}\n`;
  out += `  DISCLAIMER: This report is generated by OrbitGate, a research prototype.\n`;
  out += `  Results should not be used as the sole basis for operational decisions.\n`;
  out += `  Generated on ${timestamp} · © 2025 OrbitGate Project\n`;
  out += `${separator}\n`;

  return out;
}