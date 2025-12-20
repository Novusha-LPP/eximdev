import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAnalytics } from './AnalyticsContext';
import KPICard from './KPICard';
import ModalTable from './ModalTable';

const ExceptionsDashboard = () => {
    const { startDate, endDate } = useAnalytics();
    const [data, setData] = useState({ summary: {}, details: {} });
    const [modalOpen, setModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState('');
    const [modalData, setModalData] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get(`${process.env.REACT_APP_API_STRING}/analytics/exceptions`, {
                    params: { startDate, endDate }
                });
                setData(response.data);
            } catch (error) {
                console.error("Error fetching exceptions data", error);
            }
        };
        fetchData();
    }, [startDate, endDate]);

    const handleCardClick = (key, title) => {
        setModalTitle(title);
        setModalData(data.details[key] || []);
        setModalOpen(true);
    };

    const { summary } = data;

    return (
        <div>
            <h2>Exceptions & Alerts</h2>
            <div className="dashboard-grid">
                <KPICard title="DO Validity Expired" count={summary.do_validity_expired || 0} color="red" onClick={() => handleCardClick('do_validity_expired', 'DO Validity Expired')} />
                <KPICard title="Containers in Detention" count={summary.containers_in_detention || 0} color="red" onClick={() => handleCardClick('containers_in_detention', 'Containers in Detention')} />
                <KPICard title="Pending Billing" count={summary.pending_billing || 0} color="red" onClick={() => handleCardClick('pending_billing', 'Pending Billing')} />
                <KPICard title="Incomplete Jobs (> Range)" count={summary.incomplete_jobs || 0} color="red" onClick={() => handleCardClick('incomplete_jobs', 'Incomplete Jobs')} />
            </div>
            <ModalTable open={modalOpen} onClose={() => setModalOpen(false)} title={modalTitle} data={modalData} />
        </div>
    );
};

export default ExceptionsDashboard;
