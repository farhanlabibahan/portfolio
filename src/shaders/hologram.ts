import { SIMPLEX_3D } from './noise';

/**
 * Holographic panel material — used for the project screens and glass panels.
 * Fresnel rim + scanlines + RGB-split glitch bands + a soft interference sheen.
 * `uHover` (0 → 1) ramps distortion, chromatic split and emission on hover.
 */

export const holoVertex = /* glsl */ `
uniform float uTime;
uniform float uHover;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewDir;
varying float vGlitch;

${SIMPLEX_3D}

void main(){
  vUv = uv;

  vec3 pos = position;

  // Horizontal glitch bands that slide vertically — stronger on hover.
  float band = step(0.986, sin(pos.y * 60.0 + uTime * 3.0) * 0.5 + 0.5 + snoise(vec3(pos.y * 8.0, uTime * 1.7, 0.0)) * 0.5);
  vGlitch = band * uHover;
  pos.x += vGlitch * 0.06 * sin(uTime * 22.0);

  // Gentle surface warp so the "glass" feels liquid rather than rigid.
  pos.z += snoise(vec3(pos.xy * 1.6, uTime * 0.35)) * 0.035 * (0.35 + uHover);

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  vNormal = normalize(normalMatrix * normal);
  vViewDir = normalize(-mv.xyz);

  gl_Position = projectionMatrix * mv;
}
`;

export const holoFragment = /* glsl */ `
precision highp float;

uniform float uTime;
uniform float uHover;
uniform float uOpacity;
uniform vec3  uColor;
uniform vec3  uColor2;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewDir;
varying float vGlitch;

${SIMPLEX_3D}

void main(){
  // Fresnel — the whole reason holograms read as "glass".
  float fres = pow(1.0 - clamp(dot(normalize(vNormal), normalize(vViewDir)), 0.0, 1.0), 2.6);

  // Scanlines.
  float scan = 0.5 + 0.5 * sin((vUv.y + uTime * 0.06) * 420.0);
  scan = mix(1.0, scan, 0.16);

  // Interference sheen sweeping diagonally.
  float sheen = snoise(vec3(vUv * 3.0, uTime * 0.22));
  float sweep = smoothstep(0.35, 1.0, sin((vUv.x + vUv.y) * 3.0 - uTime * 0.7) * 0.5 + 0.5);

  // Chromatic aberration, sampled from the gradient itself.
  float ca = 0.006 + uHover * 0.02;
  float rC = smoothstep(0.0, 1.0, vUv.y + ca + sheen * 0.05);
  float gC = smoothstep(0.0, 1.0, vUv.y + sheen * 0.05);
  float bC = smoothstep(0.0, 1.0, vUv.y - ca + sheen * 0.05);

  vec3 grad = mix(uColor, uColor2, vec3(rC, gC, bC));

  vec3 col = grad * (0.16 + fres * 1.5 + sweep * 0.22);
  col *= scan;
  col += uColor2 * vGlitch * 1.2;
  col += grad * uHover * 0.5;

  // Border glow.
  vec2 e = min(vUv, 1.0 - vUv);
  float edge = 1.0 - smoothstep(0.0, 0.02, min(e.x, e.y));
  col += grad * edge * (0.9 + uHover * 1.6);

  float alpha = (0.1 + fres * 0.62 + edge * 0.6 + uHover * 0.16) * uOpacity;
  gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;
