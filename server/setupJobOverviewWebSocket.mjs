import { WebSocketServer } from 'ws';
import fetchJobOverviewData from '../server/routes/updateJobCount.mjs'; // Update path if needed

const connections = new Map(); // key: socket, value: { year }

export function setupJobOverviewWebSocket(server) {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    console.log('✅ WebSocket client connected');

    ws.on('message', async (message) => {
      try {
        const payload = JSON.parse(message);
        if (typeof payload !== 'object' || !payload.year) {
          throw new Error("Invalid payload structure");
        }

        const year = payload.year;
        connections.set(ws, { year });

        const data = await fetchJobOverviewData(year);
        ws.send(JSON.stringify({ type: 'init', data }));
      } catch (err) {
        console.error('WebSocket message error:', err);
        ws.send(JSON.stringify({ type: 'error', error: 'Invalid message format or data' }));
      }
    });

    // Periodic updates
    const intervalId = setInterval(async () => {
      const meta = connections.get(ws);
      if (ws.readyState === ws.OPEN && meta?.year) {
        try {
          const data = await fetchJobOverviewData(meta.year);
          ws.send(JSON.stringify({ type: 'update', data }));
        } catch (err) {
          console.error('Error sending update:', err);
        }
      }
    }, 10000);

    ws.on('close', () => {
      console.log('❌ WebSocket client disconnected');
      clearInterval(intervalId);
      connections.delete(ws);
    });
  });
}
