import React, { useState, useEffect } from 'react';
import { FiCheckSquare, FiCheck, FiX, FiInfo } from 'react-icons/fi';
import Button from './common/Button';
import attendanceAPI from '../../api/attendance/attendance.api';
import { formatDate } from './utils/helpers';
import toast from 'react-hot-toast';
import './ApprovalPages.css';

const RegularizationApproval = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const res = await attendanceAPI.getHODDashboard();
            setRequests(res?.data?.pendingRegularization || []);
        } catch (err) {
            toast.error('Failed to load regularization requests');
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (id, status) => {
        try {
            await attendanceAPI.approveRequest('regularization', id, status);
            toast.success(`Request ${status} successfully`);
            setRequests(prev => prev.filter(r => r.id !== id));
        } catch (err) {
            toast.error('Action failed');
        }
    };

    if (loading) {
        return <div className="approval-page"><div className="ap-loading">Loading...</div></div>;
    }

    return (
        <div className="approval-page">
            <header className="ap-header">
                <div>
                    <h1>Regularization Approvals</h1>
                    <p>Manage and rectify attendance anomalies.</p>
                </div>
            </header>

            <div className="ap-table-container">
                {requests.length === 0 ? (
                    <div className="ap-empty">
                        <FiCheckSquare size={48} strokeWidth={1} />
                        <p>No regularization requests pending.</p>
                    </div>
                ) : (
                    <table className="ap-table">
                        <thead>
                            <tr>
                                <th>Employee</th>
                                <th>Anomaly Type</th>
                                <th>Date</th>
                                <th>Reason</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requests.map((req) => (
                                <tr key={req.id}>
                                    <td className="cell-emp-name">{req.employeeName}</td>
                                    <td className="cell-meta">{req.type?.replace('_', ' ')}</td>
                                    <td className="cell-meta">{formatDate(req.date, 'dd MMM yyyy')}</td>
                                    <td className="cell-reason" title={req.reason}>{req.reason || 'No reason provided'}</td>
                                    <td className="cell-actions">
                                        <button
                                            className="btn-icon btn-approve"
                                            onClick={() => handleAction(req.id, 'approved')}
                                            title="Approve"
                                        >
                                            <FiCheck size={14} /> Approve
                                        </button>
                                        <button
                                            className="btn-icon btn-reject"
                                            onClick={() => handleAction(req.id, 'rejected')}
                                            title="Reject"
                                        >
                                            <FiX size={14} /> Reject
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default RegularizationApproval;


