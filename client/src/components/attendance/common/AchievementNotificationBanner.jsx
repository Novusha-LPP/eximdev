import React, { useState, useEffect, useCallback, useContext } from 'react';
import { UserContext } from '../../../contexts/UserContext';
import attendanceAPI from '../../../api/attendance/attendance.api';

const getAwardTheme = (tag) => {
    switch (tag) {
        case 'Best Employee of the Month':
            return {
                icon: '🌟',
                title: 'Best Employee of the Month',
                gradient: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fde68a 100%)',
                borderColor: '#f59e0b',
                ringColor: '#f59e0b',
                textColor: '#92400e',
                btnBg: '#f59e0b',
                btnHover: '#d97706'
            };
        case 'Best QC Inspector':
            return {
                icon: '🔍',
                title: 'Best QC Inspector',
                gradient: 'linear-gradient(135deg, #ecfeff 0%, #cffafe 50%, #a5f3fc 100%)',
                borderColor: '#06b6d4',
                ringColor: '#06b6d4',
                textColor: '#155e75',
                btnBg: '#0891b2',
                btnHover: '#0e7490'
            };
        case 'Best 5s Zone':
            return {
                icon: '🏆',
                title: 'Best 5s Zone',
                gradient: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 50%, #a7f3d0 100%)',
                borderColor: '#10b981',
                ringColor: '#10b981',
                textColor: '#065f46',
                btnBg: '#059669',
                btnHover: '#047857'
            };
        case 'Best Operator':
            return {
                icon: '⚙️',
                title: 'Best Operator',
                gradient: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 50%, #c7d2fe 100%)',
                borderColor: '#6366f1',
                ringColor: '#6366f1',
                textColor: '#3730a3',
                btnBg: '#4f46e5',
                btnHover: '#4338ca'
            };
        default:
            return {
                icon: '🌟',
                title: tag || 'Employee Achievement',
                gradient: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                borderColor: '#f59e0b',
                ringColor: '#f59e0b',
                textColor: '#92400e',
                btnBg: '#f59e0b',
                btnHover: '#d97706'
            };
    }
};

const AchievementNotificationBanner = () => {
    const { user } = useContext(UserContext);
    const [notifications, setNotifications] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(false);

    const fetchNotifications = useCallback(async () => {
        if (!user?._id) return;
        try {
            const res = await attendanceAPI.getUnreadAchievementNotifications();
            if (res && Array.isArray(res.notifications) && res.notifications.length > 0) {
                setNotifications(res.notifications);
                setIsVisible(true);
            }
        } catch (err) {
            console.warn('Failed to fetch achievement notifications:', err);
        }
    }, [user?._id]);

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60 * 1000); // Check every minute
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    const handleDismiss = async (notificationId) => {
        try {
            await attendanceAPI.markAchievementNotificationRead({ notification_id: notificationId });
            setNotifications(prev => {
                const updated = prev.filter(n => n._id !== notificationId);
                if (updated.length === 0) {
                    setIsVisible(false);
                } else if (currentIndex >= updated.length) {
                    setCurrentIndex(0);
                }
                return updated;
            });
        } catch (e) {
            console.warn('Error marking notification as read:', e);
        }
    };

    if (!isVisible || notifications.length === 0) return null;

    const current = notifications[currentIndex] || notifications[0];
    if (!current) return null;

    const isRecipient = Boolean(
        (current.employee_id && user?._id && String(current.employee_id) === String(user._id)) ||
        (current.employee_username && user?.username && String(current.employee_username).toLowerCase() === String(user.username).toLowerCase())
    );

    const theme = getAwardTheme(current.achievement_tag);

    return (
        <div style={{
            position: 'fixed',
            bottom: '28px',
            right: '28px',
            zIndex: 9999,
            maxWidth: '430px',
            width: 'calc(100vw - 56px)',
            background: theme.gradient,
            border: `2px solid ${theme.borderColor}`,
            borderRadius: '16px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.18), 0 0 20px rgba(245, 158, 11, 0.25)',
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            animation: 'slideUpBounce 0.4s ease-out',
            fontFamily: 'inherit'
        }}>
            <style>{`
                @keyframes slideUpBounce {
                    0% { transform: translateY(100px) scale(0.95); opacity: 0; }
                    70% { transform: translateY(-8px) scale(1.02); opacity: 1; }
                    100% { transform: translateY(0) scale(1); opacity: 1; }
                }
            `}</style>

            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '22px' }}>{isRecipient ? '🏆' : '🎉'}</span>
                    <div>
                        <div style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.8px', color: theme.textColor }}>
                            {isRecipient ? 'Congratulations To You!' : 'Achievement Announcement'}
                        </div>
                        <div style={{ fontSize: '13.5px', fontWeight: '800', color: '#1e293b' }}>
                            {theme.icon} {theme.title}
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => handleDismiss(current._id)}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        fontSize: '18px',
                        fontWeight: '700',
                        color: theme.textColor,
                        cursor: 'pointer',
                        padding: '0 4px',
                        lineHeight: 1,
                        opacity: 0.7,
                        transition: 'opacity 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity = 1}
                    onMouseLeave={e => e.currentTarget.style.opacity = 0.7}
                    title="Dismiss"
                >
                    ✕
                </button>
            </div>

            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: 'rgba(255, 255, 255, 0.75)',
                padding: '12px 14px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.95)'
            }}>
                <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: current.employee_photo ? `url(${current.employee_photo}) center/cover` : theme.btnBg,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '800',
                    fontSize: '17px',
                    flexShrink: 0,
                    boxShadow: `0 0 0 2.5px #fff, 0 0 10px ${theme.ringColor}`
                }}>
                    {!current.employee_photo && (current.employee_name?.[0] || 'E').toUpperCase()}
                </div>
                <div style={{ overflow: 'hidden' }}>
                    {isRecipient ? (
                        <>
                            <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
                                You are the {current.achievement_tag}!
                            </div>
                            <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
                                Outstanding work and dedication! Keep shining! 🌟
                            </div>
                        </>
                    ) : (
                        <>
                            <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {current.employee_name}
                            </div>
                            <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
                                has been awarded <strong>{current.achievement_tag}</strong>! 👏
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                <div style={{ fontSize: '11px', color: theme.textColor, fontWeight: '600' }}>
                    {notifications.length > 1 && `${currentIndex + 1} of ${notifications.length} awards`}
                </div>
                <button
                    onClick={() => handleDismiss(current._id)}
                    style={{
                        padding: '6px 16px',
                        borderRadius: '8px',
                        border: 'none',
                        background: theme.btnBg,
                        color: '#fff',
                        fontSize: '11.5px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = theme.btnHover}
                    onMouseLeave={e => e.currentTarget.style.background = theme.btnBg}
                >
                    {isRecipient ? 'Got It' : 'Dismiss'}
                </button>
            </div>
        </div>
    );
};

export default AchievementNotificationBanner;
