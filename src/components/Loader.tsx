'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { uiStore, useUI } from '@/lib/ui';
import { scroll } from '@/lib/scroll';

/**
 * ============================================================================
 * LOADING SCENE
 * ============================================================================
 * A cinematic pre-roll rather than a spinner: an animated SVG glyph draws
 * itself, boot lines type out, and the counter eases to 100 with a decaying
 * random walk so it never feels fake-linear.
 *
 * On exit the whole panel wipes upward while a light bar sweeps across —
 * which is also when the camera's intro dolly starts (scroll.entered = true).
 * ============================================================================
 */

const BOOT_LINES = [
  'initialising webgl context',
  'compiling glsl shaders',
  'seeding particle fields',
  'building procedural geometry',
  'calibrating camera spline',
  'ready',
];

export function Loader() {
  const { loading } = useUI();
  const [pct, setPct] = useState(0);
  const [line, setLine] = useState(0);
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
      setLine(Math.min(BOOT_LINES.length - 1, Math.floor(eased * BOOT_LINES.length)));

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
          {/* Animated SVG mark that draws itself */}
          <svg className="loader-mark" viewBox="0 0 120 120" fill="none">
            <motion.circle
              cx="60"
              cy="60"
              r="46"
              stroke="url(#lg)"
              strokeWidth="1"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 2.2, ease: 'easeInOut' }}
            />
            <motion.path
              d="M60 14 L106 60 L60 106 L14 60 Z"
              stroke="url(#lg)"
              strokeWidth="1"
              initial={{ pathLength: 0, rotate: 0 }}
              animate={{ pathLength: 1, rotate: 90 }}
              transition={{ duration: 2.4, ease: 'easeInOut' }}
              style={{ transformOrigin: '60px 60px' }}
            />
            <motion.circle
              cx="60"
              cy="60"
              r="6"
              fill="url(#lg)"
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.35, 1] }}
              transition={{ duration: 1.4, ease: 'easeOut' }}
              style={{ transformOrigin: '60px 60px' }}
            />
            <defs>
              <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#22E1FF" />
                <stop offset="100%" stopColor="#8B5CFF" />
              </linearGradient>
            </defs>
          </svg>

          <div className="loader-meta">
            <div className="loader-count">{String(pct).padStart(3, '0')}</div>
            <div className="loader-bar">
              <i style={{ transform: `scaleX(${pct / 100})` }} />
            </div>
            <div className="loader-line">{BOOT_LINES[line]}</div>
          </div>

          <div className="loader-corner loader-tl">FARHAN LABIB AHAN</div>
          <div className="loader-corner loader-br">WEBGL EXPERIENCE — 2026</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
