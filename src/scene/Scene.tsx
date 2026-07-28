'use client';

import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, AdaptiveDpr, Preload } from '@react-three/drei';
import * as THREE from 'three';
import { CameraRig } from './CameraRig';
import { Effects } from './Effects';
import { DeskScene } from './objects/DeskScene';
import { Dust } from './objects/Dust';
import { damp } from '@/lib/scroll';
import { PALETTE } from './anchors';
import type { Quality } from '@/hooks/useQuality';

/**
 * ============================================================================
 * SCENE ROOT
 * ============================================================================
 * One continuous environment — a computer lab — rather than a series of
 * disconnected abstract worlds. The camera never cuts; it travels down a
 * single room, stopping at each workstation.
 *
 * That change fixed more than the look: the old scenes were separate objects
 * hundreds of units apart with empty space between them, which is why parts of
 * the journey were literally black screens.
 * ============================================================================
 */

type Props = { quality: Quality };

/* Hoisted: an inline args array is a fresh reference each render, and R3F
   reads a changed `args` identity as "rebuild this object". The values here
   are the initial state only — the theme is applied by mutating the fog and
   background objects in AtmosphereDriver, never by changing these args. */
const FOG_ARGS: [string, number] = [PALETTE.bg, PALETTE.fog];
const BG_ARGS: [string] = [PALETTE.bg];

/**
 * Haze so the far end of the room falls off into depth.
 *
 * The theme is applied by MUTATING the existing fog and background objects,
 * not by re-creating them through `args`. That keeps the swap free of any
 * mount/unmount work in the R3F tree — which is where the circular-structure
 * crash came from last time.
 */
function AtmosphereDriver() {
  const { scene } = useThree();
  const density = useRef(PALETTE.fog);

  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05);
    density.current = damp(density.current, PALETTE.fog, 2.5, d);
    const fog = scene.fog as THREE.FogExp2 | null;
    if (fog && 'density' in fog) fog.density = density.current;
  });

  return <fogExp2 attach="fog" args={FOG_ARGS} />;
}

export function Scene({ quality }: Props) {
  const low = quality.tier === 0;

  return (
    <>
      <AtmosphereDriver />
      <color attach="background" args={BG_ARGS} />

      <CameraRig />

      {/* Procedural environment for metal/glass reflections — bright, so the
          desks and bezels pick up daylight rather than looking self-lit. */}
      {/* NEVER put a `key` on this. Re-keying <Environment> tears down and
          rebuilds its portal scene mid-reconcile, which leaves a cycle in
          R3F's instance graph and throws "Converting circular structure to
          JSON" at <Canvas>. It is mounted once for the life of the page; the
          theme changes the scene lights, not this. */}
      <Environment resolution={low ? 128 : 256} frames={1}>
        <Lightformer
          form="rect"
          intensity={0.7}
          color="#6E90C8"
          scale={[14, 3, 1]}
          position={[0, 6, -6]}
          target={[0, 0, 0]}
        />
        <Lightformer
          form="rect"
          intensity={0.5}
          color="#5C7CA8"
          scale={[10, 5, 1]}
          position={[-9, 2, 3]}
          target={[0, 0, 0]}
        />
        <Lightformer
          form="rect"
          intensity={0.5}
          color="#6E90C8"
          scale={[10, 5, 1]}
          position={[9, 2, 3]}
          target={[0, 0, 0]}
        />
        <Lightformer
          form="circle"
          intensity={0.6}
          color="#8FE4FF"
          scale={[5, 5, 1]}
          position={[0, 0, 6]}
          target={[0, 0, 0]}
        />
      </Environment>

      <DeskScene particleScale={quality.particles} />

      {/* Dust motes catching the ceiling light. */}
      {/* Dust caught in the lamp and the neon — sparse, this is a small room. */}
      <Dust particleScale={quality.particles * 0.18} />

      {quality.postFx && <Effects low={low} />}

      <AdaptiveDpr pixelated={false} />
      <Preload all />
    </>
  );
}
