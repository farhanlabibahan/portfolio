'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { scroll, SECTIONS, SECTION_VH } from '@/lib/scroll';
import { setCursor } from '@/lib/ui';
import { useContent } from '@/lib/store';

/** Fixed top chrome — mark, live coordinate readout, and a jump-to-contact CTA. */
export function Nav() {
  const { content } = useContent();
  const coordRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      if (coordRef.current) {
        // A live telemetry readout — small detail, big "this is a machine" energy.
        const z = (-scroll.progress * 268).toFixed(1);
        const v = (scroll.velocity * 100).toFixed(0);
        coordRef.current.textContent = `z ${z.padStart(6, ' ')}  ·  v ${v.padStart(4, ' ')}`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

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
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
          <circle cx="12" cy="12" r="9" stroke="url(#ng)" strokeWidth="1.2" />
          <circle cx="12" cy="12" r="3" fill="url(#ng)" />
          <defs>
            <linearGradient id="ng" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#22E1FF" />
              <stop offset="100%" stopColor="#8B5CFF" />
            </linearGradient>
          </defs>
        </svg>
        <span>{content.name.split(' ').map((w) => w[0]).join('')}</span>
      </a>

      <span ref={coordRef} className="nav-coord" />

      <div className="nav-actions">
        <a
          className="nav-cta"
          href="#contact"
          onClick={(e) => {
            e.preventDefault();
            const i = SECTIONS.indexOf('contact');
            window.scrollTo({
              top: i * SECTION_VH * window.innerHeight * 0.01,
              behavior: 'smooth',
            });
          }}
          onMouseEnter={() => setCursor('hover')}
          onMouseLeave={() => setCursor('default')}
          data-magnetic
        >
          Contact
        </a>
      </div>
    </motion.header>
  );
}

