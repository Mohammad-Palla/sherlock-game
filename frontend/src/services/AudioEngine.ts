import { clamp01 } from '../utils/math';

export type AudioLevelsCallback = (agentId: string, level: number) => void;

const AMBIENCE_FILES: Record<string, string> = {
  RAIN: '/assets/audio/ambience_rain.mp3',
  CLOCK: '/assets/audio/ambience_clock.mp3',
  ALLEY: '/assets/audio/ambience_alley.mp3',
  LAIR_DRONE: '/assets/audio/ambience_lair.mp3',
};

const SFX_FILES: Record<string, string> = {
  GUNSHOT: '/assets/audio/sfx_gunshot.mp3',
  TELEGRAM: '/assets/audio/sfx_gunshot.mp3',
  HEARTBEAT: '/assets/audio/sfx_gunshot.mp3',
  SIREN: '/assets/audio/sfx_gunshot.mp3',
  CALL_DROP: '/assets/audio/sfx_gunshot.mp3',
  FOOTSTEPS: '/assets/audio/sfx_gunshot.mp3',
  DOOR_RATTLE: '/assets/audio/sfx_gunshot.mp3',
};

export class AudioEngine {
  private audioContext?: AudioContext;
  private ambienceAudio = new Audio();
  private ambienceGain?: GainNode;
  private started = false;
  private pendingAmbience?: keyof typeof AMBIENCE_FILES;
  private audioAvailability = new Map<string, boolean>();
  private agentElements = new Map<string, HTMLAudioElement>();
  private agentAnalyser = new Map<string, AnalyserNode>();
  private agentGain = new Map<string, GainNode>();
  private rafId?: number;
  private onLevels?: AudioLevelsCallback;
  private globalAgentVolume = 0.9;
  private ambienceVolume = 0.6;
  private sfxVolume = 0.8;
  private soloAgentId?: string;
  private mutedAgents = new Set<string>();

  constructor(onLevels?: AudioLevelsCallback) {
    this.onLevels = onLevels;
    this.ambienceAudio.loop = true;
  }

  attachRoom(_room: unknown) {
    // LiveKit client removed; remote audio tracks are not attached on the frontend.
  }

  async start() {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
      this.ambienceGain = this.audioContext.createGain();
      const ambienceSource = this.audioContext.createMediaElementSource(this.ambienceAudio);
      ambienceSource.connect(this.ambienceGain).connect(this.audioContext.destination);
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    this.started = true;
    if (this.pendingAmbience) {
      void this.loadAmbience(this.pendingAmbience);
      this.pendingAmbience = undefined;
    }
    this.startLevelMonitoring();
  }

  stop() {
    if (this.rafId) window.cancelAnimationFrame(this.rafId);
    this.rafId = undefined;
    this.agentElements.forEach((element) => element.pause());
    this.ambienceAudio.pause();
    this.started = false;
  }

  setAmbience(track: keyof typeof AMBIENCE_FILES) {
    if (!this.started) {
      this.pendingAmbience = track;
      return;
    }
    void this.loadAmbience(track);
  }

  playSfx(name: keyof typeof SFX_FILES) {
    if (!this.started) return;
    const src = SFX_FILES[name];
    if (!src) return;
    void this.playSafe(src, this.sfxVolume);
  }

  setVolumes(agents: number, ambience: number, sfx: number) {
    this.globalAgentVolume = clamp01(agents);
    this.ambienceVolume = clamp01(ambience);
    this.sfxVolume = clamp01(sfx);
    if (this.ambienceGain) {
      this.ambienceGain.gain.value = this.ambienceVolume;
    }
    this.agentElements.forEach((element, id) => {
      element.volume = this.computeAgentVolume(id);
    });
  }

  setAgentMuted(agentId: string, muted: boolean) {
    if (muted) this.mutedAgents.add(agentId);
    else this.mutedAgents.delete(agentId);
    const element = this.agentElements.get(agentId);
    if (element) element.volume = this.computeAgentVolume(agentId);
  }

  setSoloAgent(agentId?: string) {
    this.soloAgentId = agentId;
    this.agentElements.forEach((element, id) => {
      element.volume = this.computeAgentVolume(id);
    });
  }

  setAgentGain(agentId: string, value: number) {
    const gainNode = this.agentGain.get(agentId);
    if (gainNode) gainNode.gain.value = clamp01(value);
  }

  private async canPlay(src: string) {
    if (this.audioAvailability.has(src)) {
      return this.audioAvailability.get(src) ?? false;
    }
    try {
      const response = await fetch(src, { method: 'HEAD' });
      const length = response.headers.get('content-length');
      const available = response.ok && (length === null || Number(length) > 0);
      this.audioAvailability.set(src, available);
      return available;
    } catch {
      this.audioAvailability.set(src, false);
      return false;
    }
  }

  private async loadAmbience(track: keyof typeof AMBIENCE_FILES) {
    const src = AMBIENCE_FILES[track];
    if (!src) return;
    if (!(await this.canPlay(src))) return;
    if (this.ambienceAudio.src !== src) {
      this.ambienceAudio.src = src;
    }
    this.ambienceAudio.play().catch(() => undefined);
  }

  private async playSafe(src: string, volume: number) {
    if (!(await this.canPlay(src))) return;
    const audio = new Audio(src);
    audio.volume = volume;
    audio.play().catch(() => undefined);
  }

  private computeAgentVolume(agentId: string) {
    if (this.soloAgentId && this.soloAgentId !== agentId) return 0;
    if (this.mutedAgents.has(agentId)) return 0;
    return this.globalAgentVolume;
  }

  private startLevelMonitoring() {
    const data = new Uint8Array(256);
    const loop = () => {
      this.agentAnalyser.forEach((analyser, id) => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i += 1) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / data.length);
        this.onLevels?.(id, clamp01(rms * 2));
      });
      this.rafId = window.requestAnimationFrame(loop);
    };
    loop();
  }
}
