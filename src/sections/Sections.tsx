'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { SplitText, Reveal } from '@/components/SplitText';
import { MagneticButton } from '@/components/MagneticButton';
import { useContent } from '@/lib/store';
import { visible, videoUrl, videoThumb } from '@/lib/data';
import {
  SECTIONS,
  SECTION_LABELS,
  NAV_SECTIONS,
  SECTION_VH,
  scroll as scrollState,
  smootherstep,
  clamp as clampNum,
  lenisWheel,
} from '@/lib/scroll';
import { setCursor } from '@/lib/ui';
import { SectionActiveProvider } from '@/lib/sectionActive';

/**
 * ============================================================================
 * DOM OVERLAY
 * ============================================================================
 * The readable half. Six chapters, one per workstation in the lab.
 *
 * WebGL owns the room; the DOM owns every word. Text rendered into a canvas is
 * never as crisp, never selectable and never accessible — and at this scale it
 * costs more than it's worth.
 * ============================================================================
 */

function Shell({
  id,
  children,
  align = 'left',
  className = '',
  last = false,
}: {
  id: string;
  children: React.ReactNode;
  /**
   * `split` — two columns, for content too tall to stack in one 100vh pane
   * `table` — centred, wide, for the data tables
   */
  align?: 'left' | 'right' | 'center' | 'split' | 'table';
  className?: string;
  /** The final chapter is exactly one viewport tall. */
  last?: boolean;
}) {
  const innerRef = useSectionFade(id);

  /**
   * Every chapter is SECTION_VH tall except the last, which is 100vh. That
   * makes the total scrollable distance exactly (N-1) * SECTION_VH, so the
   * camera arrives at its final keyframe precisely at the bottom of the page —
   * no dead zone where you're still scrolling but nothing is moving.
   */
  return (
    <section id={id} className="chapter" style={{ height: last ? '100vh' : `${SECTION_VH}vh` }}>
      <div ref={innerRef} className={`chapter-inner ${align} ${className}`}>
        {/* Gates every SplitText/Reveal below on this chapter being the one in
            view, so the staggers replay on arrival instead of having all fired
            together during the loader. */}
        <SectionActiveProvider id={id}>{children}</SectionActiveProvider>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------------------
   CHAPTER CROSSFADE TUNING
   --------------------------------------------------------------------------
   `d` is the distance, in section-index units, from the camera to this
   chapter's workstation. 1.0 = one whole section = SECTION_VH of scrolling.

   HOLD is how far the copy stays at full strength; EDGE is where it is fully
   gone. The gap between them is the crossfade, and it used to be 0.40 → 0.50
   — a tenth of a section, about 16vh of scroll. At Lenis' scroll speed that
   is roughly a fifth of a second, which reads as a cut rather than a
   transition: chapter 1 was still solid when chapter 2 snapped in.

   0.26 → 0.52 gives the fade ~42vh to run, so consecutive chapters genuinely
   dissolve through each other. The two ranges deliberately overlap slightly
   (0.52 > 0.50) so there is never a frame with no copy on screen at all.
   -------------------------------------------------------------------------- */
const FADE_HOLD = 0.26;
const FADE_EDGE = 0.52;
/** Travel of the copy across the fade, in px. Small on purpose — this is a
    drift, not a slide. Anything past ~60px starts to feel like a carousel. */
const FADE_SHIFT = 44;
const FADE_BLUR = 7;

/**
 * Cross-dissolves a chapter's copy as the camera moves between workstations.
 *
 * Fixed panes from consecutive sections are both in the document at the
 * transition between them, so without this you get two chapters' worth of
 * headings and tables painted on top of each other.
 *
 * Opacity alone is what made it "pop" — the eye reads a pure alpha ramp over a
 * moving 3D background as an on/off switch. Pairing it with a small
 * direction-aware drift, a touch of blur and a hair of scale gives the change
 * somewhere to travel, so it lands as a transition instead of a cut.
 */
function useSectionFade(id: string) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const target = SECTIONS.indexOf(id as (typeof SECTIONS)[number]);
    if (target < 0) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let raf = 0;
    let lastT = -1;
    let lastV = '';

    const loop = () => {
      /* Signed, so we know which side of the chapter we are on: positive means
         the camera has already passed it and the copy should leave upward;
         negative means it is still ahead and should rise into place. */
      const delta = scrollState.index - target;
      const t = smootherstep(clampNum((Math.abs(delta) - FADE_HOLD) / (FADE_EDGE - FADE_HOLD)));

      /* 0.004 is below one 8-bit alpha step — anything finer is a repaint that
         cannot be seen. */
      if (Math.abs(t - lastT) > 0.004) {
        lastT = t;
        el.style.opacity = String(1 - t);

        if (reduced) {
          el.style.transform = '';
          el.style.filter = '';
        } else {
          const dir = delta > 0 ? -1 : 1;
          /* Cleared entirely at rest rather than left at `blur(0px)`: an
             always-on filter forces the whole pane onto its own composited
             layer, and `.text-gradient` uses background-clip: text, which is
             fragile inside one. */
          if (t < 0.002) {
            el.style.transform = '';
            el.style.filter = '';
          } else {
            el.style.transform = `translate3d(0, ${(dir * t * FADE_SHIFT).toFixed(2)}px, 0) scale(${(1 - t * 0.022).toFixed(4)})`;
            el.style.filter = `blur(${(t * FADE_BLUR).toFixed(2)}px)`;
          }
        }
      }

      /* Below 1% the pane is invisible but still hit-testable and still
         painting — take it out of both. */
      const v = t > 0.99 ? 'hidden' : 'visible';
      if (v !== lastV) {
        lastV = v;
        el.style.visibility = v;
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [id]);

  return ref;
}

/** Rotating role typewriter, carried over from the previous portfolio. */
function Typewriter({ words }: { words: string[] }) {
  const [text, setText] = useState('');
  const timer = useRef<number>(0);

  useEffect(() => {
    if (!words.length) return;
    let word = 0;
    let char = 0;
    let deleting = false;
    let cancelled = false;

    const step = () => {
      if (cancelled) return;
      const current = words[word % words.length];
      let delay: number;

      if (deleting) {
        char -= 1;
        setText(current.substring(0, char));
        delay = 45;
        if (char === 0) {
          deleting = false;
          word += 1;
          delay = 420;
        }
      } else {
        char += 1;
        setText(current.substring(0, char));
        delay = 105;
        if (char === current.length) {
          deleting = true;
          delay = 2000;
        }
      }

      timer.current = window.setTimeout(step, delay);
    };

    timer.current = window.setTimeout(step, 700);
    return () => {
      cancelled = true;
      window.clearTimeout(timer.current);
    };
  }, [words]);

  return (
    <span className="typewriter">
      {text}
      <i className="tw-caret" aria-hidden />
    </span>
  );
}

/* ==========================================================================
   CONTACT FORM
   --------------------------------------------------------------------------
   No backend, and deliberately so. There is nothing here to rate-limit, no
   API key to leak, no inbox to scrape, and nothing to keep running — the form
   composes a message and hands it to the visitor's own Gmail, already
   addressed and filled in. They press Send; it arrives from their real
   address, so replying is just Reply.

   Gmail's compose deep-link is the primary action because it is what most
   people are already signed into. `mailto:` is offered underneath for anyone
   using Outlook, Apple Mail or a desktop client, since Gmail's URL would only
   show them a sign-in wall.
   ========================================================================== */

/** Gmail's web compose deep-link. `fs=1` forces the full composer. */
function gmailComposeUrl(to: string, subject: string, body: string) {
  const q = new URLSearchParams({ view: 'cm', fs: '1', to, su: subject, body });
  return `https://mail.google.com/mail/?${q.toString()}`;
}

function mailtoUrl(to: string, subject: string, body: string) {
  const q = new URLSearchParams({ subject, body });
  return `mailto:${to}?${q.toString()}`;
}

function ContactForm({ to }: { to: string }) {
  const [name, setName] = useState('');
  const [from, setFrom] = useState('');
  const [message, setMessage] = useState('');

  const subject = name.trim() ? `Portfolio enquiry — ${name.trim()}` : 'Portfolio enquiry';

  /* The sender's own details are appended to the body as well as being the
     account the mail is sent from. Belt and braces: if they send from a
     different address than they typed, the one they actually want a reply on
     is still in the message. */
  const body = [
    message.trim(),
    '',
    '—',
    name.trim(),
    from.trim(),
  ]
    .filter((line, i) => i < 2 || line)
    .join('\n');

  const ready = message.trim().length > 0;

  const openGmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    // Called straight out of the submit handler so it still counts as a user
    // gesture — a deferred window.open here would be swallowed by popup blockers.
    window.open(gmailComposeUrl(to, subject, body), '_blank', 'noopener,noreferrer');
  };

  const focus = () => setCursor('text');
  const blur = () => setCursor('default');

  return (
    <form className="contact-form" onSubmit={openGmail}>
      <div className="cf-row">
        <label className="cf-field">
          <span>Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            autoComplete="name"
            onFocus={focus}
            onBlur={blur}
          />
        </label>
        <label className="cf-field">
          <span>Email</span>
          <input
            type="email"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            onFocus={focus}
            onBlur={blur}
          />
        </label>
      </div>

      <label className="cf-field">
        <span>Message</span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="What are you building?"
          rows={3}
          required
          onFocus={focus}
          onBlur={blur}
        />
      </label>

      <div className="cf-actions">
        <button type="submit" className="cf-send" disabled={!ready} data-magnetic>
          <span aria-hidden>✉</span> Send via Gmail
        </button>
      </div>

      <p className="cf-alt">
        Not a Gmail user?{' '}
        <a
          href={mailtoUrl(to, subject, body)}
          onMouseEnter={() => setCursor('hover')}
          onMouseLeave={() => setCursor('default')}
        >
          Open in your own mail app
        </a>
      </p>
    </form>
  );
}

/**
 * Wraps a vertically scrollable pane (tables, video grid) with a bottom fade
 * and a "scroll" cue that only appear while there is actually more content
 * below the clip edge. The chapter panes are fixed and cannot scroll, so a
 * list that outgrows its box would otherwise look cut off with no hint that
 * it keeps going.
 */
function ScrollFade({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const hasOverflow = el.scrollHeight - el.clientHeight > 4;
      const atEnd = el.scrollTop + el.clientHeight >= el.scrollHeight - 4;
      setMore(hasOverflow && !atEnd);
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);

    /* Wheel handoff, gated on the chapter crossfade. While the section is
       still dissolving in/out (opacity not yet full) the table must not eat the
       wheel — it forwards straight to the page so the transition keeps moving.
       Once the section is fully visible the table scrolls natively, and only
       when it hits a boundary (the cue has cleared) does the wheel chain to
       Lenis. The page never moves a pixel before the table is genuinely at its
       end. */
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return;
      const section = el.closest('section');
      const target = section ? SECTIONS.indexOf(section.id as (typeof SECTIONS)[number]) : -1;
      const fullyVisible = target >= 0 && Math.abs(scrollState.index - target) <= FADE_HOLD;

      const maxScroll = el.scrollHeight - el.clientHeight;
      const atBottom = e.deltaY > 0 && el.scrollTop >= maxScroll - 4;
      const atTop = e.deltaY < 0 && el.scrollTop <= 4;

      if (fullyVisible && !atBottom && !atTop) return;
      e.preventDefault();
      e.stopPropagation();
      lenisWheel(e.deltaY, e.deltaMode);
    };
    el.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      el.removeEventListener('scroll', update);
      el.removeEventListener('wheel', onWheel);
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <div className={`scroll-fade${more ? ' more' : ''}`}>
      <div ref={ref} className={`scroll-fade-pane ${className}`}>
        {children}
      </div>
      <span className="scroll-fade-cue" aria-hidden>
        Scroll <span className="sf-chev" />
      </span>
    </div>
  );
}

