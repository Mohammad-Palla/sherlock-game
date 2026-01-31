import { useMemo } from 'react';
import { useDirectorStore } from '../state/directorStore';
import { ClueChoice, DeductionGuess } from '../types';

export type CaseActionPayload =
  | { action: 'CHOOSE_CLUE'; choice: ClueChoice }
  | { action: 'DEDUCTION'; guess: DeductionGuess }
  | { action: 'REQUEST_WATSON_HINT' };

type CaseActionsProps = {
  onAction: (payload: CaseActionPayload) => void;
  disabled?: boolean;
};

const clueFromEvidence = (id: string, title: string): ClueChoice | null => {
  const normalized = id.toLowerCase();
  if (normalized.includes('clue_a') || title.toLowerCase().includes('clue a')) return 'A';
  if (normalized.includes('clue_b') || title.toLowerCase().includes('clue b')) return 'B';
  if (normalized.includes('clue_c') || title.toLowerCase().includes('clue c')) return 'C';
  return null;
};

const CaseActions = ({ onAction, disabled }: CaseActionsProps) => {
  const evidence = useDirectorStore((s) => s.evidence);
  const selectedClue = useDirectorStore((s) => s.selectedClue);
  const deduction = useDirectorStore((s) => s.deduction);
  const timer = useDirectorStore((s) => s.timer);

  const clueCards = useMemo(
    () =>
      evidence
        .flatMap((item) => {
        const clue = clueFromEvidence(item.id, item.title);
        return clue ? [{ ...item, clue }] : [];
      })
        .sort((a, b) => a.clue.localeCompare(b.clue)),
    [evidence]
  );

  return (
    <div className="rounded-lg border border-brass/20 bg-black/60 p-4 text-xs text-parchment backdrop-blur">
      <div className="mb-3 text-xs uppercase tracking-[0.3em] text-brass">Mercury Chocolates</div>
      <div className="space-y-3">
        <div>
          <div className="mb-2 text-[10px] uppercase tracking-[0.2em] text-fog">Clues</div>
          <div className="space-y-2">
            {clueCards.length === 0 ? (
              <div className="text-[10px] uppercase tracking-[0.2em] text-fog">Awaiting clue cards...</div>
            ) : null}
            {clueCards.map((item) => (
              <button
                key={item.id}
                className={`w-full rounded-md border px-3 py-2 text-left transition ${
                  selectedClue === item.clue ? 'border-emerald-400 text-emerald-200' : 'border-brass/20 text-parchment'
                }`}
                onClick={() => item.clue && onAction({ action: 'CHOOSE_CLUE', choice: item.clue })}
                disabled={disabled}
              >
                <div className="text-[10px] uppercase tracking-[0.25em] text-brass">Clue {item.clue}</div>
                <div className="mt-1 text-[11px] text-fog">{item.description}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 text-[10px] uppercase tracking-[0.2em] text-fog">Deduction</div>
          <div className="grid gap-2">
            <button
              className={`rounded-full border px-3 py-2 text-[10px] uppercase tracking-[0.25em] transition ${
                deduction === 'RIVER_UNDERPASS' ? 'border-emerald-400 text-emerald-200' : 'border-brass text-brass'
              }`}
              onClick={() => onAction({ action: 'DEDUCTION', guess: 'RIVER_UNDERPASS' })}
              disabled={disabled}
            >
              River Underpass
            </button>
            <button
              className={`rounded-full border px-3 py-2 text-[10px] uppercase tracking-[0.25em] transition ${
                deduction === 'CATHEDRAL' ? 'border-burgundy text-burgundy' : 'border-brass text-brass'
              }`}
              onClick={() => onAction({ action: 'DEDUCTION', guess: 'CATHEDRAL' })}
              disabled={disabled}
            >
              Cathedral Bell
            </button>
            <button
              className={`rounded-full border px-3 py-2 text-[10px] uppercase tracking-[0.25em] transition ${
                deduction === 'OTHER' ? 'border-parchment/60 text-parchment' : 'border-brass text-brass'
              }`}
              onClick={() => onAction({ action: 'DEDUCTION', guess: 'OTHER' })}
              disabled={disabled}
            >
              Other
            </button>
          </div>
        </div>

        <button
          className="w-full rounded-full border border-brass px-3 py-2 text-[10px] uppercase tracking-[0.25em] text-brass"
          onClick={() => onAction({ action: 'REQUEST_WATSON_HINT' })}
          disabled={disabled}
        >
          Request Watson Hint
        </button>

        {timer && timer.running ? (
          <div className="text-[10px] uppercase tracking-[0.2em] text-fog">Timer active</div>
        ) : null}
      </div>
    </div>
  );
};

export default CaseActions;
