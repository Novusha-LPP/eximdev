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

    // Trend graph configuration (label, backend key, color)
    const trendOptions = [
        { label: 'Jobs Created', value: 'jobs_trend', color: '#8884d8' },
        { label: 'Operations Completed', value: 'ops_trend', color: '#10b981' },
        { label: 'Exam Planning', value: 'exam_trend', color: '#8b5cf6' },
        { label: 'Arrivals', value: 'arrival_trend', color: '#3b82f6' },
        { label: 'Rail Out', value: 'rail_out_trend', color: '#6366f1' },
        { label: 'BE Filed', value: 'be_trend', color: '#a855f7' },
        { label: 'OOC', value: 'ooc_trend', color: '#d946ef' },
        { label: 'DO Completed', value: 'do_trend', color: '#f97316' },
        { label: 'Billing Sent', value: 'billing_trend', color: '#14b8a6' },
        { label: 'ETA', value: 'eta_trend', color: '#06b6d4' }
    ];

    const [selectedTrend, setSelectedTrend] = useState(trendOptions[0]);

    const { summary, details } = data;

    // Transform trend data for chart based on selection
    const currentTrendRaw = details?.[selectedTrend.value] || [];
    const chartData = currentTrendRaw.map(item => ({
        date: item._id,
        count: item.count
    }));

    return (
        <div className="overview-container">
            <div className="section-header">
                <h2>Operations Overview</h2>
                <p>Real-time insights into your import/export operations</p>
            </div>

            <div className="dashboard-grid">
                <KPICard
                    title="Operations Completed"
                    count={summary.operations_completed || 0}
                    color="green"
                    onClick={() => handleCardClick('operations_completed', 'Operations Completed', 'Completion Date')}
                />
                <KPICard
                    title="Jobs Created Today"
                    count={summary.jobs_created_today || 0}
                    color="teal"
                    onClick={() => handleCardClick('jobs_created_today', 'Jobs Created Today', 'Creation Date')}
                />
                <KPICard
                    title="Exam Planning"
                    count={summary.examination_planning || 0}
                    color="purple"
                    onClick={() => handleCardClick('examination_planning', 'Examination Planning', 'Exam Plan Date')}
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
                <div className="chart-card" style={{ gridColumn: '1 / -1' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3>Trend Analysis (Last 7 Days)</h3>
                        <select
                            value={selectedTrend.value}
                            onChange={(e) => setSelectedTrend(trendOptions.find(opt => opt.value === e.target.value))}
                            style={{ padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none', cursor: 'pointer' }}
                        >
                            {trendOptions.map(option => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ width: '100%', height: 400 }}>
                        <ResponsiveContainer>
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={selectedTrend.color} stopOpacity={0.8} />
                                        <stop offset="95%" stopColor={selectedTrend.color} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="count"
                                    stroke={selectedTrend.color}
                                    fillOpacity={1}
                                    fill="url(#colorTrend)"
                                    key={selectedTrend.value} // Force animation re-render
                                />
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
        </div >
    );
};

export default OverviewDashboard;
