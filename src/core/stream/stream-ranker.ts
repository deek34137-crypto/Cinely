import { StreamCandidate } from '../types/stream.js';

/**
 * Computes a deterministic ranking score for a stream candidate following the tiered ranking policy:
 * 
 * 1. Web Playable Tier: +10,000,000
 * 2. Provider Priority: (100 - priority) * 100,000
 * 3. Resolution / Quality Tier:
 *    - 4K / 2160p: +40,000
 *    - 1080p: +30,000
 *    - 720p: +20,000
 *    - 480p: +10,000
 * 4. Stream Health / Seeders: up to +5,000
 * 5. Codec / Audio enhancement: up to +3,000
 */
export function calculateStreamScore(candidate: StreamCandidate): number {
  let score = 0;

  // Tier 1: Web Playability (Browser-ready streams always rank above raw torrents)
  if (candidate.isWebPlayable) {
    score += 10_000_000;
  }

  // Tier 2: Provider Priority (lower priorityOrder number = higher score)
  const normalizedPriority = Math.max(0, Math.min(100, candidate.addonPriority));
  score += (100 - normalizedPriority) * 100_000;

  // Tier 3: Resolution
  switch (candidate.quality) {
    case '4K':
      score += 40_000;
      break;
    case '1080p':
      score += 30_000;
      break;
    case '720p':
      score += 20_000;
      break;
    case '480p':
      score += 10_000;
      break;
    default:
      break;
  }

  // Tier 4: Seeders / Health (log-capped)
  if (candidate.seeders && candidate.seeders > 0) {
    score += Math.min(5_000, candidate.seeders * 5);
  }

  // Tier 5: Modern Codec / Audio
  if (candidate.codec === 'AV1') score += 3_000;
  else if (candidate.codec === 'HEVC') score += 2_000;
  else if (candidate.codec === 'x264') score += 1_000;

  if (candidate.audio && candidate.audio.length > 0) {
    score += 1_000;
  }

  return score;
}

/**
 * Deterministically ranks and sorts stream candidates.
 */
export function rankStreams(candidates: StreamCandidate[]): StreamCandidate[] {
  // Score all candidates
  const scored = candidates.map((c) => ({
    ...c,
    score: calculateStreamScore(c),
  }));

  // Sort descending by score; break ties deterministically with candidate ID
  return scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.id.localeCompare(b.id);
  });
}
