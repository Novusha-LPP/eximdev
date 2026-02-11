
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import KPICard from './KPICard';
import ModalTable from './ModalTable';
import './KPICard.css'; // Ensure styling is available
import './ModalTable.css';
import { CircularProgress, Box } from '@mui/material';

const PendingJobs = () => {
    const navigate = useNavigate();
    const [counts, setCounts] = useState({
        submission: 0,
        documentation: 0,
        esanchit: 0,
        doPlanning: 0
    });
    const [jobsData, setJobsData] = useState({
        submission: [],
        documentation: [],
        esanchit: [],
        doPlanning: []
    });
    const [loading, setLoading] = useState(true);

    const [modalOpen, setModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState('');
    const [modalData, setModalData] = useState([]);
    const [dateLabel, setDateLabel] = useState('Date');

    const fetchJobs = async () => {
        setLoading(true);
        try {
            // Fetch with limit=1000 to get a good list for the modal. 
            // In a real large-scale app, we might fetch list only on click, but for < 1000 items this is fine.
            const [submissionRes, documentationRes, esanchitRes, doRes] = await Promise.allSettled([
                axios.get(`${process.env.REACT_APP_API_STRING}/get-submission-jobs`, { params: { limit: 1000 } }),
                axios.get(`${process.env.REACT_APP_API_STRING}/get-documentation-jobs`, { params: { limit: 1000 } }),
                axios.get(`${process.env.REACT_APP_API_STRING}/get-esanchit-jobs`, { params: { limit: 1000 } }),
                axios.get(`${process.env.REACT_APP_API_STRING}/get-do-module-jobs`, { params: { limit: 1000 } })
            ]);

            const newCounts = { ...counts };
            const newJobs = { ...jobsData };

            if (submissionRes.status === 'fulfilled') {
                newCounts.submission = submissionRes.value.data.totalJobs || 0;
                newJobs.submission = submissionRes.value.data.jobs || [];
            }
            if (documentationRes.status === 'fulfilled') {
                newCounts.documentation = documentationRes.value.data.totalJobs || 0;
                newJobs.documentation = documentationRes.value.data.jobs || [];
            }
            if (esanchitRes.status === 'fulfilled') {
                newCounts.esanchit = esanchitRes.value.data.totalJobs || 0;
                newJobs.esanchit = esanchitRes.value.data.jobs || [];
            }
            if (doRes.status === 'fulfilled') {
                // For DO, assume totalJobs reflects the filtered count
                newCounts.doPlanning = doRes.value.data.totalJobs || 0;
                newJobs.doPlanning = doRes.value.data.jobs || [];
            }

            setCounts(newCounts);
            setJobsData(newJobs);
        } catch (error) {
            console.error("Error fetching pending jobs", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchJobs();
    }, []);

    const handleCardClick = (type) => {
        let title = '';
        let data = [];
        let label = 'Date';

        // Map data to match ModalTable expectation: 
        // { job_no, importer, shipping_line_airline, relevant_date, container_number }

        switch (type) {
            case 'submission':
                title = 'Pending Submission Jobs';
                label = 'Job Date';
                data = jobsData.submission.map(job => ({
                    ...job,
                    relevant_date: job.job_date || job.created_at || new Date().toISOString(),
                    container_number: Array.isArray(job.container_nos) ? job.container_nos.map(c => c.container_number).join(', ') : ''
                }));
                break;
            case 'documentation':
                title = 'Pending Documentation Jobs';
                label = 'Job Date';
                data = jobsData.documentation.map(job => ({
                    ...job,
                    relevant_date: job.job_date || new Date().toISOString(),
                    container_number: Array.isArray(job.container_nos) ? job.container_nos.map(c => c.container_number).join(', ') : ''
                }));
                break;
            case 'esanchit':
                title = 'Pending E-Sanchit Jobs';
                label = 'Start Date';
                data = jobsData.esanchit.map(job => ({
                    ...job,
                    relevant_date: job.job_date || new Date().toISOString(),
                    container_number: Array.isArray(job.container_nos) ? job.container_nos.map(c => c.container_number).join(', ') : ''
                }));
                break;
            case 'doPlanning':
                title = 'Pending DO Planning Jobs';
                label = 'Planning Date';
                data = jobsData.doPlanning.map(job => ({
                    ...job,
                    relevant_date: job.do_planning_date || new Date().toISOString(),
                    container_number: Array.isArray(job.container_nos) ? job.container_nos.map(c => c.container_number).join(', ') : ''
                }));
                break;
            default:
                break;
        }

        setModalTitle(title);
        setDateLabel(label);
        setModalData(data);
        setModalOpen(true);
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <div className="overview-container">
            <div className="section-header">
                <h2>Pending Jobs</h2>
                <p>Status of all currently pending jobs</p>
            </div>

            <div className="dashboard-grid">
                <KPICard
                    title="Submission Pending"
                    count={counts.submission}
                    color="orange"
                    onClick={() => navigate('/submission')}
                />
                <KPICard
                    title="Documentation Pending"
                    count={counts.documentation}
                    color="blue"
                    onClick={() => navigate('/documentation')}
                />
                <KPICard
                    title="E-Sanchit Pending"
                    count={counts.esanchit}
                    color="teal"
                    onClick={() => navigate('/e-sanchit')}
                />
                <KPICard
                    title="DO Planning Pending"
                    count={counts.doPlanning}
                    color="purple"
                    onClick={() => navigate('/import-do')}
                />
            </div>

            {/* Modal functionality is preserved in code but not triggered by current cards */}
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

export default PendingJobs;
