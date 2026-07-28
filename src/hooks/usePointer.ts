'use client';

import { useEffect } from 'react';
import { scroll } from '@/lib/scroll';

/** Feeds raw pointer position (NDC + pixels) into the scroll singleton. */
export function usePointer() {
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      scroll.pointer.x = e.clientX;
      scroll.pointer.y = e.clientY;
      scroll.mouseRaw.x = (e.clientX / window.innerWidth) * 2 - 1;
      scroll.mouseRaw.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);
}
