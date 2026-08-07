'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { uiStore, useUI } from '@/lib/ui';
import { scroll } from '@/lib/scroll';

/**
 * ============================================================================
 * LOADING SCENE
 * ============================================================================
 * A cinematic pre-roll rather than a spinner: the signature fades in and
 * back out while the counter eases to 100 with a decaying random walk so it
 * never feels fake-linear.
 *
 * On exit the whole panel wipes upward while a light bar sweeps across —
 * which is also when the camera's intro dolly starts (scroll.entered = true).
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
          exit={{ clipPath: 'inset(0 0 100% 0)', opacity: 1 }}
          transition={{ duration: 1.15, ease: [0.76, 0, 0.24, 1] }}
        >
          {/* The signature, simply faded in and back out */}
          <motion.img
            className="loader-sig"
            src="/portfolio/signature-white.png"
            alt="Farhan Labib signature"
            draggable={false}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: [0, 1, 1, 0], y: [12, 0, 0, -8] }}
            transition={{
              duration: 2.6,
              times: [0, 0.3, 0.82, 1],
              ease: 'easeInOut',
            }}
          />

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
