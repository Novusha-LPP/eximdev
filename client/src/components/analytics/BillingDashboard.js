import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAnalytics } from './AnalyticsContext';
import KPICard from './KPICard';
import ModalTable from './ModalTable';

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

    const { summary } = data;

    return (
        <div>
            <h2>Billing & Accounts</h2>
            <div className="dashboard-grid">
                <KPICard title="Billing Sheet Sent" count={summary.billing_sheet_sent || 0} color="green" onClick={() => handleCardClick('billing_sheet_sent', 'Billing Sheet Sent')} />
                <KPICard title="Bill Generated" count={summary.bill_generated || 0} color="green" onClick={() => handleCardClick('bill_generated', 'Bill Generated')} />
                <KPICard title="Operation Completed" count={summary.operation_completed || 0} color="green" onClick={() => handleCardClick('operation_completed', 'Operation Completed')} />
                <KPICard title="Payment Made" count={summary.payment_made || 0} color="green" onClick={() => handleCardClick('payment_made', 'Payment Made')} />
            </div>
            <ModalTable open={modalOpen} onClose={() => setModalOpen(false)} title={modalTitle} data={modalData} />
        </div>
    );
};

export default BillingDashboard;
