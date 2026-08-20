import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSourceFailover } from '../hooks/useSourceFailover';
import { PlaybackSource } from '../../../lib/types';

function createSource(id: string, name: string): PlaybackSource {
  return {
    id,
    providerId: id,
    providerName: name,
    name,
    title: `${name} Stream`,
    protocol: 'hls',
    url: `https://stream.example.com/${id}.m3u8`,
    isWebPlayable: true,
    quality: '1080p',
    score: 100,
  };
}

describe('useSourceFailover Hook (Phase 3C)', () => {
  const sourceA = createSource('src_a', 'Source A');
  const sourceB = createSource('src_b', 'Source B');
  const sourceC = createSource('src_c', 'Source C');

  it('selects primary source initially', () => {
    const { result } = renderHook(() =>
      useSourceFailover({
        selected: sourceA,
        alternatives: [sourceB, sourceC],
      })
    );

    expect(result.current.activeSource?.id).toBe('src_a');
    expect(result.current.allSources).toHaveLength(3);
    expect(result.current.hasAvailableSource).toBe(true);
  });

  it('advances to next alternative upon fatal failover trigger', () => {
    const onFailoverTriggered = vi.fn();
    const { result } = renderHook(() =>
      useSourceFailover({
        selected: sourceA,
        alternatives: [sourceB, sourceC],
        onFailoverTriggered,
      })
    );

    act(() => {
      result.current.triggerFailover(120);
    });

    expect(onFailoverTriggered).toHaveBeenCalledWith(sourceA, sourceB);
    expect(result.current.activeSource?.id).toBe('src_b');
    expect(result.current.failedSourceIds.has('src_a')).toBe(true);

    // Fail second source
    act(() => {
      result.current.triggerFailover(120);
    });

    expect(result.current.activeSource?.id).toBe('src_c');

    // Fail last source -> exhausted
    act(() => {
      result.current.triggerFailover(120);
    });

    expect(result.current.activeSource).toBeNull();
    expect(result.current.hasAvailableSource).toBe(false);
  });

  it('manual source selection overrides automatic selection without marking other sources failed', () => {
    const { result } = renderHook(() =>
      useSourceFailover({
        selected: sourceA,
        alternatives: [sourceB, sourceC],
      })
    );

    act(() => {
      result.current.selectSourceManually('src_c');
    });

    expect(result.current.activeSource?.id).toBe('src_c');
    // Source A and B are NOT marked as failed
    expect(result.current.failedSourceIds.has('src_a')).toBe(false);
    expect(result.current.failedSourceIds.has('src_b')).toBe(false);
  });

  it('resetFailover restores initial state on retry', () => {
    const { result } = renderHook(() =>
      useSourceFailover({
        selected: sourceA,
        alternatives: [sourceB],
      })
    );

    act(() => {
      result.current.triggerFailover();
    });
    act(() => {
      result.current.triggerFailover();
    });

    expect(result.current.hasAvailableSource).toBe(false);

    act(() => {
      result.current.resetFailover();
    });

    expect(result.current.activeSource?.id).toBe('src_a');
    expect(result.current.failedSourceIds.size).toBe(0);
    expect(result.current.hasAvailableSource).toBe(true);
  });
});
