# jacinto-design-terminal

A green-phosphor CRT terminal portfolio for [jacinto.design](https://jacinto.design). Vanilla HTML/CSS/JS — no framework, no build step.

Type `help` to get started. Not everything is listed.

## Features

- BIOS-style boot with CRT power-on, scanlines, vignette, and phosphor glow (`fx off` for plain text; flicker honors `prefers-reduced-motion`)
- Command shell: `about`, `projects`, `open <id>`, `preview <id>` (ASCII-rendered screenshots), `skills`, `courses`, `contact`, `socials`, `neofetch`, `theme green|amber|ice`
- Fish-style ghost autocomplete (Tab/→ accepts), ↑/↓ history, Ctrl-L clear
- Full case studies as man pages: `cat projects/<id>.md`
- In-terminal contact form (`contact --send`) posting through FormSubmit
- Optional retro audio: `sound on` (key clicks + 60 Hz hum)
- A filesystem to poke at (`ls`, `ls -a`, `cat`) — some of it permission-gated
- Installable PWA with offline support (stale-while-revalidate service worker)
- **Hidden text adventure** — *The Lost Mainframe*, with auto-save/resume, a speedrun clock, and two achievements. Finding the way in is part of the game. Winning changes things. (Spoilers: `SPOILERS.md`)

## Run locally

Any static server, e.g.:

```sh
npx serve .
```

## Deploy

Static Vercel deployment — zero config. `og.png` and the PWA icons are generated from the site itself via headless Chrome.
