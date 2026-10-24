<p align="center">
  <img src="public/brand/logo-on-dark.png" alt="Transformer Tuning Cars" width="320" />
</p>

<h1 align="center">Transformer Tuning Cars</h1>

<p align="center">
  <strong>Showroom tuning website for luxury and sports cars — Sousse, Tunisie</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#project-structure">Project Structure</a> •
  <a href="#scripts">Scripts</a> •
  <a href="#internationalization">i18n</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#deployment">Deployment</a> •
  <a href="#license">License</a>
</p>

<br />

---

## Overview

A premium, scroll-driven web experience for **Transformer Tuning Cars** — a luxury car tuning showroom based in Sousse, Tunisia. The home page is a real-time 3D garage: as the visitor scrolls, a stock SUV drives in, goes through the workshop bay by bay (wheels, stance, body kit, paint, tint), and is unveiled tuned on the showroom turntable.

Visitors can explore services, browse available cars, customise paint and wheel combinations in a live colour studio, and send inspection requests directly to the workshop via WhatsApp — no accounts or forms required.

> **Status:** Private concept preview. Not yet indexed by search engines.

---

## Features

| Feature | Description |
| --- | --- |
| **Garage hero** | A Three.js scene of the atelier, baked in Blender, scrubbed by scroll: the car is upgraded bay by bay with pinned spec callouts, a scan-beam panel wipe and a cloth cover reveal. Falls back to Cycles-rendered stills without WebGL, on slow devices and with reduced motion. Optional sound (off by default). |
| **Interactive inspection tool** | Full-page `/diagnose` view where customers tap car parts, add notes, and send a structured inspection request to WhatsApp in one click. Supports both 2D (SVG) and 3D (Three.js) views. |
| **Colour studio** | Live paint × wheel × tint configurator. Pick from curated finishes and see the result instantly on the inline SVG car. |
| **Inventory section** | "Available Now" cards for consignment sales and rentals, each linking to a pre-filled WhatsApp message. |
| **Effects** | Welding sparks, paint-booth mist and a scan beam that wipes each panel from stock to tuned, with a headlight flash at the reveal. |
| **Full i18n** | French (default), Arabic (RTL), and English. Locale routing via Next.js middleware with `generateStaticParams` for static generation. |
| **WhatsApp integration** | Every CTA across the site opens a pre-composed WhatsApp message in the workshop's preferred language (French). |
| **Reduced motion** | All animations respect `prefers-reduced-motion: reduce` — the garage hero shows its stills, with the same overlays. |
| **Responsive** | Designed and tested at 390 px (mobile) and 1440 px (desktop). No horizontal overflow at any scroll position. |

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | [Next.js 15](https://nextjs.org/) (App Router, React 19, TypeScript strict) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) with CSS custom properties design system |
| Car rendering | Inline SVG with CSS 3D transforms — no images, fully scalable |
| 3D views | [Three.js](https://threejs.org/) (garage hero, diagnose tool orbit camera) |
| 3D assets | Blender (headless scripts in `blender/garage/`), ComfyUI for textures, music and sound effects (`art/comfy/`) |
| Typography | Sora (display), Inter (body), JetBrains Mono (accents), IBM Plex Sans Arabic |
| Testing | [Vitest](https://vitest.dev/) (unit), [Playwright](https://playwright.dev/) (screenshot scripts) |
| Deployment | [Vercel](https://vercel.com/) |

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18.17
- **npm** ≥ 9

### Installation

```bash
git clone https://github.com/salimmay/Transformers-cars.git
cd Transformers-cars
npm install
```

### Development

```bash
npm run dev
```

Opens the dev server at [http://localhost:3000](http://localhost:3000). The default locale is French — visit `/en` or `/ar` to switch.

### Production build

```bash
npm run build
npm start
```

To build alongside a running dev server without clobbering `.next`:

```bash
NEXT_DIST_DIR=.next-build npx next build
```

---

## Project Structure

```
.
├── public/
│   ├── brand/              # Logo assets
│   └── models/             # 3D model data for the inspection tool
├── src/
│   ├── app/
│   │   ├── globals.css     # Design tokens, base styles, animations
│   │   └── [locale]/
│   │       ├── layout.tsx  # Shell: nav, footer, WhatsApp FAB, fonts
│   │       ├── page.tsx    # Homepage: hero, services, inventory, studio, contact
│   │       └── diagnose/
│   │           └── page.tsx
│   ├── car/
│   │   ├── art/            # SVG drawing primitives (side, views, defs, geometry)
│   │   ├── models/         # Car model geometry data
│   │   ├── three/          # Three.js car builder and textures
│   │   ├── PartRender.tsx  # Standalone part renderer (services, studio, cards)
│   │   ├── palette.ts      # Paint colours, wheel styles, tint levels
│   │   └── registry.ts     # Part registry with groups, z-order, offsets
│   ├── components/
│   │   ├── ColourStudio.tsx # Paint × wheel × tint configurator
│   │   ├── GarageHero.tsx   # Scroll track, overlays, stills fallback, sound toggle
│   │   ├── Inventory.tsx    # Available cars with filter chips
│   │   ├── Nav.tsx          # Sticky navigation
│   │   ├── Footer.tsx
│   │   ├── WhatsAppFloat.tsx
│   │   └── diagnose/        # Interactive inspection tool (2D + 3D)
│   ├── garage/             # Garage hero: timeline.ts (pure scroll → state), heroCar.ts (the swap point),
│   │                       # scene/ (three.js facade), sound/ (cue sheet + Web Audio engine)
│   ├── config/
│   │   ├── garage.ts       # Business details (address, socials, WhatsApp)
│   │   └── inventory.ts    # Example car listings
│   ├── i18n/
│   │   ├── config.ts       # Locale definitions and helpers
│   │   └── strings/        # Typed translation files (en, fr, ar)
│   ├── lib/
│   │   ├── whatsapp.ts     # URL builder for wa.me links
│   │   ├── inquiry.ts      # Car-specific WhatsApp message composer
│   │   └── requestMessage.ts
│   └── middleware.ts        # Locale detection and redirect
├── art/                     # Offline asset generation scripts (SVG exports)
├── blender/                 # Blender source files and render scripts
├── scripts/                 # Screenshot automation (Playwright + Chrome)
├── phase0-screens/          # Design reference screenshots
└── docs/                    # Internal documentation and plans
```

---

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm start` | Serve production build |
| `npm test` | Run Vitest unit tests |
| `npm run lint` | ESLint check |
| `npm run shots` | Automated screenshots via Playwright (requires Chrome) |

---

## Internationalization

The site supports three locales, each statically generated at build time:

| Locale | Direction | Path | Status |
| --- | --- | --- | --- |
| 🇫🇷 French | LTR | `/fr` (default) | ✅ Production ready |
| 🇬🇧 English | LTR | `/en` | ✅ Production ready |
| 🇹🇳 Arabic | RTL | `/ar` | ⚠️ Awaiting native review |

- Root `/` redirects to `/fr` via middleware.
- All strings are type-safe — the `Strings` interface enforces parity across locales.
- WhatsApp messages are always composed in French (the workshop's working language), regardless of the visitor's locale.

---

## Architecture

### Car Rendering Pipeline

The car is a hand-crafted SVG composed of **40+ individually positioned parts**, each defined in the part registry with:

- **Group** — body, glass, lighting, wheel, drivetrain, etc.
- **Z-order** — layering for correct visual stacking
- **Explode offset** — x/y displacement when the car "explodes"

```
Registry (parts, groups, z-order)
  → Art primitives (SVG paths per view)
    → CarCanvas (diagnose tool, positioned via CSS variables)
      → PartRender (standalone usage in cards, studio)
```

### Garage Hero

`src/garage/timeline.ts` is a pure, unit-tested function `stateAt(p)` that turns scroll progress (0–1) into everything the scene needs: where the car is, which bay is working, lift, wheel finish, ride height, kit, paint and tint sweeps, cover pull, showroom lights and the camera. `GarageHero.tsx` reads the scroll each frame, eases towards it, and hands the state to the three.js facade (`src/garage/scene`), to the HTML overlays and to the sound engine. Scrolling back up replays the same states.

The atelier is built and lightmap-baked in Blender by the scripts in `blender/garage/` (run headless through `run.py`), exported to `public/garage/garage.glb`; `render_stills.py` renders the fallback stills. To swap the hero car, change `src/garage/heroCar.ts`.

### Design System

All colours and spacing use CSS custom properties defined in `globals.css`:

- **Ink scale** — `--ink-950` through `--ink-700` (dark backgrounds)
- **Text** — `--mist`, `--fog`, `--snow` (light-on-dark hierarchy)
- **Accent** — Amber tones derived from the shop's logo (`#d38c22`)
- **Fonts** — `--font-display` (Sora), `--font-sans` (Inter), `--font-mono` (JetBrains Mono)

---

## Deployment

The site is deployed on **Vercel** with automatic deploys from the `main` branch.

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Output directory | `.next` |
| Node.js version | 18.x |
| Environment variables | None required |

---

## Contributing

This is a private client project. If you're working on it:

1. Create a feature branch from `main`
2. Follow the commit convention: `feat:`, `fix:`, `chore:`, `docs:`
3. Run `npm test` and `npx tsc --noEmit` before pushing
4. Open a PR for review

For the detailed implementation roadmap, see [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md).

---

## License

Private — all rights reserved. Not for redistribution.

<p align="center">
  <sub>Built with ☕ in Tunisia</sub>
</p>
