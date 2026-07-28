import * as THREE from 'three';

/**
 * Deterministic PRNG (mulberry32). Using a seeded generator instead of
 * Math.random means the point cloud is identical on server and client, and
 * identical between reloads — no layout "shimmer" on refresh.
 */
export function rng(seed = 1337) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fibonacci sphere — the only way to get genuinely even coverage on a sphere.
 * Random spherical coords clump at the poles and it always looks wrong.
 */
export function fibonacciSphere(count: number, radius: number, out: Float32Array, offset = 0) {
  const phi = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = phi * i;
    const o = offset + i * 3;
    out[o] = Math.cos(theta) * r * radius;
    out[o + 1] = y * radius;
    out[o + 2] = Math.sin(theta) * r * radius;
  }
  return out;
}

/**
 * Uniformly sample points across a mesh surface, area-weighted so big
 * triangles get proportionally more points (otherwise dense regions of the
 * tessellation get over-sampled and you can see the topology).
 */
export function sampleSurface(
  geometry: THREE.BufferGeometry,
  count: number,
  random: () => number
): Float32Array {
  const geo = geometry.index ? geometry.toNonIndexed() : geometry;
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  const triCount = pos.count / 3;

  // Build a cumulative area table for weighted picking.
  const areas = new Float32Array(triCount);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  let total = 0;

  for (let i = 0; i < triCount; i++) {
    a.fromBufferAttribute(pos, i * 3);
    b.fromBufferAttribute(pos, i * 3 + 1);
    c.fromBufferAttribute(pos, i * 3 + 2);
    ab.subVectors(b, a);
    ac.subVectors(c, a);
    total += ab.cross(ac).length() * 0.5;
    areas[i] = total;
  }

  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    // Binary search the area table.
    const target = random() * total;
    let lo = 0;
    let hi = triCount - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (areas[mid] < target) lo = mid + 1;
      else hi = mid;
    }

    a.fromBufferAttribute(pos, lo * 3);
    b.fromBufferAttribute(pos, lo * 3 + 1);
    c.fromBufferAttribute(pos, lo * 3 + 2);

    // Uniform barycentric coordinates.
    let u = random();
    let v = random();
    if (u + v > 1) {
      u = 1 - u;
      v = 1 - v;
    }
    const w = 1 - u - v;

    const o = i * 3;
    out[o] = a.x * w + b.x * u + c.x * v;
    out[o + 1] = a.y * w + b.y * u + c.y * v;
    out[o + 2] = a.z * w + b.z * u + c.z * v;
  }

  if (geo !== geometry) geo.dispose();
  return out;
}
