import { useDirectorStore } from '../state/directorStore';

const SettingsPanel = () => {
  const volumes = useDirectorStore((s) => s.volumes);
  const setVolume = useDirectorStore((s) => s.setVolume);
  const reducedMotion = useDirectorStore((s) => s.reducedMotion);
  const setReducedMotion = useDirectorStore((s) => s.setReducedMotion);
  const subtitlesEnabled = useDirectorStore((s) => s.subtitlesEnabled);
  const setSubtitlesEnabled = useDirectorStore((s) => s.setSubtitlesEnabled);

  return (
    <div className="rounded-lg border border-brass/20 bg-black/60 p-4 text-xs text-parchment backdrop-blur">
      <div className="mb-3 text-xs uppercase tracking-[0.3em] text-brass">Settings</div>
      <div className="space-y-3">
        <div>
          <div className="mb-1 text-[10px] uppercase tracking-[0.2em] text-fog">Agent Volume</div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volumes.agents}
            onChange={(event) => setVolume('agents', Number(event.target.value))}
          />
        </div>
        <div>
          <div className="mb-1 text-[10px] uppercase tracking-[0.2em] text-fog">Ambience Volume</div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volumes.ambience}
            onChange={(event) => setVolume('ambience', Number(event.target.value))}
          />
        </div>
        <div>
          <div className="mb-1 text-[10px] uppercase tracking-[0.2em] text-fog">SFX Volume</div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volumes.sfx}
            onChange={(event) => setVolume('sfx', Number(event.target.value))}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-[0.2em] text-fog">Subtitles</span>
          <button
            className="rounded-full border border-brass px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-brass"
            onClick={() => setSubtitlesEnabled(!subtitlesEnabled)}
          >
            {subtitlesEnabled ? 'On' : 'Off'}
          </button>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-[0.2em] text-fog">Reduced Motion</span>
          <button
            className="rounded-full border border-brass px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-brass"
            onClick={() => setReducedMotion(!reducedMotion)}
          >
            {reducedMotion ? 'On' : 'Off'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
