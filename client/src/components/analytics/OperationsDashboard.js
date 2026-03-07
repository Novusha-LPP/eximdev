import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PulseNav from './PulseNav';
import { useAnalytics } from './AnalyticsContext';
import useLiveAnalytics from '../../hooks/useLiveAnalytics';
import { motion, useSpring, useTransform } from 'framer-motion';
import './ESanchitTV.css';

const AnimatedNumber = ({ value }) => {
    const spring = useSpring(0, { mass: 1, stiffness: 50, damping: 15 });
    const display = useTransform(spring, (current) => Math.round(current));
    useEffect(() => { spring.set(value); }, [value, spring]);
    return <motion.span>{display}</motion.span>;
};

const OperationsDashboard = () => {
    const navigate = useNavigate();
    const { startDate, endDate, importer, selectedBranch } = useAnalytics();
    const { data: rawData, loading } = useLiveAnalytics('operations', startDate, endDate, importer, selectedBranch);

    const isDataLoaded = !loading && rawData && rawData.summary && Object.keys(rawData.summary).length > 0;

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
                    LOADING...
                </motion.div>
            </div>
        );
    }

    const data = rawData && rawData.summary ? rawData : { summary: {} };
    const pending = data.summary.in_examination_planning || 0;

    const severity = pending === 0 ? 'green' : pending <= 5 ? 'amber' : 'red';

    return (
        <div className={`tv-dashboard-wrapper tv-severity-${severity}`}>
            <button className="tv-exit-btn" onClick={() => navigate('/')}>← Exit</button>
            <PulseNav />

            {severity === 'red' && (
                <div className="tv-ember-container">
                    {[...Array(20)].map((_, i) => (
                        <div key={i} className="tv-ember" style={{
                            left: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 4}s`,
                            animationDuration: `${4 + Math.random() * 4}s`,
                            backgroundColor: ['#ef4444', '#f87171', '#fb923c', '#fca5a5'][Math.floor(Math.random() * 4)],
                            width: `${3 + Math.random() * 5}px`,
                            height: `${3 + Math.random() * 5}px`,
                        }} />
                    ))}
                </div>
            )}

            {severity === 'amber' && (
                <>
                    <div className="tv-radar-ring" />
                    <div className="tv-radar-ping" />
                </>
            )}

            {severity === 'green' && (
                <div className="tv-confetti-container">
                    {[...Array(30)].map((_, i) => (
                        <div key={i} className="tv-confetti" style={{
                            left: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 3}s`,
                            animationDuration: `${2.5 + Math.random() * 3}s`,
                            backgroundColor: ['#10b981', '#34d399', '#6ee7b7', '#fbbf24', '#60a5fa', '#a78bfa', '#f472b6', '#fb923c'][Math.floor(Math.random() * 8)],
                            width: `${6 + Math.random() * 8}px`,
                            height: `${6 + Math.random() * 8}px`,
                        }} />
                    ))}
                </div>
            )}

            <div className="tv-center">
                <div className="tv-label">Alvision Pulse — Operations</div>
                <div className={`tv-number tv-number-${severity}`}>
                    <AnimatedNumber value={pending} />
                </div>
                <div className="tv-subtitle">Examination Planning</div>
                {severity === 'green' && (
                    <motion.div
                        className="tv-celebration-msg"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                    >
                        🏆 All Clear! Great job team! 🎉
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default OperationsDashboard;
