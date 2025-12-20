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

const BillingDashboard = () => {
    const { startDate, endDate } = useAnalytics();
    const [data, setData] = useState({ summary: {}, details: {} });
    const [modalOpen, setModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState('');
    const [modalData, setModalData] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get(`${process.env.REACT_APP_API_STRING}/analytics/billing`, {
                    params: { startDate, endDate }
                });
                setData(response.data);
            } catch (error) {
                console.error("Error fetching billing data", error);
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
    const billingTrend = (details?.billing_trend || []).map(item => ({ date: item._id, count: item.count }));

    return (
        <div className="overview-container">
            <h2>Billing & Accounts</h2>
            <div className="dashboard-grid">
                <KPICard title="Billing Sheet Sent" count={summary.billing_sheet_sent || 0} color="green" onClick={() => handleCardClick('billing_sheet_sent', 'Billing Sheet Sent')} />
                <KPICard title="Bill Generated" count={summary.bill_generated || 0} color="green" onClick={() => handleCardClick('bill_generated', 'Bill Generated')} />
                <KPICard title="Operation Completed" count={summary.operation_completed || 0} color="green" onClick={() => handleCardClick('operation_completed', 'Operation Completed')} />
                <KPICard title="Payment Made" count={summary.payment_made || 0} color="green" onClick={() => handleCardClick('payment_made', 'Payment Made')} />
            </div>

            <div className="charts-section">
                <div className="chart-card">
                    <h3>Billing Activity Trend (Last 7 Days)</h3>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <AreaChart data={billingTrend}>
                                <defs>
                                    <linearGradient id="colorBilling" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                <Area type="monotone" dataKey="count" stroke="#10b981" fillOpacity={1} fill="url(#colorBilling)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <ModalTable open={modalOpen} onClose={() => setModalOpen(false)} title={modalTitle} data={modalData} />
        </div>
    );
};

export default BillingDashboard;
