/**
 * ============================================================================
 * CONTENT SOURCE OF TRUTH
 * ============================================================================
 * Everything the site renders lives here. The hidden admin panel edits a copy
 * of this in localStorage; use its "Copy JSON" button and paste the result
 * back into `DEFAULT_CONTENT` below to make changes permanent for all visitors.
 * ============================================================================
 */

/**
 * Mixed into every list item.
 *
 * `hidden` is deliberately optional and absent-by-default so that existing
 * saved content (and everything in DEFAULT_CONTENT below) stays visible without
 * needing the flag written onto it. Undefined means shown.
 *
 * It exists so the console can take an entry off the site without deleting it —
 * an award you would rather not lead with this month, or a project mid-rewrite,
 * should be one toggle away from coming back, not a re-typing job.
 */
export type Hideable = { hidden?: boolean };

/** Drop every entry the console has switched off. */
export const visible = <T extends Hideable>(items: T[]): T[] =>
  items.filter((i) => !i.hidden);

export type Achievement = Hideable & {
  id: string;
  /** e.g. "DUET CSE Carnival 2026" */
  event: string;
  /** e.g. "Datathon" */
  category: string;
  /** e.g. "DU_Not_A_DUET" */
  team: string;
  /** e.g. "8th place" — leave blank for participation-only entries */
  placement: string;
  /** Sort/display year */
  year: string;
  /** Optional one-liner shown on the card back */
  note?: string;
};

export type Project = Hideable & {
  id: string;
  title: string;
  blurb: string;
  stack: string[];
  href?: string;
  /** Optional YouTube link — gameplay / full-run demo of the project. */
  video?: string;
  /** Editing style, shown as a chip on the Work row — e.g. "Cinematic",
   *  "Documentary", "Trailer". Absent for non-video builds. */
  genre?: string;
  accent: 'cyan' | 'violet' | 'electric' | 'purple';
};

export type Video = Hideable & {
  id: string;
  /** Video title as it appears on YouTube. */
  title: string;
  /** One-liner describing the edit / the piece. */
  note: string;
  /** YouTube video ID — href and thumbnail are derived from it. */
  videoId: string;
  accent: 'cyan' | 'violet' | 'electric' | 'purple';
};

/** YouTube watch URL for a video ID. */
export const videoUrl = (videoId: string) => `https://youtube.com/watch?v=${videoId}`;

