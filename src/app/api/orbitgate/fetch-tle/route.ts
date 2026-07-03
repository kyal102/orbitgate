import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") || "groups"; // groups | norad | search | group | catalog

  try {
    if (mode === "groups") {
      const result = execSync(
        "python -c \"from orbitgate.orbit_tle_fetcher import get_available_groups, get_popular_satellites; import json; print(json.dumps({'groups': get_available_groups(), 'popular': get_popular_satellites()}))\"",
        { cwd: "/home/z/my-project", timeout: 15000, encoding: "utf-8" }
      );
      return NextResponse.json({ success: true, data: JSON.parse(result) });
    }

    if (mode === "catalog") {
      // Returns all bundled TLEs immediately (no network needed)
      const result = execSync(
        "python -c \"from orbitgate.orbit_bundled_tle import get_all_bundled; import json; print(json.dumps(get_all_bundled()))\"",
        { cwd: "/home/z/my-project", timeout: 10000, encoding: "utf-8" }
      );
      return NextResponse.json({ success: true, data: JSON.parse(result) });
    }

    if (mode === "norad") {
      const noradId = searchParams.get("norad_id");
      if (!noradId) {
        return NextResponse.json({ success: false, error: "norad_id parameter required" }, { status: 400 });
      }
      const result = execSync(
        `python -c "from orbitgate.orbit_tle_fetcher import fetch_tle_by_norad; import json; r=fetch_tle_by_norad('${noradId}'); print(json.dumps(r.to_dict()))"`,
        { cwd: "/home/z/my-project", timeout: 15000, encoding: "utf-8" }
      );
      return NextResponse.json({ success: true, data: JSON.parse(result) });
    }

    if (mode === "search") {
      const query = searchParams.get("q");
      if (!query) {
        return NextResponse.json({ success: false, error: "q parameter required" }, { status: 400 });
      }
      const safeQuery = query.replace(/'/g, "'\"'\"'");
      const result = execSync(
        `python -c "from orbitgate.orbit_tle_fetcher import fetch_tle_by_name_search; import json; r=fetch_tle_by_name_search('${safeQuery}'); print(json.dumps(r.to_dict()))"`,
        { cwd: "/home/z/my-project", timeout: 15000, encoding: "utf-8" }
      );
      return NextResponse.json({ success: true, data: JSON.parse(result) });
    }

    if (mode === "group") {
      const group = searchParams.get("group");
      if (!group) {
        return NextResponse.json({ success: false, error: "group parameter required" }, { status: 400 });
      }
      const safeGroup = group.replace(/'/g, "'\"'\"'");
      const result = execSync(
        `python -c "from orbitgate.orbit_tle_fetcher import fetch_tle_group; import json; r=fetch_tle_group('${safeGroup}'); print(json.dumps(r.to_dict()))"`,
        { cwd: "/home/z/my-project", timeout: 15000, encoding: "utf-8" }
      );
      return NextResponse.json({ success: true, data: JSON.parse(result) });
    }

    return NextResponse.json({ success: false, error: `Unknown mode: ${mode}` }, { status: 400 });
  } catch (error: unknown) {
    const err = error as { stdout?: string; stderr?: string; message?: string };
    return NextResponse.json(
      { success: false, error: err.stderr || err.message || "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mode, ...params } = body;

    if (mode === "group") {
      const group = params.group;
      if (!group) {
        return NextResponse.json({ success: false, error: "group field required" }, { status: 400 });
      }
      const safeGroup = group.replace(/'/g, "'\"'\"'");
      const result = execSync(
        `python -c "from orbitgate.orbit_tle_fetcher import fetch_tle_group; import json; r=fetch_tle_group('${safeGroup}'); print(json.dumps(r.to_dict()))"`,
        { cwd: "/home/z/my-project", timeout: 15000, encoding: "utf-8" }
      );
      return NextResponse.json({ success: true, data: JSON.parse(result) });
    }

    return NextResponse.json({ success: false, error: `Unknown mode: ${mode}` }, { status: 400 });
  } catch (error: unknown) {
    const err = error as { stdout?: string; stderr?: string; message?: string };
    return NextResponse.json(
      { success: false, error: err.stderr || err.message || "Unknown error" },
      { status: 500 }
    );
  }
}