import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userMessage = body.message;

    if (!userMessage || typeof userMessage !== "string" || userMessage.trim().length === 0) {
      return NextResponse.json(
        { reply: "Please provide a valid message." },
        { status: 400 },
      );
    }

    // Mock response for OrbitGate AI assistant
    const mockResponses: { [key: string]: string } = {
      "leo": "LEO (Low Earth Orbit) is typically between 160-2000 km altitude. The ISS orbits at ~408 km with an inclination of 51.6°. LEO orbits have periods of 90-120 minutes and are ideal for Earth observation and communication satellites.",
      "geo": "GEO (Geostationary Orbit) is at approximately 35,786 km altitude above the equator, with a period of 24 hours matching Earth's rotation. GEO satellites appear stationary from Earth and are perfect for weather monitoring and global telecommunications.",
      "sgp4": "SGP4 (Simplified General Perturbations 4) is the standard orbital propagation model used by NORAD. It accounts for atmospheric drag, Earth's oblateness (J2), and other perturbations to predict satellite positions from Two-Line Element (TLE) sets.",
      "hohmann": "A Hohmann transfer is the most fuel-efficient orbital maneuver between two circular orbits. It requires two impulses: one at the current orbit to enter the transfer ellipse, and another at the target orbit to circularize. The transfer time is half the period of the transfer ellipse.",
      "tLE": "TLE (Two-Line Element) sets contain orbital information for satellites, published by NORAD. They include the satellite's NORAD catalog number, inclination, eccentricity, semi-major axis, and mean anomaly. TLEs are typically updated daily and are valid for short-term predictions.",
    };

    const lowerMessage = userMessage.toLowerCase();
    let reply = "I'm OrbitGate AI, an expert on orbital mechanics and satellite operations. Ask me about LEO, GEO, SGP4, Hohmann transfers, TLEs, or other space topics!";

    for (const [key, value] of Object.entries(mockResponses)) {
      if (lowerMessage.includes(key)) {
        reply = value;
        break;
      }
    }

    return NextResponse.json({ reply });
  } catch (error: unknown) {
    console.error("[ai-chat] Error:", error);
    return NextResponse.json(
      { reply: "An error occurred while processing your request. Please try again." },
      { status: 500 },
    );
  }
}