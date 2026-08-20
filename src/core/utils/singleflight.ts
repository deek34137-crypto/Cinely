/**
 * Singleflight concurrency coordinator.
 * Ensures that duplicate concurrent calls for the same key share a single in-flight promise,
 * preventing redundant upstream calls.
 */
export class Singleflight<T> {
  private inFlight = new Map<string, Promise<T>>();

  /**
   * Executes the asynchronous worker function, or returns the existing in-flight Promise
   * if a call for the same key is already in progress.
   */
  async do(key: string, fn: () => Promise<T>): Promise<T> {
    const existing = this.inFlight.get(key);
    if (existing) {
      return existing;
    }

    const promise = (async () => {
      try {
        return await fn();
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, promise);
    return promise;
  }

  /**
   * Returns the count of currently in-flight executions.
   */
  get inFlightCount(): number {
    return this.inFlight.size;
  }

  /**
   * Clears all in-flight trackers (for testing/cleanup).
   */
  clear(): void {
    this.inFlight.clear();
  }
}
