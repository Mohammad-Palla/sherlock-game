const buildLiveKitWsUrl = (baseUrl: string, token: string) => {
  const wsUrl = new URL(baseUrl);
  if (wsUrl.protocol === 'http:') wsUrl.protocol = 'ws:';
  if (wsUrl.protocol === 'https:') wsUrl.protocol = 'wss:';
  if (!wsUrl.pathname || wsUrl.pathname === '/') {
    wsUrl.pathname = '/rtc';
  }
  if (!wsUrl.searchParams.has('access_token')) {
    wsUrl.searchParams.set('access_token', token);
  }
  return wsUrl.toString();
};

export const connectLiveKit = (url: string, token: string) =>
  new Promise<WebSocket>((resolve, reject) => {
    const wsUrl = buildLiveKitWsUrl(url, token);
    const socket = new WebSocket(wsUrl);
    const handleOpen = () => {
      socket.removeEventListener('error', handleError);
      resolve(socket);
    };
    const handleError = () => {
      socket.removeEventListener('open', handleOpen);
      reject(new Error('Failed to open LiveKit WebSocket'));
    };
    socket.addEventListener('open', handleOpen, { once: true });
    socket.addEventListener('error', handleError, { once: true });
  });

export const monitorLatency = (_socket: WebSocket, onLatency: (value?: number) => void) => {
  onLatency(undefined);
  return () => undefined;
};
