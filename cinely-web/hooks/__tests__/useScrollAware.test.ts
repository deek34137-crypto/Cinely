import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useScrollAware } from '../useScrollAware';

describe('useScrollAware Hook', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true });
  });

  it('returns false initially when scrollY is 0', () => {
    const { result } = renderHook(() => useScrollAware(20));
    expect(result.current).toBe(false);
  });

  it('returns true when scrollY exceeds the threshold', () => {
    const { result } = renderHook(() => useScrollAware(20));

    act(() => {
      window.scrollY = 50;
      window.dispatchEvent(new Event('scroll'));
    });

    expect(result.current).toBe(true);
  });

  it('reverts to false when scrolled back above threshold', () => {
    const { result } = renderHook(() => useScrollAware(20));

    act(() => {
      window.scrollY = 50;
      window.dispatchEvent(new Event('scroll'));
    });
    expect(result.current).toBe(true);

    act(() => {
      window.scrollY = 10;
      window.dispatchEvent(new Event('scroll'));
    });
    expect(result.current).toBe(false);
  });
});
