import React, { useEffect, useRef, useState, useContext, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserContext } from "../../contexts/UserContext";

const tabs = [
    { name: 'Combined', path: 'combined' },
    { name: 'e-Sanchit', path: 'esanchit' },
    { name: 'Documentation', path: 'documentation' },
    { name: 'Submission', path: 'submission' },
    { name: 'Operations', path: 'operations' },
    { name: 'DO', path: 'do-management' },
    { name: 'Team Pulse', path: 'team-pulse' },
];

const PulseNav = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [visible, setVisible] = useState(false);
    const hideTimer = useRef(null);

    const { user } = useContext(UserContext);

    const allowedTabs = useMemo(() => {
        const userModules = user?.modules || [];
        return tabs.filter(tab => {
            if (tab.path === 'team-pulse') {
                return userModules.includes('Team Pulse');
            }
            return userModules.includes('Pulse');
        });
    }, [user]);

    // Auto-rotate every 7 seconds, excluding 'Combined'
    useEffect(() => {
        if (location.pathname.includes('combined')) {
            return; // No rotation while on Combined dashboard
        }

        const interval = setInterval(() => {
            const rotationTabs = allowedTabs.filter(t => t.path !== 'combined');
            if (rotationTabs.length <= 1) return; // No rotation if only 1 tab or less
            const currentIdx = rotationTabs.findIndex(t => location.pathname.includes(t.path));
            if (currentIdx === -1) return;
            const nextIdx = (currentIdx + 1) % rotationTabs.length;
            navigate(`/pulse/${rotationTabs[nextIdx].path}`, { replace: true });
        }, 7000);

        return () => clearInterval(interval);
    }, [location.pathname, navigate, allowedTabs]);

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
            {allowedTabs.map((tab) => (
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
