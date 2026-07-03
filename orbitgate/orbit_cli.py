"""OrbitGate CLI interface."""

import argparse
import json
import os
import sys
from datetime import datetime, timezone

from .orbit_router import OrbitRouter
from .orbit_bench import BenchmarkRunner
from .orbit_replay import replay_case, compute_replay_hash
from .orbit_report import ReportGenerator
from .orbit_certificate import CertificateGenerator
from .orbit_claim_boundary import ClaimBoundaryChecker


def _find_benchmark_files() -> list:
    """Search for benchmark JSON files in common locations."""
    search_dirs = [
        os.path.join(os.path.dirname(__file__), "..", "benchmarks", "orbitgate_v0", "cases"),
        os.path.join(os.path.dirname(__file__), "..", "benchmarks", "orbitgate_v0"),
        os.path.join(os.path.dirname(__file__), "..", "benchmarks"),
        os.path.join(os.path.dirname(__file__), "..", "data"),
    ]
    found = []
    for d in search_dirs:
        d = os.path.abspath(d)
        if os.path.isdir(d):
            for fname in sorted(os.listdir(d)):
                if fname.endswith(".json") and fname != "all_cases.json":
                    found.append(os.path.join(d, fname))
    # If no individual files found, try all_cases.json
    if not found:
        for d in search_dirs:
            d = os.path.abspath(d)
            all_cases = os.path.join(d, "all_cases.json")
            if os.path.isfile(all_cases):
                found.append(all_cases)
                break
    return found


def _print_demo_results(runner, results, json_path=None, html_path=None, cert_path=None):
    """Print demo results and optionally save outputs."""
    print("=" * 80)
    print("OrbitGate v0 -- Demo Run")
    print(f"Time: {datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')}")
    print("=" * 80)

    for r in results:
        match_str = "PASS" if r.get("match") else "FAIL"
        expected_str = f" (expected: {r['expected_decision']})" if r.get("expected_decision") else ""
        print(f"\n[{match_str}] {r['case_id']}")
        claim_preview = r['claim_text'][:80].replace('\n', ' ')
        print(f"  Claim: {claim_preview}{'...' if len(r['claim_text']) > 80 else ''}")
        print(f"  Gate: {r['gate']}  |  Decision: {r['decision']}{expected_str}")
        print(f"  Reason: {r['reason']}")

    summary = runner.get_summary()
    print("\n" + "-" * 80)
    print(f"Summary: {summary['total']} cases | "
          f"ALLOW: {summary['allowed']} | "
          f"BLOCK: {summary['blocked']} | "
          f"REVIEW: {summary['needs_review']} | "
          f"EVIDENCE: {summary['evidence_required']} | "
          f"Matches: {summary['benchmark_matches']} | "
          f"Mismatches: {summary['benchmark_mismatches']}")
    print("-" * 80)

    if json_path or html_path:
        runner.generate_report(json_path=json_path, html_path=html_path)
        if json_path:
            print(f"\nJSON report saved to: {json_path}")
        if html_path:
            print(f"HTML report saved to: {html_path}")

    if cert_path:
        report_gen = ReportGenerator(results=results)
        report_data = report_gen.generate_json_report()
        cert_gen = CertificateGenerator(report_data=report_data)
        cert_gen.save(cert_path)
        print(f"Certificate saved to: {cert_path}")


def cmd_demo(args):
    """Run demo cases and print results."""
    runner = BenchmarkRunner()
    results = runner.run_demo()
    _print_demo_results(
        runner, results,
        json_path=args.json,
        html_path=args.html,
        cert_path=args.certificate,
    )


