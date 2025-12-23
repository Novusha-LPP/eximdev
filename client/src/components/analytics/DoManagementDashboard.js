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

const DoManagementDashboard = () => {
    const { startDate, endDate, importer } = useAnalytics();
    const [data, setData] = useState({ summary: {}, details: {} });
    const [modalOpen, setModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState('');
    const [modalData, setModalData] = useState([]);
    const [dateLabel, setDateLabel] = useState('Relevant Date');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get(`${process.env.REACT_APP_API_STRING}/analytics/do-management`, {
                    params: { startDate, endDate, importer }
                });
                setData(response.data);
            } catch (error) {
                console.error("Error fetching DO data", error);
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
    const doTrend = (details?.do_trend || []).map(item => ({ date: item._id, count: item.count }));

    return (
        <div className="overview-container">
            <h2>DO Management</h2>
            <div className="dashboard-grid">
                <KPICard title="DO Planned" count={summary.do_planned || 0} color="orange" onClick={() => handleCardClick('do_planned', 'DO Planned')} />
                <KPICard title="DO Received" count={summary.do_received || 0} color="orange" onClick={() => handleCardClick('do_received', 'DO Received')} />
                <KPICard title="DO Completed" count={summary.do_completed || 0} color="orange" onClick={() => handleCardClick('do_completed', 'DO Completed')} />
                <KPICard title="DO Revalidated" count={summary.do_revalidated || 0} color="orange" onClick={() => handleCardClick('do_revalidated', 'DO Revalidated')} />
                <KPICard title="DO Expiring (Job)" count={summary.do_expiring_job || 0} color="red" onClick={() => handleCardClick('do_expiring_job', 'DO Expiring (Job)')} />
                <KPICard title="Pending DO (With Invoices)" count={summary.jobs_with_invoices || 0} color="green" onClick={() => handleCardClick('jobs_with_invoices', 'Pending DO (With Invoices)')} />
                <KPICard title="Pending DO (No Invoices)" count={summary.jobs_without_invoices || 0} color="red" onClick={() => handleCardClick('jobs_without_invoices', 'Pending DO (No Invoices)')} />
            </div>

            <div className="charts-section">
                <div className="chart-card">
                    <h3>DO Completion Trend (Last 7 Days)</h3>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <AreaChart data={doTrend}>
                                <defs>
                                    <linearGradient id="colorDo" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                <Area type="monotone" dataKey="count" stroke="#f97316" fillOpacity={1} fill="url(#colorDo)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <ModalTable open={modalOpen} onClose={() => setModalOpen(false)} title={modalTitle} data={modalData} />
        </div>
    );
};

export default DoManagementDashboard;
