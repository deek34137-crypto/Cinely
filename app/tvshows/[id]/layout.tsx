import type { Metadata } from "next";
import { tmdb } from "@/tmdb/api";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const show = await tmdb.tv.detail(id);
    return {
      title: `${show.name} — Cinely TV`,
      description: show.overview,
    };
  } catch {
    return {
      title: "TV Show Stream — Cinely",
    };
  }
}

export default function TvShowLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen flex flex-col">{children}</div>;
}
