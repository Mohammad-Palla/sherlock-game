# Mercury Chocolates - LiveKit Noir Case

An interactive, noir-styled LiveKit scene built around a timed deduction. Sherlock (human) races Moriarty's misdirection with Watson's grounded help. The backend is the authoritative "director," emitting timed events over SSE.

## What's here
- **Frontend**: React + Vite + Tailwind + Framer Motion scene UI.
- **Backend**: FastAPI case director with SSE timeline, branching, and LiveKit join.
- **Agents**: Watson + Moriarty LiveKit agents that speak scripted captions from SSE.

## Quick start

### 1) Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Ensure .env contains LiveKit credentials:
# LIVEKIT_URL=...
# LIVEKIT_API_KEY=...
# LIVEKIT_API_SECRET=...

python backend.py
```

The API will be available on `http://localhost:8000`.

### .env (backend)

Create `backend/.env` with:

```
LIVEKIT_URL=...
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
```

### 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

Vite proxies `/api/*` to `http://localhost:8000`.

### 3) Agents (optional but recommended for audio)

In two terminals:

```bash
cd agent
python watson_agent.py
```

```bash
cd agent
python moriarty_agent.py
```

Set `CASE_BACKEND_URL` if your backend isn't on `http://localhost:8000`.

### .env (agent)

Create `agent/.env` with:

```
LIVEKIT_URL=...
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
OPENAI_API_KEY=...
DEEPGRAM_API_KEY=...
CARTESIA_API_KEY=...
```

If you want to reuse `backend/.env`, run the agent from the repo root and set `--env-file` or copy it into `agent/.env`.

## Mock mode (no LiveKit needed)
If LiveKit or the backend is unavailable, the UI falls back to **mock mode** automatically. The scene, timer, and branching still run with local events.

## Endpoints
- `POST /api/livekit/join` -> returns `{ token, url, roomName, identity, agents }`
- `GET /api/case/events?room=...` -> SSE event stream
- `POST /api/case/start` -> starts the cinematic timeline for a room
- `POST /api/case/action` -> user actions (`CHOOSE_CLUE`, `DEDUCTION`, `REQUEST_WATSON_HINT`)

## Notes
- All dialogue is original and avoids real-world harm instructions.
- Timer is authoritative on the backend; the UI only renders what it receives.
- Agents speak captions from SSE to keep audio and text aligned.