def cmd_run(args):
    """Run all benchmarks and generate report/certificate."""
    benchmark_files = _find_benchmark_files()

    if not benchmark_files:
        print("ERROR: No benchmark JSON files found.", file=sys.stderr)
        print("Searched in:", file=sys.stderr)
        for d in [
            "benchmarks/orbitgate_v0/",
            "benchmarks/",
            "data/",
        ]:
            print(f"  {os.path.abspath(os.path.join(os.path.dirname(__file__), '..', d))}", file=sys.stderr)
        print("\nPlace benchmark JSON files in one of these directories.", file=sys.stderr)
        sys.exit(1)

    print(f"Found {len(benchmark_files)} benchmark file(s):")
    for bf in benchmark_files:
        print(f"  {bf}")
    print()

    runner = BenchmarkRunner()
    all_results = []

    for bf in benchmark_files:
        print(f"Running: {bf}")
        try:
            cases = runner.load_cases(bf)
            results = runner.run_all(cases)
            all_results.extend(results)
            print(f"  {len(results)} cases loaded")
        except Exception as exc:
            print(f"  ERROR: {exc}", file=sys.stderr)

    if not all_results:
        print("No results collected.", file=sys.stderr)
        sys.exit(1)

    # Generate report
    runner.results = all_results
    json_path = args.json or "orbitgate_report.json"
    html_path = args.html or "orbitgate_report.html"
    cert_path = args.certificate or "orbitgate_certificate.json"

    summary = runner.generate_report(
        json_path=json_path,
        html_path=html_path,
        certificate_path=cert_path,
    )

    print(f"\nReport saved to: {json_path}")
    if html_path:
        print(f"HTML report saved to: {html_path}")
    if cert_path:
        print(f"Certificate saved to: {cert_path}")

    print(f"\nSummary: {summary.get('total', 0)} total | "
          f"ALLOW: {summary.get('allowed', 0)} | "
          f"BLOCK: {summary.get('blocked', 0)} | "
          f"REVIEW: {summary.get('needs_review', 0)} | "
          f"EVIDENCE: {summary.get('evidence_required', 0)}")
    print(f"Benchmark: {summary.get('benchmark_matches', 0)} matches, "
          f"{summary.get('benchmark_mismatches', 0)} mismatches")


def cmd_case(args):
    """Run a specific case by ID."""
    benchmark_files = _find_benchmark_files()
    runner = BenchmarkRunner()

    case_found = None
    for bf in benchmark_files:
        try:
            cases = runner.load_cases(bf)
            for case in cases:
                if case.get("case_id") == args.case:
                    case_found = case
                    break
            if case_found:
                break
        except Exception:
            continue

    if not case_found:
        print(f"ERROR: Case '{args.case}' not found in any benchmark file.", file=sys.stderr)
        sys.exit(1)

    result = runner.run_case(case_found)

    print("=" * 80)
    print(f"Case: {result['case_id']}")
    print("=" * 80)
    print(f"Claim: {result['claim_text']}")
    print(f"Claim Type: {result['claim_type']}")
    print(f"Gate: {result['gate']}")
    print(f"Decision: {result['decision']}")
    if result.get("expected_decision"):
        print(f"Expected: {result['expected_decision']}")
        print(f"Match: {'YES' if result['match'] else 'NO'}")
    print(f"Reason: {result['reason']}")
    print(f"Replay Hash: {result['replay_hash']}")
    print(f"Limitations: {', '.join(result['limitations'])}")
    print("=" * 80)


def cmd_replay(args):
    """Replay a specific case and verify determinism."""
    benchmark_files = _find_benchmark_files()
    runner = BenchmarkRunner()

    case_found = None
    for bf in benchmark_files:
        try:
            cases = runner.load_cases(bf)
            for case in cases:
                if case.get("case_id") == args.case:
                    case_found = case
                    break
            if case_found:
                break
        except Exception:
            continue

    if not case_found:
        print(f"Case '{args.case}' not found in benchmark files.", file=sys.stderr)
        sys.exit(1)

    claim_text = case_found.get("input", case_found.get("claim_text", ""))
    case_id = case_found.get("case_id", args.case)

    # First, get the original result and hash
    original_result = runner.run_case(case_found)
    original_hash = original_result["replay_hash"]

    # Now replay
    replay_result = replay_case(
        case_id=case_id,
        claim_text=claim_text,
        original_hash=original_hash,
        original_gate=original_result["gate"],
        original_decision=original_result["decision"],
    )

    print("=" * 80)
    print(f"Replay: {replay_result.case_id}")
    print("=" * 80)
    print(f"Status: {replay_result.status}")
    print(f"Original Hash: {replay_result.original_hash}")
    print(f"Recomputed Hash: {replay_result.recomputed_hash}")
    print(f"Details: {replay_result.details}")
    print("=" * 80)


