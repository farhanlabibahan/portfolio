'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { uiStore, useUI, setCursor } from '@/lib/ui';
import { useContent } from '@/lib/store';
import type {
  Achievement,
  Content,
  Experience,
  Link,
  Project,
  SkillGroup,
  Stat,
} from '@/lib/data';

/**
 * ============================================================================
 * HIDDEN ADMIN PANEL
 * ============================================================================
 * Four ways in — all deliberately undiscoverable by accident:
 *
 *   1. Type the word `ahan` anywhere on the page (key sequence, 1.5s timeout)
 *   2. ⌘/Ctrl + Shift + E
 *   3. Visit the URL with `#console`
 *   4. Press and hold the bottom-left corner pixel for 900ms (mobile)
 *
 * Then the passphrase gate. The passphrase itself is NOT in this file — it is
 * checked by POST /api/unlock against the server-only ADMIN_PASSPHRASE
 * environment variable, so it never ships in the browser bundle. Change it in
 * .env.local for dev, or in Vercel's environment variables for production.
 * ============================================================================
 */

const SEQUENCE = 'ahan';
const UNLOCK_KEY = 'ahan.console.unlocked';

type Tab = 'achievements' | 'projects' | 'skills' | 'experience' | 'profile' | 'data';

export function AdminPanel() {
  const { adminOpen } = useUI();
  const { content, replace, reset } = useContent();

  const [unlocked, setUnlocked] = useState(false);
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [tab, setTab] = useState<Tab>('achievements');
  const [draft, setDraft] = useState<Content>(content);
  const [toast, setToast] = useState('');

  /* Keep the draft in sync when the panel opens. */
  useEffect(() => {
    if (adminOpen) setDraft(content);
  }, [adminOpen, content]);

  /* Remember the unlock for the tab session only. */
  useEffect(() => {
    try {
      if (sessionStorage.getItem(UNLOCK_KEY) === '1') setUnlocked(true);
    } catch {
      /* private mode */
    }
  }, []);

  /* ------------------------------------------------------------------
     SECRET ENTRY POINTS
     ------------------------------------------------------------------ */
  useEffect(() => {
    let buffer = '';
    let timer = 0;

    const onKey = (e: KeyboardEvent) => {
      // Never trigger while the user is typing in a field.
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;

      // 2. hotkey
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        uiStore.set({ adminOpen: true });
        return;
      }

      // 1. key sequence
      if (e.key.length === 1) {
        buffer = (buffer + e.key.toLowerCase()).slice(-SEQUENCE.length);
        window.clearTimeout(timer);
        timer = window.setTimeout(() => (buffer = ''), 1500);
        if (buffer === SEQUENCE) {
          buffer = '';
          uiStore.set({ adminOpen: true });
        }
      }

      if (e.key === 'Escape') uiStore.set({ adminOpen: false });
    };

    // 3. hash
    const checkHash = () => {
      if (window.location.hash.toLowerCase() === '#console') {
        uiStore.set({ adminOpen: true });
      }
    };

    window.addEventListener('keydown', onKey);
    window.addEventListener('hashchange', checkHash);
    checkHash();

    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('hashchange', checkHash);
      window.clearTimeout(timer);
    };
  }, []);

  /* ------------------------------------------------------------------
     ACTIONS
     ------------------------------------------------------------------ */
  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 2200);
  };

  const tryUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (checking) return;

    setChecking(true);
    setError('');

    try {
      const res = await fetch('/api/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passphrase: pass }),
      });
      const data = (await res.json()) as { ok?: boolean; reason?: string };

      if (data.ok) {
        setUnlocked(true);
        setPass('');
        try {
          sessionStorage.setItem(UNLOCK_KEY, '1');
        } catch {
          /* private mode — unlock just won't persist across reloads */
        }
      } else {
        setError(data.reason ?? 'Access denied');
        setPass('');
        window.setTimeout(() => setError(''), 2600);
      }
    } catch {
      // Network failure, or the route is missing (e.g. a static export).
      setError('Could not reach the server');
      window.setTimeout(() => setError(''), 2600);
    } finally {
      setChecking(false);
    }
  };

  const save = () => {
    replace(draft);
    flash('Saved to this browser');
  };

  const close = () => uiStore.set({ adminOpen: false });

  const copyJson = async () => {
    const json = JSON.stringify(draft, null, 2);
    try {
      await navigator.clipboard.writeText(json);
      flash('JSON copied — paste into lib/data.ts to publish');
    } catch {
      flash('Copy failed — select the text below manually');
    }
  };

  const importJson = () => {
    const raw = window.prompt('Paste a content JSON blob:');
    if (!raw) return;
    try {
      setDraft({ ...draft, ...(JSON.parse(raw) as Content) });
      flash('Imported — remember to Save');
    } catch {
      flash('That was not valid JSON');
    }
  };

  /* --- generic list helpers so the four editors share one code path ---- */
  function listOps<
    K extends 'achievements' | 'projects' | 'skills' | 'links' | 'experience' | 'stats',
  >(key: K) {
    type Item = Content[K][number];
    const items = draft[key] as Item[];
    return {
      items,
      set: (i: number, patch: Partial<Item>) => {
        const next = [...items];
        next[i] = { ...next[i], ...patch };
        setDraft({ ...draft, [key]: next } as Content);
      },
      add: (blank: Item) => setDraft({ ...draft, [key]: [...items, blank] } as Content),
      remove: (i: number) =>
        setDraft({ ...draft, [key]: items.filter((_, k) => k !== i) } as Content),
      move: (i: number, dir: -1 | 1) => {
        const j = i + dir;
        if (j < 0 || j >= items.length) return;
        const next = [...items];
        [next[i], next[j]] = [next[j], next[i]];
        setDraft({ ...draft, [key]: next } as Content);
      },
    };
  }

  const uid = () => Math.random().toString(36).slice(2, 9);

  return (
    <>
      {/* 4. Invisible long-press corner target (mostly for touch devices). */}
      <CornerTrigger />

      <AnimatePresence>
        {adminOpen && (
          <motion.div
            className="admin-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            onClick={(e) => {
              if (e.target === e.currentTarget) close();
            }}
          >
            <motion.div
              className="admin glass"
              initial={{ y: 40, opacity: 0, scale: 0.97 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 30, opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <header className="admin-head">
                <div>
                  <span className="eyebrow">Private</span>
                  <h2>Content Console</h2>
                </div>
                <button className="admin-x" onClick={close} aria-label="Close">
                  ✕
                </button>
              </header>

              {!unlocked ? (
                <form className="admin-lock" onSubmit={tryUnlock}>
                  <p className="admin-hint">Passphrase required.</p>
                  <input
                    autoFocus
                    type="password"
                    value={pass}
                    onChange={(e) => setPass(e.target.value)}
                    placeholder="••••••••"
                    className="admin-input"
                    disabled={checking}
                    onFocus={() => setCursor('text')}
                    onBlur={() => setCursor('default')}
                  />
                  <button className="admin-btn primary" type="submit" disabled={checking}>
                    {checking ? 'Checking…' : 'Unlock'}
                  </button>
                  {error && <span className="admin-error">{error}</span>}
                </form>
              ) : (
                <>
                  <nav className="admin-tabs">
                    {(
                      [
                        'achievements',
                        'projects',
                        'skills',
                        'experience',
                        'profile',
                        'data',
                      ] as Tab[]
                    ).map((t) => (
                      <button
                        key={t}
                        className={`admin-tab ${tab === t ? 'on' : ''}`}
                        onClick={() => setTab(t)}
                      >
                        {t}
                      </button>
                    ))}
                  </nav>

                  <div className="admin-body">
                    {/* ---------------- ACHIEVEMENTS ---------------- */}
                    {tab === 'achievements' && (
                      <ListEditor
                        ops={listOps('achievements')}
                        blank={
                          {
                            id: uid(),
                            event: 'New Event 2026',
                            category: 'Hackathon',
                            team: 'Team name',
                            placement: '1st Place',
                            year: '2026',
                            note: '',
                          } as Achievement
                        }
                        addLabel="Add achievement"
                        render={(a: Achievement, i, set) => (
                          <>
                            <Field label="Event" value={a.event} onChange={(v) => set(i, { event: v })} />
                            <Row>
                              <Field label="Category" value={a.category} onChange={(v) => set(i, { category: v })} />
                              <Field label="Year" value={a.year} onChange={(v) => set(i, { year: v })} />
                            </Row>
                            <Row>
                              <Field label="Team" value={a.team} onChange={(v) => set(i, { team: v })} />
                              <Field label="Placement" value={a.placement} onChange={(v) => set(i, { placement: v })} />
                            </Row>
                            <Field
                              label="Note"
                              value={a.note ?? ''}
                              onChange={(v) => set(i, { note: v })}
                              area
                            />
                          </>
                        )}
                        title={(a: Achievement) => `${a.event} — ${a.category}`}
                      />
                    )}

                    {/* ---------------- PROJECTS ---------------- */}
                    {tab === 'projects' && (
                      <ListEditor
                        ops={listOps('projects')}
                        blank={
                          {
                            id: uid(),
                            title: 'New Project',
                            blurb: 'What it does and why it matters.',
                            stack: ['Tech'],
                            href: '#',
                            accent: 'cyan',
                          } as Project
                        }
                        addLabel="Add project"
                        render={(p: Project, i, set) => (
                          <>
                            <Field label="Title" value={p.title} onChange={(v) => set(i, { title: v })} />
                            <Field label="Blurb" value={p.blurb} onChange={(v) => set(i, { blurb: v })} area />
                            <Row>
                              <Field
                                label="Stack (comma separated)"
                                value={p.stack.join(', ')}
                                onChange={(v) =>
                                  set(i, { stack: v.split(',').map((s) => s.trim()).filter(Boolean) })
                                }
                              />
                              <Select
                                label="Accent"
                                value={p.accent}
                                options={['cyan', 'violet', 'electric', 'purple']}
                                onChange={(v) => set(i, { accent: v as Project['accent'] })}
                              />
                            </Row>
                            <Field label="Link" value={p.href ?? ''} onChange={(v) => set(i, { href: v })} />
                          </>
                        )}
                        title={(p: Project) => p.title}
                      />
                    )}

                    {/* ---------------- SKILLS ---------------- */}
                    {tab === 'skills' && (
                      <ListEditor
                        ops={listOps('skills')}
                        blank={
                          {
                            id: uid(),
                            name: 'New Skill',
                            level: 0.7,
                            items: ['Tool'],
                            accent: 'cyan',
                          } as SkillGroup
                        }
                        addLabel="Add skill planet"
                        render={(s: SkillGroup, i, set) => (
                          <>
                            <Row>
                              <Field label="Name" value={s.name} onChange={(v) => set(i, { name: v })} />
                              <Select
                                label="Accent"
                                value={s.accent}
                                options={['cyan', 'violet', 'electric', 'purple']}
                                onChange={(v) => set(i, { accent: v as SkillGroup['accent'] })}
                              />
                            </Row>
                            <label className="admin-field">
                              <span>Level — {Math.round(s.level * 100)}%</span>
                              <input
                                type="range"
                                min={0.2}
                                max={1}
                                step={0.01}
                                value={s.level}
                                onChange={(e) => set(i, { level: Number(e.target.value) })}
                              />
                            </label>
                            <Field
                              label="Items (comma separated)"
                              value={s.items.join(', ')}
                              onChange={(v) =>
                                set(i, { items: v.split(',').map((x) => x.trim()).filter(Boolean) })
                              }
                            />
                          </>
                        )}
                        title={(s: SkillGroup) => s.name}
                      />
                    )}

                    {/* ---------------- EXPERIENCE ---------------- */}
                    {tab === 'experience' && (
                      <ListEditor
                        ops={listOps('experience')}
                        blank={
                          {
                            id: uid(),
                            period: '2026 — Present',
                            role: 'Role title',
                            org: 'Organisation',
                            detail: 'What you did there.',
                          } as Experience
                        }
                        addLabel="Add experience"
                        render={(x: Experience, i, set) => (
                          <>
                            <Row>
                              <Field label="Period" value={x.period} onChange={(v) => set(i, { period: v })} />
                              <Field label="Organisation" value={x.org} onChange={(v) => set(i, { org: v })} />
                            </Row>
                            <Field label="Role" value={x.role} onChange={(v) => set(i, { role: v })} />
                            <Field
                              label="Detail"
                              value={x.detail}
                              onChange={(v) => set(i, { detail: v })}
                              area
                            />
                          </>
                        )}
                        title={(x: Experience) => `${x.role} — ${x.org}`}
                      />
                    )}

                    {/* ---------------- PROFILE ---------------- */}
                    {tab === 'profile' && (
                      <div className="admin-stack">
                        <Field label="Name" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} />
                        <Field label="Role" value={draft.role} onChange={(v) => setDraft({ ...draft, role: v })} />
                        <Field
                          label="Location"
                          value={draft.location}
                          onChange={(v) => setDraft({ ...draft, location: v })}
                        />
                        <Field
                          label="Hero rotating roles (comma separated)"
                          value={draft.roles.join(', ')}
                          onChange={(v) =>
                            setDraft({
                              ...draft,
                              roles: v.split(',').map((s) => s.trim()).filter(Boolean),
                            })
                          }
                        />
                        <Field
                          label="Tagline"
                          value={draft.tagline}
                          onChange={(v) => setDraft({ ...draft, tagline: v })}
                          area
                        />
                        <Row>
                          <Field
                            label="Email"
                            value={draft.email}
                            onChange={(v) => setDraft({ ...draft, email: v })}
                          />
                          <Field
                            label="Phone — blank hides the Call button"
                            value={draft.phone ?? ''}
                            onChange={(v) => setDraft({ ...draft, phone: v })}
                          />
                        </Row>
                        <Field
                          label="About (one paragraph per line)"
                          value={draft.about.join('\n')}
                          onChange={(v) => setDraft({ ...draft, about: v.split('\n').filter(Boolean) })}
                          area
                          rows={7}
                        />

                        <div className="admin-sub">Stats</div>
                        <ListEditor
                          ops={listOps('stats')}
                          blank={{ id: uid(), value: '0', label: 'Label' } as Stat}
                          addLabel="Add stat"
                          compact
                          render={(st: Stat, i, set) => (
                            <Row>
                              <Field label="Value" value={st.value} onChange={(v) => set(i, { value: v })} />
                              <Field label="Label" value={st.label} onChange={(v) => set(i, { label: v })} />
                            </Row>
                          )}
                          title={(st: Stat) => `${st.value} — ${st.label}`}
                        />

                        <div className="admin-sub">Links</div>
                        <ListEditor
                          ops={listOps('links')}
                          blank={{ id: uid(), label: 'Label', href: 'https://' } as Link}
                          addLabel="Add link"
                          compact
                          render={(l: Link, i, set) => (
                            <Row>
                              <Field label="Label" value={l.label} onChange={(v) => set(i, { label: v })} />
                              <Field label="URL" value={l.href} onChange={(v) => set(i, { href: v })} />
                            </Row>
                          )}
                          title={(l: Link) => l.label}
                        />
                      </div>
                    )}

                    {/* ---------------- DATA ---------------- */}
                    {tab === 'data' && (
                      <div className="admin-stack">
                        <p className="admin-hint">
                          Edits live in this browser only. To publish them for everyone, copy the
                          JSON below and paste it over <code>DEFAULT_CONTENT</code> in{' '}
                          <code>src/lib/data.ts</code>, then redeploy.
                        </p>
                        <textarea
                          className="admin-input admin-json"
                          readOnly
                          value={JSON.stringify(draft, null, 2)}
                          rows={16}
                          onFocus={(e) => e.currentTarget.select()}
                        />
                      </div>
                    )}
                  </div>

                  <footer className="admin-foot">
                    <div className="admin-foot-left">
                      <button className="admin-btn" onClick={copyJson}>
                        Copy JSON
                      </button>
                      <button className="admin-btn" onClick={importJson}>
                        Import
                      </button>
                      <button
                        className="admin-btn danger"
                        onClick={() => {
                          if (confirm('Reset all content to the built-in defaults?')) {
                            reset();
                            flash('Reset to defaults');
                            close();
                          }
                        }}
                      >
                        Reset
                      </button>
                    </div>
                    <div className="admin-foot-right">
                      {toast && <span className="admin-toast">{toast}</span>}
                      <button className="admin-btn primary" onClick={save}>
                        Save
                      </button>
                    </div>
                  </footer>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ==========================================================================
   SMALL FORM PRIMITIVES
   ========================================================================== */

function Row({ children }: { children: React.ReactNode }) {
  return <div className="admin-row">{children}</div>;
}

function Field({
  label,
  value,
  onChange,
  area,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  area?: boolean;
  rows?: number;
}) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      {area ? (
        <textarea
          className="admin-input"
          value={value}
          rows={rows}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setCursor('text')}
          onBlur={() => setCursor('default')}
        />
      ) : (
        <input
          className="admin-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setCursor('text')}
          onBlur={() => setCursor('default')}
        />
      )}
    </label>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      <select className="admin-input" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

type Ops<T> = {
  items: T[];
  set: (i: number, patch: Partial<T>) => void;
  add: (blank: T) => void;
  remove: (i: number) => void;
  move: (i: number, dir: -1 | 1) => void;
};

/**
 * One row per entry, with four controls: reorder, show/hide, delete, expand.
 *
 * Show/hide and delete are deliberately different actions. Deleting an award
 * to keep it off the site means re-typing it to bring it back, and the copy
 * only exists in this one browser — so the destructive option was the only
 * option, which is a bad place to leave someone. The eye toggle takes an entry
 * off the live site while leaving the record intact.
 */
function ListEditor<T extends { id: string; hidden?: boolean }>({
  ops,
  blank,
  render,
  title,
  addLabel,
  compact,
}: {
  ops: Ops<T>;
  blank: T;
  render: (item: T, i: number, set: Ops<T>['set']) => React.ReactNode;
  title: (item: T) => string;
  addLabel: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState<number | null>(0);
  const shownCount = ops.items.filter((i) => !i.hidden).length;

  return (
    <div className="admin-list">
      <div className="admin-list-meta">
        {shownCount} of {ops.items.length} showing on the site
      </div>

      {ops.items.map((item, i) => (
        <div
          key={item.id}
          className={`admin-item ${open === i ? 'open' : ''} ${item.hidden ? 'hidden-item' : ''}`}
        >
          <div className="admin-item-head">
            <button className="admin-item-title" onClick={() => setOpen(open === i ? null : i)}>
              <span className="admin-caret">{open === i ? '▾' : '▸'}</span>
              {title(item) || 'Untitled'}
              {item.hidden && <span className="admin-flag">hidden</span>}
            </button>
            <div className="admin-item-tools">
              <button
                className={`admin-eye ${item.hidden ? 'off' : ''}`}
                onClick={() => ops.set(i, { hidden: !item.hidden } as Partial<T>)}
                title={item.hidden ? 'Show on the site' : 'Hide from the site'}
                aria-pressed={!item.hidden}
              >
                {item.hidden ? '🚫' : '👁'}
              </button>
              <button onClick={() => ops.move(i, -1)} title="Move up">
                ↑
              </button>
              <button onClick={() => ops.move(i, 1)} title="Move down">
                ↓
              </button>
              <button
                className="danger"
                onClick={() => {
                  if (confirm(`Delete "${title(item) || 'Untitled'}" permanently?`)) ops.remove(i);
                }}
                title="Delete permanently"
              >
                ✕
              </button>
            </div>
          </div>
          {open === i && (
            <div className={`admin-item-body ${compact ? 'compact' : ''}`}>
              {render(item, i, ops.set)}
            </div>
          )}
        </div>
      ))}
      <button
        className="admin-btn dashed"
        onClick={() => {
          ops.add({ ...blank, id: Math.random().toString(36).slice(2, 9) });
          setOpen(ops.items.length);
        }}
      >
        + {addLabel}
      </button>
    </div>
  );
}

/** Long-press the bottom-left corner for 900ms. Invisible, 26px, no hit noise. */
function CornerTrigger() {
  const timer = useRef(0);
  const start = () => {
    timer.current = window.setTimeout(() => uiStore.set({ adminOpen: true }), 900);
  };
  const stop = () => window.clearTimeout(timer.current);

  return (
    <div
      className="admin-corner"
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      aria-hidden
    />
  );
}
