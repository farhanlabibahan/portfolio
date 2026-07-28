'use client';

import { useEffect, useState } from 'react';
import { scroll } from '@/lib/scroll';

export type Quality = {
  /** 0 = mobile/low, 1 = desktop/high */
  tier: 0 | 1;
  /** Multiplier applied to every particle count in the scene. */
  particles: number;
  /** Whether to mount the expensive post-processing chain. */
  postFx: boolean;
  dpr: [number, number];
  isTouch: boolean;
};

const LOW: Quality = { tier: 0, particles: 0.3, postFx: true, dpr: [1, 1.5], isTouch: true };
const HIGH: Quality = { tier: 1, particles: 1, postFx: true, dpr: [1, 1.85], isTouch: false };

/**
 * Cheap device-capability probe. We can't reliably benchmark before first
 * paint, so we go on screen size + memory + core count, which correlates well
 * enough with GPU class in practice.
 */
export function useQuality(): Quality {
  const [q, setQ] = useState<Quality>(HIGH);

  useEffect(() => {
    const isTouch = window.matchMedia('(hover: none)').matches;
    const small = window.innerWidth < 900;
    const cores = navigator.hardwareConcurrency ?? 8;
    const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const weak = isTouch || small || cores <= 4 || mem <= 4;
    const next: Quality = weak
      ? { ...LOW, isTouch, postFx: !reduced }
      : { ...HIGH, isTouch, postFx: !reduced };

    scroll.quality = next.tier;
    setQ(next);
  }, []);

  return q;
}
