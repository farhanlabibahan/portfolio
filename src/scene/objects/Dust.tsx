'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { rng } from '@/utils/sampling';
import { scroll } from '@/lib/scroll';
import { SIMPLEX_3D, CURL } from '@/shaders/noise';

/**
 * ============================================================================
 * ATMOSPHERIC DUST — the "infinite background"
 * ============================================================================
 * A cube of motes that recentres on the camera every frame, with positions
 * wrapped modulo the cube size in the vertex shader. The result: no matter how
 * far the camera travels through 270 world units, it's always inside a haze of
 * dust — for the cost of one draw call and zero CPU work.
 * ============================================================================
 */

const BOX = 46;

type Props = { particleScale: number };

export function Dust({ particleScale }: Props) {
  const points = useRef<THREE.Points>(null);
  const COUNT = Math.floor(14_000 * particleScale);

  const geo = useMemo(() => {
    const rand = rng(1234);
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(COUNT * 3);
    const scl = new Float32Array(COUNT);
    const seed = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3] = (rand() - 0.5) * BOX;
      pos[i * 3 + 1] = (rand() - 0.5) * BOX;
      pos[i * 3 + 2] = (rand() - 0.5) * BOX;
      scl[i] = 0.25 + Math.pow(rand(), 4) * 2.2;
      seed[i] = rand();
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aScale', new THREE.BufferAttribute(scl, 1));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), BOX);
    return g;
  }, [COUNT]);

  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uPixelRatio: { value: 1 },
          uOpacity: { value: 0.55 },
          uVelocity: { value: 0 },
          uBox: { value: BOX },
          uColorA: { value: new THREE.Color('#7FD4FF') },
          uColorB: { value: new THREE.Color('#B18CFF') },
        },
        vertexShader: /* glsl */ `
          attribute float aScale;
          attribute float aSeed;
          uniform float uTime;
          uniform float uPixelRatio;
          uniform float uVelocity;
          uniform float uBox;
          varying float vSeed;
          varying float vFade;

          ${SIMPLEX_3D}
          ${CURL}

          void main(){
            vSeed = aSeed;
            vec3 p = position;

            // Curl drift — slow, so it reads as suspended dust not snow.
            p += curlNoise(p * 0.05 + uTime * 0.02) * 1.6;
            p.y += sin(uTime * 0.25 + aSeed * 6.283) * 0.6;

            // Wrap into a cube centred on the camera (object space is already
            // camera-relative because the group is repositioned each frame).
            p = mod(p + uBox * 0.5, uBox) - uBox * 0.5;

            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_Position = projectionMatrix * mv;

            // Fade at the cube boundary so wrapping is invisible.
            float edge = 1.0 - smoothstep(uBox * 0.28, uBox * 0.5, length(p));
            vFade = edge;

            // Motion streak: fast scroll stretches the motes.
            float streak = 1.0 + abs(uVelocity) * 2.2;
            gl_PointSize = aScale * uPixelRatio * streak * (26.0 / max(-mv.z, 1.0));
          }
        `,
        fragmentShader: /* glsl */ `
          precision highp float;
          uniform vec3 uColorA; uniform vec3 uColorB; uniform float uOpacity;
          varying float vSeed; varying float vFade;
          void main(){
            vec2 uv = gl_PointCoord - 0.5;
            float r = length(uv);
            if (r > 0.5) discard;
            float a = pow(1.0 - smoothstep(0.0, 0.5, r), 2.6) * uOpacity * vFade;
            if (a < 0.003) discard;
            gl_FragColor = vec4(mix(uColorA, uColorB, vSeed), a);
            #include <colorspace_fragment>
          }
        `,
      }),
    []
  );

  useFrame((state, dt) => {
    mat.uniforms.uTime.value = state.clock.elapsedTime;
    mat.uniforms.uPixelRatio.value = Math.min(2, state.gl.getPixelRatio());
    mat.uniforms.uVelocity.value = scroll.velocity;

    // Recentre on the camera — this is what makes the field infinite.
    if (points.current) points.current.position.copy(state.camera.position);
  });

  return <points ref={points} geometry={geo} material={mat} frustumCulled={false} />;
}
