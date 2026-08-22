const MAGIC_BYTES = [109, 118, 109, 49] as const; // "mvm1"
const JL = [
  1116352408, 1899447441, 3049323471, 3921009573, 961987163, 1508970993,
  2453635748, 2870763221, 3624381080, 310598401, 607225278, 1426881987,
  1925078388, 2162078206, 2614888103, 3248222580,
] as const;
const STATE_SIZE = 61;
const ROUND_COUNT = 8;
const MS = 2654435769;

function splitmix64(x: number): number {
  let l = x >>> 0;
  l ^= l >>> 16;
  l = Math.imul(l, 2246822507) >>> 0;
  l ^= l >>> 13;
  l = Math.imul(l, 3266489909) >>> 0;
  l ^= l >>> 16;
  return l >>> 0;
}

function rotateLeft(l: number, bits: number): number {
  bits = bits & 31;
  return bits === 0 ? l >>> 0 : ((l << bits) | (l >>> (32 - bits))) >>> 0;
}

function mix(l: number, o: number, e: number): number {
  return (((l ^ o) >>> 0) | ((l & o & e) >>> 0)) >>> 0;
}

function fnvHash(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash = Math.imul(hash ^ input.charCodeAt(i), 16777619) >>> 0;
  }
  return splitmix64(hash);
}

function initState(seed: string, mediaId: number) {
  const state = new Array<number>(STATE_SIZE).fill(0);
  let cursor = splitmix64(fnvHash(seed) ^ splitmix64(mediaId ^ MS)) >>> 0;

  for (let round = 0; round < ROUND_COUNT; round++) {
    if (((round * (round + 1)) & 1) === 0) {
      const index = cursor % STATE_SIZE;
      cursor = rotateLeft((cursor + MS) >>> 0, 7 + (round & 7));
      state[index] = (cursor ^ splitmix64(cursor)) >>> 0;
      cursor = splitmix64(cursor + index);
    } else {
      state[round] = JL[round & 15];
    }
  }

  return { S: state, acc: splitmix64(cursor ^ 2779096485) >>> 0 };
}

function nextWord(state: { S: number[]; acc: number }, counter: number): number {
  const table = state.S;
  let acc = state.acc;
  const slot = acc % STATE_SIZE;
  const guard = 0 - +(slot in table);
  const value = (table[slot] || 0) >>> 0;
  const mixed = Math.imul(MS, counter + 1) >>> 0;
  let word = mix(acc, (value ^ mixed) >>> 0, guard);
  word = (rotateLeft((word + acc) >>> 0, slot & 31) ^ rotateLeft(acc, Math.imul(slot, 7) & 31)) >>> 0;
  acc = splitmix64(word + MS);
  table[slot] = acc >>> 0;
  state.acc = acc;
  return acc;
}

export function decryptVidKingPayload(encoded: string, seed: string, mediaId: number): string {
  const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(encoded.length / 4) * 4, "=");
  const rawBin = typeof atob !== "undefined" ? atob(normalized) : Buffer.from(normalized, "base64").toString("binary");
  const payload = new Uint8Array(rawBin.length);
  for (let i = 0; i < rawBin.length; i++) {
    payload[i] = rawBin.charCodeAt(i);
  }

  const state = initState(seed, mediaId);
  let counter = 0;

  for (let offset = 0; offset < payload.length; ) {
    const word = nextWord(state, counter++);
    payload[offset++] ^= word & 255;
    if (offset < payload.length) payload[offset++] ^= (word >>> 8) & 255;
    if (offset < payload.length) payload[offset++] ^= (word >>> 16) & 255;
    if (offset < payload.length) payload[offset++] ^= (word >>> 24) & 255;
  }

  for (let i = 0; i < MAGIC_BYTES.length; i++) {
    if (payload[i] !== MAGIC_BYTES[i]) {
      throw new Error("Decryption verification failed: invalid magic bytes");
    }
  }

  return new TextDecoder("utf-8").decode(payload.subarray(MAGIC_BYTES.length));
}

export function encryptVidKingPayload(plaintext: string, seed: string, mediaId: number): string {
  const textBytes = new TextEncoder().encode(plaintext);
  const payload = new Uint8Array(MAGIC_BYTES.length + textBytes.length);
  payload.set(MAGIC_BYTES, 0);
  payload.set(textBytes, MAGIC_BYTES.length);

  const state = initState(seed, mediaId);
  let counter = 0;

  for (let offset = 0; offset < payload.length; ) {
    const word = nextWord(state, counter++);
    payload[offset++] ^= word & 255;
    if (offset < payload.length) payload[offset++] ^= (word >>> 8) & 255;
    if (offset < payload.length) payload[offset++] ^= (word >>> 16) & 255;
    if (offset < payload.length) payload[offset++] ^= (word >>> 24) & 255;
  }

  return Buffer.from(payload).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
