export type SceneId = 'BOOT' | 'CRIME_SCENE' | 'STUDY' | 'LAIR';

export type AgentInfo = {
  id: string;
  name: string;
  role: string;
  connected?: boolean;
  level?: number;
  muted?: boolean;
  solo?: boolean;
  volume?: number;
};

export type EvidenceItem = {
  id: string;
  title: string;
  description: string;
  x: number;
  y: number;
};

export type EvidenceLink = {
  fromId: string;
  toId: string;
};

export type Caption = {
  id: string;
  agentId: string;
  text: string;
  createdAt: number;
};

export type SfxEvent = {
  id: string;
  name: 'GUNSHOT';
};

export type BackendEvent =
  | { type: 'SCENE_SET'; scene: SceneId }
  | { type: 'AGENT_SPEAKING'; agentId: string; text?: string; level?: number }
  | { type: 'CAPTION'; agentId: string; text: string }
  | { type: 'EVIDENCE_ADD'; id: string; title: string; description: string; x?: number; y?: number }
  | { type: 'LINK_EVIDENCE'; fromId: string; toId: string }
  | { type: 'SFX_GUNSHOT' }
  | { type: 'AMBIENCE_SET'; track: 'RAIN' | 'CLOCK' | 'ALLEY' | 'LAIR_DRONE' };

export type EventSourceMode = 'backend' | 'mock';
