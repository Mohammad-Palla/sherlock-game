import type { RemoteAudioTrack, RemoteParticipant, Room } from 'livekit-client';
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
};

export class AudioEngine {
  private audioContext?: AudioContext;
  private ambienceAudio = new Audio();
  private ambienceGain?: GainNode;
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

  attachRoom(room: Room) {
    room.on('trackSubscribed', (track, _publication, participant) => {
      if (track.kind !== 'audio') return;
      this.attachRemoteTrack(track as RemoteAudioTrack, participant);
    });
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
    this.startLevelMonitoring();
  }

  stop() {
    if (this.rafId) window.cancelAnimationFrame(this.rafId);
    this.rafId = undefined;
    this.agentElements.forEach((element) => element.pause());
    this.ambienceAudio.pause();
  }

  setAmbience(track: keyof typeof AMBIENCE_FILES) {
    const src = AMBIENCE_FILES[track];
    if (src && this.ambienceAudio.src !== src) {
      this.ambienceAudio.src = src;
      this.ambienceAudio.play().catch(() => undefined);
    }
  }

  playSfx(name: keyof typeof SFX_FILES) {
    const audio = new Audio(SFX_FILES[name]);
    audio.volume = this.sfxVolume;
    audio.play().catch(() => undefined);
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

  private computeAgentVolume(agentId: string) {
    if (this.soloAgentId && this.soloAgentId !== agentId) return 0;
    if (this.mutedAgents.has(agentId)) return 0;
    return this.globalAgentVolume;
  }

  private attachRemoteTrack(track: RemoteAudioTrack, participant: RemoteParticipant) {
    if (!this.audioContext) return;
    const agentId = participant.identity || participant.sid;
    if (this.agentElements.has(agentId)) return;

    const element = document.createElement('audio');
    element.autoplay = true;
    element.playsInline = true;
    element.style.display = 'none';
    element.srcObject = new MediaStream([track.mediaStreamTrack]);
    element.volume = this.computeAgentVolume(agentId);
    document.body.appendChild(element);

    const source = this.audioContext.createMediaElementSource(element);
    const gainNode = this.audioContext.createGain();
    source.connect(gainNode).connect(this.audioContext.destination);
    const analyser = this.audioContext.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);

    this.agentElements.set(agentId, element);
    this.agentAnalyser.set(agentId, analyser);
    this.agentGain.set(agentId, gainNode);
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
