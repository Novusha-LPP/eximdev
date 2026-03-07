import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PulseNav from './PulseNav';
import { useAnalytics } from './AnalyticsContext';
import useLiveAnalytics from '../../hooks/useLiveAnalytics';
import { motion, useSpring, useTransform } from 'framer-motion';
import './ESanchitTV.css';

const AnimatedNumber = ({ value }) => {
    const numericValue = Number(value) || 0;
    const spring = useSpring(0, { mass: 1, stiffness: 50, damping: 15 });
    const display = useTransform(spring, (current) => Math.round(Number(current) || 0));
    useEffect(() => { spring.set(numericValue); }, [numericValue, spring]);
    return <motion.span>{display}</motion.span>;
};

const getStatusMessage = (value, severity) => {
    if (severity === 'green') {
        const msgs = ["All Clear!", "Great job!", "Zero pending!", "Mission Success!"];
        return msgs[value % msgs.length];
    }
    if (severity === 'amber') {
        const msgs = ["Pickup speed!", "Almost there!", "Keep moving!", "Final stretch!"];
        return msgs[value % msgs.length];
    }
    return "Action Required";
};

const PulseCard = ({ title, value, path }) => {
    const navigate = useNavigate();
    const severity = value === 0 ? 'green' : value <= 5 ? 'amber' : 'red';
    const statusMsg = getStatusMessage(value, severity);

    return (
        <motion.div
            className={`tv-pulse-card tv-severity-${severity}`}
            onClick={() => navigate(`/pulse/${path}`)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <div className="tv-card-label">{title}</div>
            <div className={`tv-card-number tv-number-${severity}`}>
                <AnimatedNumber value={value} />
            </div>
            <div className="tv-card-status">
                {severity === 'green' && <span className="tv-icon">🏆</span>}
                {severity === 'amber' && <span className="tv-icon">⚡</span>}
                {severity === 'red' && <span className="tv-icon">🚨</span>}
                {statusMsg}
            </div>
        </motion.div>
    );
};

const CombinedDashboard = () => {
    const navigate = useNavigate();
    const { startDate, endDate, importer, selectedBranch } = useAnalytics();
    const { data: rawData, loading } = useLiveAnalytics('pulse', startDate, endDate, importer, selectedBranch);

    const summary = rawData?.summary || {};
    const isDataLoaded = !loading && Object.keys(summary).length > 0;

    if (!isDataLoaded) {
        return (
            <div className="tv-dashboard-wrapper">
                <button className="tv-exit-btn" onClick={() => navigate('/')}>← Exit</button>
                <PulseNav />
                <motion.div
                    className="tv-loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ repeat: Infinity, duration: 1.5, repeatType: "reverse" }}
                >
                    LOADING PULSE...
                </motion.div>
            </div>
        );
    }

    // Data is already extracted into 'summary' variable above

    return (
        <div className="tv-dashboard-wrapper tv-combined-dashboard">
            <button className="tv-exit-btn" onClick={() => navigate('/')}>← Exit</button>
            <PulseNav />

            <div className="tv-combined-container">
                <div className="tv-combined-header">
                    <h1>Alvision — Pulse Overview</h1>
                    <p>Real-time monitoring across all modules</p>
                </div>
                <div className="tv-combined-grid">
                    <PulseCard title="e-Sanchit" value={summary.esanchit || 0} path="esanchit" />
                    <PulseCard title="Documentation" value={summary.documentation || 0} path="documentation" />
                    <PulseCard title="Submission" value={summary.submission || 0} path="submission" />
                    <PulseCard title="Operations" value={summary.operations || 0} path="operations" />
                    <PulseCard title="DO Planning" value={summary.do || 0} path="do-management" />
                </div>
            </div>
        </div>
    );
};

export default CombinedDashboard;
