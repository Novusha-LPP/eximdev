import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAnalytics } from './AnalyticsContext';
import KPICard from './KPICard';
import ModalTable from './ModalTable';
import './AnalyticsLayout.css';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts';

const OverviewDashboard = () => {
    const { startDate, endDate } = useAnalytics();
    const [data, setData] = useState({ summary: {}, details: {} });
    const [modalOpen, setModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState('');
    const [modalData, setModalData] = useState([]);
    const [dateLabel, setDateLabel] = useState('Relevant Date');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get(`${process.env.REACT_APP_API_STRING}/analytics/overview`, {
                    params: { startDate, endDate }
                });
                setData(response.data);
            } catch (error) {
                console.error("Error fetching overview data", error);
            }
        };
        fetchData();
    }, [startDate, endDate]);

    const handleCardClick = (key, title, label = 'Relevant Date') => {
        setModalTitle(title);
        setDateLabel(label);
        setModalData(data.details[key] || []);
        setModalOpen(true);
    };

    const { summary, details } = data;
    const trendData = details?.jobs_trend || [];

    // Transform trend data for chart if needed (already in { _id: date, count: N } format)
    const chartData = trendData.map(item => ({
        date: item._id,
        jobs: item.count
    }));

    return (
        <div className="overview-container">
            <div className="section-header">
                <h2>Operations Overview</h2>
                <p>Real-time insights into your import/export operations</p>
            </div>

            <div className="dashboard-grid">
                <KPICard
                    title="Jobs Created Today"
                    count={summary.jobs_created_today || 0}
                    color="teal"
                    onClick={() => handleCardClick('jobs_created_today', 'Jobs Created Today', 'Creation Date')}
                />
                <KPICard
                    title="Arrivals Today"
                    count={summary.arrivals_today || 0}
                    color="blue"
                    onClick={() => handleCardClick('arrivals_today', 'Arrivals Today', 'Arrival Date')}
                />
                <KPICard
                    title="Rail Out Today"
                    count={summary.rail_out_today || 0}
                    color="blue"
                    onClick={() => handleCardClick('rail_out_today', 'Rail Out Today', 'Rail Out Date')}
                />
                <KPICard
                    title="BE Filed"
                    count={summary.be_filed || 0}
                    color="purple"
                    onClick={() => handleCardClick('be_filed', 'BE Filed', 'BE Date')}
                />
                <KPICard
                    title="OOC"
                    count={summary.ooc || 0}
                    color="purple"
                    onClick={() => handleCardClick('ooc', 'Out Of Charge', 'OOC Date')}
                />
                <KPICard
                    title="DO Completed"
                    count={summary.do_completed || 0}
                    color="orange"
                    onClick={() => handleCardClick('do_completed', 'DO Completed', 'DO Date')}
                />
                <KPICard
                    title="Billing Sent"
                    count={summary.billing_sent || 0}
                    color="green"
                    onClick={() => handleCardClick('billing_sent', 'Billing Sent', 'Bill Sent Date')}
                />
                <KPICard
                    title="Estimated Arrival (ETA)"
                    count={summary.eta || 0}
                    color="teal"
                    onClick={() => handleCardClick('eta', 'Estimated Arrivals', 'ETA Date')}
                />
            </div>

            <div className="charts-section">
                <div className="chart-card">
                    <h3>Job Creation Trend (Last 7 Days)</h3>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorJobs" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                />
                                <Area type="monotone" dataKey="jobs" stroke="#8884d8" fillOpacity={1} fill="url(#colorJobs)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <ModalTable
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                title={modalTitle}
                dateLabel={dateLabel}
                data={modalData}
            />
        </div>
    );
};

export default OverviewDashboard;
