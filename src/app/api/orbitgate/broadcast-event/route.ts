import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/orbitgate/broadcast-event
 *
 * Proxy route: receives an event from the Next.js frontend and forwards it
 * to the live-feed WebSocket mini-service on port 3004.
 *
 * Body: { type: "verification" | "system" | "telemetry", data: {...}, ... }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Forward to the live-feed mini-service
    const res = await fetch("http://localhost:3004/api/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Unknown error" }));
      return NextResponse.json(
        { success: false, error: err.error || "Failed to broadcast event" },
        { status: res.status }
      );
    }

    const result = await res.json();
    return NextResponse.json(result);
  } catch {
    // If the mini-service is down, fail silently — live feed is non-critical
    return NextResponse.json(
      { success: false, error: "Live feed service unavailable" },
      { status: 503 }
    );
  }
}