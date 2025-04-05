import { WebSocketServer } from 'ws';
import fetchJobOverviewData from '../server/routes/updateJobCount.mjs'; // your Mongo filter

export function setupJobOverviewWebSocket(server) {
  const wss = new WebSocketServer({ server }); // attach to same HTTPS server

  wss.on('connection', (ws) => {
    console.log('✅ WebSocket client connected');

    let year = null;

    ws.on('message', async (message) => {
      try {
        console.log("📩 Message from client:", message);
        
        // Try parsing JSON
        let payload;
        try {
          payload = JSON.parse(message); // frontend must send stringified object
        } catch {
          payload = { year: message.toString() }; // fallback to plain string
        }

        if (payload?.year) {
          year = payload.year;
          const data = await fetchJobOverviewData(year); // must return object
          ws.send(JSON.stringify({ type: 'init', data }));
        }
      } catch (err) {
        console.error('WebSocket message error:', err);
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid data format' }));
      }
    });

    const intervalId = setInterval(async () => {
      if (ws.readyState === ws.OPEN && year) {
        const data = await fetchJobOverviewData(year);
        ws.send(JSON.stringify({ type: 'update', data }));
      }
    }, 10000);

    ws.on('close', () => {
      console.log('❌ WebSocket client disconnected');
      clearInterval(intervalId);
    });
  });
}
