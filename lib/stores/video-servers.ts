export interface VideoServer {
  id: string;
  name: string;
  baseUrl: string;
  badge?: string;
  getMovieUrl: (tmdbId: number) => string;
  getTvUrl: (tmdbId: number) => string;
  getEpisodeUrl: (tmdbId: number, season: number, episode: number) => string;
}

export const videoServers: VideoServer[] = [
  {
    id: "vidsrc",
    name: "VidSrc",
    baseUrl: "https://vsembed.ru",
    badge: "Fast",
    getMovieUrl: (id) => `https://vsembed.ru/embed/movie?tmdb=${id}`,
    getTvUrl: (id) => `https://vsembed.ru/embed/tv?tmdb=${id}`,
    getEpisodeUrl: (id, s, e) => `https://vsembed.ru/embed/tv?tmdb=${id}&season=${s}&episode=${e}`,
  },
  {
    id: "vidsrc-mirror",
    name: "VidSrc Mirror",
    baseUrl: "https://vidsrc.wtf",
    badge: "1080p",
    getMovieUrl: (id) => `https://vidsrc.wtf/1/movie/${id}?color=9146ff`,
    getTvUrl: (id) => `https://vidsrc.wtf/1/tv/${id}/1/1?color=9146ff`,
    getEpisodeUrl: (id, s, e) => `https://vidsrc.wtf/1/tv/${id}/${s}/${e}?color=9146ff`,
  },
  {
    id: "superembed",
    name: "SuperEmbed",
    baseUrl: "https://multiembed.mov",
    badge: "Multi",
    getMovieUrl: (id) => `https://multiembed.mov/?video_id=${id}&tmdb=1`,
    getTvUrl: (id) => `https://multiembed.mov/?video_id=${id}&tmdb=1`,
    getEpisodeUrl: (id, s, e) => `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${s}&e=${e}`,
  },
  {
    id: "2embed",
    name: "2Embed",
    baseUrl: "https://www.2embed.cc",
    badge: "HD",
    getMovieUrl: (id) => `https://www.2embed.cc/embed/${id}`,
    getTvUrl: (id) => `https://www.2embed.cc/embedtvfull/${id}`,
    getEpisodeUrl: (id, s, e) => `https://www.2embed.cc/embedtv/${id}&s=${s}&e=${e}`,
  },
  {
    id: "vidnest",
    name: "VidNest",
    baseUrl: "https://vidnest.fun",
    badge: "Direct",
    getMovieUrl: (id) => `https://vidnest.fun/movie/${id}`,
    getTvUrl: (id) => `https://vidnest.fun/tv/${id}`,
    getEpisodeUrl: (id, s, e) => `https://vidnest.fun/tv/${id}/${s}/${e}`,
  },
  {
    id: "vidfast",
    name: "VidFast",
    baseUrl: "https://vidfast.pro",
    badge: "Auto",
    getMovieUrl: (id) => `https://vidfast.pro/movie/${id}?autoPlay=true`,
    getTvUrl: (id) => `https://vidfast.pro/tv/${id}`,
    getEpisodeUrl: (id, s, e) => `https://vidfast.pro/tv/${id}/${s}/${e}?autoPlay=true&nextButton=true&autoNext=true`,
  },
  {
    id: "vidking",
    name: "VidKing",
    baseUrl: "https://www.vidking.net",
    badge: "VOD",
    getMovieUrl: (id) => `https://www.vidking.net/embed/movie/${id}?color=9146ff&autoPlay=true`,
    getTvUrl: (id) => `https://www.vidking.net/embed/tv/${id}/1/1?color=9146ff&autoPlay=true`,
    getEpisodeUrl: (id, s, e) => `https://www.vidking.net/embed/tv/${id}/${s}/${e}?color=9146ff&autoPlay=true`,
  },
  {
    id: "smashystream",
    name: "SmashyStream",
    baseUrl: "https://embed.smashystream.com",
    badge: "4K",
    getMovieUrl: (id) => `https://embed.smashystream.com/playere.php?tmdb=${id}`,
    getTvUrl: (id) => `https://embed.smashystream.com/playere.php?tmdb=${id}`,
    getEpisodeUrl: (id, s, e) => `https://embed.smashystream.com/playere.php?tmdb=${id}&season=${s}&episode=${e}`,
  },
  {
    id: "autoembed",
    name: "AutoEmbed",
    baseUrl: "https://player.autoembed.cc",
    badge: "Fast",
    getMovieUrl: (id) => `https://player.autoembed.cc/embed/movie/${id}`,
    getTvUrl: (id) => `https://player.autoembed.cc/embed/tv/${id}/1/1`,
    getEpisodeUrl: (id, s, e) => `https://player.autoembed.cc/embed/tv/${id}/${s}/${e}`,
  },
  {
    id: "embedsu",
    name: "EmbedSU",
    baseUrl: "https://embed.su",
    badge: "VIP",
    getMovieUrl: (id) => `https://embed.su/embed/movie/${id}`,
    getTvUrl: (id) => `https://embed.su/embed/tv/${id}/1/1`,
    getEpisodeUrl: (id, s, e) => `https://embed.su/embed/tv/${id}/${s}/${e}`,
  },
  {
    id: "vidsrc-vip",
    name: "VidSrc VIP",
    baseUrl: "https://vidsrc.vip",
    badge: "Pro",
    getMovieUrl: (id) => `https://vidsrc.vip/embed/movie/${id}`,
    getTvUrl: (id) => `https://vidsrc.vip/embed/tv/${id}/1/1`,
    getEpisodeUrl: (id, s, e) => `https://vidsrc.vip/embed/tv/${id}/${s}/${e}`,
  },
  {
    id: "vidsrc-pro",
    name: "VidSrc Pro",
    baseUrl: "https://vidsrc.pro",
    badge: "1080p",
    getMovieUrl: (id) => `https://vidsrc.pro/embed/movie/${id}`,
    getTvUrl: (id) => `https://vidsrc.pro/embed/tv/${id}/1/1`,
    getEpisodeUrl: (id, s, e) => `https://vidsrc.pro/embed/tv/${id}/${s}/${e}`,
  },
  {
    id: "streamwish",
    name: "StreamWish",
    baseUrl: "https://streamwish.to",
    badge: "Mirror",
    getMovieUrl: (id) => `https://streamwish.to/e/${id}`,
    getTvUrl: (id) => `https://streamwish.to/e/${id}`,
    getEpisodeUrl: (id, s, e) => `https://streamwish.to/e/${id}_s${s}e${e}`,
  },
  {
    id: "rive",
    name: "Rive Stream",
    baseUrl: "https://rive.stream",
    badge: "Ad-Block",
    getMovieUrl: (id) => `https://rive.stream/embed?type=movie&id=${id}`,
    getTvUrl: (id) => `https://rive.stream/embed?type=tv&id=${id}`,
    getEpisodeUrl: (id, s, e) => `https://rive.stream/embed?type=tv&id=${id}&season=${s}&episode=${e}`,
  }
];
