import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import { writeFileSync, readFileSync, unlinkSync, existsSync } from "fs";
import { tmpdir } from "os";

export async function POST(request: NextRequest) {
  const tmpDir = tmpdir();
  const jsonPath = `${tmpDir}/orbitgate_run_${Date.now()}.json`;

  try {
    // Run the CLI demo with output to a temp file (avoids /dev/stdout issues)
    execSync(
      `python -m orbitgate.orbit_cli demo --json "${jsonPath}"`,
      {
        cwd: "/home/z/my-project",
        timeout: 60000,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      }
    );

    // Read the generated JSON report
    if (!existsSync(jsonPath)) {
      return NextResponse.json(
        { success: false, error: "Report file was not generated" },
        { status: 500 }
      );
    }

    const raw = readFileSync(jsonPath, "utf-8");
    const data = JSON.parse(raw);
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const err = error as { stdout?: string; stderr?: string; message?: string };
    return NextResponse.json(
      {
        success: false,
        error: "Benchmark execution failed",
        stdout: (err.stdout || "").slice(-2000),
        stderr: (err.stderr || "").slice(-2000),
      },
      { status: 500 }
    );
  } finally {
    try { unlinkSync(jsonPath); } catch {}
  }
}