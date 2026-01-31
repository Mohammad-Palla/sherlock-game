# Sherlock vs Moriarty — Noir Live Case UI

Production-grade React + Vite + TailwindCSS frontend for a cinematic multi-agent LiveKit audio experience. Built with Framer Motion, noir styling, and an event-driven scene director.

## Tech
- React + Vite + TypeScript
- TailwindCSS
- Framer Motion
- LiveKit Web SDK
- Zustand state manager
- Vitest for reducer tests

## Setup

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

Tests:

```bash
npm run test
```

## Backend contract
- `POST /api/livekit/join` returns `{ token, url, roomName, identity, agents }`
- `GET /api/events` is SSE and pushes JSON events

If the backend is unavailable, the UI falls back to a mocked session and a local event generator.

## Controls
- `Ctrl + \`` toggles the debug overlay.
- Debug overlay lets you simulate events (gunshot, evidence, captions, scene changes).

## Audio assets
This project references these files (place your audio in `public/assets/audio/`):

```
ambience_rain.mp3
ambience_clock.mp3
ambience_alley.mp3
ambience_lair.mp3
sfx_gunshot.mp3
```

The files are stubbed in the repo so you can swap them with real SFX/ambience.

## Notes
- Reduced Motion toggle disables camera shake and infinite motion loops.
- Subtitles are rendered as cinematic caption cards with typewriter effect.
- LiveKit is attached on user action (Connect button) to comply with autoplay policies.
