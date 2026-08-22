import type { Metadata } from "next";
import { tmdb } from "@/tmdb/api";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const movie = await tmdb.movie.detail(id);
    return {
      title: `${movie.title} (${new Date(movie.release_date || "").getFullYear() || "Movie"}) — Cinely`,
      description: movie.overview,
    };
  } catch {
    return {
      title: "Movie Playback — Cinely",
    };
  }
}

export default function MovieLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen flex flex-col">{children}</div>;
}
