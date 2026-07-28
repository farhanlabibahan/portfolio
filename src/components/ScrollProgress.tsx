'use client';

import { useEffect, useRef } from 'react';
import { scroll, SECTIONS, SECTION_LABELS, NAV_SECTIONS, SECTION_VH } from '@/lib/scroll';
import { setCursor } from '@/lib/ui';

/**
 * Right-rail chapter indicator. An SVG path is drawn progressively as you
 * scroll, with a dot riding along it and section labels that light up as the
 * camera enters each world. Clicking a chapter scrolls there.
 *
 * Updates run in RAF against the DOM directly — a React state update per frame
 * here would be the single most expensive thing on the page.
 */
export function ScrollProgress() {
  const pathRef = useRef<SVGPathElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);
  const labelRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const pctRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    const len = path.getTotalLength();
    path.style.strokeDasharray = `${len}`;
    path.style.strokeDashoffset = `${len}`;

    let raf = 0;
    const loop = () => {
      const p = scroll.smooth;
      path.style.strokeDashoffset = `${len * (1 - p)}`;

      const pt = path.getPointAtLength(len * p);
      if (dotRef.current) {
        dotRef.current.setAttribute('cx', String(pt.x));
        dotRef.current.setAttribute('cy', String(pt.y));
      }

      if (pctRef.current) {
        pctRef.current.textContent = String(Math.round(p * 100)).padStart(3, '0');
      }

      // The rail lists a subset of sections, so "active" means: the current
      // section index is nearer to this entry than to any other listed one.
      // Without that, scrolling through an unlisted transition section would
      // leave the whole rail showing nothing selected.
      const idx = scroll.index;
      let best = 0;
      let bestDist = Infinity;
      NAV_SECTIONS.forEach((id, i) => {
        const dist = Math.abs(idx - SECTIONS.indexOf(id));
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      });

      labelRefs.current.forEach((el, i) => {
        if (!el) return;
        el.dataset.on = i === best ? 'true' : 'false';
        el.style.opacity = i === best ? '1' : '0.62';
      });

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  /** Scroll to a section by its index in the *full* SECTIONS list. */
  const goTo = (sectionIndex: number) => {
    const y = sectionIndex * SECTION_VH * window.innerHeight * 0.01;
    window.scrollTo({ top: y, behavior: 'smooth' });
  };

  return (
    <div className="rail" aria-hidden={false}>
      <svg className="rail-svg" viewBox="0 0 40 320" fill="none" preserveAspectRatio="none">
        {/* Track */}
        <path
          d="M20 6 C 34 60, 6 110, 20 160 C 34 210, 6 260, 20 314"
          stroke="rgba(255,255,255,0.09)"
          strokeWidth="1"
        />
        {/* Progress */}
        <path
          ref={pathRef}
          d="M20 6 C 34 60, 6 110, 20 160 C 34 210, 6 260, 20 314"
          stroke="url(#railGrad)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle ref={dotRef} cx="20" cy="6" r="3.4" fill="#fff">
          <animate attributeName="r" values="3;4.2;3" dur="2.2s" repeatCount="indefinite" />
        </circle>
        <defs>
          <linearGradient id="railGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22E1FF" />
            <stop offset="60%" stopColor="#8B5CFF" />
            <stop offset="100%" stopColor="#C46BFF" />
          </linearGradient>
        </defs>
      </svg>

      <div className="rail-labels">
        {NAV_SECTIONS.map((id, i) => (
          <button
            key={id}
            ref={(el) => {
              labelRefs.current[i] = el;
            }}
            className="rail-label"
            onClick={() => goTo(SECTIONS.indexOf(id))}
            onMouseEnter={() => setCursor('hover')}
            onMouseLeave={() => setCursor('default')}
            data-magnetic
          >
            <span className="rail-num">{String(i + 1).padStart(2, '0')}</span>
            <span className="rail-name">{SECTION_LABELS[id]}</span>
          </button>
        ))}
      </div>

      <div className="rail-pct">
        <span ref={pctRef}>000</span>
        <i>%</i>
      </div>
    </div>
  );
}
