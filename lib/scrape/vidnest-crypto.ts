export function decodeVidNestPayload(encoded: string, key?: string): string {
  try {
    // 1. Check if base64url encoded
    const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(encoded.length / 4) * 4, "=");
    const decoded = Buffer.from(normalized, "base64").toString("utf-8");
    
    if (decoded.startsWith("{") || decoded.startsWith("[")) {
      return decoded;
    }

    // 2. XOR unscramble if key is present
    if (key) {
      let result = "";
      for (let i = 0; i < decoded.length; i++) {
        result += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
      }
      return result;
    }

    return decoded;
  } catch (error) {
    console.error("Failed to decode VidNest payload:", error);
    return encoded;
  }
}

export function encodeVidNestPayload(text: string, key?: string): string {
  let toEncode = text;
  if (key) {
    let xored = "";
    for (let i = 0; i < text.length; i++) {
      xored += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    toEncode = xored;
  }
  return Buffer.from(toEncode, "utf-8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
