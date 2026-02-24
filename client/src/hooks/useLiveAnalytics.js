import { useState, useEffect } from 'react';
import axios from 'axios';

const useLiveAnalytics = (module, startDate, endDate, importer) => {
    const [data, setData] = useState({ summary: {}, details: {} });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!module) return;

        setLoading(true);

        const today = new Date().toDateString();
        const startStr = startDate ? new Date(startDate).toDateString() : today;
        const endStr = endDate ? new Date(endDate).toDateString() : today;
        const isLive = startStr === today && endStr === today;

        if (!isLive) {
            // Use API for historical data
            const fetchData = async () => {
                try {
                    const response = await axios.get(`${process.env.REACT_APP_API_STRING}/analytics/${module}`, {
                        params: { startDate, endDate, importer }
                    });
                    setData(response.data);
                    setError(null);
                } catch (err) {
                    console.error(`Error fetching historical ${module} data`, err);
                    setError(err.message || "Error fetching historical data.");
                } finally {
                    setLoading(false);
                }
            };
            fetchData();
            return;
        }

        // Use WebSocket for Live (Today's) Data
        let host = process.env.REACT_APP_SOCKET_URL || window.location.host;
        host = host.replace(/^https?:\/\//, '');
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const SOCKET_URL = `${protocol}//${host}/analytics`;

        const socket = new WebSocket(SOCKET_URL);

        socket.onopen = () => {
            const payload = {
                module,
                startDate: startDate ? new Date(startDate).toISOString() : null,
                endDate: endDate ? new Date(endDate).toISOString() : null,
                importer
            };
            socket.send(JSON.stringify(payload));
        };

        socket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);

                if (message.type === 'init' || message.type === 'update') {
                    setData(message.data || { summary: {}, details: {} });
                    setError(null);
                    setLoading(false);
                } else if (message.type === 'error') {
                    setError(message.error || 'Server error');
                    setLoading(false);
                }
            } catch (err) {
                console.error("Error parsing analytics WebSocket message:", err);
                setError("Error parsing server data.");
                setLoading(false);
            }
        };

        socket.onerror = (err) => {
            if (socket.readyState !== WebSocket.OPEN) {
                console.error("WebSocket connection error", err);
                setError("WebSocket connection error.");
                setLoading(false);
            }
        };

        socket.onclose = () => {
            // Disconnected
        };

        return () => {
            socket.close();
        };
    }, [module, startDate, endDate, importer]);

    return { data, loading, error };
};

export default useLiveAnalytics;
