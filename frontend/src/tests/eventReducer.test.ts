import { describe, expect, it } from 'vitest';
import { applyBackendEvent } from '../state/eventReducer';
import { DirectorState } from '../state/types';

const baseState: DirectorState = {
  currentScene: 'BOOT',
  agents: { watson: { id: 'watson', name: 'Dr. Watson', role: 'Companion', level: 0 } },
  evidence: [],
  links: [],
  captions: [],
  ambience: 'RAIN',
  sfxQueue: [],
  connectionStatus: 'disconnected',
  roomName: undefined,
  playerName: 'Sherlock Holmes',
  latencyMs: undefined,
  timer: undefined,
  caseOutcome: undefined,
  locationLabel: undefined,
  selectedClue: undefined,
  deduction: undefined,
  misdirected: false,
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
    const next = applyBackendEvent(baseState, { type: 'CAPTION', agentId: 'watson', text: 'Observe.' });
    expect(next.captions).toHaveLength(1);
  });

  it('starts timer', () => {
    const next = applyBackendEvent(baseState, { type: 'TIMER_START', seconds: 120 });
    expect(next.timer?.remainingSeconds).toBe(120);
  });

  it('marks misdirect', () => {
    const next = applyBackendEvent(baseState, { type: 'MISDIRECT' });
    expect(next.misdirected).toBe(true);
  });
});
