import { useDirectorStore } from '../state/directorStore';
import { ClueChoice, DeductionGuess } from '../types';

export type MockCaseAction =
  | { action: 'CHOOSE_CLUE'; choice: ClueChoice }
  | { action: 'DEDUCTION'; guess: DeductionGuess }
  | { action: 'REQUEST_WATSON_HINT' };

const emitCaption = (agentId: string, text: string) => {
  const dispatch = useDirectorStore.getState().dispatchEvent;
  dispatch({ type: 'AGENT_SPEAKING', agentId, level: 0.2 });
  dispatch({ type: 'AGENT_SPEAKING', agentId, level: 0.7 });
  dispatch({ type: 'CAPTION', agentId, text });
  dispatch({ type: 'AGENT_SPEAKING', agentId, level: 0.1 });
};

export const handleMockCaseAction = (payload: MockCaseAction) => {
  const dispatch = useDirectorStore.getState().dispatchEvent;
  const setSelectedClue = useDirectorStore.getState().setSelectedClue;
  const setDeduction = useDirectorStore.getState().setDeduction;

  if (payload.action === 'CHOOSE_CLUE') {
    setSelectedClue(payload.choice);
    if (payload.choice === 'A') {
      emitCaption('watson', 'Citrus suggests someone is hiding stale air in a sealed space.');
    }
    return;
  }

  if (payload.action === 'REQUEST_WATSON_HINT') {
    emitCaption('watson', "Don't chase the dramatic. Follow the practical clue: enclosed, damp, and near the river.");
    return;
  }

  if (payload.action === 'DEDUCTION') {
    setDeduction(payload.guess);
    if (payload.guess === 'RIVER_UNDERPASS') {
      dispatch({
        type: 'LOCATION_CONFIRMED',
        label: 'Riverside Service Underpass - Gate 3',
      });
      dispatch({ type: 'SCENE_SET', scene: 'UNDERPASS' });
      dispatch({ type: 'AMBIENCE_SET', track: 'ALLEY' });
      dispatch({ type: 'SFX_SIREN' });
      dispatch({ type: 'SFX_FOOTSTEPS' });
      dispatch({ type: 'SFX_DOOR_RATTLE' });
      emitCaption('watson', "I'm calling it in - medical, hazmat, all of it. Move.");
      emitCaption('moriarty', 'There you are. You do love a chase.');
      window.setTimeout(() => {
        dispatch({ type: 'RESCUE_SUCCESS' });
        emitCaption('moriarty', 'Tonight you win their breathing. Tomorrow, I take something dearer.');
        dispatch({ type: 'SFX_CALL_DROP' });
      }, 4000);
    } else {
      dispatch({ type: 'MISDIRECT' });
      dispatch({ type: 'SCENE_SET', scene: 'STREET_BAIT' });
      dispatch({ type: 'TIMER_PENALTY', seconds: 45 });
      emitCaption('moriarty', 'A bell? How predictable. You walked into the fog.');
      emitCaption('watson', "Don't chase the dramatic. Chase the practical.");
    }
  }
};
