import { BackendEvent, EventSourceMode, SceneId } from '../types';
import { randomId } from '../utils/math';

export type EventHandler = (event: BackendEvent) => void;

type EventBusOptions = {
  mode: EventSourceMode;
  onEvent: EventHandler;
};

export class EventBus {
  private mode: EventSourceMode;
  private onEvent: EventHandler;
  private source?: EventSource;
  private mockTimer?: number;

  constructor(options: EventBusOptions) {
    this.mode = options.mode;
    this.onEvent = options.onEvent;
  }

  start() {
    if (this.mode === 'backend') {
      this.connectSSE();
    } else {
      this.startMock();
    }
  }

  stop() {
    if (this.source) {
      this.source.close();
      this.source = undefined;
    }
    if (this.mockTimer) {
      window.clearInterval(this.mockTimer);
      this.mockTimer = undefined;
    }
  }

  setMode(mode: EventSourceMode) {
    if (this.mode === mode) return;
    this.stop();
    this.mode = mode;
    this.start();
  }

  private connectSSE() {
    this.source = new EventSource('/api/events');
    this.source.onmessage = (message) => {
      try {
        const data = JSON.parse(message.data) as BackendEvent;
        this.onEvent(data);
      } catch {
        // ignore malformed events
      }
    };
  }

  private startMock() {
    const scenes: SceneId[] = ['CRIME_SCENE', 'STUDY', 'LAIR'];
    const ambienceTracks = ['RAIN', 'CLOCK', 'ALLEY', 'LAIR_DRONE'] as const;

    this.onEvent({
      type: 'EVIDENCE_ADD',
      id: 'ev_alpha',
      title: 'Ash-stained Glove',
      description: 'Smells of coal smoke and varnish.',
    });
    this.onEvent({
      type: 'EVIDENCE_ADD',
      id: 'ev_beta',
      title: 'Telegram Fragment',
      description: 'Half a message, ink still damp.',
    });

    this.mockTimer = window.setInterval(() => {
      const roll = Math.random();
      if (roll < 0.2) {
        this.onEvent({ type: 'SCENE_SET', scene: scenes[Math.floor(Math.random() * scenes.length)] });
        return;
      }
      if (roll < 0.4) {
        this.onEvent({
          type: 'EVIDENCE_ADD',
          id: randomId('ev'),
          title: 'Ciphered Note',
          description: 'A hastily folded telegram with erased ink.',
        });
        return;
      }
      if (roll < 0.6) {
        this.onEvent({ type: 'LINK_EVIDENCE', fromId: 'ev_alpha', toId: 'ev_beta' });
        return;
      }
      if (roll < 0.7) {
        this.onEvent({ type: 'SFX_GUNSHOT' });
        return;
      }
      if (roll < 0.85) {
        this.onEvent({
          type: 'CAPTION',
          agentId: 'sherlock',
          text: 'Notice the tread pattern. Our culprit favors the damp alleys.',
        });
        return;
      }
      this.onEvent({
        type: 'AMBIENCE_SET',
        track: ambienceTracks[Math.floor(Math.random() * ambienceTracks.length)],
      });
    }, 4200);
  }
}
