export type SceneId =
  | 'BOOT'
  | 'CRIME_SCENE'
  | 'STUDY'
  | 'LAIR'
  | 'STUDY_NOIR'
  | 'STREET_BAIT'
  | 'UNDERPASS';

export type ClueChoice = 'A' | 'B' | 'C';

export type DeductionGuess = 'RIVER_UNDERPASS' | 'CATHEDRAL' | 'OTHER';

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
  name:
    | 'GUNSHOT'
    | 'TELEGRAM'
    | 'HEARTBEAT'
    | 'SIREN'
    | 'CALL_DROP'
    | 'FOOTSTEPS'
    | 'DOOR_RATTLE';
};

export type BackendEvent =
  | { type: 'SCENE_SET'; scene: SceneId }
  | { type: 'AGENT_SPEAKING'; agentId: string; text?: string; level?: number }
  | { type: 'CAPTION'; agentId: string; text: string }
  | { type: 'EVIDENCE_ADD'; id: string; title: string; description: string; x?: number; y?: number }
  | { type: 'LINK_EVIDENCE'; fromId: string; toId: string }
  | { type: 'SFX_GUNSHOT' }
  | { type: 'SFX_TELEGRAM' }
  | { type: 'SFX_HEARTBEAT' }
  | { type: 'SFX_SIREN' }
  | { type: 'SFX_CALL_DROP' }
  | { type: 'SFX_FOOTSTEPS' }
  | { type: 'SFX_DOOR_RATTLE' }
  | { type: 'TIMER_START'; seconds: number }
  | { type: 'TIMER_TICK'; seconds: number }
  | { type: 'TIMER_PENALTY'; seconds: number }
  | { type: 'LOCATION_CONFIRMED'; label: string; coordinates?: string }
  | { type: 'RESCUE_SUCCESS' }
  | { type: 'RESCUE_FAIL' }
  | { type: 'MISDIRECT' }
  | { type: 'AMBIENCE_SET'; track: 'RAIN' | 'CLOCK' | 'ALLEY' | 'LAIR_DRONE' };

export type EventSourceMode = 'backend' | 'mock';
