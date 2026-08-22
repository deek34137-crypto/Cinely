import { describe, it, expect } from "vitest";
import { decryptVidKingPayload, encryptVidKingPayload } from "../lib/scrape/vidking-cipher";

describe("VidKing Cipher Decryption Engine", () => {
  it("should encrypt and decrypt payloads with magic bytes verification", () => {
    const originalJson = JSON.stringify({
      sources: [
        {
          file: "https://stream.vidking.net/vod/12345/master.m3u8",
          type: "hls",
        },
      ],
      tracks: [
        {
          file: "https://stream.vidking.net/subs/en.vtt",
          label: "English",
          kind: "subtitles",
        },
      ],
    });

    const seed = "test_vidking_seed_12345";
    const mediaId = 27205; // Inception

    const encrypted = encryptVidKingPayload(originalJson, seed, mediaId);
    expect(encrypted).toBeDefined();
    expect(typeof encrypted).toBe("string");

    const decrypted = decryptVidKingPayload(encrypted, seed, mediaId);
    expect(decrypted).toBe(originalJson);

    const parsed = JSON.parse(decrypted);
    expect(parsed.sources[0].file).toContain("master.m3u8");
  });

  it("should fail decryption if magic bytes or seed do not match", () => {
    const originalJson = JSON.stringify({ source: "https://test.com/stream.m3u8" });
    const encrypted = encryptVidKingPayload(originalJson, "seedA", 100);

    expect(() => {
      decryptVidKingPayload(encrypted, "wrongSeed", 100);
    }).toThrow();
  });
});