/** High-quality thumbnail for a video ID. */
export const videoThumb = (videoId: string) => `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

export type SkillGroup = Hideable & {
  id: string;
  name: string;
  /** 0..1 — drives planet size and atmosphere intensity */
  level: number;
  items: string[];
  accent: 'cyan' | 'violet' | 'electric' | 'purple';
};

export type Experience = Hideable & {
  id: string;
  period: string;
  role: string;
  org: string;
  detail: string;
};

export type Stat = Hideable & { id: string; value: string; label: string };

export type Link = Hideable & { id: string; label: string; href: string };

export type Content = {
  name: string;
  role: string;
  /** Rotating roles for the hero typewriter. */
  roles: string[];
  tagline: string;
  location: string;
  about: string[];
  stats: Stat[];
  achievements: Achievement[];
  experience: Experience[];
  projects: Project[];
  videos: Video[];
  skills: SkillGroup[];
  links: Link[];
  email: string;
  /**
   * Full international form, e.g. "+8801XXXXXXXXX". Rendered as a `tel:` link,
   * which is the only format that reliably dials from a phone and from
   * desktop softphones. Leave blank to hide the call action entirely.
   */
  phone?: string;
};

/** Static site-level constants (not editable at runtime — used in metadata). */
export const SITE = {
  name: 'Farhan Labib Ahan',
  role: 'CSE Student & Creator',
  tagline:
    'CSE undergrad at the University of Dhaka — building software, editing film, and competing in datathons and AI hackathons.',
};

export const DEFAULT_CONTENT: Content = {
  name: 'Farhan Labib Ahan',
  role: 'CSE Student & Creator',
  roles: ['CSE Student.', 'Developer.', 'Video Editor.', 'Tech Enthusiast.'],
  tagline:
    'Bridging the gap between cutting-edge code and breathtaking aesthetics.',
  location: 'Badda, Dhaka, Bangladesh',

  about: [
    'CSE undergrad at the University of Dhaka — building software, editing film, and competing in datathons and AI hackathons.',
    'Most of what I know came from the clock running down: 24-hour hackathons, live-leaderboard datathons, and AI builds that have to work on the first demo.',
  ],

  stats: [
    { id: 'st1', value: '2nd Yr', label: 'CSE Undergrad' },
    { id: 'st2', value: '7', label: 'GitHub Repos' },
    { id: 'st3', value: '4', label: 'National Competitions' },
    { id: 'st4', value: '23', label: 'Followers' },
  ],

  // --- Sourced from achivements.txt.rtf -------------------------------------
  achievements: [
    {
      id: 'a1',
      event: 'DUET CSE Carnival 2026',
      category: 'Datathon',
      team: 'DU_Not_A_DUET',
      placement: '8th Place',
      year: '2026',
      note: 'Top-10 finish against a national field.',
    },
    {
      id: 'a2',
      event: 'IUT ICT Fest 2026',
      category: 'Datathon',
      team: 'DU_Outliers',
      placement: '11th Place',
      year: '2026',
      note: 'Feature engineering and ensembling under a live leaderboard.',
    },
    {
      id: 'a3',
      event: 'SUST CSE Carnival 2026',
      category: 'AI Hackathon',
      team: 'DU_Chaos_Overload',
      placement: '12th Place',
      year: '2026',
      note: 'Full AI product built and shipped inside the hackathon window.',
    },
    {
      id: 'a4',
      event: 'IUT ICT Fest 2026',
      category: 'Agentic AI Hackathon',
      team: 'Delulu Developers',
      placement: 'Finalist',
      year: '2026',
      note: 'Autonomous multi-agent system built end to end.',
    },
  ],

  experience: [
    {
      id: 'e2',
      period: '2021 — 2023',
      role: 'Vice President (IT)',
      org: 'Notre Dame Yoga & Meditation Club',
      detail:
        'Managed the club’s technology, designed and coordinated seminar decks, and built visual overlays for media announcements.',
    },
    {
      id: 'e1',
      period: '2023 — Present',
      role: 'B.Sc. in Computer Science & Engineering',
      org: 'University of Dhaka',
      detail:
        'Core CS coursework — algorithms, object-oriented programming and data communications — kept firmly hands-on with coding projects.',
    },
    {
      id: 'e3',
      period: '2021 — 2023',
      role: 'Higher Secondary Certificate (HSC)',
      org: 'Notre Dame College, Dhaka',
      detail:
        'Science group — mathematics and physics focus, completed with high distinction.',
    },
  ],

  projects: [
    {
      id: 'p1',
      title: 'DU_Conquer',
      blurb:
        'An interactive C++ group project for CSE-1202, with console graphics and full gameplay mechanics built from scratch.',
      stack: ['C++', 'Game Dev', 'OOP'],
      href: 'https://github.com/farhanlabibahan/DU_Conquer',
      video: 'https://youtube.com/watch?v=G9tmDD0ykBE',
      genre: 'Trailer',
      accent: 'cyan',
    },
    {
      id: 'p2',
      title: 'DUREDBUS App',
      blurb:
        'An Android app for tracking University of Dhaka Red Bus routes and schedules, and booking trips.',
      stack: ['Kotlin', 'Android', 'Firebase'],
      href: 'https://github.com/farhanlabibahan/DUREDBUS',
      accent: 'violet',
    },
    {
      id: 'p7',
      title: 'CloudCare',
      blurb:
        'A Spring Boot (Java 17) web app providing healthcare features for doctors, patients and admins — user management, file uploads, PDF generation and email notifications.',
      stack: ['Java', 'Spring Boot', 'Web'],
      href: 'https://github.com/Raihri/CLOUDCARE',
      video: 'https://youtube.com/watch?v=c6hTNkT46Go',
      accent: 'electric',
    },
    {
      id: 'p3',
      title: 'SUST Onsite — ORLG',
      blurb:
        'Real-time operational risk flagging + dual liquidity forecasting for multi-provider mobile-money agents — built for the SUST CSE Carnival 2026 Multi-Provider Agent Liquidity & Anomaly Coordination Challenge. Tracks each provider balance separately, flags unusual activity with a full explanation (never "fraud"), routes every case to one accountable owner, and never moves money on its own.',
      stack: ['Fintech', 'Risk Modeling', 'Forecasting'],
      href: 'https://github.com/Raihri/sust_onsite',
      accent: 'purple',
    },
    {
      id: 'p4',
      title: 'AgriSense AI',
      blurb:
        'A source-grounded Bangladesh farm-planning agent from the IUT 12th ICT Fest Bdapps Agentic AI Hackathon (final round) — conversational intake turns into a dated, itemized, explained season plan driven by live weather and FAO-56 crop math.',
      stack: ['FastAPI', 'Next.js', 'Python', 'LLM / RAG'],
      href: 'https://github.com/Raihri/Delulu-Developers_AgriSense/tree/Ahan',
      accent: 'violet',
    },
  ],

  videos: [
    {
      id: 'v1',
      title: 'আমার চোখে জয়পুরহাট শহর',
      note: 'City travel piece — shots, pacing and colour work.',
      videoId: 'CbPTCbaXD4g',
      accent: 'cyan',
    },
    {
      id: 'v2',
      title: 'The Office Glitch | A Short-Film',
      note: 'Short film — edit, sound and titles.',
      videoId: 'ohm8DIsZamQ',
      accent: 'violet',
    },
    {
      id: 'v3',
      title: 'DU Conquer — Game Trailer',
      note: 'Trailer cut for the DU_Conquer C++ game.',
      videoId: 'WhmYbzATL9I',
      accent: 'electric',
    },
    {
      id: 'v4',
      title: 'AutoReelEngine — Pitch',
      note: 'Hackathon pitch film — motion graphics and pacing.',
      videoId: 'UjmBw8kQPsE',
      accent: 'purple',
    },
  ],

  skills: [
    {
      id: 's1',
      name: 'Programming',
      level: 0.9,
      items: ['C', 'C++', 'Java', 'Python'],
      accent: 'cyan',
    },
    {
      id: 's2',
      name: 'Backend & Tools',
      level: 0.74,
      items: ['Git', 'Docker'],
      accent: 'electric',
    },
    {
      id: 's3',
      name: 'Video & Motion',
      level: 0.92,
      items: ['DaVinci Resolve', 'CapCut'],
      accent: 'violet',
    },
    {
      id: 's4',
      name: 'Web',
      level: 0.7,
      items: ['React', 'Next.js', 'FastAPI', 'Spring Boot'],
      accent: 'purple',
    },
    {
      id: 's5',
      name: 'Design',
      level: 0.66,
      items: ['UI / UX', 'Figma'],
      accent: 'cyan',
    },
  ],

  links: [
    { id: 'l1', label: 'GitHub', href: 'https://github.com/farhanlabibahan' },
    { id: 'l2', label: 'YouTube', href: 'https://youtube.com/@farhanlabibahan' },
    { id: 'l3', label: 'Instagram', href: 'https://instagram.com/farhanlabib28' },
    { id: 'l4', label: 'Facebook', href: 'https://facebook.com/farhanlabibahan' },
    { id: 'l5', label: 'Portfolio', href: 'https://sites.google.com/view/farhanlabibahan' },
  ],

  email: 'farhanlabibahan@gmail.com',

  // From the CV — enables the Call action on the contact chapter.
  phone: '+8801912584460',
};

/** Accent name -> hex, used by both DOM and WebGL layers. */
export const ACCENTS: Record<Project['accent'], string> = {
  cyan: '#22E1FF',
  violet: '#8B5CFF',
  electric: '#2E6BFF',
  purple: '#C46BFF',
};
