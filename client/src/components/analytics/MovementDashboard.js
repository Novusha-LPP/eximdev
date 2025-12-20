import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAnalytics } from './AnalyticsContext';
import KPICard from './KPICard';
import ModalTable from './ModalTable';

const MovementDashboard = () => {
    const { startDate, endDate } = useAnalytics();
    const [data, setData] = useState({ summary: {}, details: {} });
    const [modalOpen, setModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState('');
    const [modalData, setModalData] = useState([]);
    const [dateLabel, setDateLabel] = useState('Relevant Date');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get(`${process.env.REACT_APP_API_STRING}/analytics/movement`, {
                    params: { startDate, endDate }
                });
                setData(response.data);
            } catch (error) {
                console.error("Error fetching movement data", error);
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
            <h2>Container Movement</h2>
            <div className="dashboard-grid">
                <KPICard title="Arrived" count={summary.arrived || 0} color="blue" onClick={() => handleCardClick('arrived', 'Arrived', 'Arrival Date')} />
                <KPICard title="Rail Out" count={summary.rail_out || 0} color="blue" onClick={() => handleCardClick('rail_out', 'Rail Out', 'Rail Out Date')} />
                <KPICard title="Delivered" count={summary.delivered || 0} color="blue" onClick={() => handleCardClick('delivered', 'Delivered', 'Delivery Date')} />
                <KPICard title="Empty Offload" count={summary.empty_offload || 0} color="blue" onClick={() => handleCardClick('empty_offload', 'Empty Offload', 'Offload Date')} />
                <KPICard title="By Road" count={summary.by_road || 0} color="blue" onClick={() => handleCardClick('by_road', 'By Road', 'Movement Date')} />
                <KPICard title="Detention Start" count={summary.detention_start || 0} color="red" onClick={() => handleCardClick('detention_start', 'Detention Start', 'Start Date')} />
            </div>
            <ModalTable open={modalOpen} onClose={() => setModalOpen(false)} title={modalTitle} dateLabel={dateLabel} data={modalData} />
        </div>
    );
};

export default MovementDashboard;
