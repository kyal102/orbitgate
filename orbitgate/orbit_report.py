"""OrbitGate report generator: JSON and HTML reports."""

import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional


class ReportGenerator:
    """Generates JSON and HTML reports from gate results and benchmark data."""

    def __init__(self, results: Optional[List[Dict[str, Any]]] = None):
        self.results: List[Dict[str, Any]] = results or []

    def add_result(self, result: Dict[str, Any]) -> None:
        """Add a gate result to the report."""
        self.results.append(result)

    def generate_json_report(self, extra: Optional[Dict[str, Any]] = None) -> dict:
        """Generate a complete JSON report dict."""
        summary = self._compute_summary()

        blocked = [r for r in self.results if r.get("decision") == "BLOCK"]
        needs_review = [r for r in self.results if r.get("decision") == "NEEDS_REVIEW"]
        evidence_required = [r for r in self.results if r.get("decision") == "EVIDENCE_REQUIRED"]
        allowed = [r for r in self.results if r.get("decision") == "ALLOW"]

        report: Dict[str, Any] = {
            "report_title": "OrbitGate v0 Verification Report",
            "generated_at_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "executive_summary": {
                "total_claims": len(self.results),
                "allowed": len(allowed),
                "blocked": len(blocked),
                "needs_review": len(needs_review),
                "evidence_required": len(evidence_required),
                "unsupported": len([r for r in self.results if r.get("decision") == "UNSUPPORTED"]),
                "out_of_scope": len([r for r in self.results if r.get("decision") == "OUT_OF_SCOPE"]),
            },
            "what_orbitgate_is": [
                "OrbitGate is a public research prototype for deterministic checking of AI-generated orbital claims.",
                "It routes claims through typed verification gates that apply pattern-based, rule-based checks.",
                "It provides evidence records, replay verification, and structured reports.",
                "It is NOT a flight-certified tool, does not control real spacecraft, and does not replace mission control.",
            ],
            "what_orbitgate_is_not": [
                "OrbitGate does not guarantee orbital safety.",
                "OrbitGate does not control satellites.",
                "OrbitGate does not replace mission control, NASA, ESA, or any space agency.",
                "OrbitGate does not provide flight certification.",
                "OrbitGate does not prove regulatory compliance.",
                "OrbitGate is not production-ready for real mission operations.",
                "OrbitGate cannot autonomously command spacecraft.",
            ],
            "gate_results": self.results,
            "benchmark_summary": summary,
            "blocked_claims": [
                {
                    "case_id": r.get("case_id", ""),
                    "claim_text": r.get("claim_text", "")[:200],
                    "gate": r.get("gate", ""),
                    "reason": r.get("reason", ""),
                }
                for r in blocked
            ],
            "review_required_claims": [
                {
                    "case_id": r.get("case_id", ""),
                    "claim_text": r.get("claim_text", "")[:200],
                    "gate": r.get("gate", ""),
                    "reason": r.get("reason", ""),
                }
                for r in needs_review
            ],
            "evidence_records": [
                r.get("evidence_record", {}) for r in self.results if r.get("evidence_record")
            ],
            "replay_results": [
                r.get("replay", {}) for r in self.results if r.get("replay")
            ],
            "limitations": [
                "OrbitGate v0 uses pattern-based and rule-based checks only.",
                "It does not access live orbital data or telemetry.",
                "SGP4 propagation is a simplified model and not flight-certified.",
                "All decisions require human review before real-world application.",
                "Temperature ranges, delta-v thresholds, and other limits use conservative defaults.",
            ],
            "next_required_validation": [
                "Run full benchmark suite against 160+ test cases.",
                "Verify replay determinism across multiple runs.",
                "Review all BLOCK and NEEDS_REVIEW cases manually.",
                "Install sgp4 for orbit propagation verification.",
                "Integrate with live TLE sources for real-time validation.",
            ],
        }

        if extra:
            report.update(extra)

        return report

    def save_json_report(self, path: str, extra: Optional[Dict[str, Any]] = None) -> None:
        """Generate and save JSON report to file."""
        report = self.generate_json_report(extra)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2, default=str)

    def generate_html_report(self, extra: Optional[Dict[str, Any]] = None) -> str:
        """Generate an HTML report string."""
        report = self.generate_json_report(extra)
        summary = report["executive_summary"]

        # Decision color mapping
        decision_colors = {
            "ALLOW": "#16a34a",
            "BLOCK": "#dc2626",
            "NEEDS_REVIEW": "#d97706",
            "EVIDENCE_REQUIRED": "#2563eb",
            "UNSUPPORTED": "#6b7280",
            "OUT_OF_SCOPE": "#6b7280",
        }

        # Build gate results table rows
        result_rows = []
        for i, r in enumerate(self.results):
            color = decision_colors.get(r.get("decision", ""), "#6b7280")
            result_rows.append(
                f'<tr>'
                f'<td>{i + 1}</td>'
                f'<td>{self._esc(r.get("case_id", ""))}</td>'
                f'<td>{self._esc(r.get("claim_type", ""))}</td>'
                f'<td>{self._esc(r.get("gate", ""))}</td>'
                f'<td style="color:{color};font-weight:bold;">{self._esc(r.get("decision", ""))}</td>'
                f'<td title="{self._esc(r.get("reason", ""))}">{self._esc(r.get("reason", "")[:100])}</td>'
                f'</tr>'
            )

        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>OrbitGate v0 Verification Report</title>
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #1e293b; line-height: 1.6; }}
  .header {{ background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: white; padding: 2rem 2rem 1.5rem; }}
  .header h1 {{ font-size: 1.75rem; font-weight: 700; margin-bottom: 0.25rem; }}
  .header p {{ opacity: 0.8; font-size: 0.9rem; }}
  .container {{ max-width: 1200px; margin: 0 auto; padding: 1.5rem; }}
  .card {{ background: white; border-radius: 0.75rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 1.5rem; margin-bottom: 1.5rem; }}
  .card h2 {{ font-size: 1.25rem; font-weight: 600; margin-bottom: 1rem; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5rem; }}
  .stats {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 1rem; margin-bottom: 1rem; }}
  .stat-box {{ background: #f1f5f9; border-radius: 0.5rem; padding: 1rem; text-align: center; }}
  .stat-box .number {{ font-size: 2rem; font-weight: 700; }}
  .stat-box .label {{ font-size: 0.8rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }}
  .stat-box.allow {{ background: #f0fdf4; color: #16a34a; }}
  .stat-box.block {{ background: #fef2f2; color: #dc2626; }}
  .stat-box.review {{ background: #fffbeb; color: #d97706; }}
  .stat-box.evidence {{ background: #eff6ff; color: #2563eb; }}
  table {{ width: 100%; border-collapse: collapse; font-size: 0.85rem; }}
  th {{ background: #0f172a; color: white; padding: 0.6rem 0.8rem; text-align: left; font-weight: 600; }}
  td {{ padding: 0.5rem 0.8rem; border-bottom: 1px solid #e2e8f0; }}
  tr:hover {{ background: #f8fafc; }}
  ul {{ padding-left: 1.5rem; margin: 0.5rem 0; }}
  li {{ margin-bottom: 0.3rem; }}
  .footer {{ text-align: center; padding: 2rem; color: #94a3b8; font-size: 0.8rem; }}
</style>
</head>
<body>
<div class="header">
  <h1>OrbitGate v0 Verification Report</h1>
  <p>Generated: {report["generated_at_utc"]}</p>
</div>
<div class="container">

  <div class="card">
    <h2>Executive Summary</h2>
    <div class="stats">
      <div class="stat-box"><div class="number">{summary["total_claims"]}</div><div class="label">Total Claims</div></div>
      <div class="stat-box allow"><div class="number">{summary["allowed"]}</div><div class="label">Allowed</div></div>
      <div class="stat-box block"><div class="number">{summary["blocked"]}</div><div class="label">Blocked</div></div>
      <div class="stat-box review"><div class="number">{summary["needs_review"]}</div><div class="label">Needs Review</div></div>
      <div class="stat-box evidence"><div class="number">{summary["evidence_required"]}</div><div class="label">Evidence Req.</div></div>
    </div>
  </div>

  <div class="card">
    <h2>What OrbitGate Is</h2>
    <ul>{"".join(f"<li>{self._esc(s)}</li>" for s in report["what_orbitgate_is"])}</ul>
  </div>

  <div class="card">
    <h2>What OrbitGate Is Not</h2>
    <ul>{"".join(f"<li>{self._esc(s)}</li>" for s in report["what_orbitgate_is_not"])}</ul>
  </div>

  <div class="card">
    <h2>Gate Results ({len(self.results)} claims)</h2>
    <div style="overflow-x:auto;">
    <table>
      <tr><th>#</th><th>Case ID</th><th>Claim Type</th><th>Gate</th><th>Decision</th><th>Reason</th></tr>
      {''.join(result_rows)}
    </table>
    </div>
  </div>

  <div class="card">
    <h2>Limitations</h2>
    <ul>{"".join(f"<li>{self._esc(s)}</li>" for s in report["limitations"])}</ul>
  </div>

  <div class="card">
    <h2>Next Required Validation</h2>
    <ul>{"".join(f"<li>{self._esc(s)}</li>" for s in report["next_required_validation"])}</ul>
  </div>

</div>
<div class="footer">
  OrbitGate v0 — Public Research Prototype — Not Flight Certified
</div>
</body>
</html>"""
        return html

    def save_html_report(self, path: str, extra: Optional[Dict[str, Any]] = None) -> None:
        """Generate and save HTML report to file."""
        html = self.generate_html_report(extra)
        with open(path, "w", encoding="utf-8") as f:
            f.write(html)

    def _compute_summary(self) -> Dict[str, Any]:
        """Compute benchmark summary statistics."""
        if not self.results:
            return {"passed": 0, "blocked": 0, "needs_review": 0, "evidence_required": 0, "total": 0}

        counts: Dict[str, int] = {}
        for r in self.results:
            dec = r.get("decision", "UNKNOWN")
            counts[dec] = counts.get(dec, 0) + 1

        # Count matches (if expected_decision field exists)
        matches = 0
        mismatches = 0
        for r in self.results:
            expected = r.get("expected_decision", "")
            actual = r.get("decision", "")
            if expected and actual:
                if expected == actual:
                    matches += 1
                else:
                    mismatches += 1

        return {
            "passed": counts.get("ALLOW", 0),
            "blocked": counts.get("BLOCK", 0),
            "needs_review": counts.get("NEEDS_REVIEW", 0),
            "evidence_required": counts.get("EVIDENCE_REQUIRED", 0),
            "unsupported": counts.get("UNSUPPORTED", 0),
            "out_of_scope": counts.get("OUT_OF_SCOPE", 0),
            "total": len(self.results),
            "benchmark_matches": matches,
            "benchmark_mismatches": mismatches,
        }

    @staticmethod
    def _esc(text: str) -> str:
        """HTML-escape a string."""
        return (
            text
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace('"', "&quot;")
        )