import { BackendEvent, Caption, EvidenceItem, SceneId } from '../types';
import { DirectorState } from './types';
import { clamp01, randomId } from '../utils/math';

export const applyBackendEvent = (state: DirectorState, event: BackendEvent): DirectorState => {
  switch (event.type) {
    case 'SCENE_SET':
      return {
        ...state,
        currentScene: event.scene as SceneId,
        ...(event.scene === 'STUDY_NOIR'
          ? {
              evidence: [],
              links: [],
              captions: [],
              locationLabel: undefined,
              caseOutcome: undefined,
              selectedClue: undefined,
              deduction: undefined,
              timer: undefined,
              misdirected: false,
            }
          : {}),
      };
    case 'AGENT_SPEAKING': {
      const agent = state.agents[event.agentId];
      if (!agent) return state;
      return {
        ...state,
        agents: {
          ...state.agents,
          [event.agentId]: {
            ...agent,
            level: clamp01(event.level ?? agent.level ?? 0),
          },
        },
      };
    }
    case 'CAPTION': {
      const caption: Caption = {
        id: randomId('cap'),
        agentId: event.agentId,
        text: event.text,
        createdAt: Date.now(),
      };
      return {
        ...state,
        captions: [...state.captions.slice(-4), caption],
      };
    }
    case 'EVIDENCE_ADD': {
      const exists = state.evidence.find((item) => item.id === event.id);
      if (exists) return state;
      const evidence: EvidenceItem = {
        id: event.id,
        title: event.title,
        description: event.description,
        x: event.x ?? Math.random() * 70 + 15,
        y: event.y ?? Math.random() * 55 + 15,
      };
      return {
        ...state,
        evidence: [...state.evidence, evidence],
      };
    }
    case 'LINK_EVIDENCE':
      return {
        ...state,
        links: [...state.links, { fromId: event.fromId, toId: event.toId }],
      };
    case 'SFX_GUNSHOT':
      return {
        ...state,
        sfxQueue: [...state.sfxQueue, { id: randomId('sfx'), name: 'GUNSHOT' }],
        flash: true,
      };
    case 'SFX_TELEGRAM':
      return {
        ...state,
        sfxQueue: [...state.sfxQueue, { id: randomId('sfx'), name: 'TELEGRAM' }],
      };
    case 'SFX_HEARTBEAT':
      return {
        ...state,
        sfxQueue: [...state.sfxQueue, { id: randomId('sfx'), name: 'HEARTBEAT' }],
      };
    case 'SFX_SIREN':
      return {
        ...state,
        sfxQueue: [...state.sfxQueue, { id: randomId('sfx'), name: 'SIREN' }],
      };
    case 'SFX_CALL_DROP':
      return {
        ...state,
        sfxQueue: [...state.sfxQueue, { id: randomId('sfx'), name: 'CALL_DROP' }],
      };
    case 'SFX_FOOTSTEPS':
      return {
        ...state,
        sfxQueue: [...state.sfxQueue, { id: randomId('sfx'), name: 'FOOTSTEPS' }],
      };
    case 'SFX_DOOR_RATTLE':
      return {
        ...state,
        sfxQueue: [...state.sfxQueue, { id: randomId('sfx'), name: 'DOOR_RATTLE' }],
      };
    case 'TIMER_START':
      return {
        ...state,
        timer: {
          totalSeconds: event.seconds,
          remainingSeconds: event.seconds,
          running: true,
        },
        caseOutcome: undefined,
      };
    case 'TIMER_TICK':
      if (!state.timer) return state;
      return {
        ...state,
        timer: {
          ...state.timer,
          remainingSeconds: event.seconds,
          running: event.seconds > 0,
        },
      };
    case 'TIMER_PENALTY': {
      if (!state.timer) return state;
      const nextRemaining = Math.max(0, state.timer.remainingSeconds - event.seconds);
      return {
        ...state,
        timer: {
          ...state.timer,
          remainingSeconds: nextRemaining,
          running: nextRemaining > 0,
        },
      };
    }
    case 'LOCATION_CONFIRMED':
      return {
        ...state,
        locationLabel: event.label,
      };
    case 'RESCUE_SUCCESS':
      return {
        ...state,
        caseOutcome: 'SUCCESS',
        timer: state.timer ? { ...state.timer, running: false } : state.timer,
      };
    case 'RESCUE_FAIL':
      return {
        ...state,
        caseOutcome: 'FAIL',
        timer: state.timer ? { ...state.timer, running: false } : state.timer,
      };
    case 'MISDIRECT':
      return {
        ...state,
        misdirected: true,
      };
    case 'AMBIENCE_SET':
      return {
        ...state,
        ambience: event.track,
      };
    default:
      return state;
  }
};
