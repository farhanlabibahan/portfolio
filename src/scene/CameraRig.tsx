'use client';

import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { scroll, SECTIONS, damp, clamp } from '@/lib/scroll';
import { STOPS } from './anchors';

/**
 * ============================================================================
 * CAMERA RIG — the spine of the whole experience
 * ============================================================================
 * One camera flies through all nine worlds. Its path is a Catmull-Rom spline
 * through per-section keyframes, sampled by scroll progress. Separate splines
 * for position and look-at target mean the camera can dolly forward while
 * panning sideways, orbit while descending, etc.
 *
 * On top of the spline we layer:
 *   - a per-section roll (Z rotation) for tilt
 *   - mouse parallax (damped, so it feels like weight not jitter)
 *   - velocity-driven FOV punch (fast scroll = wider lens = speed)
 *   - a low-amplitude handheld float so it never feels locked to a rail
 * ============================================================================
 */

type Key = {
  /** Camera position at this section. */
  pos: [number, number, number];
  /** What it's aiming at. */
  look: [number, number, number];
  /** Camera roll in radians. */
  roll?: number;
  /** Field of view. */
  fov?: number;
};

/**
 * One keyframe per section — one workstation each.
 *
 * The camera travels down the aisle at eye height, turning to face whichever
 * monitor it has arrived at. Because the stations alternate sides, it weaves
 * left and right as it goes, which gives the journey its motion without the
 * camera ever leaving the room.
 *
 * Generated from STATIONS rather than hand-typed so the two can't drift apart —
 * that desync is exactly what put the camera in empty space in earlier versions.
 */
export const KEYS: Key[] = STOPS.map((stop, i) => ({
  pos: stop.pos,
  look: stop.look,
  // A touch of alternating roll, so consecutive stops don't feel identical.
  roll: (i % 2 === 0 ? 1 : -1) * 0.012,
  fov: stop.fov,
}));

// Pre-build the splines once at module scope — they never change.
const posCurve = new THREE.CatmullRomCurve3(
  KEYS.map((k) => new THREE.Vector3(...k.pos)),
  false,
  'catmullrom',
  0.35
);
const lookCurve = new THREE.CatmullRomCurve3(
  KEYS.map((k) => new THREE.Vector3(...k.look)),
  false,
  'catmullrom',
  0.35
);

/** Reference aspect the FOV values are authored against. */
const BASE_ASPECT = 16 / 9;

const _pos = new THREE.Vector3();
const _look = new THREE.Vector3();
const _target = new THREE.Vector3();

/** Interpolate a scalar keyframe channel at continuous index `i`. */
function sampleScalar(i: number, pick: (k: Key) => number, fallback: number) {
  const a = Math.floor(clamp(i, 0, KEYS.length - 1));
  const b = Math.min(KEYS.length - 1, a + 1);
  const t = clamp(i - a);
  const va = pick(KEYS[a]) ?? fallback;
  const vb = pick(KEYS[b]) ?? fallback;
  // Smoothstep between keys so the derivative is continuous.
  const e = t * t * (3 - 2 * t);
  return va + (vb - va) * e;
}

export function CameraRig() {
  const { camera } = useThree();

  const state = useRef({
    pos: new THREE.Vector3(...KEYS[0].pos),
    look: new THREE.Vector3(...KEYS[0].look),
    roll: 0,
    fov: 45,
    intro: 0,
  });

  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05);
    const s = state.current;
    const n = KEYS.length - 1;

    // Spline parameter from damped scroll — the damping is what makes the
    // camera feel heavy rather than glued to the scrollbar.
    const t = clamp(scroll.smooth);

    posCurve.getPoint(t, _pos);
    lookCurve.getPoint(t, _look);

    const idx = t * n;
    const roll = sampleScalar(idx, (k) => k.roll ?? 0, 0);
    const baseFov = sampleScalar(idx, (k) => k.fov ?? 50, 50);

    // --- intro: a short dolly down the aisle after the loader clears -------
    // Kept small: the camera is inside a room now, so a big pull-back would
    // put it through the back wall.
    if (scroll.entered) s.intro = damp(s.intro, 1, 0.9, d);
    // Desk-scale: the room is ~3m across, so the intro push is centimetres,
    // not the metres the old warehouse-sized lab used.
    _pos.z += (1 - s.intro) * 0.55;
    _pos.y += (1 - s.intro) * 0.08;

    // --- mouse parallax: a head-turn, not an orbit -------------------------
    _pos.x += scroll.mouse.x * 0.06;
    _pos.y += scroll.mouse.y * 0.035;
    _look.x -= scroll.mouse.x * 0.05;
    _look.y -= scroll.mouse.y * 0.03;

    // --- handheld float: two out-of-phase sines, tiny amplitude -----------
    const time = performance.now() * 0.001;
    _pos.x += Math.sin(time * 0.31) * 0.008;
    _pos.y += Math.cos(time * 0.24) * 0.006;

    void SECTIONS;
    void clamp;

    // --- commit with damping ----------------------------------------------
    s.pos.lerp(_pos, 1 - Math.exp(-7 * d));
    s.look.lerp(_look, 1 - Math.exp(-5.5 * d));

    camera.position.copy(s.pos);
    _target.copy(s.look);
    camera.lookAt(_target);

    // Roll has to be applied *after* lookAt or it gets overwritten.
    s.roll = damp(s.roll, roll + scroll.mouse.x * 0.025 + scroll.velocity * 0.03, 4, d);
    camera.rotateZ(s.roll);

    // --- velocity FOV punch: fast scroll widens the lens -------------------
    const targetFov = baseFov + Math.abs(scroll.velocity) * 7 + scroll.chaos * 24;
    const cam = camera as THREE.PerspectiveCamera;
    s.fov = damp(s.fov, targetFov, 4, d);

    /**
     * Horizontal FOV lock.
     *
     * Three.js holds the *vertical* field of view fixed, so a portrait phone
     * sees a far narrower slice horizontally than a desktop — the monitor the
     * camera has parked in front of ends up cropped off both sides. Widening
     * the vertical FOV to hold the horizontal one roughly constant preserves
     * the composition on every device. Capped, or an ultra-narrow window would
     * fisheye the room.
     */
    let fov = s.fov;
    if (cam.aspect < BASE_ASPECT) {
      const half = Math.tan(THREE.MathUtils.degToRad(fov) / 2) * (BASE_ASPECT / cam.aspect);
      fov = Math.min(88, THREE.MathUtils.radToDeg(2 * Math.atan(half)));
    }

    if (Math.abs(cam.fov - fov) > 0.01) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
  });

  return null;
}
