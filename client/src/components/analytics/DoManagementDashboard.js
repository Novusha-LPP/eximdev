import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAnalytics } from './AnalyticsContext';
import KPICard from './KPICard';
import ModalTable from './ModalTable';

const DoManagementDashboard = () => {
    const { startDate, endDate } = useAnalytics();
    const [data, setData] = useState({ summary: {}, details: {} });
    const [modalOpen, setModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState('');
    const [modalData, setModalData] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get(`${process.env.REACT_APP_API_STRING}/analytics/do-management`, {
                    params: { startDate, endDate }
                });
                setData(response.data);
            } catch (error) {
                console.error("Error fetching DO data", error);
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
            <h2>DO Management</h2>
            <div className="dashboard-grid">
                <KPICard title="DO Planned" count={summary.do_planned || 0} color="orange" onClick={() => handleCardClick('do_planned', 'DO Planned')} />
                <KPICard title="DO Prepared" count={summary.do_prepared || 0} color="orange" onClick={() => handleCardClick('do_prepared', 'DO Prepared')} />
                <KPICard title="DO Received" count={summary.do_received || 0} color="orange" onClick={() => handleCardClick('do_received', 'DO Received')} />
                <KPICard title="DO Completed" count={summary.do_completed || 0} color="orange" onClick={() => handleCardClick('do_completed', 'DO Completed')} />
                <KPICard title="DO Revalidated" count={summary.do_revalidated || 0} color="orange" onClick={() => handleCardClick('do_revalidated', 'DO Revalidated')} />
                <KPICard title="DO Expiring (Job)" count={summary.do_expiring_job || 0} color="red" onClick={() => handleCardClick('do_expiring_job', 'DO Expiring (Job)')} />
                <KPICard title="Container DO Expiry" count={summary.container_do_expiry || 0} color="red" onClick={() => handleCardClick('container_do_expiry', 'Container DO Expiry')} />
            </div>
            <ModalTable open={modalOpen} onClose={() => setModalOpen(false)} title={modalTitle} data={modalData} />
        </div>
    );
};

export default DoManagementDashboard;
