import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

if (typeof window !== 'undefined' && typeof window.HTMLElement !== 'undefined') {
  if (!window.HTMLElement.prototype.scrollBy) {
    window.HTMLElement.prototype.scrollBy = vi.fn();
  }
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
