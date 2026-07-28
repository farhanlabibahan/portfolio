'use client';

/**
 * ============================================================================
 * SECTION ACTIVATION
 * ============================================================================
 * Tells the entrance animations (SplitText, Reveal) when their chapter is
 * actually the one being looked at.
 *
 * Why this exists: those components originally used IntersectionObserver via
 * framer's `useInView`. That works for a normal document, but every
 * `.chapter-inner` here is `position: fixed; inset: 0` — so as far as the
 * observer is concerned all six chapters are on screen, permanently, from the
 * first frame. Every stagger in the site therefore fired at once during the
 * loading scene and was long finished by the time you scrolled anywhere. All
 * that remained on arrival was the opacity ramp, which is exactly why chapters
 * appeared to pop in fully-formed.
 *
 * Scroll index is the real source of truth for "which chapter am I in", so
 * activation reads that instead. It is sampled on a RAF loop but only commits
 * to React state when the boolean flips, so a full scroll of the page costs a
 * couple of renders per chapter rather than one per frame.
 * ============================================================================
 */

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { SECTIONS, scroll } from './scroll';

/** `null` = no chapter context (used outside a Shell) — fall back to useInView. */
const SectionActiveCtx = createContext<boolean | null>(null);

/**
 * Hysteresis. ON slightly before the copy starts fading in, so the stagger is
 * already running as the pane becomes visible rather than starting after it
 * has landed; OFF well after it has gone, so a small scroll wobble at the
 * boundary cannot strobe the animation.
 */
const ON_WITHIN = 0.5;
const OFF_BEYOND = 0.64;

export function SectionActiveProvider({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  // First chapter starts active: it is on screen before any scrolling happens,
  // and server and client must agree on the first render.
  const target = SECTIONS.indexOf(id as (typeof SECTIONS)[number]);
  const [active, setActive] = useState(target === 0);

  useEffect(() => {
    if (target < 0) return;

    let raf = 0;
    let current = target === 0;

    const loop = () => {
      const d = Math.abs(scroll.index - target);
      const next = current ? d < OFF_BEYOND : d < ON_WITHIN;
      if (next !== current) {
        current = next;
        setActive(next);
      }
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  return <SectionActiveCtx.Provider value={active}>{children}</SectionActiveCtx.Provider>;
}

/**
 * `true`/`false` inside a chapter, `null` outside one. Callers treat `null` as
 * "decide for yourself" and fall back to intersection observation.
 */
export function useSectionActive() {
  return useContext(SectionActiveCtx);
}

/** Convenience for the entrance components: context wins, viewport is fallback. */
export function useEntrance(inView: boolean) {
  const active = useSectionActive();
  return useMemo(() => (active === null ? inView : active), [active, inView]);
}
