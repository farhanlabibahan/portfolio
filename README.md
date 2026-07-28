# Farhan Labib Ahan — WebGL Portfolio

A scroll-driven cinematic experience. Nine 3D worlds, one continuous camera spline, custom GLSL throughout.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
```

---

## The secret console

Four ways in — pick whichever you'll remember:

| Method | How |
| --- | --- |
| **Key sequence** | Type `ahan` anywhere on the page |
| **Hotkey** | `⌘ / Ctrl` + `Shift` + `E` |
| **URL** | Add `#console` to the address |
| **Touch** | Press and hold the very bottom-left corner for ~1 second |

Passphrase: whatever `ADMIN_PASSPHRASE` is set to (ships as `aH@n_cv1`).

From there you can add, edit, reorder and delete achievements, projects, skills, links and your bio.

### Changing the passphrase

**Local:** edit `ADMIN_PASSPHRASE` in `.env.local`, restart `npm run dev`.

**Production:** Vercel → Project → Settings → Environment Variables → add `ADMIN_PASSPHRASE`, then redeploy. (Vercel doesn't read your local `.env.local`, so this step is required or the console will report that the server isn't configured.)

The value is checked by `POST /api/unlock` on the server, so it never appears in the JavaScript sent to the browser. Note the deliberate absence of a `NEXT_PUBLIC_` prefix — that prefix inlines a variable into the client bundle verbatim, which would make the passphrase editable but not private. The route also does a constant-time comparison and rate-limits to 8 attempts per minute per IP.

### Making an edit permanent

Edits are saved to `localStorage`, so they live on the device you made them on. To publish for everyone:

1. Open the console → **Data** tab (or hit **Copy JSON**)
2. Paste the JSON over `DEFAULT_CONTENT` in `src/lib/data.ts`
3. Commit and redeploy

Want edits to sync across devices without that step? Swap the `persist()` function in `src/lib/store.tsx` for a Vercel KV or Postgres write — it's the only place storage is touched.

---

## Deploying to Vercel

Push to GitHub, import the repo in Vercel, accept the defaults. No environment variables, no build config, no external assets — everything (lighting, textures, geometry) is generated procedurally at runtime.

If your current deployment shows a Vercel login screen, that's **Deployment Protection**. Turn it off under Project → Settings → Deployment Protection, or the site stays private.

---

## The desk

The whole site is **one desk** — a CSE student's workspace at night. Rain running down the window with neon bleeding through it, a CRT full of C++, a warm lamp, a stack of books, a mug, a breadboard with blinking LEDs, a Rubik's cube. The camera never cuts; it drifts around that one desk, settling on whatever each chapter is about.

| # | Chapter | Where the camera goes |
| --- | --- | --- |
| 1 | Home | Wide establishing shot of the whole desk |
| 2 | About | Leans in toward the monitor — bio and skills |
| 3 | Journey | Down onto the stack of books — stats and experience |
| 4 | Awards | Up to the framed pieces on the wall — **competition results** |
| 5 | Work | Square on to the CRT — **GitHub projects** |
| 6 | Contact | Pulls back, window filling the frame |

Lighting is four practical sources — lamp, CRT, neon, breadboard LEDs — with almost no ambient. Bright pools against near-black is the entire look; an evenly lit room would kill it.

Text *inside* the scene (the code on the CRT, the neon, the book spines, the wall frames) is drawn to 2D canvases and used as textures — see `src/utils/canvasTexture.ts`. No font files to fetch or host; it uses fonts the browser already has.

Camera stops live in `STOPS` (`src/scene/anchors.ts`) and the rig derives its keyframes from there, so geometry and camera can't drift apart. Each stop's framing is verified against its subject at both 16:9 and portrait.

Hidden extras: Konami code (`↑↑↓↓←→←→BA`) for chaos mode, `?` for shortcuts, and a note in the browser console.

---

## Architecture

```
src/
  app/          layout, global CSS, design tokens
  components/   cursor, loader, nav, rail, admin console, easter eggs
  sections/     DOM copy overlay (one block per world)
  scene/        Canvas root, camera rig, post-processing
    objects/    one file per world
  shaders/      GLSL — noise, particles, nebula, portal, hologram, energy
  hooks/        Lenis scroll, pointer, device-quality probe
  lib/          content store, scroll singleton, UI store
  utils/        seeded RNG, mesh surface sampling
```

