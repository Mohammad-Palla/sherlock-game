import { BackendEvent, Caption, EvidenceItem, SceneId } from '../types';
import { DirectorState } from './types';
import { clamp01, randomId } from '../utils/math';

export const applyBackendEvent = (state: DirectorState, event: BackendEvent): DirectorState => {
  switch (event.type) {
    case 'SCENE_SET':
      return {
        ...state,
        currentScene: event.scene as SceneId,
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
    case 'AMBIENCE_SET':
      return {
        ...state,
        ambience: event.track,
      };
    default:
      return state;
  }
};