function ChapterTag({ index }: { index: number }) {
  const id = SECTIONS[index];
  const navIndex = NAV_SECTIONS.indexOf(id);
  return (
    <div className="chapter-tag">
      {navIndex >= 0 && (
        <>
          <span className="ct-num">{String(navIndex + 1).padStart(2, '0')}</span>
          <span className="ct-line" />
        </>
      )}
      <span className="ct-name">{SECTION_LABELS[id]}</span>
    </div>
  );
}

export function Sections() {
  const { content } = useContent();

  /* Entries switched off in the console never reach the DOM. Memoised because
     these arrays are dependencies of the Reveal staggers below — a fresh array
     identity every render would restart them. */
  const skills = useMemo(() => visible(content.skills), [content.skills]);
  const stats = useMemo(() => visible(content.stats), [content.stats]);
  const experience = useMemo(() => visible(content.experience), [content.experience]);
  const achievements = useMemo(() => visible(content.achievements), [content.achievements]);
  const projects = useMemo(() => visible(content.projects), [content.projects]);
  const videos = useMemo(() => visible(content.videos), [content.videos]);
  const links = useMemo(
    () => visible(content.links).filter((l) => !l.href.startsWith('mailto:')),
    [content.links]
  );

  return (
    <div className="chapters">
      {/* ================= 01 — HERO (lab entrance) ================= */}
      <Shell id="hero" align="center" className="hero">
        <ChapterTag index={0} />
        <SplitText
          as="h1"
          text={content.name}
          className="display hero-name text-gradient"
          stagger={0.03}
          delay={0.15}
        />
        <Reveal delay={0.5}>
          <p className="hero-role">
            <Typewriter words={content.roles} />
          </p>
        </Reveal>
        <Reveal delay={0.65}>
          <p className="hero-tag">{content.tagline}</p>
        </Reveal>
        <Reveal delay={0.85} className="hero-scroll">
          <span className="scroll-hint-line" />
          <span className="eyebrow">Scroll to enter the lab</span>
        </Reveal>
      </Shell>

      {/* ================= 02 — ABOUT (bio + skills) ================= */}
      <Shell id="about" align="split">
        <div className="split-col">
          <ChapterTag index={1} />
          <SplitText as="h2" text="About." className="display h-lg" stagger={0.03} />
          <div className="prose">
            {content.about.slice(0, 2).map((p, i) => (
              <Reveal key={i} delay={0.1 + i * 0.1}>
                <p>{p}</p>
              </Reveal>
            ))}
          </div>
        </div>

        <div className="split-col">
          {/* Skills live here rather than in their own chapter — five orbiting
              labels in 3D collided constantly, and as a list they're both
              readable and one fewer stop on the journey. */}
          <div className="skill-list">
            {skills.map((s, i) => (
              <Reveal key={s.id} delay={0.15 + i * 0.06}>
                <div className="skill-row" data-accent={s.accent}>
                  <span className="skill-name">{s.name}</span>
                  <span className="skill-items">{s.items.join(' · ')}</span>
                  <span className="skill-bar">
                    <i style={{ width: `${Math.round(s.level * 100)}%` }} />
                  </span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </Shell>

      {/* ================= 03 — JOURNEY (stats + experience) ================= */}
      <Shell id="journey" align="split">
        <div className="split-col">
          <ChapterTag index={2} />
          <SplitText as="h2" text="Journey." className="display h-lg" stagger={0.03} />
          <div className="stat-grid">
            {stats.map((s, i) => (
              <Reveal key={s.id} delay={0.1 + i * 0.07}>
                <div className="stat glass">
                  <span className="stat-k">{s.value}</span>
                  <span className="stat-v">{s.label}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        <div className="split-col xp-list">
          {experience.map((x, i) => (
            <Reveal key={x.id} delay={0.2 + i * 0.09}>
              <div className="xp">
                <span className="xp-period">{x.period}</span>
                <h3 className="xp-role">{x.role}</h3>
                <span className="xp-org">{x.org}</span>
                <p className="xp-detail">{x.detail}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Shell>

      {/* ================= 04 — AWARDS =================
          A table, not a carousel. Every result visible at once, comparable at
          a glance — which is the entire point of a results list. Showing them
          one at a time meant a reader never saw the shape of the record. */}
      <Shell id="awards" align="table">
        <ChapterTag index={3} />
        <SplitText as="h2" text="Achievements." className="display h-md" stagger={0.03} />

        <Reveal delay={0.12}>
          <ScrollFade className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="dt-num">#</th>
                  <th>Event</th>
                  <th>Category</th>
                  <th>Team</th>
                  <th className="dt-right">Result</th>
                </tr>
              </thead>
              <tbody>
                {achievements.map((a, i) => (
                  <tr key={a.id}>
                    <td className="dt-num" data-label="#">
                      {String(i + 1).padStart(2, '0')}
                    </td>
                    <td data-label="Event">
                      <span className="dt-main">{a.event}</span>
                      <span className="dt-sub">
                        {a.year}
                        {a.note ? ` · ${a.note}` : ''}
                      </span>
                    </td>
                    <td data-label="Category">{a.category}</td>
                    <td className="dt-mono" data-label="Team">
                      {a.team}
                    </td>
                    <td className="dt-right" data-label="Result">
                      <span className="dt-badge">{a.placement}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollFade>
        </Reveal>
      </Shell>

      {/* ================= 05 — WORK ================= */}
      <Shell id="work" align="table">
        <ChapterTag index={4} />
        <SplitText as="h2" text="Work." className="display h-md" stagger={0.03} />

        <Reveal delay={0.12}>
          <ScrollFade className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="dt-num">#</th>
                  <th>Project</th>
                  <th>Stack</th>
                  <th className="dt-right">Link</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p, i) => (
                  <tr key={p.id} data-accent={p.accent}>
                    <td className="dt-num" data-label="#">
                      {String(i + 1).padStart(2, '0')}
                    </td>
                    <td data-label="Project">
                      <span className="dt-main">{p.title}</span>
                      {p.genre && <span className="dt-genre">{p.genre}</span>}
                      <span className="dt-sub">{p.blurb}</span>
                    </td>
                    <td data-label="Stack">
                      <span className="dt-stack">
                        {p.stack.map((tech) => (
                          <span key={tech}>{tech}</span>
                        ))}
                      </span>
                    </td>
                    <td className="dt-right" data-label="Link">
                      <span className="dt-links">
                        {p.href && p.href !== '#' ? (
                          <a
                            className="dt-link"
                            href={p.href}
                            target="_blank"
                            rel="noreferrer noopener"
                            onMouseEnter={() => setCursor('hover')}
                            onMouseLeave={() => setCursor('default')}
                          >
                            {p.href.includes('github.com') ? 'GitHub' : 'View'}{' '}
                            <span aria-hidden>↗</span>
                          </a>
                        ) : (
                          <span className="dt-sub">—</span>
                        )}
                        {p.video && (
                          <a
                            className="dt-link dt-link-video"
                            href={p.video}
                            target="_blank"
                            rel="noreferrer noopener"
                            onMouseEnter={() => setCursor('hover')}
                            onMouseLeave={() => setCursor('default')}
                          >
                            <span aria-hidden>▶</span> Watch
                          </a>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollFade>
        </Reveal>
      </Shell>

      {/* ================= 06 — VIDEO EDITING ================= */}
      <Shell id="editing" align="table">
        <ChapterTag index={5} />
        <SplitText as="h2" text="Video Editing." className="display h-md" stagger={0.03} />

        <Reveal delay={0.12}>
          <ScrollFade className="video-grid">
            {videos.map((v, i) => (
              <Reveal key={v.id} delay={0.14 + i * 0.07} className="video-cell">
                <a
                  className="video-card"
                  href={videoUrl(v.videoId)}
                  target="_blank"
                  rel="noreferrer noopener"
                  data-accent={v.accent}
                  onMouseEnter={() => setCursor('hover')}
                  onMouseLeave={() => setCursor('default')}
                >
                  <span className="video-thumb">
                    <img
                      src={videoThumb(v.videoId)}
                      alt={v.title}
                      loading="lazy"
                      width={480}
                      height={360}
                    />
                    <span className="video-play" aria-hidden>
                      <span>▶</span>
                    </span>
                  </span>
                  <span className="video-body">
                    <span className="video-title">{v.title}</span>
                    <span className="video-note">{v.note}</span>
                    <span className="video-cta">
                      Watch on YouTube <span aria-hidden>↗</span>
                    </span>
                  </span>
                </a>
              </Reveal>
            ))}
          </ScrollFade>
        </Reveal>
      </Shell>

      {/* ================= 07 — CONTACT ================= */}
      <Shell id="contact" align="center" className="contact" last>
        <ChapterTag index={6} />
        <SplitText
          as="h2"
          text="Let's build something."
          className="display h-xl text-gradient"
          stagger={0.026}
        />
        <Reveal delay={0.26}>
          <ContactForm to={content.email} />
        </Reveal>
        <Reveal delay={0.38} className="contact-links">
          {links.map((l) => (
            <a
              key={l.id}
              href={l.href}
              target="_blank"
              rel="noreferrer noopener"
              onMouseEnter={() => setCursor('hover')}
              onMouseLeave={() => setCursor('default')}
            >
              {l.label}
            </a>
          ))}
        </Reveal>
        <Reveal delay={0.48}>
          <p className="contact-loc">
            <a
              href={`mailto:${content.email}`}
              onMouseEnter={() => setCursor('hover')}
              onMouseLeave={() => setCursor('default')}
            >
              {content.email}
            </a>
          </p>
        </Reveal>
      </Shell>
    </div>
  );
}

/** Kept for the focused-project overlay hook in App.tsx. */
export function ProjectDetail({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { content } = useContent();
  const project = content.projects.find((p) => p.id === id);

  useEffect(() => {
    if (!id) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [id, onClose]);

  if (!project) return null;

  return (
    <motion.div
      className="detail"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="detail-inner glass">
        <span className="eyebrow">Now viewing</span>
        <h3>{project.title}</h3>
        <p>{project.blurb}</p>
        <div className="detail-actions">
          {project.href && project.href !== '#' && (
            <MagneticButton href={project.href}>Open project</MagneticButton>
          )}
          <button className="detail-close" onClick={onClose} data-magnetic>
            Exit
          </button>
        </div>
      </div>
    </motion.div>
  );
}