Two decisions worth knowing about if you go editing:

**Scroll state is a plain mutable object, not React state** (`src/lib/scroll.ts`). Lenis writes to it, `useFrame` reads from it. Routing 120 updates/second through React would re-render the tree constantly and tank the frame rate.

**Content lives in a module-level store, not React context** (`src/lib/store.tsx`). React Three Fiber renders into its own reconciler root, and context does not cross that boundary — with a provider, your admin edits would update the text but leave the 3D cards stale.

### One palette — night, no theme switch

`PALETTE` in `src/scene/anchors.ts`. Near-black room lit by four practicals: the desk lamp, the CRT, the neon through the rain, and the LEDs on the breadboard.

There is deliberately no light mode. A lit version of this scene is a *different room*, not a recolour, and every attempt at having both meant swapping lighting at runtime — which is where the R3F circular-structure crash kept coming from.

#### Rules for the R3F tree

- **Lights use settable props** (`color`, `groundColor`, `intensity`), never `args`. `args` is *constructor arguments* — changing it makes R3F dispose and rebuild the object, so a theme swap would tear down every light in the room.
- **Fog and background are mutated, not re-created.** `AtmosphereDriver` lerps `fog.color` and `scene.background` per frame, which gives a smooth cross-fade for free.
- **Never put a `ref` on a post-processing effect** — see below.

## The "Converting circular structure to JSON" trap

Worth reading before touching `src/scene/Effects.tsx`.

Most effects in `@react-three/postprocessing` (Bloom, ChromaticAberration, Vignette, Noise, ToneMapping, and 14 others) are built with `wrapEffect`, a plain function component whose args memo is keyed on the JSON of its rest props:

```js
const args = useMemo(() => [...], [JSON.stringify(restProps)])
```

In React 19, `ref` is an **ordinary prop** on function components. So `<Bloom ref={x} />` puts the ref into those rest props. Once React populates it, `ref.current` is the effect instance, which carries R3F's `__r3f` Instance with its `children` array and `parent` back-reference — and `JSON.stringify` walks straight into the cycle:

```
TypeError: Converting circular structure to JSON
  property 'children' -> Array -> index 0 -> property 'parent' closes the circle
  at Canvas
```

The error points at `<Canvas>`, which is nowhere near the actual cause.

**The nasty part:** the first render is fine, because `ref.current` is still `null`. It only throws on the second. That means it passes `tsc`, `next build`, static generation and any SSR smoke test, and fails only in a real browser.

So every parameter in the post chain is a **static prop**. Anything that needs to animate must mutate an object already handed to the effect — the chromatic-aberration `offset` is a `Vector2` we own and write to in `useFrame`, which touches no React props and allocates nothing per frame.

`npm run check:effects` enforces this statically. `npm run check` runs it alongside `tsc`.

Accents are re-picked per theme, not reused: `#22E1FF` measures 1.4:1 on the evening background — invisible. Both palettes verified at WCAG AA (4.5:1) for body, muted and every accent.

Styling flows through semantic tokens (`--ink`, `--ink-2`, `--ink-3`, `--panel`, `--panel-brd`, `--scrim`, `--halo`, `--shadow`) in `globals.css`. Build new UI on those and it themes for free — `--halo` in particular flips the text separation from a white glow to a black one.

### Sun shafts

`src/shaders/sunshaft.ts` — one additive quad per window, soft-edged, with drifting noise. Real volumetric light means a raymarch or an occlusion-buffer blur; at these angles a quad reads the same for a fraction of the cost.

The tilt and length are **derived from where the light should land**, not hand-tuned. Hand-tuning is how the first version ended up aiming at the ceiling.

The sun is a directional light that **rides along with the camera** (`SunLight`). Two traps it avoids: `target-position` as a JSX prop does nothing unless `light.target` is added to the scene, and a directional light's orthographic shadow camera can't cover a 90-unit room at usable resolution — so it keeps a tight box around whatever's on screen.

### The card reel mounts exactly one card

`CardReel` renders **only** the active card. Not hidden, not faded — the others aren't in the document.

Three earlier versions kept every card mounted and controlled them with opacity and visibility, and each failed differently:

