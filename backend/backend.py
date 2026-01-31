from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, StreamingResponse
from pydantic import BaseModel
from livekit import api
import os
from datetime import timedelta
from dotenv import load_dotenv
import asyncio
import json
import time
from typing import Dict, List, Optional, Any, Set

load_dotenv()

app = FastAPI(title="LiveKit AI Voice Agent API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Configuration - NEVER hard-code these, always use environment variables
LIVEKIT_URL = os.getenv("LIVEKIT_URL")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")

# Validate configuration
if not all([LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET]):
    raise ValueError("Missing required environment variables. Please set LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET")


class JoinRequest(BaseModel):
    room_name: str
    participant_name: str
    metadata: dict = {}


class TokenResponse(BaseModel):
    token: str
    url: str
    room_name: str


class KnowledgeBaseRequest(BaseModel):
    website_url: str
    max_pages: int = 50


class AgentInfo(BaseModel):
    id: str
    name: str
    role: str


class LiveKitJoinOptions(BaseModel):
    room_name: Optional[str] = None
    participant_name: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class JoinResponse(BaseModel):
    token: str
    url: str
    roomName: str
    identity: str
    agents: List[AgentInfo]


class CaseStartRequest(BaseModel):
    room: str


class CaseActionRequest(BaseModel):
    room: str
    action: str
    choice: Optional[str] = None
    guess: Optional[str] = None


async def ensure_room(room_name: str, metadata: Optional[Dict[str, Any]] = None) -> None:
    lkapi = api.LiveKitAPI(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
    try:
        meta_json = json.dumps(metadata or {})
        try:
            await lkapi.room.create_room(api.CreateRoomRequest(
                name=room_name,
                metadata=meta_json,
                empty_timeout=10 * 60,
            ))
        except Exception:
            await lkapi.room.update_room_metadata(api.UpdateRoomMetadataRequest(
                room=room_name,
                metadata=meta_json,
            ))
    finally:
        await lkapi.aclose()


async def issue_token(room_name: str, participant_name: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, str]:
    await ensure_room(room_name, metadata)
    participant_identity = f"{participant_name}_{os.urandom(4).hex()}"
    token = api.AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
    token.with_identity(participant_identity)
    token.with_name(participant_name)
    token.with_ttl(timedelta(hours=2))
    token.with_grants(api.VideoGrants(
        room_join=True,
        room=room_name,
        can_publish=True,
        can_subscribe=True,
        can_publish_data=True,
    ))
    return {
        "token": token.to_jwt(),
        "identity": participant_identity,
    }


class CaseRoomState:
    def __init__(self, room: str) -> None:
        self.room = room
        self.subscribers: Set[asyncio.Queue[str]] = set()
        self.started = False
        self.timer_task: Optional[asyncio.Task] = None
        self.timeline_task: Optional[asyncio.Task] = None
        self.remaining_seconds = 0
        self.timer_running = False
        self.selected_clue: Optional[str] = None
        self.deduction: Optional[str] = None
        self.case_over = False


class CaseDirector:
    def __init__(self) -> None:
        self.rooms: Dict[str, CaseRoomState] = {}

    def get_room(self, room: str) -> CaseRoomState:
        if room not in self.rooms:
            self.rooms[room] = CaseRoomState(room)
        return self.rooms[room]

    def add_subscriber(self, room: str, queue: asyncio.Queue[str]) -> None:
        state = self.get_room(room)
        state.subscribers.add(queue)

    def remove_subscriber(self, room: str, queue: asyncio.Queue[str]) -> None:
        state = self.get_room(room)
        state.subscribers.discard(queue)

    async def emit(self, room: str, event: Dict[str, Any]) -> None:
        state = self.get_room(room)
        payload = json.dumps(event)
        dead: List[asyncio.Queue[str]] = []
        for queue in state.subscribers:
            try:
                queue.put_nowait(payload)
            except asyncio.QueueFull:
                dead.append(queue)
        for queue in dead:
            state.subscribers.discard(queue)

    async def emit_caption(self, room: str, agent_id: str, text: str) -> None:
        for level in (0.2, 0.6, 0.9):
            await self.emit(room, {"type": "AGENT_SPEAKING", "agentId": agent_id, "level": level})
            await asyncio.sleep(0.12)
        await self.emit(room, {"type": "CAPTION", "agentId": agent_id, "text": text})
        await self.emit(room, {"type": "AGENT_SPEAKING", "agentId": agent_id, "level": 0.1})

    async def start_timer(self, state: CaseRoomState, seconds: int) -> None:
        state.remaining_seconds = seconds
        state.timer_running = True
        await self.emit(state.room, {"type": "TIMER_START", "seconds": seconds})
        if state.timer_task:
            state.timer_task.cancel()
        state.timer_task = asyncio.create_task(self._run_timer(state))

    async def apply_penalty(self, state: CaseRoomState, seconds: int) -> None:
        state.remaining_seconds = max(0, state.remaining_seconds - seconds)
        await self.emit(state.room, {"type": "TIMER_PENALTY", "seconds": seconds})
        await self.emit(state.room, {"type": "TIMER_TICK", "seconds": state.remaining_seconds})
        if state.remaining_seconds <= 0:
            await self.fail_case(state)

    async def _run_timer(self, state: CaseRoomState) -> None:
        while state.timer_running and state.remaining_seconds > 0 and not state.case_over:
            await asyncio.sleep(1)
            state.remaining_seconds = max(0, state.remaining_seconds - 1)
            await self.emit(state.room, {"type": "TIMER_TICK", "seconds": state.remaining_seconds})
        if state.remaining_seconds <= 0 and not state.case_over:
            await self.fail_case(state)

    async def fail_case(self, state: CaseRoomState) -> None:
        if state.case_over:
            return
        state.case_over = True
        state.timer_running = False
        await self.emit(state.room, {"type": "RESCUE_FAIL"})
        await self.emit_caption(state.room, "watson", "We are out of time. We have to move anyway.")
        await self.emit(state.room, {"type": "SFX_CALL_DROP"})

    async def succeed_case(self, state: CaseRoomState) -> None:
        if state.case_over:
            return
        state.case_over = True
        state.timer_running = False
        await self.emit(state.room, {"type": "RESCUE_SUCCESS"})
        await self.emit(state.room, {"type": "SFX_CALL_DROP"})

    async def start_case(self, room: str) -> None:
        state = self.get_room(room)
        state.started = True
        state.case_over = False
        state.selected_clue = None
        state.deduction = None
        state.remaining_seconds = 0
        state.timer_running = False
        if state.timeline_task:
            state.timeline_task.cancel()
        if state.timer_task:
            state.timer_task.cancel()
        state.timeline_task = asyncio.create_task(self._run_timeline(state))

    async def _run_timeline(self, state: CaseRoomState) -> None:
        start = time.monotonic()

        async def wait_until(target: float) -> None:
            delay = target - (time.monotonic() - start)
            if delay > 0:
                await asyncio.sleep(delay)

        await self.emit(state.room, {"type": "SCENE_SET", "scene": "STUDY_NOIR"})
        await self.emit(state.room, {"type": "AMBIENCE_SET", "track": "RAIN"})

        await wait_until(2)
        await self.emit_caption(state.room, "moriarty", "Evening, Sherlock. Two small lives are in my keeping for a moment.")
        await wait_until(5)
        await self.emit_caption(state.room, "watson", "Where are they?")
        await wait_until(7)
        await self.emit_caption(state.room, "moriarty", "They are eating chocolates. Sweet, but not safe.")
        await wait_until(10)
        await self.emit_caption(state.room, "moriarty", "Find them before the clock bites, or the papers will do the rest.")

        await wait_until(15)
        await self.emit(state.room, {"type": "SFX_TELEGRAM"})
        await self.emit(state.room, {
            "type": "EVIDENCE_ADD",
            "id": "clue_a",
            "title": "Clue A - Citrus Air Freshener",
            "description": "Harsh and cheap. Someone is masking stale air.",
            "x": 18,
            "y": 28,
        })
        await self.emit(state.room, {
            "type": "EVIDENCE_ADD",
            "id": "clue_b",
            "title": "Clue B - Cathedral Bell",
            "description": "A bell noted at midnight. Too theatrical?",
            "x": 48,
            "y": 20,
        })
        await self.emit(state.room, {
            "type": "EVIDENCE_ADD",
            "id": "clue_c",
            "title": "Clue C - Violin Case",
            "description": "Placed to bait your ego.",
            "x": 70,
            "y": 34,
        })
        await self.emit(state.room, {
            "type": "LINK_EVIDENCE",
            "fromId": "clue_a",
            "toId": "clue_c",
        })

        await wait_until(18)
        await self.emit_caption(state.room, "moriarty", "Three clues. One true, one bait, one tailored to your vanity.")
        await wait_until(20)
        await self.start_timer(state, 240)
        await wait_until(22)
        await self.emit_caption(state.room, "watson", "This is not a game.")
        await wait_until(24)
        await self.emit_caption(state.room, "moriarty", "Everything is a game. You simply arrived late.")

        await wait_until(28)
        await self.emit(state.room, {"type": "SFX_HEARTBEAT"})
        await self.emit(state.room, {"type": "AMBIENCE_SET", "track": "CLOCK"})
        await self.emit_caption(state.room, "moriarty", "While you think, they take small bites. Brave, obedient.")

        await wait_until(35)
        if not state.deduction:
            await self.emit_caption(state.room, "moriarty", "Indecision is a slow knife, Sherlock.")
            await self.apply_penalty(state, 15)

    async def handle_action(self, payload: CaseActionRequest) -> None:
        state = self.get_room(payload.room)
        if state.case_over:
            return
        if payload.action == "CHOOSE_CLUE":
            state.selected_clue = payload.choice
            if payload.choice == "A":
                await self.emit_caption(state.room, "watson", "Citrus covers stale air. That means a sealed, shut-up space.")
            return

        if payload.action == "REQUEST_WATSON_HINT":
            await self.emit_caption(state.room, "watson", "Don't chase the dramatic. Follow the practical: enclosed, damp, near the river.")
            return

        if payload.action == "DEDUCTION":
            state.deduction = payload.guess
            if payload.guess == "RIVER_UNDERPASS":
                await self.emit(state.room, {
                    "type": "LOCATION_CONFIRMED",
                    "label": "Riverside Service Underpass - Gate 3",
                })
                await self.emit(state.room, {"type": "SCENE_SET", "scene": "UNDERPASS"})
                await self.emit(state.room, {"type": "AMBIENCE_SET", "track": "ALLEY"})
                await self.emit(state.room, {"type": "SFX_SIREN"})
                await self.emit(state.room, {"type": "SFX_FOOTSTEPS"})
                await self.emit(state.room, {"type": "SFX_DOOR_RATTLE"})
                await self.emit_caption(state.room, "watson", "I'm calling it in - medical, hazmat, all of it. Go.")
                await self.emit_caption(state.room, "moriarty", "There you are. You do love a chase.")
                await asyncio.sleep(4)
                await self.succeed_case(state)
                await self.emit_caption(state.room, "moriarty", "Tonight you win their breathing. Tomorrow, I take what you cannot borrow back.")
                return

            await self.emit(state.room, {"type": "MISDIRECT"})
            await self.emit(state.room, {"type": "SCENE_SET", "scene": "STREET_BAIT"})
            await self.apply_penalty(state, 45)
            await self.emit_caption(state.room, "moriarty", "A bell? Predictable. You chased the theater.")
            await self.emit_caption(state.room, "watson", "Don't chase the dramatic. Chase the practical.")


case_director = CaseDirector()


@app.get("/")
def root():
    return {
        "service": "LiveKit AI Voice Agent",
        "status": "running",
        "components": {
            "stt": "Deepgram",
            "llm": "Groq (Llama 3.3 70B)",
            "tts": "Cartesia"
        },
        "endpoints": {
            "token": "/token",
            "livekit_join": "/api/livekit/join",
            "case_events": "/api/case/events",
            "case_start": "/api/case/start",
            "case_action": "/api/case/action",
            "demo": "/demo",
            "extract_kb": "/extract-knowledge-base"
        }
    }


@app.post("/token", response_model=TokenResponse)
async def create_token(request: JoinRequest):
    """Create access token for participant to join room"""
    try:
        # Update room metadata if provided
        if request.metadata:
            import json
            lkapi = api.LiveKitAPI(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
            meta_json = json.dumps(request.metadata)
            
            try:
                # Strategy: Try to create room first (ensures it exists and sets metadata)
                # If it exists, this might fail or return the existing room (depending on API version).
                # To be safe, we wrap in try/except and fallback to update.
                print(f"Attempting to set metadata for room: {request.room_name}")
                
                try:
                    await lkapi.room.create_room(api.CreateRoomRequest(
                        name=request.room_name,
                        metadata=meta_json,
                        empty_timeout=10 * 60, # Keep alive for 10 mins if empty
                    ))
                    print(f"Created room '{request.room_name}' with metadata.")
                except Exception as create_err:
                    # If creation failed, assume it exists and try to update
                    print(f"Room creation note (likely exists): {create_err}. Updating metadata...")
                    await lkapi.room.update_room_metadata(api.UpdateRoomMetadataRequest(
                        room=request.room_name,
                        metadata=meta_json
                    ))
                    print(f"Updated metadata for room '{request.room_name}'.")
                    
            except Exception as e:
                print(f"ERROR: Failed to set room metadata: {e}")
            finally:
                await lkapi.aclose()

        # Generate unique identity
        participant_identity = f"{request.participant_name}_{os.urandom(4).hex()}"
        
        # Create access token
        token = api.AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
        token.with_identity(participant_identity)
        token.with_name(request.participant_name)
        token.with_ttl(timedelta(hours=2))
        
        # Grant permissions
        token.with_grants(api.VideoGrants(
            room_join=True,
            room=request.room_name,
            can_publish=True,
            can_subscribe=True,
            can_publish_data=True,
        ))
        
        jwt_token = token.to_jwt()
        
        return TokenResponse(
            token=jwt_token,
            url=LIVEKIT_URL,
            room_name=request.room_name
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create token: {str(e)}")


@app.post("/api/livekit/join", response_model=JoinResponse)
async def join_livekit(payload: Optional[LiveKitJoinOptions] = None):
    """Frontend join endpoint for Sherlock player."""
    payload = payload or LiveKitJoinOptions()
    room_name = payload.room_name or f"mercury-case-{os.urandom(3).hex()}"
    participant_name = payload.participant_name or "Sherlock Holmes"
    metadata = {
        "case": "mercury_chocolates",
        "crime_type": "contaminated chocolates abduction",
        "complexity": "high",
        "user_role": "Sherlock",
        "bg_volume": 0.1,
    }
    if payload.metadata:
        metadata.update(payload.metadata)

    token_data = await issue_token(room_name, participant_name, metadata=metadata)

    return JoinResponse(
        token=token_data["token"],
        url=LIVEKIT_URL,
        roomName=room_name,
        identity=token_data["identity"],
        agents=[
            AgentInfo(id="watson", name="Dr. Watson", role="Companion"),
            AgentInfo(id="moriarty", name="Professor Moriarty", role="Antagonist"),
        ],
    )


@app.get("/api/case/events")
async def case_events(room: str):
    if not room:
        raise HTTPException(status_code=400, detail="Missing room")

    queue: asyncio.Queue[str] = asyncio.Queue(maxsize=100)
    case_director.add_subscriber(room, queue)

    async def event_stream():
        try:
            while True:
                try:
                    data = await asyncio.wait_for(queue.get(), timeout=15)
                    yield f"data: {data}\n\n"
                except asyncio.TimeoutError:
                    yield "event: keepalive\ndata: {}\n\n"
        finally:
            case_director.remove_subscriber(room, queue)

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )


@app.post("/api/case/start")
async def start_case(request: CaseStartRequest):
    await case_director.start_case(request.room)
    return {"status": "started"}


@app.post("/api/case/action")
async def case_action(request: CaseActionRequest):
    await case_director.handle_action(request)
    return {"status": "ok"}


@app.get("/demo", response_class=HTMLResponse)
async def demo_page():
    """Demo page for AI Voice Agent"""
    return """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AI Voice Agent Demo</title>
        <script src="https://cdn.jsdelivr.net/npm/livekit-client/dist/livekit-client.umd.min.js"></script>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }
            .container {
                background: white;
                border-radius: 20px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                padding: 40px;
                max-width: 600px;
                width: 100%;
            }
            h1 {
                color: #667eea;
                text-align: center;
                margin-bottom: 10px;
                font-size: 2em;
            }
            .subtitle {
                text-align: center;
                color: #666;
                margin-bottom: 30px;
                font-size: 0.9em;
            }
            .tech-stack {
                display: flex;
                justify-content: center;
                gap: 15px;
                margin-bottom: 30px;
                flex-wrap: wrap;
            }
            .tech-badge {
                background: #f0f4ff;
                color: #667eea;
                padding: 6px 12px;
                border-radius: 20px;
                font-size: 0.85em;
                font-weight: 600;
            }
            .form-group {
                margin-bottom: 20px;
            }
            label {
                display: block;
                margin-bottom: 8px;
                font-weight: 600;
                color: #333;
            }
            input {
                width: 100%;
                padding: 14px;
                border: 2px solid #e0e0e0;
                border-radius: 10px;
                font-size: 16px;
                transition: border-color 0.3s;
            }
            input:focus {
                outline: none;
                border-color: #667eea;
            }
            .status {
                padding: 15px;
                border-radius: 10px;
                margin-bottom: 20px;
                font-weight: 500;
                text-align: center;
            }
            .status.info {
                background: #dbeafe;
                color: #1e40af;
            }
            .status.success {
                background: #d1fae5;
                color: #065f46;
            }
            .status.error {
                background: #fee2e2;
                color: #991b1b;
            }
            .status.warning {
                background: #fef3c7;
                color: #92400e;
            }
            button {
                width: 100%;
                padding: 16px;
                border: none;
                border-radius: 10px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s;
                margin-bottom: 10px;
            }
            .btn-primary {
                background: #667eea;
                color: white;
            }
            .btn-primary:hover:not(:disabled) {
                background: #5568d3;
                transform: translateY(-2px);
                box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
            }
            .btn-danger {
                background: #ef4444;
                color: white;
            }
            .btn-danger:hover:not(:disabled) {
                background: #dc2626;
                transform: translateY(-2px);
                box-shadow: 0 10px 20px rgba(239, 68, 68, 0.3);
            }
            button:disabled {
                opacity: 0.5;
                cursor: not-allowed;
                transform: none !important;
            }
            .participants {
                background: #f9fafb;
                border: 2px solid #e5e7eb;
                border-radius: 10px;
                padding: 15px;
                margin-top: 20px;
                font-size: 14px;
            }
            .participants h3 {
                margin-bottom: 10px;
                color: #374151;
                font-size: 14px;
            }
            .participant {
                padding: 8px;
                background: white;
                border-radius: 6px;
                margin-bottom: 6px;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .participant.agent {
                background: #dcfce7;
            }
            .audio-visualizer {
                height: 60px;
                background: #f0f4ff;
                border-radius: 10px;
                margin-top: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 4px;
                padding: 0 20px;
            }
            .bar {
                width: 4px;
                background: #667eea;
                border-radius: 2px;
                transition: height 0.1s;
            }
            .speaking {
                background: #10b981 !important;
            }
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }
            .recording {
                animation: pulse 1.5s infinite;
            }
            .debug {
                background: #f3f4f6;
                border: 1px solid #d1d5db;
                border-radius: 8px;
                padding: 10px;
                margin-top: 15px;
                font-size: 12px;
                font-family: monospace;
                max-height: 200px;
                overflow-y: auto;
            }
            .debug-entry {
                padding: 4px 0;
                border-bottom: 1px solid #e5e7eb;
            }
            .kb-section {
                background: #f0f9ff;
                border: 2px solid #0ea5e9;
                border-radius: 15px;
                padding: 25px;
                margin-bottom: 30px;
            }
            .kb-section h2 {
                color: #0369a1;
                margin-bottom: 10px;
                font-size: 1.3em;
            }
            .kb-section p {
                color: #666;
                margin-bottom: 20px;
                font-size: 0.9em;
            }
            .section-divider {
                border-top: 2px solid #e5e7eb;
                padding-top: 30px;
            }
            .section-divider h2 {
                color: #667eea;
                margin-bottom: 20px;
                font-size: 1.3em;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🤖 AI Voice Agent</h1>
            <p class="subtitle">Talk naturally with an AI assistant</p>
            
            <div class="tech-stack">
                <span class="tech-badge">🎤 Deepgram</span>
                <span class="tech-badge">🧠 openai LLM</span>
                <span class="tech-badge">🔊 Cartesia</span>
                <span class="tech-badge">📞 LiveKit</span>
            </div>

            <!-- Voice Chat Section -->
            <div class="section-divider">
                <h2>🎙️ Voice Chat</h2>
            </div>

            <div id="status" class="status info">
                Ready to connect
            </div>

            <div class="form-group">
                <label for="roomName">Room Name</label>
                <input type="text" id="roomName" placeholder="Enter room name" value="voice-room">
            </div>

            <div class="form-group">
                <label for="userName">Your Name</label>
                <input type="text" id="userName" placeholder="Enter your name" value="User">
            </div>

            <!-- Crime Scene Injection -->
            <div class="kb-section" style="margin-top: 20px; border-color: #7c3aed; background: #faf5ff;">
                <h2 style="color: #6d28d9;">🕵️‍♀️ Crime Scene Settings</h2>
                
                <!-- Scenario Preset -->
                <div class="form-group">
                    <label>Scenario Preset</label>
                    <select id="scenarioPreset" onchange="applyPreset()" style="width: 100%; padding: 14px; border: 2px solid #7c3aed; border-radius: 10px; background: #fff;">
                        <option value="custom">Custom</option>
                        <option value="indian_kidnap">Moriarty's Kidnapping (Indian Edition)</option>
                        <option value="indian_bomb">Moriarty's Bombing Plot (Indian Edition)</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Crime Type</label>
                    <input type="text" id="crimeType" placeholder="e.g. Bank Heist, Murder Mystery">
                </div>
                <div class="form-group">
                    <label>Victim Name (if applicable)</label>
                    <input type="text" id="victimName" placeholder="e.g. Priya, Rahul" value="">
                </div>
                <div class="form-group">
                    <label>Complexity</label>
                    <select id="crimeComplexity" style="width: 100%; padding: 14px; border: 2px solid #e0e0e0; border-radius: 10px;">
                        <option value="">Normal</option>
                        <option value="Low">Low</option>
                        <option value="High">High</option>
                        <option value="Impossible">Impossible</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Your Role</label>
                    <input type="text" id="userRole" placeholder="e.g. Detective, Suspect" value="Detective">
                </div>
                <!-- Volume Control -->
                <div class="form-group">
                    <label>Background Music Volume (0 - 1)</label>
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <input type="range" id="bgVolume" min="0" max="1" step="0.1" value="0.2" oninput="document.getElementById('volValue').innerText = this.value">
                        <span id="volValue">0.2</span>
                    </div>
                </div>

                <script>
                function applyPreset() {
                    const preset = document.getElementById('scenarioPreset').value;
                    if (preset === 'indian_kidnap') {
                        document.getElementById('crimeType').value = 'Kidnapping (Indian Edition)';
                        document.getElementById('victimName').value = 'Priya';
                        document.getElementById('crimeComplexity').value = 'High';
                        document.getElementById('userRole').value = 'Detective';
                    } else if (preset === 'indian_bomb') {
                        document.getElementById('crimeType').value = 'Bombing (Indian Edition)';
                        document.getElementById('victimName').value = 'N/A';
                        document.getElementById('crimeComplexity').value = 'Impossible';
                        document.getElementById('userRole').value = 'Bomb Specialist';
                    } else {
                        document.getElementById('crimeType').value = '';
                        document.getElementById('victimName').value = '';
                        document.getElementById('crimeComplexity').value = '';
                    }
                }
                </script>
            </div>

            <button class="btn-primary" onclick="joinCall()" id="joinBtn">
                🎙️ Start Voice Call
            </button>

            <button class="btn-danger" onclick="leaveCall()" id="leaveBtn" disabled>
                📞 End Call
            </button>

            <div class="audio-visualizer" id="visualizer" style="display: none;">
                <div class="bar" style="height: 20px;"></div>
                <div class="bar" style="height: 35px;"></div>
                <div class="bar" style="height: 25px;"></div>
                <div class="bar" style="height: 40px;"></div>
                <div class="bar" style="height: 30px;"></div>
                <div class="bar" style="height: 45px;"></div>
                <div class="bar" style="height: 25px;"></div>
                <div class="bar" style="height: 35px;"></div>
                <div class="bar" style="height: 20px;"></div>
            </div>

            <div class="participants" id="participants" style="display: none;">
                <h3>📋 Participants</h3>
                <div id="participantList"></div>
            </div>

            <div class="debug" id="debug" style="display: none;">
                <strong>Debug Log:</strong>
                <div id="debugLog"></div>
            </div>
        </div>

        <script>
            let room;
            let isConnected = false;
            let audioContext;
            let analyser;
            let dataArray;
            const API_URL = window.location.origin;

            async function extractKnowledgeBase() {
                const websiteUrl = document.getElementById('websiteUrl').value.trim();
                const maxPages = parseInt(document.getElementById('maxPages').value) || 50;
                const statusDiv = document.getElementById('extractionStatus');
                const extractBtn = document.getElementById('extractBtn');

                if (!websiteUrl) {
                    statusDiv.style.display = 'block';
                    statusDiv.className = 'status error';
                    statusDiv.textContent = 'Please enter a website URL';
                    return;
                }

                try {
                    new URL(websiteUrl);
                } catch (e) {
                    statusDiv.style.display = 'block';
                    statusDiv.className = 'status error';
                    statusDiv.textContent = 'Please enter a valid URL (e.g., https://example.com)';
                    return;
                }

                try {
                    extractBtn.disabled = true;
                    statusDiv.style.display = 'block';
                    statusDiv.className = 'status info';
                    statusDiv.textContent = `⏳ Extracting knowledge base from ${websiteUrl}... This may take a few minutes.`;

                    const response = await fetch(`${API_URL}/extract-knowledge-base`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            website_url: websiteUrl,
                            max_pages: maxPages
                        })
                    });

                    if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.detail || 'Failed to extract knowledge base');
                    }

                    const data = await response.json();
                    statusDiv.className = 'status success';
                    statusDiv.innerHTML = `✅ ${data.message}<br><small>Output saved to: ${data.output_dir}</small>`;

                } catch (error) {
                    console.error('Extraction error:', error);
                    statusDiv.className = 'status error';
                    statusDiv.textContent = `❌ Failed: ${error.message}`;
                } finally {
                    extractBtn.disabled = false;
                }
            }

            function setStatus(message, type = 'info') {
                const status = document.getElementById('status');
                status.textContent = message;
                status.className = `status ${type}`;
            }

            function addDebug(message) {
                const debugLog = document.getElementById('debugLog');
                const entry = document.createElement('div');
                entry.className = 'debug-entry';
                entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
                debugLog.appendChild(entry);
                debugLog.scrollTop = debugLog.scrollHeight;
                console.log(message);
            }

            function updateParticipants() {
                if (!room) return;
                
                const participantList = document.getElementById('participantList');
                participantList.innerHTML = '';
                
                const localDiv = document.createElement('div');
                localDiv.className = 'participant';
                localDiv.innerHTML = `👤 ${room.localParticipant.name || room.localParticipant.identity} (You)`;
                participantList.appendChild(localDiv);
                
                room.remoteParticipants.forEach(participant => {
                    const div = document.createElement('div');
                    const isAgent = participant.identity.toLowerCase().includes('agent') || 
                                   participant.name?.toLowerCase().includes('agent');
                    div.className = `participant ${isAgent ? 'agent' : ''}`;
                    div.innerHTML = `${isAgent ? '🤖' : '👤'} ${participant.name || participant.identity}`;
                    participantList.appendChild(div);
                });
                
                document.getElementById('participants').style.display = 'block';
            }

            function setupAudioVisualization(track) {
                try {
                    if (!audioContext) {
                        audioContext = new (window.AudioContext || window.webkitAudioContext)();
                        analyser = audioContext.createAnalyser();
                        analyser.fftSize = 32;
                        dataArray = new Uint8Array(analyser.frequencyBinCount);
                    }
                    
                    const stream = new MediaStream([track.mediaStreamTrack]);
                    const source = audioContext.createMediaStreamSource(stream);
                    source.connect(analyser);
                    
                    animateBars();
                } catch (e) {
                    addDebug('Audio visualization error: ' + e.message);
                }
            }

            function animateBars() {
                if (!isConnected || !analyser) return;
                
                analyser.getByteFrequencyData(dataArray);
                const bars = document.querySelectorAll('.bar');
                
                bars.forEach((bar, i) => {
                    const value = dataArray[i] || 0;
                    const height = (value / 255) * 40 + 10;
                    bar.style.height = height + 'px';
                    bar.classList.toggle('speaking', value > 30);
                });
                
                requestAnimationFrame(animateBars);
            }

            async function joinCall() {
                const roomName = document.getElementById('roomName').value.trim();
                const userName = document.getElementById('userName').value.trim();

                if (!roomName || !userName) {
                    setStatus('Please enter both room name and your name', 'error');
                    return;
                }

                try {
                    setStatus('Connecting to room...', 'info');
                    document.getElementById('debug').style.display = 'block';
                    addDebug('Starting connection process...');

                    addDebug(`Requesting token for room: ${roomName}`);
                    const response = await fetch(`${API_URL}/token`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            room_name: roomName,
                            participant_name: userName,
                            metadata: {
                                crime_type: document.getElementById('crimeType').value,
                                victim_name: document.getElementById('victimName').value,
                                complexity: document.getElementById('crimeComplexity').value,
                                user_role: document.getElementById('userRole').value,
                                bg_volume: document.getElementById('bgVolume').value
                            }
                        })
                    });

                    if (!response.ok) {
                        throw new Error(`Failed to get access token: ${response.statusText}`);
                    }

                    const data = await response.json();
                    addDebug('Token received successfully');

                    room = new LivekitClient.Room({
                        adaptiveStream: true,
                        dynacast: true,
                        audioCaptureDefaults: {
                            autoGainControl: true,
                            echoCancellation: true,
                            noiseSuppression: true,
                        },
                    });

                    room.on('connected', () => {
                        addDebug('Connected to room successfully');
                        setStatus('✅ Connected! Waiting for AI agent...', 'success');
                        isConnected = true;
                        document.getElementById('visualizer').style.display = 'flex';
                        updateParticipants();
                        updateButtons(true);
                    });

                    room.on('disconnected', (reason) => {
                        addDebug('Disconnected from room: ' + reason);
                        setStatus('Disconnected', 'info');
                        isConnected = false;
                        updateButtons(false);
                        document.getElementById('visualizer').style.display = 'none';
                        document.getElementById('participants').style.display = 'none';
                    });

                    room.on('participantConnected', (participant) => {
                        addDebug(`Participant connected: ${participant.identity}`);
                        const isAgent = participant.identity.toLowerCase().includes('agent') || 
                                       participant.name?.toLowerCase().includes('agent');
                        
                        if (isAgent) {
                            setStatus('🤖 AI Agent is ready! Start speaking...', 'success');
                        }
                        updateParticipants();
                    });

                    room.on('participantDisconnected', (participant) => {
                        addDebug(`Participant disconnected: ${participant.identity}`);
                        updateParticipants();
                    });

                    room.on('trackSubscribed', (track, publication, participant) => {
                        addDebug(`Track subscribed: ${track.kind} from ${participant.identity}`);
                        
                        if (track.kind === 'audio') {
                            const isAgent = participant.identity.toLowerCase().includes('agent') || 
                                           participant.name?.toLowerCase().includes('agent');
                            
                            if (isAgent) {
                                addDebug('Playing agent audio');
                                const audioElement = track.attach();
                                audioElement.volume = 1.0;
                                document.body.appendChild(audioElement);
                            }
                        }
                    });

                    room.on('trackUnsubscribed', (track, publication, participant) => {
                        addDebug(`Track unsubscribed: ${track.kind} from ${participant.identity}`);
                        track.detach();
                    });

                    room.on('audioPlaybackStatusChanged', () => {
                        if (!room.canPlaybackAudio) {
                            addDebug('Audio playback blocked - user interaction required');
                            setStatus('⚠️ Click anywhere to enable audio', 'warning');
                            
                            const enableAudio = async () => {
                                await room.startAudio();
                                addDebug('Audio playback enabled');
                                setStatus('🤖 AI Agent is ready! Start speaking...', 'success');
                                document.removeEventListener('click', enableAudio);
                            };
                            
                            document.addEventListener('click', enableAudio, { once: true });
                        }
                    });

                    addDebug(`Connecting to ${data.url}...`);
                    await room.connect(data.url, data.token);

                    addDebug('Enabling microphone...');
                    await room.localParticipant.setMicrophoneEnabled(true);
                    addDebug('Microphone enabled');

                    const localAudioTrack = room.localParticipant.audioTrackPublications.values().next().value?.track;
                    if (localAudioTrack) {
                        setupAudioVisualization(localAudioTrack);
                    }

                    const agentPresent = Array.from(room.remoteParticipants.values()).some(p => 
                        p.identity.toLowerCase().includes('agent') || p.name?.toLowerCase().includes('agent')
                    );

                    if (!agentPresent) {
                        setStatus('⏳ Waiting for AI agent to join...', 'warning');
                        addDebug('No agent detected in room yet');
                    }

                } catch (error) {
                    console.error('Error joining call:', error);
                    addDebug('ERROR: ' + error.message);
                    setStatus('❌ Failed to join: ' + error.message, 'error');
                    updateButtons(false);
                }
            }

            async function leaveCall() {
                if (room) {
                    addDebug('Leaving call...');
                    await room.disconnect();
                    room = null;
                    isConnected = false;
                    
                    if (audioContext) {
                        audioContext.close();
                        audioContext = null;
                        analyser = null;
                    }
                    
                    setStatus('Call ended', 'info');
                    updateButtons(false);
                    document.getElementById('visualizer').style.display = 'none';
                    document.getElementById('participants').style.display = 'none';
                }
            }

            function updateButtons(connected) {
                document.getElementById('joinBtn').disabled = connected;
                document.getElementById('leaveBtn').disabled = !connected;
                document.getElementById('roomName').disabled = connected;
                document.getElementById('userName').disabled = connected;
            }

            window.addEventListener('beforeunload', () => {
                if (room) room.disconnect();
            });
        </script>
    </body>
    </html>
    """

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
