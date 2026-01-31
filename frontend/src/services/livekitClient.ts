import { Room, RoomEvent } from 'livekit-client';

export type LiveKitConnection = {
  room: Room;
};

export const connectLiveKit = async (url: string, token: string) => {
  const room = new Room({
    adaptiveStream: true,
    dynacast: true,
  });
  await room.connect(url, token);
  return room;
};

export const monitorLatency = (room: Room, onLatency: (value: number) => void) => {
  const handler = () => {
    const stats = room.engine?.getRTCStats?.();
    const latency = stats ? stats.maxRoundTripTime : undefined;
    if (latency) onLatency(Math.round(latency * 1000));
  };
  const interval = window.setInterval(handler, 2000);
  const cleanup = () => window.clearInterval(interval);
  room.on(RoomEvent.Disconnected, cleanup);
  return cleanup;
};
