const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export interface ScrapeFetchOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
  referer?: string;
  proxyUrl?: string;
}

export async function scrapeFetch(url: string, options: ScrapeFetchOptions = {}): Promise<Response> {
  const { timeoutMs = 10000, retries = 2, referer, headers = {}, ...rest } = options;

  const mergedHeaders: Record<string, string> = {
    "User-Agent": DEFAULT_USER_AGENT,
    Accept: "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "cross-site",
    ...(referer ? { Referer: referer, Origin: new URL(referer).origin } : {}),
    ...(headers as Record<string, string>),
  };

  let lastError: any = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        ...rest,
        headers: mergedHeaders,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (err: any) {
      lastError = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error(`Failed to fetch ${url} after ${retries + 1} attempts`);
}
