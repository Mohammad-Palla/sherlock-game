import { useDirectorStore } from '../state/directorStore';
import { useToastStore } from '../state/toastStore';
import { BackendEvent, SceneId } from '../types';

const DebugOverlay = () => {
  const dispatchEvent = useDirectorStore((s) => s.dispatchEvent);
  const setScene = useDirectorStore((s) => s.setScene);
  const setEventSourceMode = useDirectorStore((s) => s.setEventSourceMode);
  const evidence = useDirectorStore((s) => s.evidence);
  const eventSourceMode = useDirectorStore((s) => s.eventSourceMode);
  const pushToast = useToastStore((s) => s.push);

  const sendEvent = (event: BackendEvent) => {
    dispatchEvent(event);
    pushToast(`Event: ${event.type}`);
  };

  const scenes: SceneId[] = ['CRIME_SCENE', 'STUDY', 'LAIR'];

  return (
    <div className="pointer-events-auto absolute bottom-6 left-6 w-72 rounded-lg border border-brass/30 bg-black/80 p-4 text-xs text-parchment backdrop-blur">
      <div className="mb-2 text-xs uppercase tracking-[0.3em] text-brass">Debug Control</div>
      <div className="flex flex-col gap-2">
        <button
          className="case-button text-xs"
          onClick={() => sendEvent({ type: 'SFX_GUNSHOT' })}
        >
          Gunshot
        </button>
        <button
          className="case-button text-xs"
          onClick={() =>
            sendEvent({
              type: 'EVIDENCE_ADD',
              id: `ev_${Math.floor(Math.random() * 1000)}`,
              title: 'Pocket Watch',
              description: 'Tarnished brass, still ticking.',
            })
          }
        >
          Add Evidence
        </button>
        <button
          className="case-button text-xs"
          onClick={() =>
            sendEvent({
              type: 'CAPTION',
              agentId: 'moriarty',
              text: 'Every clue is a thread you cannot cut.',
            })
          }
        >
          Villain Line
        </button>
        <button
          className="case-button text-xs"
          onClick={() => {
            if (evidence.length >= 2) {
              sendEvent({
                type: 'LINK_EVIDENCE',
                fromId: evidence[0].id,
                toId: evidence[1].id,
              });
            }
          }}
        >
          Link Evidence
        </button>
        <div className="flex flex-wrap gap-2">
          {scenes.map((scene) => (
            <button
              key={scene}
              className="rounded-full border border-brass px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-brass"
              onClick={() => setScene(scene)}
            >
              {scene}
            </button>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-brass/20 pt-2">
          <span className="text-[10px] uppercase tracking-[0.2em] text-fog">Event Source</span>
          <button
            className="rounded-full border border-brass px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-brass"
            onClick={() => setEventSourceMode(eventSourceMode === 'mock' ? 'backend' : 'mock')}
          >
            {eventSourceMode}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DebugOverlay;
