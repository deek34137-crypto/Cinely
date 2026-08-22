export interface FlareSolverrResponse {
  status: "ok" | "error";
  message: string;
  solution?: {
    url: string;
    status: number;
    headers: Record<string, string>;
    response: string;
    cookies: Array<{
      name: string;
      value: string;
      domain: string;
      path: string;
    }>;
    userAgent: string;
  };
}

export async function solveCloudflareChallenge(
  url: string,
  flaresolverrUrl = process.env.FLARESOLVERR_URL || "http://localhost:8191/v1"
): Promise<string | null> {
  try {
    const res = await fetch(flaresolverrUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cmd: "request.get",
        url,
        maxTimeout: 60000,
      }),
      signal: AbortSignal.timeout(65000),
    });

    if (!res.ok) return null;
    const data = (await res.json()) as FlareSolverrResponse;
    if (data.status === "ok" && data.solution?.response) {
      return data.solution.response;
    }
    return null;
  } catch (error) {
    console.warn("FlareSolverr not available or timed out:", error);
    return null;
  }
}
