import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const tabs = [
    { name: 'e-Sanchit', path: 'esanchit' },
    { name: 'Documentation', path: 'documentation' },
    { name: 'Submission', path: 'submission' },
    { name: 'Operations', path: 'operations' },
    { name: 'DO', path: 'do-management' },
];

const PulseNav = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [visible, setVisible] = useState(false);
    const hideTimer = useRef(null);

    // Auto-rotate every 7 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            const currentIdx = tabs.findIndex(t => location.pathname.includes(t.path));
            const nextIdx = (currentIdx + 1) % tabs.length;
            navigate(`/pulse/${tabs[nextIdx].path}`, { replace: true });
        }, 7000);

        return () => clearInterval(interval);
    }, [location.pathname, navigate]);

    // Show nav on mouse move, hide after 3 seconds of inactivity
    useEffect(() => {
        const handleMouseMove = () => {
            setVisible(true);
            clearTimeout(hideTimer.current);
            hideTimer.current = setTimeout(() => setVisible(false), 3000);
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            clearTimeout(hideTimer.current);
        };
    }, []);

    return (
        <nav className="tv-nav" style={{
            opacity: visible ? 1 : 0,
            transform: `translateX(-50%) translateY(${visible ? '0' : '10px'})`,
        }}>
            {tabs.map((tab) => (
                <button
                    key={tab.path}
                    className={`tv-nav-btn${location.pathname.includes(tab.path) ? ' active' : ''}`}
                    onClick={() => navigate(`/pulse/${tab.path}`)}
                >
                    {tab.name}
                </button>
            ))}
        </nav>
    );
};

export default PulseNav;
