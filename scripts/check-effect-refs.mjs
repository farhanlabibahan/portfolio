#!/usr/bin/env node
/**
 * ============================================================================
 * GUARD: no `ref` on a wrapEffect-based post-processing component
 * ============================================================================
 * @react-three/postprocessing builds most of its effects with `wrapEffect`,
 * a plain function component whose args memo is keyed on the JSON of its rest
 * props:
 *
 *     useMemo(() => [...], [JSON.stringify(restProps)])
 *
 * In React 19 `ref` is an ordinary prop on function components, so a ref lands
 * in those rest props. Once React fills it in, `ref.current` is the effect,
 * which carries R3F's `__r3f` Instance with its `children` / `parent`
 * back-reference — and the stringify walks into that cycle:
 *
 *     TypeError: Converting circular structure to JSON
 *
 * The first render is fine (ref.current is null), so this survives `tsc`,
 * `next build` and any SSR smoke test, then throws in the browser on the
 * second render. Exactly the kind of thing worth a static check.
 *
 * Run: node scripts/check-effect-refs.mjs
 * ============================================================================
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

/** Effects that go through wrapEffect. Verified against the installed dist. */
const WRAPPED = [
  'Bloom',
  'BrightnessContrast',
  'ChromaticAberration',
  'ColorDepth',
  'Depth',
  'DotScreen',
  'FXAA',
  'HueSaturation',
  'Noise',
  'Ramp',
  'SMAA',
  'Scanline',
  'Sepia',
  'ShockWave',
  'TiltShift',
  'TiltShift2',
  'ToneMapping',
  'Vignette',
  'WaterEffect',
];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (['.tsx', '.jsx'].includes(extname(p))) out.push(p);
  }
  return out;
}

const problems = [];

for (const file of walk('src')) {
  const src = readFileSync(file, 'utf8');
  for (const name of WRAPPED) {
    // Match the opening tag and everything up to its closing bracket.
    const re = new RegExp(`<${name}(\\s[^>]*?)/?>`, 'gs');
    for (const m of src.matchAll(re)) {
      if (/\bref\s*=/.test(m[1])) {
        const line = src.slice(0, m.index).split('\n').length;
        problems.push(`${file}:${line}  <${name}> has a ref`);
      }
    }
  }
}

if (problems.length) {
  console.error('\n✗ ref passed to a wrapEffect-based effect — this will throw');
  console.error('  "Converting circular structure to JSON" at runtime.\n');
  for (const p of problems) console.error('   ' + p);
  console.error('\n  Use static props instead, or mutate an object you already');
  console.error('  handed to the effect (see the Vector2 in Effects.tsx).\n');
  process.exit(1);
}

console.log(`✓ no refs on wrapEffect-based effects (checked ${WRAPPED.length} components)`);
