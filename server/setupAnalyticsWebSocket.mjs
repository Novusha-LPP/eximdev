import { WebSocketServer } from 'ws';
import { fetchAnalyticsData } from './routes/analytics/analyticsRoutes.mjs';
import { getJobModel } from './model/jobModelFactory.mjs';

const connections = new Map(); // key: socket, value: { module, startDate, endDate, importer, branch, category }

export function setupAnalyticsWebSocket(server) {
    const wss = new WebSocketServer({ noServer: true });

    wss.on('connection', (ws) => {
        ws.on('message', async (message) => {
            try {
                const payload = JSON.parse(message);
                if (typeof payload !== 'object' || !payload.module) {
                    throw new Error("Invalid payload structure");
                }

                const { module, startDate, endDate, importer, branch, category } = payload;
                const JobModel = getJobModel(branch || 'AHMEDABAD', category || 'SEA');
                connections.set(ws, { module, startDate, endDate, importer, branch, category });

                const data = await fetchAnalyticsData(JobModel, module, startDate, endDate, importer);
                ws.send(JSON.stringify({ type: 'init', data }));
            } catch (err) {
                console.error('WebSocket Analytics message error:', err);
                ws.send(JSON.stringify({ type: 'error', error: err.message || 'Invalid message format or data' }));
            }
        });

        // Periodic updates every 10 seconds
        const intervalId = setInterval(async () => {
            const meta = connections.get(ws);
            if (ws.readyState === ws.OPEN && meta && meta.module) {
                try {
                    const JobModel = getJobModel(meta.branch || 'AHMEDABAD', meta.category || 'SEA');
                    const data = await fetchAnalyticsData(JobModel, meta.module, meta.startDate, meta.endDate, meta.importer);
                    ws.send(JSON.stringify({ type: 'update', data }));
                } catch (err) {
                    console.error('Error sending analytics update:', err);
                }
            }
        }, 10000);

        ws.on('close', () => {
            clearInterval(intervalId);
            connections.delete(ws);
        });
    });

    return wss;
}
