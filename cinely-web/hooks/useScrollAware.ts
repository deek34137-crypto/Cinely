'use client';

import { useState, useEffect } from 'react';

/**
 * Hook to detect whether the user has scrolled past a specific threshold.
 * Uses passive scroll listeners for smooth 60fps rendering.
 */
export function useScrollAware(threshold: number = 20): boolean {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > threshold;
      setIsScrolled(scrolled);
    };

    // Check initial position
    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  return isScrolled;
}
