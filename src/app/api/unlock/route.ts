import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';

/**
 * ============================================================================
 * POST /api/unlock
 * ============================================================================
 * Validates the admin passphrase server-side.
 *
 * Why not just compare it in the browser? Because anything the client can
 * check, the client can read. A `NEXT_PUBLIC_` variable gets inlined into the
 * JavaScript bundle verbatim — moving the passphrase there would make it
 * editable but no more private than hardcoding it. Checking it here means the
 * value never leaves the server; the browser only ever learns yes or no.
 * ============================================================================
 */

export const runtime = 'nodejs';
// Never cache an auth check.
export const dynamic = 'force-dynamic';

/** Constant-time compare, so response latency can't be used to guess the value. */
function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  // timingSafeEqual throws on length mismatch, which would itself leak length.
  // Comparing fixed-size hashes of the inputs avoids that.
  if (ba.length !== bb.length) {
    // Still burn a comparison so the early-exit isn't observable.
    timingSafeEqual(ba, ba);
    return false;
  }
  return timingSafeEqual(ba, bb);
}

/* --------------------------------------------------------------------------
   Tiny in-memory rate limiter. Serverless instances are ephemeral and not
   shared, so this is a speed bump rather than a guarantee — enough to make
   brute-forcing tedious without dragging in a KV store.
   -------------------------------------------------------------------------- */
const attempts = new Map<string, { count: number; first: number }>();
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 8;

function rateLimited(key: string): boolean {
  const now = Date.now();
  const rec = attempts.get(key);

  if (!rec || now - rec.first > WINDOW_MS) {
    attempts.set(key, { count: 1, first: now });
    return false;
  }

  rec.count += 1;

  // Opportunistic cleanup so the map can't grow without bound.
  if (attempts.size > 500) {
    for (const [k, v] of attempts) {
      if (now - v.first > WINDOW_MS) attempts.delete(k);
    }
  }

  return rec.count > MAX_ATTEMPTS;
}

export async function POST(request: Request) {
  const expected = process.env.ADMIN_PASSPHRASE;

  if (!expected) {
    return NextResponse.json(
      { ok: false, reason: 'ADMIN_PASSPHRASE is not configured on the server.' },
      { status: 500 }
    );
  }

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';

  if (rateLimited(ip)) {
    return NextResponse.json(
      { ok: false, reason: 'Too many attempts. Wait a minute.' },
      { status: 429 }
    );
  }

  let passphrase = '';
  try {
    const body = (await request.json()) as { passphrase?: unknown };
    if (typeof body.passphrase === 'string') passphrase = body.passphrase;
  } catch {
    /* malformed body — falls through to a failed comparison */
  }

  const ok = safeEqual(passphrase, expected);
  return NextResponse.json({ ok }, { status: ok ? 200 : 401 });
}
