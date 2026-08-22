import { describe, it, expect } from "vitest";
import {
  encodeScrapePlaybackToken,
  decodeScrapePlaybackToken,
  rewriteManifestPlaylist,
  rewriteDashManifest,
} from "../lib/scrape/playback";

describe("Playback Tokenization and Manifest Rewriter", () => {
  it("should encode and decode playback tokens correctly", () => {
    const token = encodeScrapePlaybackToken({
      url: "https://upstream.cdn.example.com/hls/master.m3u8",
      referer: "https://vidking.net/",
      streamType: "hls",
    });

    expect(token).toBeDefined();

    const decoded = decodeScrapePlaybackToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.url).toBe("https://upstream.cdn.example.com/hls/master.m3u8");
    expect(decoded?.referer).toBe("https://vidking.net/");
    expect(decoded?.streamType).toBe("hls");
  });

  it("should rewrite HLS master and media manifests to proxy endpoints", () => {
    const rawMasterM3u8 = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=1400000,RESOLUTION=1280x720
720p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2800000,RESOLUTION=1920x1080
1080p.m3u8
`;

    const upstreamUrl = "https://upstream.cdn.example.com/hls/master.m3u8";
    const rewritten = rewriteManifestPlaylist(rawMasterM3u8, upstreamUrl, "https://vidking.net/");

    expect(rewritten).toContain("/api/scrape/play/");
    expect(rewritten).toContain("#EXT-X-STREAM-INF");
    expect(rewritten).not.toContain("\n720p.m3u8");
  });

  it("should rewrite EXT-X-KEY URI tags", () => {
    const rawMediaM3u8 = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXT-X-KEY:METHOD=AES-128,URI="enc.key",IV=0x01
#EXTINF:9.009,
segment_0.ts
#EXTINF:9.009,
segment_1.ts
#EXT-X-ENDLIST
`;

    const upstreamUrl = "https://upstream.cdn.example.com/hls/video/";
    const rewritten = rewriteManifestPlaylist(rawMediaM3u8, upstreamUrl, "https://vidking.net/");

    expect(rewritten).toContain('URI="/api/scrape/play/');
    expect(rewritten).toContain("#EXTINF:9.009,");
    expect(rewritten).not.toContain("\nsegment_0.ts");
    expect(rewritten).toContain("#EXT-X-ENDLIST");
  });

  it("should rewrite DASH MPD BaseURL elements", () => {
    const rawXml = `<?xml version="1.0"?>
<MPD xmlns="urn:mpeg:dash:schema:mpd:2011">
  <BaseURL>https://upstream.dash.example.com/video/</BaseURL>
</MPD>`;

    const upstreamUrl = "https://upstream.dash.example.com/manifest.mpd";
    const rewritten = rewriteDashManifest(rawXml, upstreamUrl);

    expect(rewritten).toContain("<BaseURL>/api/scrape/play/");
  });
});
