import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAnalytics } from './AnalyticsContext';
import KPICard from './KPICard';
import ModalTable from './ModalTable';

import './AnalyticsLayout.css';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

const MovementDashboard = () => {
    const { startDate, endDate, importer } = useAnalytics();
    const [data, setData] = useState({ summary: {}, details: {} });
    const [modalOpen, setModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState('');
    const [modalData, setModalData] = useState([]);
    const [dateLabel, setDateLabel] = useState('Relevant Date');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get(`${process.env.REACT_APP_API_STRING}/analytics/movement`, {
                    params: { startDate, endDate, importer }
                });
                setData(response.data);
            } catch (error) {
                console.error("Error fetching movement data", error);
            }
        };
        fetchData();
    }, [startDate, endDate, importer]);

    const handleCardClick = (key, title, label = 'Relevant Date') => {
        setModalTitle(title);
        setDateLabel(label);
        setModalData(data.details[key] || []);
        setModalOpen(true);
    };

    const { summary, details } = data;
    const arrivalTrend = (details?.arrival_trend || []).map(item => ({ date: item._id, count: item.count }));

    return (
        <div className="overview-container">
            <h2>Container Movement</h2>
            <div className="dashboard-grid">
                <KPICard title="Arrived" count={summary.arrived || 0} color="blue" onClick={() => handleCardClick('arrived', 'Arrived', 'Arrival Date')} />
                <KPICard title="Rail Out" count={summary.rail_out || 0} color="blue" onClick={() => handleCardClick('rail_out', 'Rail Out', 'Rail Out Date')} />
                <KPICard title="Delivered" count={summary.delivered || 0} color="blue" onClick={() => handleCardClick('delivered', 'Delivered', 'Delivery Date')} />
                <KPICard title="Empty Offload" count={summary.empty_offload || 0} color="blue" onClick={() => handleCardClick('empty_offload', 'Empty Offload', 'Offload Date')} />
                <KPICard title="By Road" count={summary.by_road || 0} color="blue" onClick={() => handleCardClick('by_road', 'By Road', 'Movement Date')} />
                <KPICard title="Detention Start" count={summary.detention_start || 0} color="red" onClick={() => handleCardClick('detention_start', 'Detention Start', 'Start Date')} />
            </div>

            <div className="charts-section">
                <div className="chart-card">
                    <h3>Container Arrival Trend (Last 7 Days)</h3>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <AreaChart data={arrivalTrend}>
                                <defs>
                                    <linearGradient id="colorArrival" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                <Area type="monotone" dataKey="count" stroke="#3b82f6" fillOpacity={1} fill="url(#colorArrival)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <ModalTable open={modalOpen} onClose={() => setModalOpen(false)} title={modalTitle} dateLabel={dateLabel} data={modalData} />
        </div>
    );
};

export default MovementDashboard;
