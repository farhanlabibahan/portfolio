'use client';

import { useSyncExternalStore } from 'react';

/**
 * Minimal external store — shared between the WebGL tree and the DOM tree.
 * React context can't cross the <Canvas> boundary cheaply for high-frequency
 * values, and pulling in a state library for ~40 lines isn't worth it.
 */
function createStore<T>(initial: T) {
  let state = initial;
  const listeners = new Set<() => void>();

  return {
    get: () => state,
    set: (patch: Partial<T>) => {
      const next = { ...state, ...patch };
      // Bail out if nothing actually changed — avoids render churn.
      let changed = false;
      for (const k in next) {
        if (next[k] !== state[k]) {
          changed = true;
          break;
        }
      }
      if (!changed) return;
      state = next;
      listeners.forEach((l) => l());
    },
    subscribe: (l: () => void) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}

export type UIState = {
  /** id of the project the camera has flown into, or null */
  focusedProject: string | null;
  /** true while the loading scene is on screen */
  loading: boolean;
  /** cursor context — drives the custom cursor's shape */
  cursor: 'default' | 'hover' | 'view' | 'drag' | 'text';
  /** admin panel visibility */
  adminOpen: boolean;
};

export const uiStore = createStore<UIState>({
  focusedProject: null,
  loading: true,
  cursor: 'default',
  adminOpen: false,
});

export function useUI(): UIState {
  return useSyncExternalStore(
    uiStore.subscribe,
    uiStore.get,
    uiStore.get // server snapshot — same initial object, safe because it's frozen at boot
  );
}

export const setCursor = (cursor: UIState['cursor']) => uiStore.set({ cursor });
