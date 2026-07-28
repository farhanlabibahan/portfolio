'use client';

/**
 * ============================================================================
 * CONTENT STORE
 * ============================================================================
 * A module-level external store rather than React context — deliberately.
 *
 * React Three Fiber renders into its own reconciler root, and React context
 * does NOT cross that boundary. With a context provider, the DOM tree and the
 * WebGL tree would each hold a *separate* copy of the content, so saving an
 * edit in the admin panel would update the text overlays but leave the 3D
 * timeline cards showing stale data until a reload. An external store is read
 * by both trees from the same place, so everything updates together.
 *
 * Persistence is localStorage — works on Vercel's read-only filesystem with
 * zero backend. To publish edits for every visitor: admin panel → Copy JSON →
 * paste over DEFAULT_CONTENT in lib/data.ts → redeploy.
 * ============================================================================
 */

import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { DEFAULT_CONTENT, type Content } from './data';

const STORAGE_KEY = 'ahan.portfolio.content.v1';

let state: Content = DEFAULT_CONTENT;
let hydrated = false;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

/** Merge stored content over defaults so newly-added fields never break. */
function merge(stored: unknown): Content {
  if (!stored || typeof stored !== 'object') return DEFAULT_CONTENT;
  return { ...DEFAULT_CONTENT, ...(stored as Partial<Content>) };
}

function hydrate() {
  if (hydrated || typeof window === 'undefined') return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      state = merge(JSON.parse(raw));
      emit();
    }
  } catch {
    /* corrupted payload or private mode — fall back to defaults */
  }
}

function persist(next: Content) {
  state = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* quota / private mode — edits stay in memory for this session */
  }
  emit();
}

export const contentStore = {
  get: () => state,
  /** Server + first-client render must agree, so always return defaults. */
  getServerSnapshot: () => DEFAULT_CONTENT,
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
  update: (patch: Partial<Content>) => persist({ ...state, ...patch }),
  replace: (next: Content) => persist(merge(next)),
  reset: () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* noop */
    }
    state = DEFAULT_CONTENT;
    emit();
  },
};

/**
 * Kept as a component so call sites read naturally, but it only triggers
 * hydration — there is no context involved.
 */
export function ContentProvider({ children }: { children: React.ReactNode }) {
  useEffect(hydrate, []);
  return <>{children}</>;
}

export function useContent() {
  const content = useSyncExternalStore(
    contentStore.subscribe,
    contentStore.get,
    contentStore.getServerSnapshot
  );

  const update = useCallback((patch: Partial<Content>) => contentStore.update(patch), []);
  const replace = useCallback((next: Content) => contentStore.replace(next), []);
  const reset = useCallback(() => contentStore.reset(), []);

  return useMemo(
    () => ({ content, hydrated, update, replace, reset }),
    [content, update, replace, reset]
  );
}
