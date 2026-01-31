import { useDirectorStore } from '../state/directorStore';

const ConnectionStatus = () => {
  const status = useDirectorStore((s) => s.connectionStatus);
  const roomName = useDirectorStore((s) => s.roomName);
  const latency = useDirectorStore((s) => s.latencyMs);

  return (
    <div className="flex items-center gap-3 text-xs uppercase tracking-[0.25em]">
      <span
        className={`h-2 w-2 rounded-full ${
          status === 'connected' ? 'bg-emerald-400' : status === 'connecting' ? 'bg-brass' : 'bg-burgundy'
        }`}
      />
      <span className="text-fog">{status}</span>
      {roomName ? <span className="text-brass">{roomName}</span> : null}
      {latency ? <span className="text-fog">{latency}ms</span> : <span className="text-fog">Latency --</span>}
    </div>
  );
};

export default ConnectionStatus;
