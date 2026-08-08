'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { uiStore, useUI } from '@/lib/ui';
import { scroll } from '@/lib/scroll';

/**
 * ============================================================================
 * LOADING SCENE
 * ============================================================================
 * A lightweight pre-roll rather than a signature card: a spinning ring and a
 * percentage counter ease to 100 with a decaying random walk so it never
 * feels fake-linear.
 *
 * The panel is a translucent black veil, so the real page — WebGL lab and
 * hero — is already visible behind it. On exit it fades to fully
 * transparent, which is also when the camera's intro dolly starts
 * (scroll.entered = true).
 * ============================================================================
 */

export function Loader() {
  const { loading } = useUI();
  const [pct, setPct] = useState(0);
  const raf = useRef(0);

  useEffect(() => {
    const start = performance.now();
    const DURATION = 2600;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION);
      // Ease-out-expo with a little jitter so it reads as real work.
      const eased = t >= 1 ? 1 : 1 - Math.pow(2, -9 * t);
      const jitter = t < 0.96 ? Math.sin(now * 0.02) * 1.4 : 0;
      const v = Math.min(100, Math.round(eased * 100 + jitter));

      setPct(v);

      if (t < 1) {
        raf.current = requestAnimationFrame(tick);
      } else {
        setPct(100);
        // Hold on 100 for a beat — the pause is what makes it feel deliberate.
        window.setTimeout(() => {
          uiStore.set({ loading: false });
          scroll.entered = true;
        }, 520);
      }
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, []);

  // Lock scrolling while the loader is up.
  useEffect(() => {
    document.documentElement.classList.toggle('lenis-stopped', loading);
    return () => document.documentElement.classList.remove('lenis-stopped');
  }, [loading]);

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          className="loader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
        >
          <div className="loader-spinner" aria-hidden>
            <i />
          </div>

          <div className="loader-meta">
            <div className="loader-count">{String(pct).padStart(3, '0')}</div>
            <div className="loader-bar">
              <i style={{ transform: `scaleX(${pct / 100})` }} />
            </div>
          </div>

          <div className="loader-corner loader-tl">FARHAN LABIB AHAN</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
