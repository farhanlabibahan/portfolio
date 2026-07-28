import { SIMPLEX_3D, HASH } from './noise';

/**
 * ============================================================================
 * RAIN-STREAKED WINDOW GLASS
 * ============================================================================
 * Sits in front of the neon sign. Droplets cling and trail, streaks run down,
 * and the glass picks up a warm sodium wash from the street below.
 *
 * The neon texture is sampled with a UV offset taken from the droplet field,
 * so the sign genuinely refracts through the water rather than having drops
 * painted on top of it — that's the detail that sells wet glass.
 * ============================================================================
 */

export const rainVertex = /* glsl */ `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const rainFragment = /* glsl */ `
precision highp float;

uniform float     uTime;
uniform sampler2D uSign;      // the neon lettering behind the glass
uniform vec3      uStreet;    // sodium glow rising from below
uniform vec3      uTint;      // cool cast on the glass itself
uniform float     uSignGain;

varying vec2 vUv;

${SIMPLEX_3D}
${HASH}

/** Static beads of water clinging to the pane. */
float beads(vec2 uv, float scale, float seed, out vec2 disp){
  vec2 g = uv * scale;
  vec2 id = floor(g);
  vec2 f  = fract(g) - 0.5;

  vec3 r = hash31(id.x * 57.0 + id.y * 131.0 + seed);
  // Only some cells hold a drop, and they sit off-centre.
  float present = step(0.55, r.z);
  vec2 centre = (r.xy - 0.5) * 0.6;
  float d = length((f - centre) * vec2(1.0, 1.25));
  float rad = 0.13 + r.z * 0.16;

  float drop = smoothstep(rad, rad * 0.35, d) * present;
  disp = normalize(f - centre + 1e-5) * drop * 0.045;
  return drop;
}

/** Trails running down the pane, each with a heavier head. */
float trails(vec2 uv, float scale, float speed, float seed, out vec2 disp){
  vec2 g = vec2(uv.x * scale, uv.y);
  float col = floor(g.x);
  float r = hash11(col * 13.7 + seed);

  // Columns run at different speeds and not all of them run at all.
  float active = step(0.42, hash11(col * 3.1 + seed + 11.0));
  float y = fract(uv.y * 0.6 - uTime * speed * (0.5 + r));

  float x = fract(g.x) - 0.5;
  float across = smoothstep(0.16, 0.0, abs(x));

  // Head of the droplet plus the thinning tail behind it.
  float head = smoothstep(0.06, 0.0, abs(y - 0.5)) * across;
  float tail = smoothstep(0.45, 0.0, y) * across * 0.45;

  float t = (head + tail) * active;
  disp = vec2(x * t * 0.05, -t * 0.03);
  return t;
}

void main(){
  vec2 uv = vUv;

  vec2 d1, d2, d3;
  float b1 = beads(uv, 26.0, 1.0, d1);
  float b2 = beads(uv, 44.0, 7.0, d2);
  float tr = trails(uv, 22.0, 0.10, 3.0, d3);

  vec2 disp = d1 + d2 * 0.6 + d3;
  float water = clamp(b1 + b2 * 0.7 + tr, 0.0, 1.0);

  // Condensation haze — thicker toward the edges of the pane.
  float haze = smoothstep(0.0, 0.55, snoise(vec3(uv * 4.0, 0.0)) * 0.5 + 0.5);
  vec2 edge = abs(uv - 0.5) * 2.0;
  haze *= 0.35 + 0.65 * max(edge.x, edge.y);

  // The sign, refracted. Water thins the haze, so drops read as clear spots.
  vec3 sign = texture2D(uSign, uv + disp).rgb;
  vec3 blur = texture2D(uSign, uv + disp * 3.0).rgb;
  sign = mix(blur, sign, clamp(water * 1.6, 0.0, 1.0));
  sign *= mix(0.62, 1.0, water);

  vec3 col = sign * uSignGain;

  // Sodium streetlight washing up from the bottom of the pane.
  float up = smoothstep(0.55, 0.0, uv.y);
  col += uStreet * up * (0.20 + haze * 0.30 + water * 0.5);

  // Cool cast + the glass itself catching light on the droplets.
  col += uTint * haze * 0.10;
  col += vec3(1.0) * water * 0.06;

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;
