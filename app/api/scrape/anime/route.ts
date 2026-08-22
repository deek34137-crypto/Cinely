import { NextResponse } from "next/server";
import { handleScrapeRequest } from "@/lib/scrape/api-handlers";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const result = await handleScrapeRequest({
      mediaKind: "anime",
      ...payload,
    });

    if (!result) {
      return NextResponse.json({ error: "No anime streams resolved" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Scrape failed" }, { status: 500 });
  }
}
