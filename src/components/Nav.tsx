'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { scroll, SECTIONS, SECTION_LABELS, NAV_SECTIONS, SECTION_VH } from '@/lib/scroll';
import { setCursor } from '@/lib/ui';
import { useContent } from '@/lib/store';

/**
 * Fixed top chrome — portrait avatar on the left, every chapter as a
 * horizontal link in the centre (lit up as the camera arrives), CV on the
 * right. Replaces the old vertical right-rail.
 */
export function Nav() {
  const { content } = useContent();
  const linkRefs = useRef<(HTMLButtonElement | null)[]>([]);

  /* The nearest listed chapter becomes the active one. Updates hit the DOM in
     a RAF against the same `scroll.index` the camera uses — React state per
     frame would be the most expensive thing on the page. */
  useEffect(() => {
    let raf = 0;
    const loop = () => {
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
      linkRefs.current.forEach((el, i) => {
        if (!el) return;
        el.dataset.on = i === best ? 'true' : 'false';
        el.style.opacity = i === best ? '1' : '0.58';
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  /** Scroll to a section by its index in the *full* SECTIONS list. */
  const goTo = (sectionIndex: number) => {
    window.scrollTo({
      top: sectionIndex * SECTION_VH * window.innerHeight * 0.01,
      behavior: 'smooth',
    });
  };

  return (
    <motion.header
      className="nav"
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 3.4, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
    >
      <a
        className="nav-mark"
        href="#hero"
        onClick={(e) => {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onMouseEnter={() => setCursor('hover')}
        onMouseLeave={() => setCursor('default')}
        data-magnetic
      >
        <img
          className="nav-avatar"
          src="/portfolio/ahan.jpeg"
          alt={content.name}
          width="40"
          height="40"
          draggable={false}
        />
        <span>{content.name.split(' ').slice(0, 2).join(' ')}</span>
      </a>

      <nav className="nav-links" aria-label="Sections">
        {NAV_SECTIONS.map((id, i) => (
          <button
            key={id}
            ref={(el) => {
              linkRefs.current[i] = el;
            }}
            className="nav-link"
            onClick={() => goTo(SECTIONS.indexOf(id))}
            onMouseEnter={() => setCursor('hover')}
            onMouseLeave={() => setCursor('default')}
            data-magnetic
          >
            <span className="nav-num">{String(i + 1).padStart(2, '0')}</span>
            <span className="nav-name">{SECTION_LABELS[id]}</span>
          </button>
        ))}
      </nav>

      <div className="nav-actions">
        <Link
          className="nav-cta"
          href="/cv.pdf"
          target="_blank"
          rel="noreferrer noopener"
          onMouseEnter={() => setCursor('hover')}
          onMouseLeave={() => setCursor('default')}
          data-magnetic
        >
          CV
        </Link>
      </div>
    </motion.header>
  );
}
