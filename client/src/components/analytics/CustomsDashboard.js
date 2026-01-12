import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAnalytics } from './AnalyticsContext';
import KPICard from './KPICard';
import ModalTable from './ModalTable';
import { BranchContext } from '../../contexts/BranchContext';
import { useContext } from 'react';
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

const CustomsDashboard = () => {
    const { startDate, endDate, importer } = useAnalytics();
    const { selectedBranch } = useContext(BranchContext);
    const [data, setData] = useState({ summary: {}, details: {} });
    const [modalOpen, setModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState('');
    const [modalData, setModalData] = useState([]);
    const [dateLabel, setDateLabel] = useState('Relevant Date');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get(`${process.env.REACT_APP_API_STRING}/analytics/customs`, {
                    params: { startDate, endDate, importer }
                });
                setData(response.data);
            } catch (error) {
                console.error("Error fetching customs data", error);
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
    const beTrend = (details?.be_trend || []).map(item => ({ date: item._id, count: item.count }));
    const oocTrend = (details?.ooc_trend || []).map(item => ({ date: item._id, count: item.count }));

    return (
        <div className="overview-container">
            <h2>Customs Clearance</h2>
            <div className="dashboard-grid">
                <KPICard title="IGM" count={summary.igm || 0} color="purple" onClick={() => handleCardClick('igm', 'IGM')} />
                {selectedBranch !== "GANDHIDHAM" && (
                    <KPICard title="Gateway IGM" count={summary.gateway_igm || 0} color="purple" onClick={() => handleCardClick('gateway_igm', 'Gateway IGM')} />
                )}
                <KPICard title="BE Filed" count={summary.be_filed || 0} color="purple" onClick={() => handleCardClick('be_filed', 'BE Filed')} />
                <KPICard title="Assessment" count={summary.assessment || 0} color="purple" onClick={() => handleCardClick('assessment', 'Assessment')} />
                <KPICard title="Duty Paid" count={summary.duty_paid || 0} color="purple" onClick={() => handleCardClick('duty_paid', 'Duty Paid')} />
                <KPICard title="PCV" count={summary.pcv || 0} color="purple" onClick={() => handleCardClick('pcv', 'PCV')} />
                <KPICard title="OOC" count={summary.ooc || 0} color="purple" onClick={() => handleCardClick('ooc', 'OOC')} />
                <KPICard title="Discharge" count={summary.discharge || 0} color="purple" onClick={() => handleCardClick('discharge', 'Discharge')} />
            </div>

            <div className="charts-section">
                <div className="chart-card">
                    <h3>BE Filing Trend (Last 7 Days)</h3>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <AreaChart data={beTrend}>
                                <defs>
                                    <linearGradient id="colorBe" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                <Area type="monotone" dataKey="count" stroke="#8884d8" fillOpacity={1} fill="url(#colorBe)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="chart-card">
                    <h3>OOC Trend (Last 7 Days)</h3>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <AreaChart data={oocTrend}>
                                <defs>
                                    <linearGradient id="colorOoc" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                <Area type="monotone" dataKey="count" stroke="#82ca9d" fillOpacity={1} fill="url(#colorOoc)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <ModalTable open={modalOpen} onClose={() => setModalOpen(false)} title={modalTitle} data={modalData} />
        </div>
    );
};

export default CustomsDashboard;
