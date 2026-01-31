import { describe, expect, it } from 'vitest';
import { applyBackendEvent } from '../state/eventReducer';
import { DirectorState } from '../state/types';

const baseState: DirectorState = {
  currentScene: 'BOOT',
  agents: { sherlock: { id: 'sherlock', name: 'Sherlock', role: 'Detective', level: 0 } },
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
    agents: 1,
    ambience: 0.5,
    sfx: 0.7,
  },
  flash: false,
};

describe('applyBackendEvent', () => {
  it('sets scene', () => {
    const next = applyBackendEvent(baseState, { type: 'SCENE_SET', scene: 'STUDY' });
    expect(next.currentScene).toBe('STUDY');
  });

  it('adds evidence', () => {
    const next = applyBackendEvent(baseState, {
      type: 'EVIDENCE_ADD',
      id: 'ev1',
      title: 'Clue',
      description: 'Something',
    });
    expect(next.evidence).toHaveLength(1);
  });

  it('adds caption', () => {
    const next = applyBackendEvent(baseState, { type: 'CAPTION', agentId: 'sherlock', text: 'Observe.' });
    expect(next.captions).toHaveLength(1);
  });
});
