'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { rainVertex, rainFragment } from '@/shaders/rainGlass';
import {
  makeCodeTexture,
  makeNeonTexture,
  makeSpineTexture,
  makeFrameTexture,
  makeDeskFrameTexture,
} from '@/utils/canvasTexture';
import { useContent } from '@/lib/store';
import { scroll } from '@/lib/scroll';
import { DESK, PALETTE } from '../anchors';

/**
 * ============================================================================
 * THE DESK
 * ============================================================================
 * A single CSE student's desk at night: rain on the window, neon bleeding
 * through it, a CRT full of C++, a warm lamp, and the clutter that makes a
 * workspace look lived in.
 *
 * The whole thing is lit by four practical sources — lamp, CRT, neon, and the
 * LEDs on the breadboard — with almost no ambient. That contrast is the entire
 * look: bright pools against near-black, rather than an evenly lit room.
 *
 * Text in the scene (the code, the neon, the book spines) is drawn to canvases
 * and used as textures. See utils/canvasTexture.
 * ============================================================================
 */

type Props = { particleScale: number };

const BOOKS: [string, string, string][] = [
  ['1984', '#8E2A2A', '#F4D9D9'],
  ['MACHINE LEARNING', '#2F5D46', '#DFF3E6'],
  ['ARTIFICIAL INTELLIGENCE', '#1F5E5B', '#D6F2F1'],
  ['ALGORITHMS & DATA STRUCTURES', '#4A4520', '#F0EBCB'],
];