1. Neighbours at partial opacity overlapped, because the cards are tall.
2. A card declaring `visibility: visible` **overrode its hidden chapter** — visibility is inherited, and an explicit `visible` on a descendant beats a `hidden` ancestor. The Awards and Work cards bled across every other section.
3. A RAF loop held element references captured at mount.

One mounted card makes all three impossible. React swaps the node on a `key` change, which restarts the CSS entrance animation.

**Two numbers must stay in sync:** `activeIndex`'s `(through - 0.10) / 0.80` inset in `CardReel.tsx`, and `useSectionFade`'s `(d - 0.40) / 0.10` window in `Sections.tsx`. They're matched so the first card is fully settled exactly as the chapter reaches full opacity, and the last is still up as it begins to leave. Mismatch them and the outer cards get shown while the chapter is still faded — which reads as "I only ever see two of them".

Simulated dwell per card: 28/43/43/28vh for the four achievements, 20–26vh each for the six projects.

Because only one card is mounted, both reels also carry a visually-hidden `<ul>` with the full list so the content stays crawlable.

### Chapter panes are fixed, not sticky

`.chapter-inner` is `position: fixed`, with visibility driven by scroll index in `useSectionFade`.

It used to be `position: sticky`, which is a trap here: a sticky child only stays pinned for (block height − pane height) of scrolling. With a 160vh section and a 100vh pane that's **37.5%** — the copy scrolled away for the other 62.5% while the camera was still travelling. That's why the Awards and Work reels could only ever reach one of their cards: the pane left the screen before the reel had advanced.

`throughFor()` now spans exactly ±0.5 index, matching the range a fixed pane is shown for, so a reel gets the section's whole scroll distance.

### Lab geometry — one source of truth

`src/scene/anchors.ts` owns the layout. `STATIONS` lists each workstation's Z and side; `cameraStop()` derives where the camera parks; `monitorYaw()` derives which way the panel faces. **The camera rig and the room geometry both read from these** — they are not maintained separately. Earlier versions kept camera keyframes and scene positions in two places, and every time one moved the camera ended up aimed at nothing.

Two non-obvious things in there:

- Monitors are **angled toward the camera's parking spot**, not square across the aisle. Perpendicular panels are seen almost edge-on by a camera travelling down the aisle — measured at 20% of frame width. Angled, they fill ~61%.
- The rig applies a **horizontal FOV lock**. Three.js fixes the *vertical* field of view, so a portrait phone sees a much narrower horizontal slice and the monitor gets cropped off both sides. Widening vertical FOV to hold horizontal constant keeps the framing identical from 16:9 down to 0.46 — verified centred at all four common aspects.

### The card reel — and why it's DOM, not WebGL

Achievements and projects are **plain HTML cards** (`src/components/CardReel.tsx`), absolutely positioned and moved by a RAF loop reading `scroll.index`. Each rises from below into centre, holds, then continues up and out.

They were originally rendered inside the 3D scene using drei's `<Html>`. Don't go back to that. `<Html>` visibility is binary — it either mounts the DOM or it doesn't — so cards meant to be at 20% "fading" opacity rendered at **full CSS opacity behind the front card**. The result was a permanent pile-up of ghost cards, and no amount of tuning the reveal curve fixed it, because the reveal value was never reaching the DOM in the first place.

In plain DOM, opacity is just opacity. The 3D layer behind those sections (`HoloBackdrop`) is deliberately abstract and text-free so it can't compete with the cards in front.

### Headline text — a trap worth knowing

`.text-gradient` used to use `background-clip: text` with `color: transparent`, painting a gradient through the glyph shapes. Two things silently blank that out:

- **`text-shadow`** renders *on top of* the clipped background, filling the glyphs with the shadow colour — the heading goes solid black.
- **A `filter` on a descendant** (e.g. animating per-character blur) gives that element its own rendering surface, detached from the ancestor's background.

Both are easy to reintroduce by accident and the failure mode is unreadable text rather than an error, so the technique is gone entirely. It's now a solid colour with an animated glow, which cannot fail that way.

---

## Performance

Targets 60fps. Device capability is probed on mount (`src/hooks/useQuality.ts`) and drives particle counts, DPR cap, shadows and the post-processing chain. Mobile gets roughly 30% of the particles and a trimmed effect stack.

The city is three draw calls (instanced). Every world stays mounted but is visibility-gated by camera proximity — remounting a 90k-point cloud mid-scroll would drop frames every time.
