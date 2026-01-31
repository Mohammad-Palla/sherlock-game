import { AgentInfo, Caption, ClueChoice, DeductionGuess, EvidenceItem, EvidenceLink, SceneId } from '../types';

export type DirectorState = {
  currentScene: SceneId;
  agents: Record<string, AgentInfo>;
  evidence: EvidenceItem[];
  links: EvidenceLink[];
  captions: Caption[];
  ambience: 'RAIN' | 'CLOCK' | 'ALLEY' | 'LAIR_DRONE';
  sfxQueue: {
    id: string;
    name:
      | 'GUNSHOT'
      | 'TELEGRAM'
      | 'HEARTBEAT'
      | 'SIREN'
      | 'CALL_DROP'
      | 'FOOTSTEPS'
      | 'DOOR_RATTLE';
  }[];
  connectionStatus: 'disconnected' | 'connecting' | 'connected';
  roomName?: string;
  playerName?: string;
  latencyMs?: number;
  timer?: {
    totalSeconds: number;
    remainingSeconds: number;
    running: boolean;
  };
  caseOutcome?: 'SUCCESS' | 'FAIL';
  locationLabel?: string;
  selectedClue?: ClueChoice;
  deduction?: DeductionGuess;
  misdirected: boolean;
  reducedMotion: boolean;
  subtitlesEnabled: boolean;
  volumes: {
    agents: number;
    ambience: number;
    sfx: number;
  };
  flash: boolean;
};
