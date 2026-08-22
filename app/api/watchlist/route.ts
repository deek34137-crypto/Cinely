import { NextResponse } from "next/server";
import { db, watchlist } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId") || "anonymous_user";

    const items = await db.select().from(watchlist).where(eq(watchlist.userId, userId));
    return NextResponse.json({ items });
  } catch {
    // If DB is offline, return empty list (client will fall back to local storage)
    return NextResponse.json({ items: [] });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId = "anonymous_user", contentId, mediaType, status = "watching", season, episode } = body;

    if (!contentId || !mediaType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await db
      .insert(watchlist)
      .values({
        userId,
        contentId: Number(contentId),
        mediaType,
        status,
        lastWatchedSeason: season,
        lastWatchedEpisode: episode,
        lastWatchedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [watchlist.userId, watchlist.contentId, watchlist.mediaType],
        set: {
          status,
          lastWatchedSeason: season,
          lastWatchedEpisode: episode,
          lastWatchedAt: new Date(),
          updatedAt: new Date(),
        },
      });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: true, message: "Saved locally" });
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId") || "anonymous_user";
    const contentId = url.searchParams.get("contentId");
    const mediaType = url.searchParams.get("mediaType") as "movie" | "tv";

    if (contentId && mediaType) {
      await db
        .delete(watchlist)
        .where(
          and(
            eq(watchlist.userId, userId),
            eq(watchlist.contentId, Number(contentId)),
            eq(watchlist.mediaType, mediaType)
          )
        );
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: true });
  }
}
