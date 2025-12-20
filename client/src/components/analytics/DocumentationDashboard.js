import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAnalytics } from './AnalyticsContext';
import KPICard from './KPICard';
import ModalTable from './ModalTable';

const DocumentationDashboard = () => {
    const { startDate, endDate } = useAnalytics();
    const [data, setData] = useState({ summary: {}, details: {} });
    const [modalOpen, setModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState('');
    const [modalData, setModalData] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get(`${process.env.REACT_APP_API_STRING}/analytics/documentation`, {
                    params: { startDate, endDate }
                });
                setData(response.data);
            } catch (error) {
                console.error("Error fetching documentation data", error);
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
            <h2>Documentation Pipeline</h2>
            <div className="dashboard-grid">
                <KPICard title="Checklist Approved" count={summary.checklist_approved || 0} color="teal" onClick={() => handleCardClick('checklist_approved', 'Checklist Approved')} />
                <KPICard title="Docs Received" count={summary.docs_received || 0} color="teal" onClick={() => handleCardClick('docs_received', 'Docs Received')} />
                <KPICard title="Docs Completed" count={summary.documentation_completed || 0} color="teal" onClick={() => handleCardClick('documentation_completed', 'Docs Completed')} />
                <KPICard title="eSanchit Completed" count={summary.esanchit_completed || 0} color="teal" onClick={() => handleCardClick('esanchit_completed', 'eSanchit Completed')} />
                <KPICard title="Submission Completed" count={summary.submission_completed || 0} color="teal" onClick={() => handleCardClick('submission_completed', 'Submission Completed')} />
            </div>
            <ModalTable open={modalOpen} onClose={() => setModalOpen(false)} title={modalTitle} data={modalData} />
        </div>
    );
};

export default DocumentationDashboard;
