import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { getEndpoint } from './reports-helper';

const CustomerTrainingReport = () => {
    const [trainingData, setTrainingData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [trainingSearch, setTrainingSearch] = useState('');
    const [trainingStatusFilter, setTrainingStatusFilter] = useState('all');

    useEffect(() => {
        const fetchTrainings = async () => {
            setLoading(true);
            try {
                const endpoint = getEndpoint('/customer-trainings');
                const res = await axios.get(endpoint, { withCredentials: true });
                setTrainingData(res.data || []);
            } catch (err) {
                console.error("Error fetching training details for Project Nucleus:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchTrainings();
    }, []);

    const filteredTrainingData = useMemo(() => {
        return trainingData.filter(item => {
            const code = (item.training_code || '').toLowerCase();
            const customer = (item.customerName || '').toLowerCase();
            const trainee = (item.trainee_name || '').toLowerCase();
            const trainer = (item.trainer_name || '').toLowerCase();
            const search = trainingSearch.toLowerCase();
            const matchesSearch = code.includes(search) || customer.includes(search) || trainee.includes(search) || trainer.includes(search);

            let matchesStatus = true;
            if (trainingStatusFilter !== 'all') {
                matchesStatus = item.training_status === trainingStatusFilter;
            }
            return matchesSearch && matchesStatus;
        });
    }, [trainingData, trainingSearch, trainingStatusFilter]);

    const totalTrainings = trainingData.length;
    const completedTrainings = trainingData.filter(t => t.training_status === 'Completed').length;
    const pendingTrainings = trainingData.filter(t => t.training_status === 'Pending').length;
    const ratedTrainings = trainingData.filter(t => t.feedback_rating);
    const avgRating = ratedTrainings.length > 0
        ? (ratedTrainings.reduce((sum, t) => sum + t.feedback_rating, 0) / ratedTrainings.length).toFixed(1)
        : '0.0';

    if (loading) {
        return (
            <div className="nucleus-loading-container">
                <div className="nucleus-loader"></div>
                <div style={{ marginTop: '1rem', color: '#6b7280' }}>Loading report details...</div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Stats Card */}
            <div className="nucleus-stats-card" style={{ borderLeft: '4px solid #8b5cf6', background: 'linear-gradient(90deg, rgba(139, 92, 246, 0.08) 0%, rgba(139, 92, 246, 0.01) 100%)' }}>
                <div className="stats-text" style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'center', width: '100%' }}>
                    <div>
                        Total Sessions: <span className="highlight-val" style={{ color: '#8b5cf6' }}>{totalTrainings}</span>
                    </div>
                    <div>
                        Completed: <span className="highlight-val" style={{ color: '#10b981' }}>{completedTrainings}</span>
                    </div>
                    <div>
                        Pending: <span className="highlight-val" style={{ color: '#f59e0b' }}>{pendingTrainings}</span>
                    </div>
                    <div style={{ marginLeft: 'auto' }}>
                        Average Feedback: <span className="highlight-val" style={{ color: '#eab308' }}>★ {avgRating}</span>
                    </div>
                </div>
            </div>

            {/* Custom Search & Filters */}
            <div className="nucleus-controls-container">
                <div className="nucleus-filter-section">
                    <div className="filter-row custom-filter-row" style={{ marginTop: 0, paddingLeft: 0, background: 'transparent', gap: '1.5rem', display: 'flex', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="filter-label" style={{ minWidth: 'auto', margin: 0 }}>Search:</span>
                            <input
                                type="text"
                                placeholder="Search by code, customer, trainee, trainer..."
                                className="nucleus-input"
                                style={{ width: '300px', padding: '6px 12px', fontSize: '0.9rem' }}
                                value={trainingSearch}
                                onChange={(e) => setTrainingSearch(e.target.value)}
                            />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="filter-label" style={{ minWidth: 'auto', margin: 0 }}>Status:</span>
                            <select
                                value={trainingStatusFilter}
                                onChange={(e) => setTrainingStatusFilter(e.target.value)}
                                className="nucleus-select"
                                style={{ padding: '6px 24px 6px 12px', fontSize: '0.9rem' }}
                            >
                                <option value="all">All Statuses</option>
                                <option value="Completed">Completed</option>
                                <option value="Pending">Pending</option>
                                <option value="Expired">Expired</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="nucleus-table-wrapper">
                <table className="nucleus-table">
                    <thead>
                        <tr>
                            <th>Code</th>
                            <th>Customer Entity</th>
                            <th>Module</th>
                            <th>Trainee Name</th>
                            <th>Date</th>
                            <th>Trainer</th>
                            <th>Mode</th>
                            <th>Status</th>
                            <th>Rating</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTrainingData.length > 0 ? (
                            filteredTrainingData.map((item, index) => (
                                <tr key={item._id || index}>
                                    <td className="mono-text" style={{ fontWeight: 600, color: 'var(--primary-700)' }}>
                                        {item.training_code}
                                    </td>
                                    <td style={{ fontWeight: 600, color: 'var(--slate-800)' }}>
                                        {item.customerName || '—'}
                                    </td>
                                    <td>
                                        <span className="status-pill info" style={{ fontSize: '0.8rem' }}>
                                            {item.training_module}
                                        </span>
                                    </td>
                                    <td style={{ fontWeight: 500 }}>{item.trainee_name}</td>
                                    <td className="mono-text">
                                        {item.training_date ? new Date(item.training_date).toLocaleDateString('en-GB') : '—'}
                                    </td>
                                    <td style={{ fontWeight: 500 }}>{item.trainer_name}</td>
                                    <td>
                                        <span className="status-pill" style={{
                                            backgroundColor: 'rgba(6, 182, 212, 0.08)',
                                            color: 'rgb(6, 182, 212)',
                                            border: '1px solid rgba(6, 182, 212, 0.2)',
                                            fontSize: '0.8rem',
                                            textTransform: 'uppercase'
                                        }}>
                                            {item.training_mode}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`status-pill ${
                                            item.training_status === 'Completed' ? 'success' :
                                            item.training_status === 'Expired' ? 'error' : 'warning'
                                        }`} style={{ fontWeight: 600 }}>
                                            {item.training_status}
                                        </span>
                                    </td>
                                    <td>
                                        {item.feedback_rating ? (
                                            <span style={{ color: '#eab308', fontWeight: 600 }}>
                                                {'★'.repeat(item.feedback_rating)}
                                                <span style={{ color: '#d1d5db' }}>{'★'.repeat(5 - item.feedback_rating)}</span>
                                            </span>
                                        ) : (
                                            <span style={{ color: 'var(--slate-400)', fontStyle: 'italic', fontSize: '0.85rem' }}>Not Rated</span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="9" style={{ textAlign: 'center', color: '#6b7280', padding: '30px' }}>
                                    No training records found matching the search criteria.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CustomerTrainingReport;
