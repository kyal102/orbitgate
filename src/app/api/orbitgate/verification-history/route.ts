import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "50", 10) || 50, 1), 200);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10) || 0, 0);
    const gate = searchParams.get("gate");
    const decision = searchParams.get("decision");

    const where: Record<string, string> = {};
    if (gate) where.gate = gate;
    if (decision) where.decision = decision;

    const records = await db.verificationRecord.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    const entries = records.map((r) => ({
      id: r.id,
      claim: r.claim,
      decision: r.decision,
      gate: r.gate,
      risk_label: r.riskLabel,
      reason: r.reason,
      evidence: safeJsonParse(r.evidence),
      missing_evidence: safeJsonParse(r.missingEvidence),
      timestamp: r.createdAt.toISOString(),
    }));

    return NextResponse.json({ success: true, data: entries, count: entries.length });
  } catch (error) {
    console.error("Failed to fetch verification history:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch verification history" },
      { status: 500 }
    );
  }
}

function safeJsonParse(str: string): string[] {
  try {
    const parsed = JSON.parse(str);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}