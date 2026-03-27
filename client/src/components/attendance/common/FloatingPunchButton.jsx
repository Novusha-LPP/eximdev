import React, { useState, useEffect } from 'react';
import attendanceAPI from '../../../api/attendance/attendance.api';
import toast from 'react-hot-toast';
import './FloatingPunchButton.css';

const FloatingPunchButton = () => {
    const [checking, setChecking] = useState(false);
    const [punchStatus, setPunchStatus] = useState(null);
    const [liveWorkHours, setLiveWorkHours] = useState('0h 0m 0s');
    const [isDragging, setIsDragging] = useState(false);
    const [pos, setPos] = useState(() => {
        const saved = localStorage.getItem('punch_btn_pos');
        return saved ? JSON.parse(saved) : { bottom: '2rem', right: '2rem' };
    });
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [hasMoved, setHasMoved] = useState(false);

    useEffect(() => {
        fetchStatus();
        
        const handleStatusUpdate = () => {
            fetchStatus();
        };

        window.addEventListener('attendance-updated', handleStatusUpdate);
        const intervalId = setInterval(fetchStatus, 60000); // Poll status every minute
        
        return () => {
            window.removeEventListener('attendance-updated', handleStatusUpdate);
            clearInterval(intervalId);
        };
    }, []);

    useEffect(() => {
        let timerId;
        if (punchStatus?.action === 'OUT' && punchStatus.sessionStartTime) {
            const updateTimer = () => {
                const sessionStart = new Date(punchStatus.sessionStartTime);
                const now = new Date();
                const diffMs = now - sessionStart;
                const currentSessionSeconds = Math.floor(diffMs / 1000);
                const totalSeconds = Math.round((punchStatus.previousSessionsHours || 0) * 3600) + currentSessionSeconds;

                const hours = Math.floor(totalSeconds / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                const seconds = totalSeconds % 60;
                setLiveWorkHours(`${hours}h ${minutes}m ${seconds}s`);
            };

            updateTimer();
            timerId = setInterval(updateTimer, 1000);
        } else {
            setLiveWorkHours(punchStatus?.workHours || '0h 0m');
        }

        return () => clearInterval(timerId);
    }, [punchStatus]);

    const fetchStatus = async () => {
        try {
            // Re-using the dashboard endpoint just to get the punch status
            // Backend could have a lighter endpoint but this works for now
            const response = await attendanceAPI.getDashboardData();
            if (response && response.punchStatus) {
                setPunchStatus(response.punchStatus);
            }
        } catch (error) {
            console.error('Failed to fetch punch status', error);
        }
    };

    const handleMouseDown = (e) => {
        setIsDragging(true);
        setHasMoved(false);
        const clientX = e.clientX || e.touches?.[0]?.clientX;
        const clientY = e.clientY || e.touches?.[0]?.clientY;
        setDragStart({ x: clientX, y: clientY });
    };

    useEffect(() => {
        const handleMove = (e) => {
            if (!isDragging) return;
            
            setHasMoved(true);
            const clientX = e.clientX || e.touches?.[0]?.clientX;
            const clientY = e.clientY || e.touches?.[0]?.clientY;

            if (clientX === undefined || clientY === undefined) return;

            setPos(prev => {
                const currentRight = prev.right_px || (typeof prev.right === 'string' ? parseFloat(prev.right) * (prev.right.includes('rem') ? 16 : 1) : prev.right);
                const currentBottom = prev.bottom_px || (typeof prev.bottom === 'string' ? parseFloat(prev.bottom) * (prev.bottom.includes('rem') ? 16 : 1) : prev.bottom);

                const dx = dragStart.x - clientX;
                const dy = dragStart.y - clientY;

                let newRight = currentRight + dx;
                let newBottom = currentBottom + dy;

                // --- BOUNDARY CHECKS ---
                const container = document.querySelector('.floating-punch-container');
                if (container) {
                    const rect = container.getBoundingClientRect();
                    const pad = 10; // Padding from edge

                    // Limit Right (between 0 and window width - button width)
                    const maxRight = window.innerWidth - rect.width - pad;
                    newRight = Math.max(pad, Math.min(newRight, maxRight));

                    // Limit Bottom (between 0 and window height - button height)
                    const maxBottom = window.innerHeight - rect.height - pad;
                    newBottom = Math.max(pad, Math.min(newBottom, maxBottom));
                }

                return {
                    right: `${newRight}px`,
                    bottom: `${newBottom}px`,
                    right_px: newRight,
                    bottom_px: newBottom
                };
            });
            
            setDragStart({ x: clientX, y: clientY });
        };

        const handleEnd = () => {
            if (isDragging) {
                setIsDragging(false);
                localStorage.setItem('punch_btn_pos', JSON.stringify({
                    right: pos.right,
                    bottom: pos.bottom
                }));
            }
        };

        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleEnd);
        window.addEventListener('touchmove', handleMove, { passive: false });
        window.addEventListener('touchend', handleEnd);
        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleEnd);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('touchend', handleEnd);
        };
    }, [isDragging, dragStart, pos]);

    const handlePunch = async (e) => {
        if (hasMoved) {
            e.preventDefault();
            return;
        }
        try {
            setChecking(true);
            let location = null;
            try {
                const pos = await new Promise((resolve, reject) =>
                    navigator.geolocation.getCurrentPosition(resolve, reject)
                );
                location = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
            } catch { }

            const type = punchStatus?.action || 'IN';
            const response = await attendanceAPI.punch({ type, method: 'WEB', location });

            if (response?.message) {
                toast.success(response.message);
                fetchStatus();
                // Trigger a global refresh event if other components need to know
                window.dispatchEvent(new CustomEvent('attendance-updated'));
            }
        } catch (error) {
            toast.error(error?.message || 'Action failed');
        } finally {
            setChecking(false);
        }
    };

    if (!punchStatus) return null;

    return (
        <div 
            className={`floating-punch-container ${isDragging ? 'dragging' : ''}`}
            style={{ 
                bottom: pos.bottom, 
                right: pos.right,
                transition: isDragging ? 'none' : 'all 0.3s ease'
            }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleMouseDown}
        >
            <div className={`status-label-badge ${punchStatus?.action === 'OUT' ? 'active' : 'inactive'}`}>
                {punchStatus?.status || 'Not Checked In'}
            </div>
            <button
                className={`floating-punch-btn ${punchStatus?.action === 'OUT' ? 'punch-out' : 'punch-in'}`}
                onClick={handlePunch}
                disabled={checking}
                style={{ cursor: isDragging ? 'grabbing' : 'pointer' }}
            >
                {checking ? 'Processing...' : (punchStatus?.action === 'OUT' ? 'Punch Out' : 'Punch In')}
                <span className="timer-live">{liveWorkHours}</span>
            </button>
        </div>
    );
};

export default FloatingPunchButton;

