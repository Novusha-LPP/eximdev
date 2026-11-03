import { WebSocketServer } from 'ws';
import fetchJobOverviewData from './routes/updateJobCount.mjs';

const connections = new Map(); // key: socket, value: { year }

const UPDATE_INTERVAL_MS = 30000; // 30 seconds — reduced from 10s to ease MongoDB connection pressure

// One in-flight aggregation per year, shared by every connection on this worker
const inFlight = new Map(); // year -> Promise

function computeOverview(year) {
  if (inFlight.has(year)) return inFlight.get(year);
  const promise = fetchJobOverviewData(year).finally(() => inFlight.delete(year));
  inFlight.set(year, promise);
  return promise;
}

let ticker = null;

function startTicker() {
  if (ticker) return;
  // Periodic updates: compute once per subscribed year, send to all its sockets
  ticker = setInterval(async () => {
    const socketsByYear = new Map();
    for (const [ws, meta] of connections) {
      if (ws.readyState === ws.OPEN && meta?.year) {
        if (!socketsByYear.has(meta.year)) socketsByYear.set(meta.year, []);
        socketsByYear.get(meta.year).push(ws);
      }
    }

    for (const [year, sockets] of socketsByYear) {
      try {
        const data = await computeOverview(year);
        const message = JSON.stringify({ type: 'update', data });
        for (const ws of sockets) {
          if (ws.readyState === ws.OPEN && connections.get(ws)?.year === year) {
            ws.send(message);
          }
        }
      } catch (err) {
        console.error('Error sending update:', err);
      }
    }
  }, UPDATE_INTERVAL_MS);
}

function stopTickerIfIdle() {
  if (ticker && connections.size === 0) {
    clearInterval(ticker);
    ticker = null;
  }
}

export function setupJobOverviewWebSocket(server) {
  const wss = new WebSocketServer({ noServer: true });

  wss.on('connection', (ws) => {
    ws.on('message', async (message) => {
      try {
        const payload = JSON.parse(message);
        if (typeof payload !== 'object' || !payload.year) {
          throw new Error("Invalid payload structure");
        }

        const year = payload.year;
        connections.set(ws, { year });
        startTicker();

        const data = await computeOverview(year);
        ws.send(JSON.stringify({ type: 'init', data }));
      } catch (err) {
        console.error('WebSocket message error:', err);
        ws.send(JSON.stringify({ type: 'error', error: 'Invalid message format or data' }));
      }
    });

    ws.on('close', () => {
      console.log('❌ WebSocket client disconnected');
      connections.delete(ws);
      stopTickerIfIdle();
    });
  });

  return wss;
}