def cmd_handoff_pack(args):
    """Generate a complete handoff pack."""
    pack_dir = args.output or "orbitgate_handoff"

    # Run demo to get results
    runner = BenchmarkRunner()
    runner.run_demo()

    os.makedirs(pack_dir, exist_ok=True)

    json_path = os.path.join(pack_dir, "orbitgate_report.json")
    html_path = os.path.join(pack_dir, "orbitgate_report.html")
    cert_path = os.path.join(pack_dir, "orbitgate_certificate.json")

    summary = runner.generate_report(
        json_path=json_path,
        html_path=html_path,
        certificate_path=cert_path,
    )

    print(f"Handoff pack generated in: {os.path.abspath(pack_dir)}")
    print(f"  - {json_path}")
    print(f"  - {html_path}")
    print(f"  - {cert_path}")
    print(f"\nSummary: {summary}")


def main(argv=None):
    """Main CLI entry point.

    Supports two invocation styles:
      1. Subcommands:  orbitgate demo / orbitgate run / orbitgate case CASE_ID / ...
      2. Flags:        orbitgate --demo / orbitgate --run / orbitgate --case CASE_ID / ...
    """
    parser = argparse.ArgumentParser(
        prog="orbitgate",
        description="OrbitGate v0 -- Deterministic verification-gate system for AI-generated orbital claims",
    )

    # Top-level flags (--demo, --run, etc.)
    parser.add_argument("--demo", action="store_true", help="Run demo cases")
    parser.add_argument("--run", action="store_true", help="Run all benchmarks and generate report/certificate")
    parser.add_argument("--case", type=str, default=None, help="Run a specific case by ID")
    parser.add_argument("--json", type=str, default=None, help="Output JSON report path")
    parser.add_argument("--html", type=str, default=None, help="Output HTML report path")
    parser.add_argument("--certificate", type=str, default=None, help="Output certificate path")
    parser.add_argument("--handoff-pack", action="store_true", help="Generate handoff pack")
    parser.add_argument("--output", type=str, default=None, help="Output directory (for handoff-pack)")

    # Subcommands
    subparsers = parser.add_subparsers(dest="subcommand", help="Command to run")

    demo_p = subparsers.add_parser("demo", help="Run demo cases")
    demo_p.add_argument("--json", type=str, default=None, help="Output JSON report path")
    demo_p.add_argument("--html", type=str, default=None, help="Output HTML report path")
    demo_p.add_argument("--certificate", type=str, default=None, help="Output certificate path")

    run_p = subparsers.add_parser("run", help="Run all benchmarks")
    run_p.add_argument("--json", type=str, default=None, help="Output JSON report path")
    run_p.add_argument("--html", type=str, default=None, help="Output HTML report path")
    run_p.add_argument("--certificate", type=str, default=None, help="Output certificate path")

    case_p = subparsers.add_parser("case", help="Run a specific case")
    case_p.add_argument("case", type=str, help="Case ID to run")

    replay_p = subparsers.add_parser("replay", help="Replay a specific case")
    replay_p.add_argument("case", type=str, help="Case ID to replay")

    handoff_p = subparsers.add_parser("handoff-pack", help="Generate handoff pack")
    handoff_p.add_argument("--output", type=str, default=None, help="Output directory")

    args = parser.parse_args(argv)

    # Handle subcommands first
    if args.subcommand == "demo":
        cmd_demo(args)
        return
    elif args.subcommand == "run":
        cmd_run(args)
        return
    elif args.subcommand == "case":
        cmd_case(args)
        return
    elif args.subcommand == "replay":
        cmd_replay(args)
        return
    elif args.subcommand == "handoff-pack":
        cmd_handoff_pack(args)
        return

    # Handle top-level flags
    if args.demo:
        cmd_demo(args)
    elif args.run:
        cmd_run(args)
    elif args.case:
        cmd_case(args)
    elif args.handoff_pack:
        cmd_handoff_pack(args)
    else:
        # Default: run demo
        args.demo = True
        cmd_demo(args)


if __name__ == "__main__":
    main()