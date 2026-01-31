import { AgentInfo, ClueChoice, DeductionGuess } from '../types';

export type JoinResponse = {
  token: string;
  url: string;
  roomName: string;
  identity: string;
  agents: AgentInfo[];
};

type JoinRequest = {
  room_name?: string;
  participant_name?: string;
  metadata?: Record<string, unknown>;
};

const defaultJoinPayload: JoinRequest = {
  participant_name: 'Sherlock Holmes',
  metadata: {
    crime_type: 'contaminated chocolates abduction',
    complexity: 'high',
    user_role: 'Sherlock',
    bg_volume: 0.1,
  },
};

export const joinLiveKit = async (payload: JoinRequest = defaultJoinPayload): Promise<JoinResponse> => {
  const response = await fetch('/api/livekit/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error('Failed to join LiveKit');
  }
  return (await response.json()) as JoinResponse;
};

export type CaseActionRequest =
  | { room: string; action: 'CHOOSE_CLUE'; choice: ClueChoice }
  | { room: string; action: 'DEDUCTION'; guess: DeductionGuess }
  | { room: string; action: 'REQUEST_WATSON_HINT' };

export const startCase = async (room: string) => {
  const response = await fetch('/api/case/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ room }),
  });
  if (!response.ok) {
    throw new Error('Failed to start case');
  }
};

export const sendCaseAction = async (payload: CaseActionRequest) => {
  const response = await fetch('/api/case/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error('Failed to send case action');
  }
};

export const mockJoinResponse = (): JoinResponse => ({
  token: 'mock-token',
  url: 'wss://mock.livekit.server',
  roomName: 'Mock Room',
  identity: 'sherlock',
  agents: [
    { id: 'watson', name: 'Dr. Watson', role: 'Companion' },
    { id: 'moriarty', name: 'Professor Moriarty', role: 'Antagonist' },
  ],
});
