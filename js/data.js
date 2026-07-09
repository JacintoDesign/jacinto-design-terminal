// Content for the phosphor terminal — sourced from jacinto.design
"use strict";

window.PhosphorData = {
  site: {
    name: "Jacinto Design",
    person: "Jacinto Wong",
    title: "Senior Developer at CBC · Instructor at Zero to Mastery",
    location: "Toronto, Canada",
    email: "contact@jacinto.design",
    url: "https://jacinto.design",
  },

  about: [
    "Jacinto Wong — Senior Developer at the Canadian Broadcasting Corporation,",
    "instructor at Zero to Mastery Academy, based in Toronto, Canada.",
    "",
    "The spark      Passion for technology since age 12, when I built my first computer.",
    "Teaching       5 years teaching in Canada and South Korea, now teaching web dev online.",
    "The leap       Self-taught developer — landed a Senior Developer role after just",
    "               4 months of online learning. I know what breaking into tech takes.",
    "The mission    High-quality, affordable courses that help students build real",
    "               portfolio projects and transition into web development careers.",
    "The goal       Quality education accessible to everyone, regardless of background",
    "               or budget.",
  ],

  stats: [
    ["5+", "years teaching"],
    ["4", "months from first line of code to senior role"],
    ["100+", "projects shipped"],
  ],

  now: {
    title: "Agentic Engineering course",
    blurb: "A new course on building production-grade AI agents — orchestration, tool use, and evals. In progress at Zero to Mastery.",
  },

  projects: [
    {
      id: "vibemail",
      title: "VibeMail Glass",
      year: "2026",
      category: "Full-Stack · App",
      description: "A full-stack email client wrapped in a frosted-glass, fully monospaced interface — virtualized threads, instant search, and a Supabase + Postgres backend. Real-time Gmail sync via Pub/Sub push (no polling), AES-256-GCM encrypted tokens, and a typed REST API.",
      tech: ["TypeScript", "Next.js", "Supabase", "PostgreSQL"],
      href: "https://vibemail-fullstack.vercel.app",
      repo: "https://github.com/JacintoDesign/vibemail-fullstack",
    },
    {
      id: "b-safe-electric",
      title: "B-Safe Electric",
      year: "2026",
      category: "Client Site · Web",
      description: "A conversion-focused marketing site for a Greater Toronto Area electrical contractor. Multi-page React + Vite build with per-page SEO, gallery lightboxes, and a zero-backend contact form — fast, credible, built to turn visitors into booked calls.",
      tech: ["TypeScript", "React", "Vite", "Tailwind CSS"],
      href: "https://b-safe-electric.vercel.app",
      repo: "https://github.com/JacintoDesign/b-safe-electric",
    },
    {
      id: "scoundrel",
      title: "Scoundrel Game",
      year: "2025",
      category: "Game · PWA",
      description: "The cult solo dungeon-crawler card game, rebuilt as an offline-first PWA. A rules-complete 44-card dungeon engine, 3D card flips that honor prefers-reduced-motion, auto-save after every action, and full keyboard + screen-reader support.",
      tech: ["JavaScript", "PWA", "Service Worker", "HTML5", "CSS3"],
      href: "https://ztm-scoundrel-game.vercel.app",
      repo: "https://github.com/JacintoDesign/scoundrel-game-pwa",
    },
    {
      id: "news-reader",
      title: "News Reader",
      year: "2025",
      category: "Web App · News",
      description: "A distraction-free reader pulling live headlines into one clean feed — one featured article at a time, no infinite scroll. API tokens stay server-side behind a proxy, with per-page caching and background prefetch so paging feels instant.",
      tech: ["TypeScript", "REST API", "Vercel Functions"],
      href: "https://news-reader-azure.vercel.app",
      repo: "https://github.com/JacintoDesign/news-reader",
    },
    {
      id: "music-player",
      title: "Music Player",
      year: "2025",
      category: "Audio · React",
      description: "A Spotify-style player for your own MP3s — no server, no account, no upload. In-browser ID3 parsing with SHA-256 dedupe, a drag-to-reorder queue, IndexedDB offline library, Media Session lock-screen controls, and real-time audio visualizers.",
      tech: ["TypeScript", "React", "PWA", "IndexedDB"],
      href: "https://ztm-music-player.vercel.app",
      repo: "https://github.com/JacintoDesign/ztm-music-player",
    },
    {
      id: "recipes",
      title: "Recipes App",
      year: "2025",
      category: "Productivity · PWA",
      description: "Recipe discovery that keeps working when the network doesn't. Search, browse, and save recipes with IndexedDB offline favorites, a cached server-side API proxy, skeleton loaders, and dark/light/system themes.",
      tech: ["TypeScript", "PWA", "Express", "IndexedDB"],
      href: "https://ztm-recipe-app.vercel.app",
      repo: "https://github.com/JacintoDesign/recipes",
    },
    {
      id: "agentic-course",
      title: "Agentic Engineering",
      year: "2026",
      category: "Course · In progress",
      description: "A new course on building production-grade AI agents — orchestration, tool use, and evals. Currently in development at Zero to Mastery.",
      tech: ["AI Agents", "TypeScript", "LLMs", "Evals"],
      status: "soon",
    },
  ],

  skills: [
    ["Languages", "TypeScript · JavaScript · HTML5 · CSS3 · SQL"],
    ["Frontend", "React · Next.js (App Router) · Vite · Tailwind CSS · GSAP"],
    ["Backend", "Node.js · Express · Vercel Functions · Supabase · PostgreSQL"],
    ["Platform", "PWAs · Service Workers · IndexedDB · REST APIs · OAuth 2.0"],
    ["AI", "AI agents · LLM orchestration · tool use · evals"],
    ["Teaching", "Course design · 5 years classroom + online instruction"],
  ],

  socials: [
    ["Website", "jacinto.design", "https://jacinto.design"],
    ["LinkedIn", "in/jacintowong", "https://www.linkedin.com/in/jacintowong/"],
    ["GitHub", "JacintoDesign", "https://github.com/JacintoDesign"],
    ["Medium", "@jacintowong", "https://jacintowong.medium.com"],
    ["CodePen", "jacintodesign", "https://codepen.io/jacintodesign"],
  ],
};
