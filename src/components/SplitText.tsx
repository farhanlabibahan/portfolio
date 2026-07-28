'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { useEntrance } from '@/lib/sectionActive';

/**
 * Character-by-character reveal. Splits on words first so text still wraps
 * correctly, then on characters inside each word — naive per-character
 * splitting breaks line-wrapping and is the most common way this effect goes
 * wrong.
 */
type Props = {
  text: string;
  className?: string;
  /** Seconds between each character. */
  stagger?: number;
  delay?: number;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span' | 'div';
  /** Re-run the animation every time it scrolls into view. */
  repeat?: boolean;
};

export function SplitText({
  text,
  className = '',
  stagger = 0.022,
  delay = 0,
  as = 'div',
  repeat = true,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const viewed = useInView(ref, { once: !repeat, amount: 0.35 });
  // Inside a chapter this is the section's own activation; the observer is only
  // a fallback for headings rendered outside one. See lib/sectionActive.
  const inView = useEntrance(viewed);
  const Tag = motion[as] as typeof motion.div;

  const words = text.split(' ');
  let index = 0;

  return (
    <Tag ref={ref} className={className} aria-label={text}>
      {words.map((word, w) => (
        <span key={w} style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
          {Array.from(word).map((ch) => {
            const i = index++;
            return (
              // No per-character `filter` here on purpose: a filter on a
              // descendant of a `background-clip: text` element detaches it
              // from the clipped background and the glyph renders blank.
              <motion.span
                key={i}
                className="char"
                aria-hidden
                initial={{ y: '0.85em', opacity: 0, rotateX: -70 }}
                animate={
                  inView
                    ? { y: '0em', opacity: 1, rotateX: 0 }
                    : { y: '0.85em', opacity: 0, rotateX: -70 }
                }
                transition={{
                  duration: 0.72,
                  delay: delay + i * stagger,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                {ch}
              </motion.span>
            );
          })}
          {w < words.length - 1 && <span className="char">&nbsp;</span>}
        </span>
      ))}
    </Tag>
  );
}

/** Simple fade+rise wrapper for blocks that don't need per-character work. */
export function Reveal({
  children,
  delay = 0,
  y = 26,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const viewed = useInView(ref, { amount: 0.25 });
  const inView = useEntrance(viewed);

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y, filter: 'blur(8px)' }}
      animate={inView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : { opacity: 0, y, filter: 'blur(8px)' }}
      transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
