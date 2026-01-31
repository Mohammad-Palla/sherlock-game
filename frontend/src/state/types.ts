import { AgentInfo, Caption, EvidenceItem, EvidenceLink, SceneId } from '../types';

export type DirectorState = {
  currentScene: SceneId;
  agents: Record<string, AgentInfo>;
  evidence: EvidenceItem[];
  links: EvidenceLink[];
  captions: Caption[];
  ambience: 'RAIN' | 'CLOCK' | 'ALLEY' | 'LAIR_DRONE';
  sfxQueue: { id: string; name: 'GUNSHOT' }[];
  connectionStatus: 'disconnected' | 'connecting' | 'connected';
  roomName?: string;
  latencyMs?: number;
  reducedMotion: boolean;
  subtitlesEnabled: boolean;
  volumes: {
    agents: number;
    ambience: number;
    sfx: number;
  };
  flash: boolean;
};
