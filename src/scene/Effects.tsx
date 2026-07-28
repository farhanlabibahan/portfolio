'use client';

import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  EffectComposer,
  Bloom,
  DepthOfField,
  ChromaticAberration,
  Vignette,
  Noise,
  ToneMapping,
} from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';
import { scroll } from '@/lib/scroll';

/**
 * ============================================================================
 * POST-PROCESSING CHAIN
 * ============================================================================
 * Order matters — DOF before bloom so out-of-focus highlights bloom as soft
 * discs rather than sharp dots, then CA / vignette / grain as the final lens.
 *
 * ---------------------------------------------------------------------------
 * DO NOT PUT A `ref` ON THESE EFFECTS.
 * ---------------------------------------------------------------------------
 * Most of them (Bloom, ChromaticAberration, Vignette, Noise, ToneMapping) are
 * built with @react-three/postprocessing's `wrapEffect`, which is a plain
 * function component whose args memo is keyed on `JSON.stringify(props)`:
 *
 *     const args = useMemo(() => [...], [JSON.stringify(restProps)])
 *
 * In React 19 `ref` is an ordinary prop on function components, so a ref ends
 * up inside those rest props. Once React populates it, `ref.current` is the
 * effect instance, which carries R3F's `__r3f` Instance with its `children`
 * and `parent` back-reference — and the stringify walks straight into that
 * cycle:
 *
 *     Converting circular structure to JSON
 *       property 'children' -> Array -> index 0 -> property 'parent'
 *
 * It survives the first render (ref.current is still null) and throws on the
 * second, which is why it never showed up in a build or an SSR check.
 *
 * So: every parameter here is a static prop. Anything that needs to animate
 * has to do it by mutating an object already handed to the effect — see the
 * chromatic-aberration offset below, which is a Vector2 we own and write to
 * in useFrame. That touches no React props and allocates nothing per frame.
 * ============================================================================
 */

type Props = { low: boolean };

export function Effects({ low }: Props) {
  // Owned by us, handed to the effect once, mutated in place afterwards.
  const caOffset = useMemo(() => new THREE.Vector2(0.0005, 0.00035), []);

  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05);
    const v = Math.abs(scroll.velocity);

    // Velocity-driven lens smear — the cheapest way to make scrolling feel
    // physical. Slight asymmetry reads as a real lens rather than a filter.
    const target = 0.0004 + v * 0.005 + scroll.chaos * 0.01;
    const next = caOffset.x + (target - caOffset.x) * (1 - Math.exp(-6 * d));
    caOffset.set(next, next * 0.7);
  });

  // On low-power devices keep bloom + tone mapping (cheap, high impact) and
  // drop DOF and grain (expensive, low impact at small sizes).
  if (low) {
    return (
      <EffectComposer multisampling={0} enableNormalPass={false}>
        <Bloom
          intensity={0.85}
          luminanceThreshold={0.5}
          luminanceSmoothing={0.35}
          mipmapBlur
          radius={0.7}
        />
        <ChromaticAberration
          offset={caOffset}
          blendFunction={BlendFunction.NORMAL}
          radialModulation={false}
          modulationOffset={0}
        />
        <Vignette eskil={false} offset={0.3} darkness={0.62} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    );
  }

  return (
    <EffectComposer multisampling={2} enableNormalPass={false}>
      <DepthOfField focusDistance={0.021} focalLength={0.05} bokehScale={2.2} />
      {/* High threshold: in a lit room only the windows, sun shafts and
          monitors should bloom. Lower and every bright wall blooms too, which
          is what turns an interior into fog. */}
      <Bloom
        intensity={0.8}
        luminanceThreshold={0.46}
        luminanceSmoothing={0.32}
        mipmapBlur
        radius={0.68}
      />
      <ChromaticAberration
        offset={caOffset}
        blendFunction={BlendFunction.NORMAL}
        radialModulation
        modulationOffset={0.35}
      />
      <Noise opacity={0.024} blendFunction={BlendFunction.OVERLAY} />
      <Vignette eskil={false} offset={0.28} darkness={0.7} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}
