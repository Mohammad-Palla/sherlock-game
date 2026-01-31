import { useCallback, useEffect, useRef, useState } from 'react';
import { useDirectorStore } from './state/directorStore';
import SceneManager from './components/SceneManager';
import TopBar from './components/TopBar';
import AgentPanel from './components/AgentPanel';
import SubtitleBar from './components/SubtitleBar';
import SettingsPanel from './components/SettingsPanel';
import DebugOverlay from './components/DebugOverlay';
import Toasts from './components/Toasts';
import { joinLiveKit, mockJoinResponse, sendCaseAction, startCase } from './services/backend';
import { connectLiveKit, monitorLatency } from './services/livekitClient';
import { AudioEngine } from './services/AudioEngine';
import { EventBus } from './services/EventBus';
import { BackendEvent } from './types';
import { useToastStore } from './state/toastStore';
import { formatSceneLabel } from './utils/scenes';
import TimerOverlay from './components/TimerOverlay';
import CaseActions, { CaseActionPayload } from './components/CaseActions';
import { handleMockCaseAction } from './services/mockCaseDirector';

const normalizeIdentity = (identity: string) => identity.split('_')[0]?.toLowerCase() ?? identity.toLowerCase();

const formatIdentity = (identity: string) => {
  const base = identity.split('_')[0]?.replace(/[-_]+/g, ' ').trim();
  if (!base) return identity;
  return base.replace(/\b\w/g, (char) => char.toUpperCase());
};

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
  const roomName = useDirectorStore((s) => s.roomName);
  const setSelectedClue = useDirectorStore((s) => s.setSelectedClue);
  const setDeduction = useDirectorStore((s) => s.setDeduction);
  const setPlayerName = useDirectorStore((s) => s.setPlayerName);

  const pushToast = useToastStore((s) => s.push);

  const [debugVisible, setDebugVisible] = useState(false);

  const audioEngineRef = useRef<AudioEngine>();
  const eventBusRef = useRef<EventBus>();
  const latencyCleanupRef = useRef<() => void>();
  const socketRef = useRef<WebSocket | null>(null);
  const connectingRef = useRef(false);

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
      if (event.type === 'SCENE_SET') pushToast(`Scene: ${formatSceneLabel(event.scene)}`);
      if (event.type === 'SFX_GUNSHOT') pushToast('Gunshot detected');
      if (event.type === 'RESCUE_SUCCESS') pushToast('Rescue confirmed');
      if (event.type === 'RESCUE_FAIL') pushToast('Timer expired');
    },
    [dispatchEvent, pushToast]
  );

  useEffect(() => {
    const bus = new EventBus({ mode: eventSourceMode, onEvent: handleBackendEvent, roomName });
    eventBusRef.current = bus;
    bus.start();
    return () => bus.stop();
  }, [eventSourceMode, handleBackendEvent, roomName]);

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
    if (connectingRef.current || connectionStatus !== 'disconnected') return;
    connectingRef.current = true;
    try {
      setConnectionStatus('connecting');
      const response = await joinLiveKit();
      const playerId = normalizeIdentity(response.identity);
      setPlayerName(formatIdentity(response.identity));
      setRoomInfo(response.roomName);
      const agentMap = Object.fromEntries(
        response.agents
          .filter((agent) => {
            const agentId = agent.id.toLowerCase();
            const agentName = agent.name.toLowerCase();
            if (agentId === playerId) return false;
            if (playerId === 'sherlock' && agentName.includes('sherlock')) return false;
            return true;
          })
          .map((agent) => [agent.id, { ...agent, volume: 1 }])
      );
      setAgents(agentMap);
      setEventSourceMode('backend');
      await audioEngineRef.current?.start();
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      const socket = await connectLiveKit(response.url, response.token);
      socketRef.current = socket;
      socket.addEventListener('close', () => {
        setConnectionStatus('disconnected');
        setLatency(undefined);
      });
      latencyCleanupRef.current?.();
      latencyCleanupRef.current = monitorLatency(socket, setLatency);
      setConnectionStatus('connected');
      if (useDirectorStore.getState().currentScene === 'BOOT') {
        dispatchEvent({ type: 'SCENE_SET', scene: 'STUDY_NOIR' });
      }
      try {
        await startCase(response.roomName);
      } catch {
        pushToast('Case start failed');
      }
      pushToast('LiveKit connected');
    } catch (error) {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      const fallback = mockJoinResponse();
      const playerId = normalizeIdentity(fallback.identity);
      setPlayerName(formatIdentity(fallback.identity));
      setRoomInfo(fallback.roomName);
      const agentMap = Object.fromEntries(
        fallback.agents
          .filter((agent) => {
            const agentId = agent.id.toLowerCase();
            const agentName = agent.name.toLowerCase();
            if (agentId === playerId) return false;
            if (playerId === 'sherlock' && agentName.includes('sherlock')) return false;
            return true;
          })
          .map((agent) => [agent.id, { ...agent, volume: 1 }])
      );
      setAgents(agentMap);
      setConnectionStatus('connected');
      setEventSourceMode('mock');
      await audioEngineRef.current?.start();
      if (useDirectorStore.getState().currentScene === 'BOOT') {
        dispatchEvent({ type: 'SCENE_SET', scene: 'STUDY_NOIR' });
      }
      pushToast('Mock session started');
    }
    connectingRef.current = false;
  };

  const connectLabel = connectionStatus === 'connected' ? 'Connected' : connectionStatus === 'connecting' ? 'Connecting...' : 'Connect to Case';

  const handleCaseAction = useCallback(
    async (payload: CaseActionPayload) => {
      if (payload.action === 'CHOOSE_CLUE') setSelectedClue(payload.choice);
      if (payload.action === 'DEDUCTION') setDeduction(payload.guess);

      if (eventSourceMode === 'mock') {
        handleMockCaseAction(payload);
        if (payload.action === 'DEDUCTION') {
          eventBusRef.current?.markDecisionMade();
          if (payload.guess === 'RIVER_UNDERPASS') {
            eventBusRef.current?.stopMockTimer();
          }
        }
        return;
      }

      if (!roomName) {
        pushToast('Room not ready');
        return;
      }

      try {
        if (payload.action === 'CHOOSE_CLUE') {
          await sendCaseAction({ room: roomName, action: 'CHOOSE_CLUE', choice: payload.choice });
        } else if (payload.action === 'DEDUCTION') {
          await sendCaseAction({ room: roomName, action: 'DEDUCTION', guess: payload.guess });
        } else {
          await sendCaseAction({ room: roomName, action: 'REQUEST_WATSON_HINT' });
        }
      } catch (error) {
        pushToast('Case action failed');
      }
    },
    [eventSourceMode, roomName, pushToast, setDeduction, setSelectedClue]
  );

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
              <CaseActions onAction={handleCaseAction} disabled={connectionStatus !== 'connected'} />
            </div>
            <SubtitleBar />
            <Toasts />
            <TimerOverlay />
          </div>
          <AgentPanel />
        </div>
      </div>
      {debugVisible ? <DebugOverlay /> : null}
    </div>
  );
};

export default App;
