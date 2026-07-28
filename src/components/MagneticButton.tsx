'use client';

import { setCursor } from '@/lib/ui';

/**
 * A glass CTA that the custom cursor physically attracts (see Cursor.tsx —
 * the `[data-magnetic]` attribute is what it looks for). The transform is
 * applied by the cursor's RAF loop, so this component stays render-free.
 */
type Props = {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: 'primary' | 'ghost';
  className?: string;
};

export function MagneticButton({
  children,
  href,
  onClick,
  variant = 'primary',
  className = '',
}: Props) {
  const common = {
    className: `mag-btn mag-${variant} glass glass-sheen ${className}`,
    'data-magnetic': true,
    onMouseEnter: () => setCursor('hover'),
    onMouseLeave: () => setCursor('default'),
  };

  const inner = (
    <>
      <span className="mag-label">{children}</span>
      <span className="mag-glow" aria-hidden />
    </>
  );

  if (href) {
    return (
      <a
        {...common}
        href={href}
        target={href.startsWith('http') ? '_blank' : undefined}
        rel={href.startsWith('http') ? 'noreferrer noopener' : undefined}
      >
        {inner}
      </a>
    );
  }

  return (
    <button {...common} type="button" onClick={onClick}>
      {inner}
    </button>
  );
}
