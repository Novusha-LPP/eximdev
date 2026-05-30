import { WebSocketServer } from 'ws';

const clients = new Set();

export function setupDgftWebSocket() {
  const wss = new WebSocketServer({ noServer: true });

  wss.on('connection', (ws) => {
    clients.add(ws);

    ws.on('close', () => {
      clients.delete(ws);
    });

    ws.on('error', (err) => {
      console.error('[DgftWebSocket] Socket error:', err);
      clients.delete(ws);
    });
  });

  return wss;
}

export function broadcastLicenseUpdate(authorizationNo) {
  if (!authorizationNo) return;
  const payload = JSON.stringify({ type: 'recalculated', authorizationNo });
  for (const client of clients) {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(payload);
    }
  }
}
