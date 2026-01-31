import { useCallback, useEffect, useRef, useState } from 'react';
import { useDirectorStore } from './state/directorStore';
import SceneManager from './components/SceneManager';
import TopBar from './components/TopBar';
import AgentPanel from './components/AgentPanel';
import SubtitleBar from './components/SubtitleBar';
import SettingsPanel from './components/SettingsPanel';
import DebugOverlay from './components/DebugOverlay';
import Toasts from './components/Toasts';
import { joinLiveKit, mockJoinResponse } from './services/backend';
import { connectLiveKit, monitorLatency } from './services/livekitClient';
import { AudioEngine } from './services/AudioEngine';
import { EventBus } from './services/EventBus';
import { BackendEvent } from './types';
import { useToastStore } from './state/toastStore';

const App = () => {
  const dispatchEvent = useDirectorStore((s) => s.dispatchEvent);
  const setConnectionStatus = useDirectorStore((s) => s.setConnectionStatus);
  const setAgents = useDirectorStore((s) => s.setAgents);
  const updateAgent = useDirectorStore((s) => s.updateAgent);
  const setRoomInfo = useDirectorStore((s) => s.setRoomInfo);
  const setLatency = useDirectorStore((s) => s.setLatency);
  const sfxQueue = useDirectorStore((s) => s.sfxQueue);
  const consumeSfx = useDirectorStore((s) => s.consumeSfx);
  const ambience = useDirectorStore((s) => s.ambience);
  const volumes = useDirectorStore((s) => s.volumes);
  const agents = useDirectorStore((s) => s.agents);
  const connectionStatus = useDirectorStore((s) => s.connectionStatus);
  const eventSourceMode = useDirectorStore((s) => s.eventSourceMode);
  const setEventSourceMode = useDirectorStore((s) => s.setEventSourceMode);

  const pushToast = useToastStore((s) => s.push);

  const [debugVisible, setDebugVisible] = useState(false);

  const audioEngineRef = useRef<AudioEngine>();
  const eventBusRef = useRef<EventBus>();
  const latencyCleanupRef = useRef<() => void>();

  useEffect(() => {
    audioEngineRef.current = new AudioEngine((agentId, level) => {
      updateAgent(agentId, { level });
    });
    return () => {
      audioEngineRef.current?.stop();
      latencyCleanupRef.current?.();
    };
  }, [updateAgent]);

  const handleBackendEvent = useCallback(
    (event: BackendEvent) => {
      dispatchEvent(event);
      if (event.type === 'EVIDENCE_ADD') pushToast('New evidence added');
      if (event.type === 'SCENE_SET') pushToast(`Scene: ${event.scene}`);
      if (event.type === 'SFX_GUNSHOT') pushToast('Gunshot detected');
    },
    [dispatchEvent, pushToast]
  );

  useEffect(() => {
    const bus = new EventBus({ mode: eventSourceMode, onEvent: handleBackendEvent });
    eventBusRef.current = bus;
    bus.start();
    return () => bus.stop();
  }, [eventSourceMode, handleBackendEvent]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === '`') {
        setDebugVisible((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    audioEngineRef.current?.setVolumes(volumes.agents, volumes.ambience, volumes.sfx);
  }, [volumes]);

  useEffect(() => {
    audioEngineRef.current?.setAmbience(ambience);
  }, [ambience]);

  useEffect(() => {
    sfxQueue.forEach((sfx) => {
      audioEngineRef.current?.playSfx(sfx.name);
      consumeSfx(sfx.id);
    });
  }, [sfxQueue, consumeSfx]);

  useEffect(() => {
    Object.values(agents).forEach((agent) => {
      if (agent.id) {
        audioEngineRef.current?.setAgentMuted(agent.id, !!agent.muted);
        audioEngineRef.current?.setAgentGain(agent.id, agent.volume ?? 1);
      }
    });
    const soloAgent = Object.values(agents).find((agent) => agent.solo)?.id;
    audioEngineRef.current?.setSoloAgent(soloAgent);
  }, [agents]);

  const handleConnect = async () => {
    try {
      setConnectionStatus('connecting');
      const response = await joinLiveKit();
      setRoomInfo(response.roomName);
      const agentMap = Object.fromEntries(
        response.agents.map((agent) => [agent.id, { ...agent, volume: 1 }])
      );
      setAgents(agentMap);
      setEventSourceMode('backend');
      await audioEngineRef.current?.start();
      const room = await connectLiveKit(response.url, response.token);
      audioEngineRef.current?.attachRoom(room);
      latencyCleanupRef.current?.();
      latencyCleanupRef.current = monitorLatency(room, setLatency);
      setConnectionStatus('connected');
      if (useDirectorStore.getState().currentScene === 'BOOT') {
        dispatchEvent({ type: 'SCENE_SET', scene: 'CRIME_SCENE' });
      }
      pushToast('LiveKit connected');
    } catch (error) {
      const fallback = mockJoinResponse();
      setRoomInfo(fallback.roomName);
      const agentMap = Object.fromEntries(
        fallback.agents.map((agent) => [agent.id, { ...agent, volume: 1 }])
      );
      setAgents(agentMap);
      setConnectionStatus('connected');
      setEventSourceMode('mock');
      await audioEngineRef.current?.start();
      if (useDirectorStore.getState().currentScene === 'BOOT') {
        dispatchEvent({ type: 'SCENE_SET', scene: 'CRIME_SCENE' });
      }
      pushToast('Mock session started');
    }
  };

  const connectLabel = connectionStatus === 'connected' ? 'Connected' : connectionStatus === 'connecting' ? 'Connecting...' : 'Connect to Case';

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-ink text-parchment">
      <SceneManager />
      <div className="absolute inset-0 flex flex-col">
        <TopBar />
        <div className="flex flex-1">
          <div className="relative flex-1">
            <div className="absolute left-6 top-24 z-10 flex flex-col gap-4">
              <button
                className={`case-button magnify ${connectionStatus !== 'disconnected' ? 'opacity-60' : ''}`}
                onClick={handleConnect}
                disabled={connectionStatus !== 'disconnected'}
              >
                {connectLabel}
              </button>
              <SettingsPanel />
            </div>
            <SubtitleBar />
            <Toasts />
          </div>
          <AgentPanel />
        </div>
      </div>
      {debugVisible ? <DebugOverlay /> : null}
    </div>
  );
};

export default App;
