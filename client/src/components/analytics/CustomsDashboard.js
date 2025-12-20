import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAnalytics } from './AnalyticsContext';
import KPICard from './KPICard';
import ModalTable from './ModalTable';

const CustomsDashboard = () => {
    const { startDate, endDate } = useAnalytics();
    const [data, setData] = useState({ summary: {}, details: {} });
    const [modalOpen, setModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState('');
    const [modalData, setModalData] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get(`${process.env.REACT_APP_API_STRING}/analytics/customs`, {
                    params: { startDate, endDate }
                });
                setData(response.data);
            } catch (error) {
                console.error("Error fetching customs data", error);
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
            <h2>Customs Clearance</h2>
            <div className="dashboard-grid">
                <KPICard title="IGM" count={summary.igm || 0} color="purple" onClick={() => handleCardClick('igm', 'IGM')} />
                <KPICard title="Gateway IGM" count={summary.gateway_igm || 0} color="purple" onClick={() => handleCardClick('gateway_igm', 'Gateway IGM')} />
                <KPICard title="BE Filed" count={summary.be_filed || 0} color="purple" onClick={() => handleCardClick('be_filed', 'BE Filed')} />
                <KPICard title="Assessment" count={summary.assessment || 0} color="purple" onClick={() => handleCardClick('assessment', 'Assessment')} />
                <KPICard title="Duty Paid" count={summary.duty_paid || 0} color="purple" onClick={() => handleCardClick('duty_paid', 'Duty Paid')} />
                <KPICard title="PCV" count={summary.pcv || 0} color="purple" onClick={() => handleCardClick('pcv', 'PCV')} />
                <KPICard title="OOC" count={summary.ooc || 0} color="purple" onClick={() => handleCardClick('ooc', 'OOC')} />
                <KPICard title="Discharge" count={summary.discharge || 0} color="purple" onClick={() => handleCardClick('discharge', 'Discharge')} />
            </div>
            <ModalTable open={modalOpen} onClose={() => setModalOpen(false)} title={modalTitle} data={modalData} />
        </div>
    );
};

export default CustomsDashboard;
