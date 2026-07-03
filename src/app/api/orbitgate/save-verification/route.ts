import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { claim, decision, gate, risk_label, reason, evidence, missing_evidence } = body;

    // Validate required fields
    if (typeof claim !== "string" || claim.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "claim is required and must be a non-empty string" },
        { status: 400 }
      );
    }
    if (typeof decision !== "string" || decision.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "decision is required and must be a non-empty string" },
        { status: 400 }
      );
    }
    if (typeof gate !== "string" || gate.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "gate is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    const record = await db.verificationRecord.create({
      data: {
        claim: claim.trim(),
        decision: decision.trim(),
        gate: gate.trim(),
        riskLabel: typeof risk_label === "string" ? risk_label.trim() : "",
        reason: typeof reason === "string" ? reason.trim() : "",
        evidence: Array.isArray(evidence) ? JSON.stringify(evidence) : "[]",
        missingEvidence: Array.isArray(missing_evidence) ? JSON.stringify(missing_evidence) : "[]",
      },
    });

    return NextResponse.json({ success: true, id: record.id });
  } catch (error) {
    console.error("Failed to save verification record:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save verification record" },
      { status: 500 }
    );
  }
}