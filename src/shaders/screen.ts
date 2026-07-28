import { SIMPLEX_3D, HASH } from './noise';

/**
 * ============================================================================
 * CRT / MONITOR SCREEN
 * ============================================================================
 * Procedural screen content for the lab's monitors — blocky "code" rows that
 * type themselves in and scroll, a scanline grid, phosphor bloom toward the
 * centre and barrel-ish edge falloff.
 *
 * Deliberately abstract rather than real glyphs: readable text belongs in the
 * DOM layer where it stays crisp and selectable. This is the glow the copy
 * sits in front of.
 * ============================================================================
 */

export const screenVertex = /* glsl */ `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const screenFragment = /* glsl */ `
precision highp float;

uniform float uTime;
uniform float uActive;    // 0 = idle/dim, 1 = the station being visited
uniform float uSeed;
uniform vec3  uColor;
uniform vec3  uColor2;
uniform float uOpacity;
/** Global gain — pulled down in light mode so screens don't blow out. */
uniform float uBoost;

varying vec2 vUv;

${SIMPLEX_3D}
${HASH}

void main(){
  vec2 uv = vUv;

  // --- code rows -----------------------------------------------------------
  const float ROWS = 26.0;
  float rowF = floor(uv.y * ROWS);
  float rowLocal = fract(uv.y * ROWS);

  // Each row scrolls upward; offset per row so it isn't a marching grid.
  float scroll = uTime * 0.11 + uSeed;
  float rowSeed = hash11(rowF + floor(scroll) * 37.0 + uSeed * 13.0);

  // Indentation and line length vary like real code.
  float indent = floor(hash11(rowF + 3.1 + uSeed) * 4.0) * 0.06;
  float len = 0.18 + hash11(rowF + 7.7 + uSeed) * 0.62;

  // Typing reveal: rows fill in left-to-right on a stagger.
  float typed = clamp((fract(scroll * 0.6 + rowSeed) * 2.2), 0.0, 1.0);
  float lineEnd = indent + len * typed;

  // Character cells within the row.
  float cells = 46.0;
  float cx = floor(uv.x * cells);
  float charOn = step(indent * cells, cx) * step(cx, lineEnd * cells);
  // Random gaps so it reads as words, not a solid bar.
  charOn *= step(0.22, hash11(cx + rowF * 91.0 + floor(scroll) * 17.0 + uSeed));

  // Glyph body — a block with padding, so cells read as separate characters.
  float glyph = charOn
    * smoothstep(0.08, 0.2, fract(uv.x * cells))
    * smoothstep(0.92, 0.8, fract(uv.x * cells))
    * smoothstep(0.22, 0.36, rowLocal)
    * smoothstep(0.84, 0.7, rowLocal);

  // A few rows highlighted like keywords / selected lines.
  float keyword = step(0.86, hash11(rowF * 5.0 + uSeed + floor(scroll)));

  // --- blinking cursor at the end of the newest line -----------------------
  float cursorRow = step(abs(rowF - floor(hash11(floor(scroll * 0.6) + uSeed) * ROWS)), 0.5);
  float cursor = cursorRow
    * step(lineEnd * cells, cx) * step(cx, lineEnd * cells + 1.0)
    * step(0.5, fract(uTime * 1.6))
    * smoothstep(0.2, 0.34, rowLocal) * smoothstep(0.86, 0.72, rowLocal);

  vec3 col = mix(uColor, uColor2, keyword) * glyph;
  col += uColor2 * cursor * 1.4;

  // --- CRT treatment -------------------------------------------------------
  // Scanlines.
  float scan = 0.82 + 0.18 * sin(uv.y * 620.0);
  col *= scan;

  // Aperture grille.
  col *= 0.9 + 0.1 * sin(uv.x * 900.0);

  // Phosphor glow: the panel is lit even where there's no text.
  float centre = 1.0 - length((uv - 0.5) * vec2(1.05, 1.25));
  vec3 backlight = uColor * 0.075 * smoothstep(0.0, 0.85, centre);

  // Slow flicker + a faint noise wash, so idle screens still feel alive.
  float flicker = 0.96 + 0.04 * sin(uTime * 7.3 + uSeed * 12.0);
  float wash = snoise(vec3(uv * 3.0, uTime * 0.15 + uSeed)) * 0.02;

  col = (col + backlight + wash) * flicker;

  // Active screens burn brighter; idle ones sit back.
  col *= mix(0.42, 1.55, uActive) * uBoost;

  // Edge falloff — the bezel shadow that sells it as a physical panel.
  vec2 e = min(uv, 1.0 - uv);
  float edge = smoothstep(0.0, 0.035, min(e.x, e.y));
  col *= edge;

  gl_FragColor = vec4(col, uOpacity);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;
