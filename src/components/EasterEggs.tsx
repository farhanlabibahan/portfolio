'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { scroll } from '@/lib/scroll';

/**
 * ============================================================================
 * EASTER EGGS
 * ============================================================================
 *   1. Konami code  → "chaos mode": particles go turbulent, bloom blows out,
 *                     the lens smears. Toggles off with the same code.
 *   2. Console art  → a greeting for anyone who opens devtools.
 *   3. `?` key      → shortcut card.
 * ============================================================================
 */

const KONAMI = [
  'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
  'b', 'a',
];

export function EasterEggs() {
  const [chaos, setChaos] = useState(false);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    let seq: string[] = [];

    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;

      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        setHelp((h) => !h);
        return;
      }

      seq = [...seq, e.key].slice(-KONAMI.length);
      if (seq.join(',').toLowerCase() === KONAMI.join(',').toLowerCase()) {
        seq = [];
        setChaos((c) => !c);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* Ramp the shared chaos uniform rather than snapping it. */
  useEffect(() => {
    let raf = 0;
    const target = chaos ? 1 : 0;
    const loop = () => {
      scroll.chaos += (target - scroll.chaos) * 0.06;
      if (Math.abs(scroll.chaos - target) > 0.002) raf = requestAnimationFrame(loop);
      else scroll.chaos = target;
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [chaos]);

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log(
      '%c◍ You found the console.\n%cNine worlds, one camera spline, ~150k particles.\nTry the Konami code. Press ? for shortcuts.',
      'color:#22E1FF;font-size:16px;font-weight:bold',
      'color:#8B5CFF;font-size:12px'
    );
  }, []);

  return (
    <>
      <AnimatePresence>
        {chaos && (
          <motion.div
            className="egg-banner"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
          >
            CHAOS MODE ENGAGED
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {help && (
          <motion.div
            className="egg-help glass"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.3 }}
          >
            <strong>Shortcuts</strong>
            <ul>
              <li>
                <kbd>?</kbd> toggle this card
              </li>
              <li>
                <kbd>↑↑↓↓←→←→BA</kbd> chaos mode
              </li>
              <li>
                <kbd>Esc</kbd> close overlays
              </li>
              <li>click a project screen to fly in</li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
