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

const DocumentationDashboard = () => {
    const { startDate, endDate } = useAnalytics();
    const [data, setData] = useState({ summary: {}, details: {} });
    const [modalOpen, setModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState('');
    const [modalData, setModalData] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get(`${process.env.REACT_APP_API_STRING}/analytics/documentation`, {
                    params: { startDate, endDate }
                });
                setData(response.data);
            } catch (error) {
                console.error("Error fetching documentation data", error);
            }
        };
        fetchData();
    }, [startDate, endDate]);

    const handleCardClick = (key, title) => {
        setModalTitle(title);
        setModalData(data.details[key] || []);
        setModalOpen(true);
    };

    const { summary, details } = data;
    const docsTrend = (details?.docs_trend || []).map(item => ({ date: item._id, count: item.count }));

    return (
        <div className="overview-container">
            <h2>Documentation Pipeline</h2>
            <div className="dashboard-grid">
                <KPICard title="Checklist Approved" count={summary.checklist_approved || 0} color="teal" onClick={() => handleCardClick('checklist_approved', 'Checklist Approved')} />
                <KPICard title="Docs Received" count={summary.docs_received || 0} color="teal" onClick={() => handleCardClick('docs_received', 'Docs Received')} />
                <KPICard title="Docs Completed" count={summary.documentation_completed || 0} color="teal" onClick={() => handleCardClick('documentation_completed', 'Docs Completed')} />
                <KPICard title="eSanchit Completed" count={summary.esanchit_completed || 0} color="teal" onClick={() => handleCardClick('esanchit_completed', 'eSanchit Completed')} />
                <KPICard title="Submission Completed" count={summary.submission_completed || 0} color="teal" onClick={() => handleCardClick('submission_completed', 'Submission Completed')} />
            </div>

            <div className="charts-section">
                <div className="chart-card">
                    <h3>Documentation Completion Trend (Last 7 Days)</h3>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <AreaChart data={docsTrend}>
                                <defs>
                                    <linearGradient id="colorDocs" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                <Area type="monotone" dataKey="count" stroke="#14b8a6" fillOpacity={1} fill="url(#colorDocs)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <ModalTable open={modalOpen} onClose={() => setModalOpen(false)} title={modalTitle} data={modalData} />
        </div>
    );
};

export default DocumentationDashboard;
