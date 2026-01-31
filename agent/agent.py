import logging
import os
import sys
from typing import Optional
from dotenv import load_dotenv
from persona import get_criminal_mindset_prompt
from livekit.agents import (
    Agent,
    AgentSession,
    JobContext,
    JobProcess,
    MetricsCollectedEvent,
    RoomInputOptions,
    WorkerOptions,
    cli,
    metrics,
)
from livekit.plugins import noise_cancellation, silero
from livekit.plugins.turn_detector.multilingual import MultilingualModel
from livekit.plugins import deepgram, groq, cartesia, silero
from livekit.agents import ChatContext, ChatMessage

logger = logging.getLogger("agent-worker")
logging.basicConfig(level=logging.INFO)

load_dotenv(".env")



class VoiceAssistant(Agent):
    """Voice AI Assistant Agent"""
    
    def __init__(self, instructions: Optional[str] = None) -> None:
        default_instructions = """You are an intelligent voice assistant embedded on a website, helping visitors get the information they need quickly and efficiently.

CORE IDENTITY:
- You represent this website and speak on its behalf
- You have access to relevant knowledge about the website's content, products, services, and policies
- You communicate naturally through voice, so keep responses conversational and concise

COMMUNICATION STYLE:
- Speak in a natural, conversational tone as if having a face-to-face conversation
- Keep responses brief and scannable - aim for 2-3 sentences unless more detail is requested
- Avoid bullet points, markdown formatting, and complex punctuation
- Never use emojis, asterisks, or special characters
- If you need to list items, speak them naturally: "There are three options: first, second, and third"

CAPABILITIES:
- Answer questions about website content, features, and offerings
- Guide users to relevant pages or sections
- Provide summaries of complex information in simple terms
- Help with navigation and next steps
- Clarify policies, pricing, and processes

HANDLING QUERIES:
- When you receive additional context from the knowledge base, integrate it naturally without mentioning "according to documents" or "based on provided information"
- If you don't know something, be honest and offer to help find the information or direct them to contact support
- For complex requests, break down your response into digestible parts
- Always confirm understanding before providing detailed answers to ambiguous questions

BOUNDARIES:
- Stay focused on website-related information and assistance
- For questions outside your knowledge base, politely redirect to appropriate resources
- Never make up information - if unsure, say so
- Don't make promises about features, pricing, or policies unless explicitly stated in your knowledge base

TONE: Professional yet friendly, helpful, and efficient. You're here to make their experience easier."""

        
        super().__init__(
            instructions=instructions or default_instructions,
        )
    async def on_user_turn_completed(
        self, turn_ctx: ChatContext, new_message: ChatMessage,
    ) -> None:
        pass


# Global VAD instance for efficiency
vad_instance = None


def get_vad():
    """Get or initialize VAD instance"""
    global vad_instance
    if vad_instance is None:
        logger.info("Loading VAD model...")
        vad_instance = silero.VAD.load()
    return vad_instance


