import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAnalytics } from './AnalyticsContext';
import KPICard from './KPICard';
import ModalTable from './ModalTable';
import './AnalyticsLayout.css'; // Shared grid styles

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

    const { summary } = data;

    return (
        <div>
            <h2>Operations Overview</h2>
            <div className="dashboard-grid">
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
