'use client';

import { Suspense, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { Scene } from './Scene';
import { PALETTE } from './anchors';
import { useQuality } from '@/hooks/useQuality';

/**
 * WebGL host. Fixed behind the DOM; the overlay sections set
 * `pointer-events: none` so hover/click reach the canvas for the interactive
 * objects (project screens, neural nodes, skill planets).
 *
 * Content is read from the module-level store in lib/store, not context —
 * React context does not cross the <Canvas> reconciler boundary.
 */
/* Hoisted out of render. Passing fresh object literals to <Canvas> makes R3F
   treat the GL/camera config as changed on every render. */
const GL_CONFIG = {
  antialias: false, // post-processing handles AA; MSAA here is wasted cost
  alpha: false,
  powerPreference: 'high-performance' as const,
  stencil: false,
  depth: true,
};
const CAMERA_CONFIG = { fov: 45, near: 0.1, far: 600, position: [0, 1.6, 4] as [number, number, number] };

export function Experience() {
  const quality = useQuality();

  const onCreated = useCallback(({ gl, scene }: { gl: THREE.WebGLRenderer; scene: THREE.Scene }) => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    // Slightly under 1 so the blown-out windows don't clip the whole frame.
    gl.toneMappingExposure = 0.95;
    gl.setClearColor(PALETTE.bg, 1);
    scene.background = new THREE.Color(PALETTE.bg);
  }, []);

  return (
    <div className="canvas-wrap">
      <Canvas
        dpr={quality.dpr}
        gl={GL_CONFIG}
        camera={CAMERA_CONFIG}
        shadows={quality.tier === 1}
        onCreated={onCreated}
      >
        <Suspense fallback={null}>
          <Scene quality={quality} />
        </Suspense>
      </Canvas>
    </div>
  );
}