async def entrypoint(ctx: JobContext):
    """
    Main entrypoint for the agent worker.
    This is called when a room is created or when an agent is requested.
    """
    logger.info(f"Starting agent for room: {ctx.room.name}")
    
    # Explicitly fetch fresh room metadata to avoid race conditions
    room_metadata = ctx.room.metadata
    
    try:
        from livekit import api
        lkapi = api.LiveKitAPI(os.getenv("LIVEKIT_URL"), os.getenv("LIVEKIT_API_KEY"), os.getenv("LIVEKIT_API_SECRET"))
        rooms = await lkapi.room.list_rooms(api.ListRoomsRequest(names=[ctx.room.name]))
        if rooms.rooms:
            room_metadata = rooms.rooms[0].metadata
            logger.info(f"🔄 FRESH METADATA FETCHED: {room_metadata}")
        await lkapi.aclose()
    except Exception as e:
        logger.warning(f"Failed to fetch fresh metadata, using context metadata: {e}")

    if not room_metadata:
        logger.warning("⚠️ NO ROOM METADATA FOUND. Persona will default to standard assistant.")
    else:
        logger.info(f"✅ METADATA RECEIVED: {room_metadata}")
    
    room_metadata = room_metadata or "{}"
    
    # Parse metadata for custom instructions
    instructions = None
    stt_model = "deepgram/nova-3-general"#"assemblyai/universal-streaming:en"
    llm_model = "openai/gpt-4.1-mini"
    tts_model = "cartesia/sonic-2:9626c31c-bec5-4cca-baa8-f8ba9e84c8bc"
    
    try:
        import json
        metadata = json.loads(room_metadata)
        instructions = metadata.get("instructions")
        stt_model = metadata.get("stt_model", stt_model)
        llm_model = metadata.get("llm_model", llm_model)
        tts_model = metadata.get("tts_model", tts_model)
    except Exception as e:
        logger.warning(f"Could not parse room metadata: {e}")

    # Check for Riddler/Moriarty persona trigger
    if instructions is None and "crime_type" in metadata or "riddler" in str(metadata).lower():
        logger.info("Activating Riddler/Moriarty Persona")
        instructions = get_criminal_mindset_prompt(metadata)

    
    # Initialize usage collector for metrics
    usage_collector = metrics.UsageCollector()
    
    # Create agent session with configured models
    session = AgentSession(
        stt=stt_model,#"assemblyai/universal-streaming:en"
        llm="openai/gpt-4.1-mini",
        tts=tts_model,
        preemptive_generation=True,  # Generate responses while user is speaking
    )
    
    @session.on("metrics_collected")
    def _on_metrics_collected(ev: MetricsCollectedEvent):
        """Log metrics when collected"""
        metrics.log_metrics(ev.metrics)
        usage_collector.collect(ev.metrics)
    
    async def log_usage():
        """Log usage summary on shutdown"""
        summary = usage_collector.get_summary()
        logger.info(f"Session usage summary: {summary}")
    
    # Register shutdown callback
    ctx.add_shutdown_callback(log_usage)
    
    # Start the agent session
    await session.start(
        agent=VoiceAssistant(instructions=instructions),
        room=ctx.room,
        room_input_options=RoomInputOptions(
            noise_cancellation=noise_cancellation.BVC(),  # Background voice cancellation
        ),
    )
    
    # Connect to the room
    await ctx.connect()
    
    # --------------------------------------------------------------------------
    # Audio Playback Logic
    # --------------------------------------------------------------------------
    from livekit import rtc
    import asyncio
    
    async def _play_audio_file(file_path: str, loop: bool = False, volume: float = 1.0):
        """Plays an audio file into the room."""
        try:
            source = rtc.AudioSource(24000, 1) # 24kHz, 1 channel
            track = rtc.LocalAudioTrack.create_audio_track("audio_player", source)
            options = rtc.TrackPublishOptions(source=rtc.TrackSource.SOURCE_MICROPHONE)
            publication = await ctx.room.local_participant.publish_track(track, options)
            
            import av

            while True:
                try:
                    container = av.open(file_path)
                    stream = container.streams.audio[0]
                    resampler = av.AudioResampler(
                        format='s16',
                        layout='mono',
                        rate=24000,
                    )

                    for frame in container.decode(stream):
                        frames = resampler.resample(frame)
                        for f in frames:
                           data = f.to_ndarray().tobytes()
                           if volume != 1.0:
                               import numpy as np
                               audio_data = np.frombuffer(data, dtype=np.int16)
                               audio_data = (audio_data * volume).astype(np.int16)
                               data = audio_data.tobytes()
                               
                           audio_frame = rtc.AudioFrame(
                               data=data,
                               sample_rate=24000,
                               num_channels=1,
                               samples_per_channel=f.samples
                           )
                           await source.capture_frame(audio_frame)
                    
                    container.close()
                    
                except Exception as e:
                    logger.error(f"Error reading audio file {file_path}: {e}")
                    break
                    
                if not loop:
                    break
                    
            await ctx.room.local_participant.unpublish_track(publication.sid)
            
        except Exception as e:
             logger.error(f"Failed to play audio {file_path}: {e}")

    # 1. Play Intro Sound (Machine Gun)
    intro_path = os.path.join(os.path.dirname(__file__), "playback_audios", "machine-gun-01.wav")
    if os.path.exists(intro_path):
        logger.info(f"Playing intro audio: {intro_path}")
        # Run in background (fire and forget? or wait?) - Wait so it plays BEFORE hello
        await _play_audio_file(intro_path, loop=False, volume=0.5)
    else:
        logger.warning(f"Intro audio not found at: {intro_path}")

    # 2. Start Background Loop (Fire and forget task)
    bg_path = os.path.join(os.path.dirname(__file__), "playback_audios", "bg.mp3")
    if os.path.exists(bg_path):
        bg_volume = 0.1
        try:
             if "bg_volume" in metadata:
                 bg_volume = float(metadata.get("bg_volume"))
        except: pass
        
        logger.info(f"Starting background audio: {bg_path} (Vol: {bg_volume})")
        asyncio.create_task(_play_audio_file(bg_path, loop=True, volume=bg_volume))
    else:
        logger.warning(f"Background audio not found at: {bg_path}")
    
    # --------------------------------------------------------------------------
    
    # 3. Dynamic Greeting based on Persona
    if instructions:
         initial_greeting = "Welcome Sherlock and Watson to the game of LIFE!"
         
    await session.say(
       initial_greeting,
       allow_interruptions=False,
    )
    logger.info(f"Agent successfully started in room: {ctx.room.name}")


if __name__ == "__main__":
    # Run the agent worker
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
        )
    )