'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';
import { scroll, setLenis, SECTIONS, SECTION_VH, clamp } from '@/lib/scroll';

/**
 * Boots Lenis smooth scrolling and pumps the global scroll singleton.
 *
 * Weighty + organic is the brief, so: low lerp, a long expo-out easing curve,
 * and a slightly reduced wheel multiplier. The result is that a single wheel
 * flick keeps gliding for ~1.5s instead of stopping dead.
 */
export function useLenis() {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const lenis = new Lenis({
      duration: reduced ? 0.1 : 1.45,
      // Long expo-out tail — this is where the "cinematic weight" comes from.
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      wheelMultiplier: 0.85,
      touchMultiplier: 1.4,
      lerp: reduced ? 1 : 0.085,
      smoothWheel: !reduced,
      // Scrollable panes (tables, video grid) scroll themselves instead of
      // hijacking the wheel and scrolling the page underneath them.
      allowNestedScroll: true,
    });

    setLenis(lenis);

    let last = 0;
    let prevProgress = 0;

    /**
     * Section index is derived from *absolute* scroll distance rather than
     * normalised page progress. That keeps world index N exactly aligned with
     * the top of DOM section N, so the 3D scene and its HTML copy always
     * arrive together — normalising first introduces a drift of up to half a
     * viewport by the last section.
     */
    const onScroll = () => {
      const per = SECTION_VH * window.innerHeight * 0.01;
      const last = SECTIONS.length - 1;
      const idx = clamp(window.scrollY / per, 0, last);
      scroll.index = idx;
      scroll.progress = last > 0 ? idx / last : 0;
    };

    lenis.on('scroll', onScroll);
    onScroll();

    // Single RAF loop for Lenis + derived values, so nothing double-schedules.
    let raf = 0;
    const tick = (time: number) => {
      lenis.raf(time);

      const dt = Math.min(0.05, (time - last) / 1000) || 0.016;
      last = time;

      // Velocity: normalised delta of progress, damped so it decays smoothly.
      const delta = (scroll.progress - prevProgress) / dt;
      prevProgress = scroll.progress;
      scroll.velocity += (clamp(delta * 6, -1, 1) - scroll.velocity) * Math.min(1, dt * 8);

      // Damped scroll + pointer for anything that shouldn't snap.
      const k = 1 - Math.exp(-6 * dt);
      scroll.smooth += (scroll.progress - scroll.smooth) * k;
      scroll.mouse.x += (scroll.mouseRaw.x - scroll.mouse.x) * (1 - Math.exp(-4 * dt));
      scroll.mouse.y += (scroll.mouseRaw.y - scroll.mouse.y) * (1 - Math.exp(-4 * dt));

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onResize = () => {
      scroll.aspect = window.innerWidth / window.innerHeight;
      onScroll();
    };
    onResize();
    window.addEventListener('resize', onResize);

    document.documentElement.classList.add('lenis');

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      document.documentElement.classList.remove('lenis');
      setLenis(null);
      lenis.destroy();
    };
  }, []);
}
