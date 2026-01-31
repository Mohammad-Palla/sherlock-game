import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

type StatusType = "info" | "success" | "error" | "warning";

type SceneKey = "study" | "market" | "underpass" | "landmark";

type Caption = {
  id: string;
  speaker: "moriarty" | "watson";
  text: string;
};

type CaseDetails = {
  victimName: string;
  userRole: string;
  crimeType: string;
  bgVolume: number;
};

const SCENES: Record<
  SceneKey,
  { title: string; subtitle: string; image: string }
> = {
  study: {
    title: "The Study",
    subtitle: "The call arrives under rain-laced windows",
    image: "/images/sherlock-study.jpg",
  },
  market: {
    title: "The Market",
    subtitle: "Crowds blur the trail, the villain smiles",
    image: "/images/market-scene.jpeg",
  },
  underpass: {
    title: "The Underpass",
    subtitle: "Echoes and footsteps under the river road",
    image: "/images/underpass-scene.jpg",
  },
  landmark: {
    title: "The Landmark",
    subtitle: "Stone and silence hide the truth",
    image: "/images/sherlock.jpg",
  },
};

const DEFAULT_BARS = [20, 35, 25, 40, 30, 45, 25, 35, 20];

const isSceneKey = (value: string): value is SceneKey =>
  value === "study" ||
  value === "market" ||
  value === "underpass" ||
  value === "landmark";

const createRoomName = () => {
  const suffix = Math.random().toString(16).slice(2, 8);
  return `kidnap-${suffix}`;
};

