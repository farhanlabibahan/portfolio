import type { SectionId } from '@/lib/scroll';

/**
 * ============================================================================
 * THE DESK — layout constants
 * ============================================================================
 * One CSE student's desk at night. Roughly metric: the desk surface is at
 * y = 0.75, the wall behind it at z = -1.05, the camera in front at positive z.
 *
 * Camera stops are derived from this file so the rig and the geometry can't
 * drift apart.
 * ============================================================================
 */

export const DESK = {
  /** Height of the desk surface. */
  top: 0.75,
  width: 3.4,
  depth: 1.15,
  /** Wall plane behind the desk. */
  wallZ: -1.05,
  /** Centre of the window opening. */
  windowY: 1.72,
  windowW: 2.5,
  windowH: 1.42,
  /** CRT screen centre. */
  crtY: 1.16,
  crtZ: -0.34,
  roomW: 6.2,
  roomH: 3.0,
};

export type Stop = {
  id: SectionId;
  pos: [number, number, number];
  look: [number, number, number];
  fov: number;
  /** Subject label, for the code that dims non-focused props. */
  focus: 'wide' | 'crt' | 'books' | 'wall' | 'window';
};

/**
 * One stop per chapter. The camera never cuts — it drifts around a single
 * desk, settling on whatever the section is about.
 */
export const STOPS: Stop[] = [
  // Establishing shot, framed like a photograph of the whole desk.
  { id: 'hero', pos: [0, 1.42, 3.05], look: [0, 1.3, -1.0], fov: 42, focus: 'wide' },
  // Lean in toward the monitor, slightly off-axis.
  { id: 'about', pos: [-0.62, 1.26, 1.62], look: [-0.05, 1.12, -0.4], fov: 40, focus: 'crt' },
  // Down onto the stack of books at the left of the desk.
  { id: 'journey', pos: [-0.72, 1.12, 1.12], look: [-1.02, 0.9, -0.15], fov: 38, focus: 'books' },
  // Up to the framed piece on the wall. The look target is ON the frame, not
  // partway toward it — aiming short pushes the subject to the edge of frame,
  // and the error is magnified on narrow viewports.
  { id: 'awards', pos: [1.28, 1.74, 0.92], look: [2.28, 2.02, -1.02], fov: 40, focus: 'wall' },
  // Square on to the CRT, close.
  { id: 'work', pos: [0.02, 1.18, 1.12], look: [0, 1.15, -0.4], fov: 38, focus: 'crt' },
  // Pull back and rise, the window filling the frame behind the desk.
  { id: 'contact', pos: [0, 1.58, 2.5], look: [0, 1.7, -1.05], fov: 44, focus: 'window' },
];

export const STOP_BY_ID = Object.fromEntries(STOPS.map((s) => [s.id, s])) as Record<
  SectionId,
  Stop
>;

/** Legacy alias — some modules only need a Z per section. */
export const ANCHORS = Object.fromEntries(STOPS.map((s) => [s.id, s.pos[2]])) as Record<
  SectionId,
  number
>;

export type LabPalette = {
  bg: string;
  fog: number;
  /** Room surfaces. */
  wall: string;
  floor: string;
  ceiling: string;
  desk: string;
  /** Warm pool from the desk lamp. */
  lamp: string;
  lampIntensity: number;
  /** Cool spill from the CRT. */
  crt: string;
  crtIntensity: number;
  /** Neon behind the rain glass. */
  neon: number;
  /** Sodium streetlight rising up the window. */
  street: string;
  ambient: number;
  ambientColor: string;
  hemiSky: string;
  hemiGround: string;
  hemi: number;
};

/**
 * The desk at night — the only palette.
 *
 * There is no theme switch. The scene is lit by four practicals (lamp, CRT,
 * neon, breadboard LEDs) against near-black; a "light mode" version of that is
 * a different room, not a different colour scheme, and every attempt to have
 * both meant swapping lighting at runtime — which is where the R3F
 * circular-structure crash kept coming from.
 */
export const PALETTE: LabPalette = {
  bg: '#05070B',
  fog: 0.045,
  wall: '#10151E',
  floor: '#080B11',
  ceiling: '#0B0F16',
  desk: '#4A3928',
  lamp: '#FFB44F',
  lampIntensity: 7.5,
  crt: '#4E7BFF',
  crtIntensity: 3.6,
  neon: 1.25,
  street: '#B8862F',
  ambient: 0.18,
  ambientColor: '#2C4162',
  hemiSky: '#38527D',
  hemiGround: '#05070B',
  hemi: 0.32,
};
