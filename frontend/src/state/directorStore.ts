import { create } from 'zustand';
import { BackendEvent, EventSourceMode, SceneId } from '../types';
import { DirectorState } from './types';
import { applyBackendEvent } from './eventReducer';

const initialState: DirectorState = {
  currentScene: 'BOOT',
  agents: {},
  evidence: [],
  links: [],
  captions: [],
  ambience: 'RAIN',
  sfxQueue: [],
  connectionStatus: 'disconnected',
  roomName: undefined,
  latencyMs: undefined,
  reducedMotion: false,
  subtitlesEnabled: true,
  volumes: {
    agents: 0.9,
    ambience: 0.6,
    sfx: 0.8,
  },
  flash: false,
};

type DirectorActions = {
  dispatchEvent: (event: BackendEvent) => void;
  setConnectionStatus: (status: DirectorState['connectionStatus']) => void;
  setRoomInfo: (roomName: string) => void;
  setLatency: (latencyMs?: number) => void;
  setAgents: (agents: DirectorState['agents']) => void;
  updateAgent: (id: string, partial: Partial<DirectorState['agents'][string]>) => void;
  setScene: (scene: SceneId) => void;
  consumeSfx: (id: string) => void;
  setReducedMotion: (value: boolean) => void;
  setSubtitlesEnabled: (value: boolean) => void;
  setVolume: (key: keyof DirectorState['volumes'], value: number) => void;
  clearFlash: () => void;
  setEventSourceMode: (mode: EventSourceMode) => void;
};

export type DirectorStore = DirectorState & DirectorActions & { eventSourceMode: EventSourceMode };

export const useDirectorStore = create<DirectorStore>((set, get) => ({
  ...initialState,
  eventSourceMode: 'mock',
  dispatchEvent: (event) => set((state) => applyBackendEvent(state, event)),
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setRoomInfo: (roomName) => set({ roomName }),
  setLatency: (latencyMs) => set({ latencyMs }),
  setAgents: (agents) => set({ agents }),
  updateAgent: (id, partial) =>
    set((state) => ({
      agents: {
        ...state.agents,
        [id]: {
          ...state.agents[id],
          ...partial,
        },
      },
    })),
  setScene: (scene) => set({ currentScene: scene }),
  consumeSfx: (id) =>
    set((state) => ({
      sfxQueue: state.sfxQueue.filter((item) => item.id !== id),
    })),
  setReducedMotion: (value) => set({ reducedMotion: value }),
  setSubtitlesEnabled: (value) => set({ subtitlesEnabled: value }),
  setVolume: (key, value) =>
    set((state) => ({
      volumes: {
        ...state.volumes,
        [key]: value,
      },
    })),
  clearFlash: () => set({ flash: false }),
  setEventSourceMode: (mode) => set({ eventSourceMode: mode }),
}));
