import type Lenis from 'lenis';

/**
 * ============================================================================
 * SCROLL STATE SINGLETON
 * ============================================================================
 * Scroll drives *everything* — camera, shaders, particle morphs. Pushing that
 * through React state would re-render the tree 120x/second, so instead we keep
 * a plain mutable object that Lenis writes to and `useFrame` reads from.
 * Zero re-renders, zero garbage.
 * ============================================================================
 */

export type ScrollState = {
  /** Raw normalised page progress, 0 → 1. */
  progress: number;
  /** Damped version of `progress` — what the camera actually follows. */
  smooth: number;
  /** Signed scroll velocity, roughly -1 → 1. Used for motion blur / lens FX. */
  velocity: number;
  /** Continuous section index: 0 → SECTIONS.length - 1. */
  index: number;
  /** Pointer in NDC (-1 → 1), damped. */
  mouse: { x: number; y: number };
  /** Raw pointer in NDC. */
  mouseRaw: { x: number; y: number };
  /** Pixel pointer position (for the DOM cursor). */
  pointer: { x: number; y: number };
  /** Viewport aspect helper — <1 means portrait/mobile. */
  aspect: number;
  /** Set true once the loading scene finishes. */
  entered: boolean;
  /** Easter egg: cranked to 1 when the konami code fires. */
  chaos: number;
  /** Global quality tier, 0 = low, 1 = high. */
  quality: number;
};

export const scroll: ScrollState = {
  progress: 0,
  smooth: 0,
  velocity: 0,
  index: 0,
  mouse: { x: 0, y: 0 },
  mouseRaw: { x: 0, y: 0 },
  pointer: { x: 0, y: 0 },
  aspect: 1.6,
  entered: false,
  chaos: 0,
  quality: 1,
};

/**
 * Section identifiers, in scroll order. Drives camera keyframes + nav.
 *
 * One section = one workstation in the lab. The abstract transition sections
 * (deep space, neural net) are gone: they carried no content, and the camera
 * spent a third of the journey drifting through empty black.
 */
export const SECTIONS = [
  'hero',
  'about',
  'journey',
  'awards',
  'work',
  'editing',
  'contact',
] as const;

export type SectionId = (typeof SECTIONS)[number];

/** Plain-English chapter names. */
export const SECTION_LABELS: Record<SectionId, string> = {
  hero: 'Home',
  about: 'About',
  journey: 'Journey',
  awards: 'Achievements',
  work: 'Work',
  editing: 'Editing',
  contact: 'Contact',
};

/** Every section is now a real destination, so the rail lists all of them. */
export const NAV_SECTIONS: SectionId[] = [...SECTIONS];

/** Scroll length allocated to each section, in viewport heights. */
export const SECTION_VH = 160;

/* ---------------------------------------------------------------------------
   MATH HELPERS
   ------------------------------------------------------------------------ */

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Frame-rate independent damping. `l` ~ 3..12 feels good. */
export const damp = (a: number, b: number, l: number, dt: number) =>
  lerp(a, b, 1 - Math.exp(-l * dt));

export const smoothstep = (t: number) => {
  const x = clamp(t);
  return x * x * (3 - 2 * x);
};

export const smootherstep = (t: number) => {
  const x = clamp(t);
  return x * x * x * (x * (x * 6 - 15) + 10);
};

/** Map v from [a,b] to [0,1], clamped. */
export const range = (v: number, a: number, b: number) => clamp((v - a) / (b - a));

/**
 * A 0 → 1 → 0 window. Returns how "active" a section is given the continuous
 * section index. `width` widens the crossfade between neighbouring scenes.
 */
export const window01 = (index: number, target: number, width = 1) =>
  smoothstep(1 - clamp(Math.abs(index - target) / width));

/** Local 0 → 1 progress *within* section `target`. */
export const local = (index: number, target: number) => clamp(index - target + 0.5, 0, 1);

/**
 * 0 → 1 progress across a section, by section id.
 *
 * The window is exactly ±0.5 index — i.e. from the midpoint between this
 * section and the previous one, to the midpoint before the next. That matches
 * the span for which the section's fixed pane is on screen, so a card reel
 * gets the section's full scroll range to work through rather than a fraction
 * of it.
 */
export const throughFor = (id: SectionId) => {
  const target = SECTIONS.indexOf(id);
  return clamp(scroll.index - target + 0.5);
};

/**
 * Position of card `slot` on a reel, in slot units.
 * 0 = dead centre, +1 = one slot below (waiting), -1 = one slot above (gone).
 */
export const reelOffset = (slot: number, count: number, through: number) => {
  const p = clamp((through - 0.1) / 0.8);
  return slot - p * Math.max(1, count - 1);
};

/** Presence for a reel slot — full inside `dead`, gone past `cutoff`. */
export const reelReveal = (offset: number, dead = 0.16, cutoff = 0.74) => {
  const a = Math.abs(offset);
  return 1 - smootherstep(clamp((a - dead) / (cutoff - dead)));
};

/* ---------------------------------------------------------------------------
   LENIS BRIDGE
   Lenis lives inside useLenis (a component) but nested scroll panes need to
   hand the wheel back to it once they run out of room. Keep a module-level
   handle here so a pane at its scroll boundary can feed Lenis exactly the
   same delta it would receive from a wheel over the page itself.
   ------------------------------------------------------------------------ */

let lenis: Lenis | null = null;

export function setLenis(instance: Lenis | null) {
  lenis = instance;
}

/** Feed one wheel tick into Lenis as if it had been scrolled over the page. */
export function lenisWheel(deltaY: number, deltaMode: number) {
  if (!lenis) return;
  const o = lenis.options as Lenis['options'] & { lerp: number; wheelMultiplier: number };
  const multiplier = deltaMode === 1 ? 100 / 6 : deltaMode === 2 ? window.innerHeight : 1;
  lenis.scrollTo(lenis.targetScroll + deltaY * multiplier * o.wheelMultiplier, {
    programmatic: false,
    lerp: o.lerp,
    duration: o.duration,
    easing: o.easing,
  });
}
