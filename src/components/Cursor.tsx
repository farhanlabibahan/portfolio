'use client';

import { useEffect, useRef } from 'react';
import { useUI } from '@/lib/ui';

/**
 * ============================================================================
 * CUSTOM CURSOR
 * ============================================================================
 * Three layers, each with its own inertia:
 *   1. dot    — 1:1 with the pointer (instant, so clicks feel accurate)
 *   2. ring   — heavy lag + magnetic snap to [data-magnetic] elements
 *   3. trail  — 14 particles chasing each other with decreasing stiffness
 *
 * Everything runs in a single RAF loop writing transforms directly to the DOM.
 * React never re-renders on pointer move.
 * ============================================================================
 */

const TRAIL = 14;

export function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const trailRefs = useRef<(HTMLDivElement | null)[]>([]);
  const { cursor } = useUI();
  const cursorRef = useRef(cursor);
  cursorRef.current = cursor;

  useEffect(() => {
    // Touch devices get the native (absent) cursor — a fake one is useless there.
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    document.documentElement.classList.add('has-custom-cursor');

    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const ring = { x: target.x, y: target.y, s: 1 };
    const trail = Array.from({ length: TRAIL }, () => ({ x: target.x, y: target.y }));
    let magnet: HTMLElement | null = null;
    let down = false;

    const onMove = (e: PointerEvent) => {
      target.x = e.clientX;
      target.y = e.clientY;

      // Magnetic detection — cheapest reliable way is elementFromPoint.
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      magnet = el?.closest<HTMLElement>('[data-magnetic]') ?? null;
    };

    const onDown = () => (down = true);
    const onUp = () => (down = false);

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);

    let raf = 0;
    const loop = () => {
      // --- dot: instant -----------------------------------------------------
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${target.x}px, ${target.y}px, 0)`;
      }

      // --- ring: lagged, snaps to magnetic targets --------------------------
      let rx = target.x;
      let ry = target.y;
      let scale = 1;

      if (magnet) {
        const r = magnet.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        // Pull 55% of the way toward the element's centre.
        rx = target.x + (cx - target.x) * 0.55;
        ry = target.y + (cy - target.y) * 0.55;
        scale = Math.max(r.width, r.height) / 38 + 0.15;

        // Push the element itself toward the cursor — the other half of the
        // magnetic effect, and the part people actually notice.
        const mx = (target.x - cx) * 0.28;
        const my = (target.y - cy) * 0.28;
        magnet.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
      }

      // Context-driven sizes.
      const ctx = cursorRef.current;
      if (!magnet) {
        scale = ctx === 'view' ? 2.3 : ctx === 'hover' ? 1.75 : ctx === 'text' ? 0.35 : 1;
      }
      if (down) scale *= 0.72;

      ring.x += (rx - ring.x) * 0.16;
      ring.y += (ry - ring.y) * 0.16;
      ring.s += (scale - ring.s) * 0.14;

      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ring.x}px, ${ring.y}px, 0) scale(${ring.s})`;
        ringRef.current.style.borderColor =
          ctx === 'view' ? 'rgba(196,107,255,0.75)' : 'rgba(34,225,255,0.55)';
      }

      // --- trail: chain of springs ------------------------------------------
      let px = target.x;
      let py = target.y;
      for (let i = 0; i < TRAIL; i++) {
        const t = trail[i];
        const k = 0.34 - i * 0.016;
        t.x += (px - t.x) * k;
        t.y += (py - t.y) * k;
        px = t.x;
        py = t.y;

        const el = trailRefs.current[i];
        if (el) {
          const f = 1 - i / TRAIL;
          el.style.transform = `translate3d(${t.x}px, ${t.y}px, 0) scale(${f * 1.5})`;
          el.style.opacity = String(f * 0.5);
        }
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    // Reset any element we left mid-magnetise.
    const clearMagnets = () => {
      document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => {
        if (el !== magnet) el.style.transform = '';
      });
    };
    const clearInterval_ = window.setInterval(clearMagnets, 120);

    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(clearInterval_);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      document.documentElement.classList.remove('has-custom-cursor');
    };
  }, []);

  return (
    <>
      {Array.from({ length: TRAIL }).map((_, i) => (
        <div
          key={i}
          ref={(el) => {
            trailRefs.current[i] = el;
          }}
          className="cursor-trail"
          style={{
            background: i % 2 ? 'rgba(34,225,255,0.9)' : 'rgba(139,92,255,0.9)',
            boxShadow: '0 0 8px currentColor',
          }}
        />
      ))}
      <div ref={ringRef} className="cursor-ring" />
      <div ref={dotRef} className="cursor-dot" />
    </>
  );
}
