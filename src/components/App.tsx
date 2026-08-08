'use client';

import dynamic from 'next/dynamic';
import { AnimatePresence } from 'framer-motion';
import { useLenis } from '@/hooks/useLenis';
import { usePointer } from '@/hooks/usePointer';
import { ContentProvider } from '@/lib/store';
import { uiStore, useUI } from '@/lib/ui';
import { Cursor } from './Cursor';
import { Loader } from './Loader';
import { Nav } from './Nav';
import { AdminPanel } from './AdminPanel';
import { EasterEggs } from './EasterEggs';
import { Sections, ProjectDetail } from '@/sections/Sections';

/**
 * Root client shell. The WebGL layer is loaded with `ssr: false` — Three.js
 * touches `window` during module init, and there is nothing meaningful to
 * server-render inside a canvas anyway.
 */
const Experience = dynamic(
  () => import('@/scene/Experience').then((m) => m.Experience),
  { ssr: false }
);

function Chrome() {
  const { focusedProject } = useUI();

  return (
    <>
      <Nav />
      <Sections />
      <AnimatePresence>
        {focusedProject && (
          <ProjectDetail
            id={focusedProject}
            onClose={() => uiStore.set({ focusedProject: null })}
          />
        )}
      </AnimatePresence>
    </>
  );
}

export function App() {
  useLenis();
  usePointer();


  return (
    <ContentProvider>
      <Loader />
      <Experience />
      <Chrome />
      <AdminPanel />
      <EasterEggs />
      <Cursor />

      {/* Cinematic finishing layers — always on top of everything else. */}
      <div className="cine-vignette" aria-hidden />
      <div className="noise-overlay" aria-hidden />
    </ContentProvider>
  );
}