const App = () => {
  const [status, setStatus] = useState({
    message: "Case ready",
    type: "info" as StatusType,
  });
  const [isConnected, setIsConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [scene, setScene] = useState<SceneKey>("study");
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [speaking, setSpeaking] = useState({ moriarty: false, watson: false });

  const roomNameRef = useRef(createRoomName());
  const userNameRef = useRef("Detective");

  const roomRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const rafRef = useRef<number | null>(null);
  const barsRef = useRef<Array<HTMLDivElement | null>>([]);
  const audioContainerRef = useRef<HTMLDivElement | null>(null);
  const speakingTimersRef = useRef<
    Record<"moriarty" | "watson", number | undefined>
  >({
    moriarty: undefined,
    watson: undefined,
  });
  const decoderRef = useRef(new TextDecoder());
  const caseDetailsRef = useRef<CaseDetails>({
    victimName: "Priya",
    userRole: "Detective",
    crimeType: "Kidnapping (Indian Edition)",
    bgVolume: 0.2,
  });

  const updateStatus = (message: string, type: StatusType = "info") => {
    setStatus({ message, type });
  };

  const stopVisualizer = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    analyserRef.current = null;
    dataArrayRef.current = null;
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => undefined);
      audioContextRef.current = null;
    }
  };

  const animateBars = () => {
    if (!analyserRef.current || !dataArrayRef.current) return;
    analyserRef.current.getByteFrequencyData(dataArrayRef.current);
    barsRef.current.forEach((bar, index) => {
      if (!bar) return;
      const value = dataArrayRef.current?.[index] ?? 0;
      const height = (value / 255) * 40 + 10;
      bar.style.height = `${height}px`;
      if (value > 30) {
        bar.classList.add("speaking");
      } else {
        bar.classList.remove("speaking");
      }
    });
    rafRef.current = requestAnimationFrame(animateBars);
  };

  const setupAudioVisualization = (track: any) => {
    if (!track?.mediaStreamTrack) return;
    stopVisualizer();
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    const stream = new MediaStream([track.mediaStreamTrack]);
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
    animateBars();
  };

  const clearSpeakingTimers = () => {
    (
      Object.keys(speakingTimersRef.current) as Array<"moriarty" | "watson">
    ).forEach((key) => {
      const timer = speakingTimersRef.current[key];
      if (timer) window.clearTimeout(timer);
      speakingTimersRef.current[key] = undefined;
    });
    setSpeaking({ moriarty: false, watson: false });
  };

  const pushCaption = (speaker: "moriarty" | "watson", text: string) => {
    setCaptions((prev) => {
      const next = [...prev, { id: `${speaker}-${Date.now()}`, speaker, text }];
      return next.slice(-6);
    });
  };

  const flashSpeaker = (speaker: "moriarty" | "watson") => {
    setSpeaking((prev) => ({ ...prev, [speaker]: true }));
    const existing = speakingTimersRef.current[speaker];
    if (existing) window.clearTimeout(existing);
    const timer = window.setTimeout(() => {
      setSpeaking((prev) => ({ ...prev, [speaker]: false }));
    }, 2200);
    speakingTimersRef.current[speaker] = timer;
  };

  const handleSceneEvent = (incoming: string) => {
    const normalized = incoming.trim().toLowerCase();
    if (isSceneKey(normalized)) {
      setScene(normalized);
    }
  };

  const handleCaptionEvent = (speaker: string, text: string) => {
    const normalized = speaker.trim().toLowerCase();
    if (normalized !== "moriarty" && normalized !== "watson") return;
    pushCaption(normalized, text);
    flashSpeaker(normalized);
  };

  const handleDataMessage = (payload: Uint8Array | string) => {
    try {
      const raw =
        typeof payload === "string"
          ? payload
          : decoderRef.current.decode(payload);
      const message = JSON.parse(raw) as {
        type?: string;
        scene?: string;
        speaker?: string;
        text?: string;
        status?: string;
      };
      if (message.type === "SCENE_SET" && message.scene) {
        handleSceneEvent(message.scene);
        return;
      }
      if (message.type === "CAPTION" && message.speaker && message.text) {
        handleCaptionEvent(message.speaker, message.text);
        return;
      }
      if (message.type === "STATUS" && message.status) {
        updateStatus(message.status, "info");
      }
    } catch (error) {
      // ignore malformed packets
    }
  };

  const joinCall = async () => {
    if (connecting || isConnected) return;

    const livekitClient = (window as any).LivekitClient;
    if (!livekitClient) {
      updateStatus("LiveKit client not loaded", "error");
      return;
    }

    const caseDetails = caseDetailsRef.current;

    try {
      setConnecting(true);
      updateStatus("Opening the case line...", "info");

      const response = await fetch("/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room_name: roomNameRef.current,
          participant_name: userNameRef.current,
          metadata: {
            crime_type: caseDetails.crimeType,
            victim_name: caseDetails.victimName,
            complexity: "High",
            user_role: caseDetails.userRole,
            bg_volume: caseDetails.bgVolume,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get access token: ${response.statusText}`);
      }

      const data = await response.json();

      const room = new livekitClient.Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: {
          autoGainControl: true,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      roomRef.current = room;

      room.on("connected", () => {
        updateStatus("Connected. Stay sharp.", "success");
        setIsConnected(true);
      });

      room.on("disconnected", () => {
        updateStatus("Disconnected", "info");
        setIsConnected(false);
        setCaptions([]);
        setScene("study");
        if (audioContainerRef.current) {
          audioContainerRef.current.innerHTML = "";
        }
        clearSpeakingTimers();
        stopVisualizer();
      });

      room.on(
        "dataReceived",
        (
          payload: Uint8Array,
          _participant: any,
          _kind: any,
          _topic: string,
        ) => {
          handleDataMessage(payload);
        },
      );

      room.on(
        "trackSubscribed",
        (track: any, _publication: any, participant: any) => {
          if (track.kind !== "audio") return;
          const element = track.attach();
          element.volume = 1.0;
          if (audioContainerRef.current) {
            audioContainerRef.current.appendChild(element);
          } else {
            document.body.appendChild(element);
          }
        },
      );

      room.on("trackUnsubscribed", (track: any) => {
        const detached = track.detach();
        detached.forEach((element: HTMLElement) => element.remove());
      });

      room.on("audioPlaybackStatusChanged", () => {
        if (!room.canPlaybackAudio) {
          updateStatus("Click anywhere to enable audio", "warning");
          const enableAudio = async () => {
            await room.startAudio();
            updateStatus("Agent online. You can speak now.", "success");
          };
          document.addEventListener("click", enableAudio, { once: true });
        }
      });

      await room.connect(data.url, data.token);
      await room.localParticipant.setMicrophoneEnabled(true);

      const localAudioPublication = Array.from(
        room.localParticipant.audioTrackPublications.values(),
      ).find((publication: any) => publication.track);
      if (localAudioPublication?.track) {
        setupAudioVisualization(localAudioPublication.track);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      updateStatus(`Failed to join: ${message}`, "error");
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
      setIsConnected(false);
      clearSpeakingTimers();
      stopVisualizer();
    } finally {
      setConnecting(false);
    }
  };

  const leaveCall = async () => {
    if (!roomRef.current) return;
    await roomRef.current.disconnect();
    roomRef.current = null;
    setIsConnected(false);
    setCaptions([]);
    setScene("study");
    clearSpeakingTimers();
    stopVisualizer();
    updateStatus("Case closed", "info");
  };

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (roomRef.current) {
        roomRef.current.disconnect();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (roomRef.current) {
        roomRef.current.disconnect();
      }
      clearSpeakingTimers();
      stopVisualizer();
    };
  }, []);

  const statusBadge = useMemo(() => {
    if (connecting) return "Connecting";
    if (isConnected) return "Connected";
    return "Disconnected";
  }, [connecting, isConnected]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-ink text-parchment">
      <AnimatePresence mode="wait">
        <motion.div
          key={scene}
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${SCENES[scene].image})` }}
          initial={{ opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </AnimatePresence>
      <div className="absolute inset-0 bg-black/60" />
      <div className="noise absolute inset-0 opacity-50" />
      <div className="vignette absolute inset-0" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(192,165,107,0.2),transparent_55%)]" />

      <main className="relative z-10 flex min-h-screen flex-col px-6 py-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-fog">
              Case file
            </p>
            <h1 className="font-serif text-3xl uppercase tracking-[0.2em] text-parchment sm:text-4xl">
              Moriarty Kidnapping
            </h1>
            <p className="mt-2 text-sm uppercase tracking-[0.3em] text-brass">
              Indian Edition
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3 rounded-full border border-brass/40 bg-black/40 px-4 py-2 text-xs uppercase tracking-[0.3em]">
              <span
                className={`h-2 w-2 rounded-full ${isConnected ? "bg-emerald-400" : connecting ? "bg-amber-400" : "bg-rose-400"}`}
              />
              {statusBadge}
            </div>
            <button
              className="primary-button"
              onClick={joinCall}
              disabled={isConnected || connecting}
            >
              Start Case
            </button>
            <button
              className="secondary-button"
              onClick={leaveCall}
              disabled={!isConnected}
            >
              End Case
            </button>
          </div>
        </header>

        <section className="mt-8 grid flex-1 gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="flex flex-col gap-6">
            <div className="glass-panel">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.4em] text-fog">
                <span>Live scene</span>
                <span>{SCENES[scene].title}</span>
              </div>
              <h3 className="mt-4 font-serif text-2xl uppercase tracking-[0.2em] text-parchment sm:text-3xl">
                {SCENES[scene].title}
              </h3>
              <p className="mt-2 max-w-xl text-sm uppercase tracking-[0.3em] text-fog">
                {SCENES[scene].subtitle}
              </p>
            </div>

            <div className="glass-panel">
              <h2 className="panel-title">Case log</h2>
              <div className="mt-4 space-y-4">
                {captions.length === 0 ? (
                  <p className="text-xs uppercase tracking-[0.2em] text-fog">
                    Waiting for the story to unfold.
                  </p>
                ) : (
                  captions.map((caption) => (
                    <motion.div
                      key={caption.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                      className={`rounded-lg border px-4 py-3 text-sm ${
                        caption.speaker === "moriarty"
                          ? "border-burgundy/40 bg-burgundy/10 text-parchment"
                          : "border-brass/40 bg-brass/10 text-parchment"
                      }`}
                    >
                      <div className="text-[10px] uppercase tracking-[0.3em] text-fog">
                        {caption.speaker === "moriarty" ? "Moriarty" : "Watson"}
                      </div>
                      <p className="mt-2 leading-relaxed">{caption.text}</p>
                    </motion.div>
                  ))
                )}
              </div>
            </div>

            <div className="glass-panel">
              <h2 className="panel-title">Audio pulse</h2>
              <div
                className="audio-visualizer"
                style={{ display: isConnected ? "flex" : "none" }}
              >
                {DEFAULT_BARS.map((height, index) => (
                  <div
                    key={`bar-${index}`}
                    ref={(el) => {
                      barsRef.current[index] = el;
                    }}
                    className="bar"
                    style={{ height }}
                  />
                ))}
              </div>
              {!isConnected ? (
                <p className="mt-2 text-xs uppercase tracking-[0.2em] text-fog">
                  Connect to see levels.
                </p>
              ) : null}
              <div className={`status-chip status-${status.type}`}>
                {status.message}
              </div>
            </div>
          </div>

          <aside className="flex flex-col gap-6">
            <div
              className={`glass-panel ${speaking.moriarty ? "ring-2 ring-burgundy/70 shadow-glow" : ""}`}
            >
              <h2 className="panel-title">Moriarty</h2>
              <img
                src="/images/moriarity.png"
                alt="Moriarty"
                className="mt-4 w-full rounded-xl"
              />
              <p className="mt-4 text-xs uppercase tracking-[0.3em] text-fog">
                Antagonist
              </p>
            </div>
            <div
              className={`glass-panel ${speaking.watson ? "ring-2 ring-brass/70 shadow-glow" : ""}`}
            >
              <h2 className="panel-title">Watson</h2>
              <img
                src="/images/watson.png"
                alt="Watson"
                className="mt-4 w-full rounded-xl"
              />
              <p className="mt-4 text-xs uppercase tracking-[0.3em] text-fog">
                Companion
              </p>
            </div>
          </aside>
        </section>
      </main>

      <div ref={audioContainerRef} className="hidden" />
    </div>
  );
};

export default App;
