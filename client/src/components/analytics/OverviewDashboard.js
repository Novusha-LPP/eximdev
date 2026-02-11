
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAnalytics } from './AnalyticsContext';
import KPICard from './KPICard';
import ModalTable from './ModalTable';
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
import './AnalyticsLayout.css'; // Inherits the theme

const OverviewDashboard = () => {
    const { startDate, endDate, importer } = useAnalytics();
    const [data, setData] = useState({ summary: {}, details: {} });
    const [modalOpen, setModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState('');
    const [modalData, setModalData] = useState([]);
    const [modalType, setModalType] = useState('');
    const [dateLabel, setDateLabel] = useState('Relevant Date');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get(`${process.env.REACT_APP_API_STRING}/analytics/overview`, {
                    params: { startDate, endDate, importer }
                });
                setData(response.data);
            } catch (error) {
                console.error("Error fetching overview data", error);
            }
        };
        fetchData();
    }, [startDate, endDate, importer]);

    const handleCardClick = (key, title, label = 'Relevant Date') => {
        setModalTitle(title);
        setDateLabel(label);
        setModalType(key);
        setModalData(data.details[key] || []);
        setModalOpen(true);
    };

    const { summary, details } = data;

    // Trend graph configuration (label, backend key, color)
    const trendOptions = [
        { label: 'Jobs Created', value: 'jobs_trend', color: '#60a5fa' },
        { label: 'ETA', value: 'eta_trend', color: '#f472b6' },
        { label: 'Gateway IGM', value: 'gateway_igm_trend', color: '#6366f1' },
        { label: 'Discharge', value: 'discharge_trend', color: '#14b8a6' },
        { label: 'Arrivals', value: 'arrival_trend', color: '#34d399' },
        { label: 'Rail Out', value: 'rail_out_trend', color: '#818cf8' },
        { label: 'BE Filed', value: 'be_trend', color: '#a78bfa' },
        { label: 'OOC', value: 'ooc_trend', color: '#e879f9' },
        { label: 'DO Completed', value: 'do_trend', color: '#fb923c' },
        { label: 'Billing Sent', value: 'billing_trend', color: '#2dd4bf' }
    ];

    const [selectedTrend, setSelectedTrend] = useState(trendOptions[0]);
    const currentTrendRaw = details?.[selectedTrend.value] || [];
    const chartData = currentTrendRaw.map(item => ({
        date: item._id,
        count: item.count
    }));

    // Defined Order as per user request
    const cards = [
        { key: 'jobs_created_today', title: 'Jobs Created', label: 'Creation Date', color: 'blue' },
        { key: 'eta', title: 'ETA', label: 'ETA Date', color: 'pink' },
        { key: 'gateway_igm_date', title: 'Gateway IGM', label: 'IGM Date', color: 'indigo' },
        { key: 'discharge_date', title: 'Discharge', label: 'Discharge Date', color: 'teal' },
        { key: 'arrivals_today', title: 'Arrivals', label: 'Arrival Date', color: 'cyan' },
        { key: 'rail_out_today', title: 'Rail Out', label: 'Rail Out Date', color: 'blue' },
        { key: 'be_filed', title: 'BE Filed', label: 'BE Date', color: 'purple' },
        { key: 'ooc', title: 'OOC', label: 'OOC Date', color: 'fuchsia' },
        { key: 'empty_offload', title: 'Empty Offload', label: 'Offload Date', color: 'rose' },
        { key: 'billing_sent', title: 'Billing Sent', label: 'Bill Sent Date', color: 'green' },
        { key: 'do_completed', title: 'DO Completed', label: 'DO Date', color: 'orange' },
        { key: 'operations_completed', title: 'Ops Completed', label: 'Completion Date', color: 'emerald' },
    ];

    return (
        <div className="overview-container">
            <div className="section-header">
                <h2>Operations Overview</h2>
                <p>Real-time insights on your shipments</p>
            </div>

            <div className="dashboard-grid">
                {cards.map(card => (
                    <KPICard
                        key={card.key}
                        title={card.title}
                        count={summary[card.key] || 0}
                        color={card.color}
                        onClick={() => handleCardClick(card.key, card.title, card.label)}
                    />
                ))}
            </div>

            <div className="charts-section">
                <div className="chart-card" style={{ gridColumn: '1 / -1' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3>Trend Analysis (Last 7 Days)</h3>
                        <select
                            value={selectedTrend.value}
                            onChange={(e) => setSelectedTrend(trendOptions.find(opt => opt.value === e.target.value))}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '8px',
                                background: '#ffffff',
                                border: '1px solid #cbd5e1',
                                color: '#1e293b',
                                outline: 'none'
                            }}
                        >
                            {trendOptions.map(option => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ width: '100%', height: 350 }}>
                        <ResponsiveContainer>
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={selectedTrend.color} stopOpacity={0.6} />
                                        <stop offset="95%" stopColor={selectedTrend.color} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                <XAxis dataKey="date" stroke="#64748b" />
                                <YAxis stroke="#64748b" />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#ffffff',
                                        borderRadius: '8px',
                                        border: '1px solid #e2e8f0',
                                        color: '#1e293b',
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="count"
                                    stroke={selectedTrend.color}
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorTrend)"
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
                type={modalType}
                data={modalData}
            />
        </div>
    );
};

export default OverviewDashboard;