export function DeskScene({ particleScale }: Props) {
  const { content } = useContent();
  const P = PALETTE;

  const glassMat = useRef<THREE.ShaderMaterial>(null);
  const ledRefs = useRef<THREE.Mesh[]>([]);
  const lampLight = useRef<THREE.PointLight>(null);
  const crtLight = useRef<THREE.RectAreaLight | THREE.PointLight>(null);

  /* --- Canvas textures, built once ------------------------------------- */
  const codeTex = useMemo(() => makeCodeTexture(), []);
  const neonTex = useMemo(() => makeNeonTexture(content.name), [content.name]);
  const spineTexes = useMemo(
    () => BOOKS.map(([t, bg, fg]) => makeSpineTexture(t, bg, fg)),
    []
  );
  const frameA = useMemo(
    () => makeFrameTexture(['DU'], '#1E3A6E', 'UNIVERSITY OF DHAKA'),
    []
  );
  const frameB = useMemo(() => makeFrameTexture(['CSE'], '#16324F', 'CSEDU · 1992'), []);
  const deskFrameTex = useMemo(
    () => makeDeskFrameTexture('অন্বেষক', 'CSE-DU'),
    []
  );

  const rainMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: rainVertex,
        fragmentShader: rainFragment,
        uniforms: {
          uTime: { value: 0 },
          uSign: { value: neonTex },
          uStreet: { value: new THREE.Color(P.street) },
          uTint: { value: new THREE.Color('#4E7BA8') },
          uSignGain: { value: P.neon },
        },
      }),
    [neonTex]
  );

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;

    const gm = glassMat.current ?? rainMat;
    gm.uniforms.uTime.value = t;
    gm.uniforms.uSignGain.value = P.neon;
    (gm.uniforms.uStreet.value as THREE.Color).set(P.street);

    // Breadboard LEDs — each blinks on its own rhythm, one of them steady.
    for (let i = 0; i < ledRefs.current.length; i++) {
      const led = ledRefs.current[i];
      if (!led) continue;
      const m = led.material as THREE.MeshBasicMaterial;
      const blink = i === 0 ? 1 : 0.45 + 0.55 * Math.abs(Math.sin(t * (0.9 + i * 0.7) + i));
      m.opacity = 0.55 + blink * 0.45;
      led.scale.setScalar(0.9 + blink * 0.25);
    }

    // The lamp breathes very slightly, like a filament.
    if (lampLight.current) {
      lampLight.current.intensity = P.lampIntensity * (0.97 + Math.sin(t * 2.3) * 0.03);
    }
    if (crtLight.current) {
      crtLight.current.intensity = P.crtIntensity * (0.94 + Math.sin(t * 9.1) * 0.06);
    }

    void dt;
  });

  const roomZ = DESK.wallZ;

  return (
    <group>
      {/* ================= ROOM ================= */}
      {/* Back wall, with the window opening cut around by four panels so we
          never render geometry behind the glass. */}
      {[
        // [x, y, w, h]
        [0, DESK.windowY + DESK.windowH / 2 + 0.55, DESK.roomW, 1.1],
        [0, DESK.windowY - DESK.windowH / 2 - 0.7, DESK.roomW, 1.4],
        [-(DESK.windowW / 2 + 0.95), DESK.windowY, 1.9, DESK.windowH + 0.1],
        [DESK.windowW / 2 + 0.95, DESK.windowY, 1.9, DESK.windowH + 0.1],
      ].map(([x, y, w, h], i) => (
        <mesh key={i} position={[x, y, roomZ]} receiveShadow>
          <planeGeometry args={[w, h]} />
          <meshStandardMaterial color={P.wall} roughness={0.95} />
        </mesh>
      ))}

      {/* Floor + ceiling, mostly to catch a little bounce. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0.4]} receiveShadow>
        <planeGeometry args={[DESK.roomW, 4.5]} />
        <meshStandardMaterial color={P.floor} roughness={0.9} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, DESK.roomH, 0.4]}>
        <planeGeometry args={[DESK.roomW, 4.5]} />
        <meshStandardMaterial color={P.ceiling} roughness={1} />
      </mesh>

      {/* ================= WINDOW ================= */}
      <group position={[0, DESK.windowY, roomZ + 0.01]}>
        {/* Rain glass with the neon refracting through it */}
        <mesh>
          <planeGeometry args={[DESK.windowW, DESK.windowH]} />
          <primitive object={rainMat} attach="material" ref={glassMat} />
        </mesh>

        {/* Teal frame + centre mullion, as in the reference */}
        {[
          [0, DESK.windowH / 2 + 0.05, DESK.windowW + 0.2, 0.1],
          [0, -(DESK.windowH / 2 + 0.05), DESK.windowW + 0.2, 0.1],
          [-(DESK.windowW / 2 + 0.05), 0, 0.1, DESK.windowH + 0.2],
          [DESK.windowW / 2 + 0.05, 0, 0.1, DESK.windowH + 0.2],
          [0, 0, 0.055, DESK.windowH],
        ].map(([x, y, w, h], i) => (
          <mesh key={i} position={[x, y, 0.012]}>
            <boxGeometry args={[w, h, 0.05]} />
            <meshStandardMaterial color="#1E4C52" roughness={0.55} metalness={0.35} />
          </mesh>
        ))}

        {/* The neon itself lighting the room */}
        <pointLight color="#8FE4FF" intensity={P.neon * 2.6} distance={5} decay={2} />
      </group>

      {/* ================= WALL FRAMES ================= */}
      {[
        { x: -2.28, tex: frameA },
        { x: 2.28, tex: frameB },
      ].map(({ x, tex }, i) => (
        <group key={i} position={[x, 2.02, roomZ + 0.03]}>
          <mesh>
            <planeGeometry args={[0.66, 0.82]} />
            <meshStandardMaterial
              map={tex}
              roughness={0.75}
              emissive="#FFFFFF"
              emissiveMap={tex}
              emissiveIntensity={0.42}
            />
          </mesh>
          {/* Slim white frame with a backlight glow */}
          <mesh position={[0, 0, -0.012]}>
            <planeGeometry args={[0.78, 0.94]} />
            <meshBasicMaterial color="#EAF2FF" transparent opacity={0.18} />
          </mesh>
          <pointLight color="#CFE4FF" intensity={0.55} distance={1.5} decay={2} position={[0, 0, 0.3]} />
        </group>
      ))}

      {/* ================= DESK ================= */}
      <mesh position={[0, DESK.top - 0.03, 0]} receiveShadow castShadow>
        <boxGeometry args={[DESK.width, 0.06, DESK.depth]} />
        <meshStandardMaterial color={P.desk} roughness={0.72} metalness={0.05} />
      </mesh>
      <mesh position={[0, DESK.top - 0.09, -DESK.depth / 2 + 0.03]}>
        <boxGeometry args={[DESK.width, 0.08, 0.05]} />
        <meshStandardMaterial color={P.desk} roughness={0.8} />
      </mesh>

      {/* ================= CRT MONITOR ================= */}
      <group position={[0, 0, DESK.crtZ]}>
        {/* Beige case */}
        <mesh position={[0, DESK.crtY, 0]} castShadow>
          <boxGeometry args={[0.82, 0.72, 0.62]} />
          <meshStandardMaterial color="#A9AE7C" roughness={0.82} />
        </mesh>
        {/* Screen recess */}
        <mesh position={[0, DESK.crtY + 0.04, 0.312]}>
          <planeGeometry args={[0.66, 0.5]} />
          <meshBasicMaterial map={codeTex} toneMapped={false} />
        </mesh>
        {/* Glass bulge catching a highlight */}
        <mesh position={[0, DESK.crtY + 0.04, 0.318]}>
          <planeGeometry args={[0.66, 0.5]} />
          <meshBasicMaterial
            color="#9FC0FF"
            transparent
            opacity={0.06}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
        {/* Base + vents */}
        <mesh position={[0, DESK.top + 0.05, 0]} castShadow>
          <boxGeometry args={[0.7, 0.1, 0.56]} />
          <meshStandardMaterial color="#9DA271" roughness={0.85} />
        </mesh>
        {/* Power LED */}
        <mesh position={[0.28, DESK.crtY - 0.3, 0.315]}>
          <circleGeometry args={[0.008, 12]} />
          <meshBasicMaterial color="#7CFF9E" toneMapped={false} />
        </mesh>

        {/* The screen's spill — the cool half of the lighting */}
        <pointLight
          ref={crtLight as never}
          position={[0, DESK.crtY, 0.75]}
          color={P.crt}
          intensity={P.crtIntensity}
          distance={2.6}
          decay={2}
        />
      </group>

      {/* ================= KEYBOARD + MOUSE ================= */}
      <mesh position={[-0.02, DESK.top + 0.02, 0.36]} rotation={[0, 0.02, 0]} castShadow>
        <boxGeometry args={[0.92, 0.03, 0.3]} />
        <meshStandardMaterial color="#C9C6B4" roughness={0.8} />
      </mesh>
      <mesh position={[-0.02, DESK.top + 0.036, 0.33]} rotation={[0, 0.02, 0]}>
        <boxGeometry args={[0.86, 0.008, 0.2]} />
        <meshStandardMaterial color="#B4B1A0" roughness={0.7} />
      </mesh>
      <mesh position={[0.66, DESK.top + 0.025, 0.34]} castShadow>
        <sphereGeometry args={[0.055, 20, 14]} />
        <meshStandardMaterial color="#C9C6B4" roughness={0.6} />
      </mesh>

      {/* ================= BOOKS ================= */}
      <group position={[-1.12, DESK.top, -0.06]} rotation={[0, 0.13, 0]}>
        {BOOKS.map((_, i) => (
          <mesh key={i} position={[0, 0.045 + i * 0.075, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.62, 0.07, 0.44]} />
            {/* Spine texture on the front-facing edge only; sides stay plain. */}
            <meshStandardMaterial map={spineTexes[BOOKS.length - 1 - i]} roughness={0.9} />
          </mesh>
        ))}
      </group>

      {/* ================= MUG ================= */}
      <group position={[-0.62, DESK.top, 0.3]}>
        <mesh position={[0, 0.06, 0]} castShadow>
          <cylinderGeometry args={[0.055, 0.05, 0.12, 24]} />
          <meshStandardMaterial color="#D8DCE4" roughness={0.45} />
        </mesh>
        <mesh position={[0.062, 0.06, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.032, 0.009, 10, 22, Math.PI]} />
          <meshStandardMaterial color="#D8DCE4" roughness={0.45} />
        </mesh>
        <mesh position={[0, 0.121, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.048, 20]} />
          <meshStandardMaterial color="#33251A" roughness={0.3} />
        </mesh>
      </group>

      {/* ================= BREADBOARD + LEDS ================= */}
      <group position={[-1.35, DESK.top, 0.34]} rotation={[0, 0.22, 0]}>
        <mesh position={[0, 0.014, 0]} castShadow>
          <boxGeometry args={[0.42, 0.025, 0.2]} />
          <meshStandardMaterial color="#1A2030" roughness={0.7} />
        </mesh>
        {[-0.13, -0.02, 0.09, 0.17].map((x, i) => (
          <mesh
            key={i}
            ref={(el) => {
              if (el) ledRefs.current[i] = el;
            }}
            position={[x, 0.038, 0.02]}
          >
            <sphereGeometry args={[0.011, 10, 8]} />
            <meshBasicMaterial
              color={i % 2 === 0 ? '#FF3B30' : '#FF7A45'}
              transparent
              opacity={1}
              toneMapped={false}
            />
          </mesh>
        ))}
        <pointLight color="#FF4530" intensity={0.32} distance={0.7} decay={2} position={[0, 0.08, 0.05]} />
        {/* Jumper wires arcing over the board */}
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[-0.1 + i * 0.1, 0.06, -0.02]} rotation={[0, 0, 0]}>
            <torusGeometry args={[0.05, 0.004, 6, 16, Math.PI]} />
            <meshStandardMaterial color={['#E24B4B', '#4B8BE2', '#4BE28B'][i]} roughness={0.5} />
          </mesh>
        ))}
      </group>

      {/* ================= RUBIK'S CUBE ================= */}
      <group position={[0.92, DESK.top + 0.055, 0.06]} rotation={[0, -0.35, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.11, 0.11, 0.11]} />
          <meshStandardMaterial color="#0E0E12" roughness={0.6} />
        </mesh>
        {/* Sticker faces */}
        {(
          [
            [[0, 0, 0.056], [0, 0, 0], '#D93A2B'],
            [[0.056, 0, 0], [0, Math.PI / 2, 0], '#2B62D9'],
            [[0, 0.056, 0], [-Math.PI / 2, 0, 0], '#F2F2F2'],
          ] as [number[], number[], string][]
        ).map(([p, r, c], i) =>
          [-0.034, 0, 0.034].map((a) =>
            [-0.034, 0, 0.034].map((b) => (
              <mesh
                key={`${i}-${a}-${b}`}
                position={
                  i === 0
                    ? [a, b, p[2]]
                    : i === 1
                      ? [p[0], b, a]
                      : [a, p[1], b]
                }
                rotation={r as [number, number, number]}
              >
                <planeGeometry args={[0.03, 0.03]} />
                <meshStandardMaterial color={c} roughness={0.45} />
              </mesh>
            ))
          )
        )}
      </group>

      {/* ================= DESK FRAME ================= */}
      <group position={[0.62, DESK.top, -0.16]} rotation={[0, -0.28, 0]}>
        <mesh position={[0, 0.11, 0]} castShadow>
          <boxGeometry args={[0.3, 0.22, 0.02]} />
          <meshStandardMaterial color="#C79A5C" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.11, 0.012]}>
          <planeGeometry args={[0.25, 0.17]} />
          <meshStandardMaterial
            map={deskFrameTex}
            roughness={0.7}
            emissive="#FFFFFF"
            emissiveMap={deskFrameTex}
            emissiveIntensity={0.3}
          />
        </mesh>
        <mesh position={[0, 0.005, -0.05]} rotation={[0.4, 0, 0]}>
          <boxGeometry args={[0.04, 0.11, 0.01]} />
          <meshStandardMaterial color="#B08A50" roughness={0.7} />
        </mesh>
      </group>

      {/* ================= DESK LAMP ================= */}
      <group position={[1.35, DESK.top, 0.08]} rotation={[0, -0.5, 0]}>
        {/* Weighted base */}
        <mesh position={[0, 0.018, 0]} castShadow>
          <cylinderGeometry args={[0.11, 0.12, 0.036, 26]} />
          <meshStandardMaterial color="#E5E7EA" roughness={0.45} metalness={0.25} />
        </mesh>
        {/* Arm */}
        <mesh position={[-0.06, 0.24, 0]} rotation={[0, 0, 0.3]} castShadow>
          <cylinderGeometry args={[0.011, 0.011, 0.46, 12]} />
          <meshStandardMaterial color="#D5D8DC" roughness={0.4} metalness={0.4} />
        </mesh>
        <mesh position={[-0.2, 0.44, 0]} rotation={[0, 0, 1.15]} castShadow>
          <cylinderGeometry args={[0.011, 0.011, 0.32, 12]} />
          <meshStandardMaterial color="#D5D8DC" roughness={0.4} metalness={0.4} />
        </mesh>
        {/* Shade */}
        <group position={[-0.36, 0.5, 0]} rotation={[0, 0, -0.75]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.1, 0.062, 0.14, 24, 1, true]} />
            <meshStandardMaterial color="#252B31" roughness={0.55} side={THREE.DoubleSide} />
          </mesh>
          {/* Bulb */}
          <mesh position={[0, -0.06, 0]}>
            <sphereGeometry args={[0.05, 18, 12]} />
            <meshBasicMaterial color={P.lamp} toneMapped={false} />
          </mesh>
        </group>

        {/* The warm pool — the dominant light in the frame */}
        <pointLight
          ref={lampLight}
          position={[-0.4, 0.46, 0.06]}
          color={P.lamp}
          intensity={P.lampIntensity}
          distance={3.4}
          decay={2}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-bias={-0.0012}
        />
      </group>

      {/* ================= PAPER + PENCIL ================= */}
      <mesh
        position={[1.0, DESK.top + 0.006, 0.38]}
        rotation={[-Math.PI / 2, 0, -0.14]}
        receiveShadow
      >
        <planeGeometry args={[0.3, 0.22]} />
        <meshStandardMaterial color="#EDE7DA" roughness={0.9} />
      </mesh>
      <mesh position={[1.02, DESK.top + 0.012, 0.36]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.006, 0.006, 0.19, 8]} />
        <meshStandardMaterial color="#C0392B" roughness={0.6} />
      </mesh>

      {/* ================= AMBIENT ================= */}
      <ambientLight intensity={P.ambient} color={P.ambientColor} />
      <hemisphereLight color={P.hemiSky} groundColor={P.hemiGround} intensity={P.hemi} />

      {/* Keeps the prop in the signature without affecting the scene. */}
      <group visible={false} scale={Math.max(0.001, particleScale)} />
      <MouseParallax />
    </group>
  );
}

/** A whisper of head movement, so the frame is never perfectly locked. */
function MouseParallax() {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!ref.current) return;
    ref.current.position.x = scroll.mouse.x * 0.012;
    ref.current.position.y = scroll.mouse.y * 0.008;
  });
  return <group ref={ref} />;
}
