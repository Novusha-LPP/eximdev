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
        const year = payload.year;

        if (!year) return;

        connections.set(ws, { year });

        // Send initial data
        const data = await fetchJobOverviewData(year);
        ws.send(JSON.stringify({ type: 'init', data }));

      } catch (err) {
        console.error('WebSocket message error:', err);
        ws.send(JSON.stringify({ type: 'error', error: 'Invalid message format or data' }));
      }
    });

    const intervalId = setInterval(async () => {
      for (const [client, meta] of connections.entries()) {
        if (client.readyState === ws.OPEN && meta.year) {
          try {
            const data = await fetchJobOverviewData(meta.year);
            client.send(JSON.stringify({ type: 'update', data }));
          } catch (err) {
            console.error('Error sending update:', err);
          }
        }
      }
    }, 10000); // 10 sec update interval

    ws.on('close', () => {
      console.log('❌ WebSocket client disconnected');
      connections.delete(ws);
    });
  });
}
