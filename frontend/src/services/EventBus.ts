import { BackendEvent, EventSourceMode } from '../types';

export type EventHandler = (event: BackendEvent) => void;

type EventBusOptions = {
  mode: EventSourceMode;
  onEvent: EventHandler;
  roomName?: string;
};

export class EventBus {
  private mode: EventSourceMode;
  private onEvent: EventHandler;
  private roomName?: string;
  private source?: EventSource;
  private mockTimer?: number;
  private mockTimeouts: number[] = [];
  private mockRemaining = 0;
  private mockDecisionMade = false;

  constructor(options: EventBusOptions) {
    this.mode = options.mode;
    this.onEvent = options.onEvent;
    this.roomName = options.roomName;
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
    this.mockTimeouts.forEach((timeout) => window.clearTimeout(timeout));
    this.mockTimeouts = [];
  }

  setMode(mode: EventSourceMode) {
    if (this.mode === mode) return;
    this.stop();
    this.mode = mode;
    this.start();
  }

  markDecisionMade() {
    this.mockDecisionMade = true;
  }

  stopMockTimer() {
    if (this.mockTimer) {
      window.clearInterval(this.mockTimer);
      this.mockTimer = undefined;
    }
    this.mockRemaining = 0;
  }

  private connectSSE() {
    if (!this.roomName) return;
    const roomParam = encodeURIComponent(this.roomName);
    this.source = new EventSource(`/api/case/events?room=${roomParam}`);
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
    this.mockDecisionMade = false;
    this.onEvent({ type: 'SCENE_SET', scene: 'STUDY_NOIR' });
    this.onEvent({ type: 'AMBIENCE_SET', track: 'RAIN' });

    const emitCaption = (agentId: string, text: string) => {
      this.onEvent({ type: 'AGENT_SPEAKING', agentId, level: 0.3 });
      this.onEvent({ type: 'AGENT_SPEAKING', agentId, level: 0.7 });
      this.onEvent({ type: 'CAPTION', agentId, text });
      this.onEvent({ type: 'AGENT_SPEAKING', agentId, level: 0.1 });
    };

    this.schedule(2000, () => {
      emitCaption('moriarty', 'Evening, Sherlock. I have two small lives on loan.');
      emitCaption('watson', 'Tell us where they are.');
    });
    this.schedule(7000, () => {
      emitCaption('moriarty', 'They are eating chocolates. Sweet, but not safe.');
    });
    this.schedule(10000, () => {
      emitCaption('moriarty', 'Find them before the clock bites, or the papers will do the rest.');
    });

    this.schedule(15000, () => {
      this.onEvent({ type: 'SFX_TELEGRAM' });
      this.onEvent({
        type: 'EVIDENCE_ADD',
        id: 'clue_a',
        title: 'Clue A - Citrus Air Freshener',
        description: 'Harsh and cheap. Someone is masking stale air.',
        x: 18,
        y: 28,
      });
      this.onEvent({
        type: 'EVIDENCE_ADD',
        id: 'clue_b',
        title: 'Clue B - Cathedral Bell',
        description: 'A bell noted at midnight. Too theatrical?',
        x: 48,
        y: 20,
      });
      this.onEvent({
        type: 'EVIDENCE_ADD',
        id: 'clue_c',
        title: 'Clue C - Violin Case',
        description: 'Placed to bait your ego.',
        x: 70,
        y: 34,
      });
      this.onEvent({ type: 'LINK_EVIDENCE', fromId: 'clue_a', toId: 'clue_c' });
    });

    this.schedule(18000, () => {
      emitCaption('moriarty', 'Three clues. One true, one bait, one tailored to your vanity.');
    });

    this.schedule(20000, () => {
      this.startMockTimer(240);
      this.onEvent({ type: 'SFX_HEARTBEAT' });
      this.onEvent({ type: 'AMBIENCE_SET', track: 'CLOCK' });
    });
    this.schedule(22000, () => {
      emitCaption('watson', 'This is not a game.');
    });
    this.schedule(24000, () => {
      emitCaption('moriarty', 'Everything is a game. You simply arrived late.');
    });
    this.schedule(28000, () => {
      emitCaption('moriarty', 'While you think, they take small bites. Brave, obedient.');
    });

    this.schedule(35000, () => {
      if (this.mockDecisionMade) return;
      emitCaption('moriarty', 'While you hesitate, they keep nibbling. Brave little things.');
      this.applyMockPenalty(15);
    });
  }

  private schedule(delayMs: number, action: () => void) {
    const timeout = window.setTimeout(action, delayMs);
    this.mockTimeouts.push(timeout);
  }

  private startMockTimer(seconds: number) {
    this.mockRemaining = seconds;
    this.onEvent({ type: 'TIMER_START', seconds });
    if (this.mockTimer) window.clearInterval(this.mockTimer);
    this.mockTimer = window.setInterval(() => {
      this.mockRemaining = Math.max(0, this.mockRemaining - 1);
      this.onEvent({ type: 'TIMER_TICK', seconds: this.mockRemaining });
      if (this.mockRemaining <= 0) {
        if (this.mockTimer) window.clearInterval(this.mockTimer);
        this.mockTimer = undefined;
        this.onEvent({ type: 'RESCUE_FAIL' });
        this.onEvent({ type: 'SFX_CALL_DROP' });
      }
    }, 1000);
  }

  private applyMockPenalty(seconds: number) {
    this.mockRemaining = Math.max(0, this.mockRemaining - seconds);
    this.onEvent({ type: 'TIMER_PENALTY', seconds });
    this.onEvent({ type: 'TIMER_TICK', seconds: this.mockRemaining });
  }
}
