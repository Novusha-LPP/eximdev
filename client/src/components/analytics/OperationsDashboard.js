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

const OperationsDashboard = () => {
    const { startDate, endDate, importer } = useAnalytics();
    const [data, setData] = useState({ summary: {}, details: {} });
    const [modalOpen, setModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState('');
    const [modalData, setModalData] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get(`${process.env.REACT_APP_API_STRING}/analytics/operations`, {
                    params: { startDate, endDate, importer }
                });
                setData(response.data);
            } catch (error) {
                console.error("Error fetching Operations data", error);
            }
        };
        fetchData();
    }, [startDate, endDate, importer]);

    const handleCardClick = (key, title) => {
        setModalTitle(title);
        setModalData(data.details[key] || []);
        setModalOpen(true);
    };

    const { summary, details } = data;
    const opsTrend = (details?.ops_trend || []).map(item => ({ date: item._id, count: item.count }));

    return (
        <div className="overview-container">
            <h2>Operations Management</h2>
            <div className="dashboard-grid">
                <KPICard title="In Examination Planning" count={summary.in_examination_planning || 0} color="red" onClick={() => handleCardClick('in_examination_planning', 'In Examination Planning')} />
                <KPICard title="Operations Completed" count={summary.operations_completed || 0} color="green" onClick={() => handleCardClick('operations_completed', 'Operations Completed')} />
            </div>

            <div className="charts-section">
                <div className="chart-card">
                    <h3>Operations Completion Trend (Last 7 Days)</h3>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <AreaChart data={opsTrend}>
                                <defs>
                                    <linearGradient id="colorOps" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                <Area type="monotone" dataKey="count" stroke="#3b82f6" fillOpacity={1} fill="url(#colorOps)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <ModalTable open={modalOpen} onClose={() => setModalOpen(false)} title={modalTitle} data={modalData} />
        </div>
    );
};

export default OperationsDashboard;
