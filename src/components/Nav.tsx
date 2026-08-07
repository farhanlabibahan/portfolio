'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { SECTIONS, SECTION_VH } from '@/lib/scroll';
import { setCursor } from '@/lib/ui';
import { useContent } from '@/lib/store';

/** Fixed top chrome — mark and a jump-to-contact CTA. */
export function Nav() {
  const { content } = useContent();

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
          src="/portfolio/signature-white.png"
          alt="Farhan Labib signature"
          width="32"
          height="22"
          draggable={false}
        />
        <span>{content.name.split(' ').slice(0, 2).join(' ')}</span>
      </a>

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

