import { useDirectorStore } from '../state/directorStore';
import { clamp01 } from '../utils/math';

const AgentPanel = () => {
  const agents = useDirectorStore((s) =>
    Object.values(s.agents).filter((agent) => agent.id && agent.name)
  );
  const updateAgent = useDirectorStore((s) => s.updateAgent);
  const playerName = useDirectorStore((s) => s.playerName);

  return (
    <div className="flex h-full w-72 flex-col gap-4 border-l border-brass/20 bg-black/40 p-4 backdrop-blur">
      <div className="text-xs uppercase tracking-[0.3em] text-brass">Agents</div>
      <div className="flex flex-col gap-3 overflow-y-auto pr-2">
        {playerName ? (
          <div className="rounded-md border border-brass/10 bg-black/30 p-3">
            <div className="text-[10px] uppercase tracking-[0.2em] text-fog">You</div>
            <div className="font-serif text-sm text-parchment">{playerName}</div>
          </div>
        ) : null}
        {agents.length === 0 ? (
          <div className="text-xs text-fog">Awaiting agents...</div>
        ) : null}
        {agents.map((agent) => (
          <div key={agent.id} className="rounded-md border border-brass/10 bg-charcoal/60 p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-serif text-sm text-parchment">{agent.name}</div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-fog">{agent.role}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.2em] ${
                    agent.muted ? 'border-burgundy text-burgundy' : 'border-brass text-brass'
                  }`}
                  onClick={() => updateAgent(agent.id, { muted: !agent.muted })}
                >
                  Mute
                </button>
                <button
                  className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.2em] ${
                    agent.solo ? 'border-emerald-400 text-emerald-300' : 'border-brass text-brass'
                  }`}
                  onClick={() => updateAgent(agent.id, { solo: !agent.solo })}
                >
                  Solo
                </button>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-fog">
              <span>Level</span>
              <div className="h-2 flex-1 rounded-full bg-black/50">
                <div
                  className="h-2 rounded-full bg-emerald-400"
                  style={{ width: `${clamp01(agent.level ?? 0) * 100}%` }}
                />
              </div>
            </div>
            <div className="mt-3">
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={agent.volume ?? 1}
                onChange={(event) => updateAgent(agent.id, { volume: Number(event.target.value) })}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AgentPanel;
