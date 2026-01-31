import { AgentInfo } from '../types';

export type JoinResponse = {
  token: string;
  url: string;
  roomName: string;
  identity: string;
  agents: AgentInfo[];
};

export const joinLiveKit = async (): Promise<JoinResponse> => {
  const response = await fetch('/api/livekit/join', { method: 'POST' });
  if (!response.ok) {
    throw new Error('Failed to join LiveKit');
  }
  return (await response.json()) as JoinResponse;
};

export const mockJoinResponse = (): JoinResponse => ({
  token: 'mock-token',
  url: 'wss://mock.livekit.server',
  roomName: 'Mock Room',
  identity: 'detective-ui',
  agents: [
    { id: 'sherlock', name: 'Sherlock Holmes', role: 'Detective' },
    { id: 'watson', name: 'Dr. Watson', role: 'Companion' },
    { id: 'moriarty', name: 'Professor Moriarty', role: 'Antagonist' },
  ],
});
