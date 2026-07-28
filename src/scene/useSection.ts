'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import {
  scroll,
  window01,
  clamp,
  smootherstep,
  SECTIONS,
  type SectionId,
} from '@/lib/scroll';

export type SectionSignal = {
  /** 0 → 1 → 0 as the camera passes through this section. */
  active: number;
  /** -1 (before) → 0 (centred) → +1 (after). */
  signed: number;
  /** 0 → 1 across the whole section, monotonically increasing. */
  through: number;
};

const sig: SectionSignal = { active: 0, signed: -1, through: 0 };

/** Compute this section's scroll signals for the current frame. */
export function readSection(id: SectionId, width = 1.15): SectionSignal {
  const target = SECTIONS.indexOf(id);
  sig.active = window01(scroll.index, target, width);
  sig.signed = clamp(scroll.index - target, -1.5, 1.5);
  sig.through = clamp((scroll.index - target + 0.85) / 1.7);
  return sig;
}

/**
 * ============================================================================
 * VERTICAL REEL
 * ============================================================================
 * Cards ride a vertical conveyor directly in front of the camera: each one
 * rises from below into dead centre, holds while you read it, then continues
 * up and out as the next arrives.
 *
 * Why this rather than scattering them through the scene: a card is only truly
 * legible when it's centred, square-on and close. Anything laid out to the
 * side is being read at an angle, at distance, over whatever the 3D happens to
 * be doing behind it. Centring every card in turn means every card gets the
 * best seat in the house.
 *
 * @param slot     card index
 * @param count    total cards
 * @param through  0 → 1 progress across the section
 * @returns `offset` in slots (0 = dead centre, +1 = one slot below, -1 above)
 */
export function reelOffset(slot: number, count: number, through: number): number {
  // Spread the run across the section with a little padding at each end, so
  // the first card is already settled on entry and the last doesn't get
  // clipped by the section boundary.
  const p = clamp((through - 0.1) / 0.8);
  return slot - p * Math.max(1, count - 1);
}

/**
 * Presence for a reel slot. Full inside the dead zone, gone past the cutoff —
 * a deliberately short crossfade so two cards are never both competing for
 * attention at readable opacity.
 */
export function reelReveal(offset: number, dead = 0.16, cutoff = 0.74): number {
  const a = Math.abs(offset);
  return 1 - smootherstep(clamp((a - dead) / (cutoff - dead)));
}

/**
 * Frustum/perf gate: hides a whole scene group once it's far enough from the
 * camera that it can't contribute anything. Saves an enormous amount of GPU on
 * the sections you aren't looking at.
 */
export function useSectionGate(id: SectionId, range = 1.6) {
  const ref = useRef<Group>(null);
  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    const target = SECTIONS.indexOf(id);
    const visible = Math.abs(scroll.index - target) < range;
    if (g.visible !== visible) g.visible = visible;
  });
  return ref;
}
