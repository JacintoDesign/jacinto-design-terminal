# phosphor-portfolio

A green-phosphor CRT terminal portfolio for [jacinto.design](https://jacinto.design). Vanilla HTML/CSS/JS — no framework, no build step.

Type `help` to get started. Not everything is listed.

## Features

- BIOS-style boot sequence, scanlines, vignette, and phosphor glow (flicker honors `prefers-reduced-motion`)
- Command shell: `about`, `projects`, `open <id>`, `skills`, `now`, `contact`, `socials`, `theme green|amber|ice`, tab completion, ↑/↓ history
- A small filesystem to poke at (`ls`, `ls -a`, `cat`)
- **Hidden text adventure** — *The Lost Mainframe*. Finding the way in is part of the game. (Spoilers: `SPOILERS.md`)

## Run locally

Any static server, e.g.:

```sh
npx serve .
```

## Deploy

Static Vercel deployment — zero config.
