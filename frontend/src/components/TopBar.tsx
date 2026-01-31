import ConnectionStatus from './ConnectionStatus';
import { useDirectorStore } from '../state/directorStore';

const TopBar = () => {
  const agents = useDirectorStore((s) =>
    Object.values(s.agents).filter((agent) => agent.id && agent.name)
  );
  const playerName = useDirectorStore((s) => s.playerName);

  return (
    <div className="flex items-center justify-between border-b border-brass/20 bg-black/50 px-6 py-3 backdrop-blur">
      <div className="font-serif text-lg uppercase tracking-[0.4em] text-brass">Case Control</div>
      <ConnectionStatus />
      <div className="flex items-center gap-2">
        {playerName ? (
          <div className="flex items-center gap-2 text-xs text-brass/80">
            <span className="h-2 w-2 rounded-full bg-brass/60" />
            <span className="uppercase tracking-[0.2em]">You: {playerName.split(' ')[0]}</span>
          </div>
        ) : null}
        {agents.slice(0, 4).map((agent) => (
          <div key={agent.id} className="flex items-center gap-2 text-xs text-parchment">
            <span className={`h-2 w-2 rounded-full ${agent.level && agent.level > 0.12 ? 'bg-emerald-400' : 'bg-fog/40'}`} />
            <span className="uppercase tracking-[0.2em]">{agent.name?.split(' ')[0] ?? 'Agent'}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TopBar;
