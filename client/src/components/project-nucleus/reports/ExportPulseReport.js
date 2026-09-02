import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { motion, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import { getEndpoint } from './reports-helper';

const AnimatedNumber = ({ value }) => {
    const numericValue = Number(value) || 0;
    const spring = useSpring(0, { mass: 1, stiffness: 50, damping: 15 });
    const display = useTransform(spring, (current) => Math.round(Number(current) || 0));
    
    useEffect(() => { 
        spring.set(numericValue); 
    }, [numericValue, spring]);
    
    return <motion.span>{display}</motion.span>;
};

const ExportPulseReport = () => {
    const [pulseData, setPulseData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    
    // Use ref to keep track of the abort controller for cleanup
    const abortControllerRef = useRef(null);

    const fetchPulseData = useCallback(async (isManualRefresh = false) => {
        if (isManualRefresh) setIsRefreshing(true);
        else if (!pulseData) setLoading(true);

        // Cancel previous request if it's still pending
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        
        abortControllerRef.current = new AbortController();

        try {
            const url = getEndpoint('/export-analytics/pulse?exporter=');
            const res = await axios.get(url, {
                withCredentials: true,
                signal: abortControllerRef.current.signal
            });
            
            if (res.data && res.data.success) {
                setPulseData(res.data.summary);
                setLastUpdated(new Date());
                setError(null);
            } else {
                setError('Failed to fetch export pulse data: Invalid response format.');
            }
        } catch (err) {
            if (axios.isCancel(err)) {
                console.log('Request canceled:', err.message);
            } else {
                console.error('Error fetching export pulse:', err);
                setError(err.response?.data?.message || err.message || 'Failed to fetch export pulse data.');
            }
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }, [pulseData]);

    useEffect(() => {
        fetchPulseData();
        
        // Refresh every 30 seconds
        const interval = setInterval(() => {
            fetchPulseData(false);
        }, 30000);
        
        return () => {
            clearInterval(interval);
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [fetchPulseData]);

    if (loading && !pulseData) {
        return (
            <div className="nucleus-loading-container" style={{ minHeight: '300px' }}>
                <div className="nucleus-loader"></div>
                <div style={{ marginTop: '1rem', color: '#6b7280', fontWeight: '500' }}>Initializing Pulse Data...</div>
            </div>
        );
    }

    const cards = [
        { label: 'Total Pending', value: pulseData?.totalPending || 0, color: 'var(--primary-600)', bg: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(6, 182, 212, 0.02) 100%)', border: 'var(--primary-500)' },
        { label: 'Handover', value: pulseData?.handover || 0, color: '#f59e0b', bg: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.02) 100%)', border: '#f59e0b' },
        { label: 'Billing', value: pulseData?.billing || 0, color: '#8b5cf6', bg: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(139, 92, 246, 0.02) 100%)', border: '#8b5cf6' },
        { label: 'Operations', value: pulseData?.ops || 0, color: '#ec4899', bg: 'linear-gradient(135deg, rgba(236, 72, 153, 0.1) 0%, rgba(236, 72, 153, 0.02) 100%)', border: '#ec4899' },
        { label: 'Created Today', value: pulseData?.createdToday || 0, color: '#10b981', bg: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.02) 100%)', border: '#10b981' }
    ];

    return (
        <div style={{ padding: '10px 0' }}>
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {lastUpdated && (
                        <div style={{ fontSize: '0.85rem', color: 'var(--slate-400)' }}>
                            Last updated: {lastUpdated.toLocaleTimeString()}
                        </div>
                    )}
                    <button 
                        onClick={() => fetchPulseData(true)}
                        disabled={isRefreshing}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            background: 'white', border: '1px solid var(--slate-200)',
                            padding: '6px 12px', borderRadius: '6px',
                            color: 'var(--slate-700)', fontSize: '0.85rem', fontWeight: '500',
                            cursor: isRefreshing ? 'not-allowed' : 'pointer',
                            opacity: isRefreshing ? 0.7 : 1,
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => { if (!isRefreshing) e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                        onMouseOut={(e) => { if (!isRefreshing) e.currentTarget.style.backgroundColor = 'white'; }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }}>
                            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.59-10.87l5.25 5.3"/>
                        </svg>
                        Refresh
                    </button>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {error ? (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="nucleus-stats-card" 
                        style={{ borderLeft: '4px solid #ef4444', backgroundColor: '#fef2f2', marginBottom: '20px' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                            </svg>
                            <div>
                                <h3 style={{ color: '#991b1b', margin: '0 0 4px 0', fontSize: '1rem' }}>Connection Error</h3>
                                <p style={{ color: '#b91c1c', margin: 0, fontSize: '0.9rem' }}>{error}</p>
                            </div>
                        </div>
                    </motion.div>
                ) : null}
            </AnimatePresence>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px' }}>
                {cards.map((card, idx) => (
                    <motion.div
                        key={card.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: idx * 0.1, ease: "easeOut" }}
                        whileHover={{ y: -4, transition: { duration: 0.2 } }}
                        style={{
                            background: card.bg,
                            borderLeft: `4px solid ${card.border}`,
                            borderRadius: '10px',
                            padding: '24px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                    >
                        <div style={{ color: 'var(--slate-500)', fontSize: '0.9rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', zIndex: 1 }}>
                            {card.label}
                        </div>
                        <div style={{ fontSize: '3rem', fontWeight: '800', color: card.color, lineHeight: 1, zIndex: 1 }}>
                            <AnimatedNumber value={card.value} />
                        </div>
                        
                        {/* Decorative background element */}
                        <div style={{
                            position: 'absolute',
                            right: '-10%',
                            bottom: '-20%',
                            opacity: 0.05,
                            transform: 'rotate(-15deg)',
                            pointerEvents: 'none'
                        }}>
                            <svg width="120" height="120" viewBox="0 0 24 24" fill="currentColor">
                                <circle cx="12" cy="12" r="10" />
                            </svg>
                        </div>
                    </motion.div>
                ))}
            </div>
            
            {/* Define the spin animation used by the refresh button if it's not defined globally */}
            <style>
                {`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                `}
            </style>
        </div>
    );
};

export default ExportPulseReport;
