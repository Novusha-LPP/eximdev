import { WebSocketServer } from 'ws';
import { fetchAnalyticsData } from './routes/analytics/analyticsRoutes.mjs';

const connections = new Map(); // key: socket, value: { module, startDate, endDate, importer }

export function setupAnalyticsWebSocket(server) {
    // Use noServer: true since it will be part of the main upgrade handler
    // Wait, if we use noServer: true, we have to handle the upgrade event manually in app.mjs
    // Or handle it gracefully alongside the JobOverviewWebSocket

    // We will create a standalone wss with noServer: true
    const wss = new WebSocketServer({ noServer: true });

    wss.on('connection', (ws) => {
        ws.on('message', async (message) => {
            try {
                const payload = JSON.parse(message);
                // Payload must have module
                if (typeof payload !== 'object' || !payload.module) {
                    throw new Error("Invalid payload structure");
                }

                const { module, startDate, endDate, importer, branchId, category } = payload;
                connections.set(ws, { module, startDate, endDate, importer, branchId, category });

                const data = await fetchAnalyticsData(module, startDate, endDate, importer, branchId, category);
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
                    const data = await fetchAnalyticsData(meta.module, meta.startDate, meta.endDate, meta.importer, meta.branchId, meta.category);
                    ws.send(JSON.stringify({ type: 'update', data }));
                } catch (err) {
                    console.error('Error sending analytics update:', err);
                }
            }
        }, 10000);

        ws.on('close', () => {
            // console.log('❌ Analytics WebSocket client disconnected');
            clearInterval(intervalId);
            connections.delete(ws);
        });
    });

    return wss;
}
