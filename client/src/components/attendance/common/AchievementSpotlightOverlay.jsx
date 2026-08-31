import React, { useState, useEffect, useCallback, useContext } from 'react';
import confetti from 'canvas-confetti';
import { UserContext } from '../../../contexts/UserContext';
import attendanceAPI from '../../../api/attendance/attendance.api';

const getThemeConfig = (tag) => {
    switch (tag) {
        case 'Best Employee of the Month':
            return {
                icon: '🌟',
                badgeText: 'EMPLOYEE EXCELLENCE',
                title: 'Best Employee of the Month',
                primaryColor: '#d97706',
                secondaryColor: '#b45309',
                glowColor: 'rgba(217, 119, 6, 0.25)',
                beamGradient: 'radial-gradient(circle at 50% 15%, rgba(245, 158, 11, 0.15) 0%, rgba(251, 191, 36, 0.05) 45%, transparent 70%)',
                pillBg: '#fffbeb',
                pillBorder: '#fde68a',
                pillText: '#b45309',
                plaqueBg: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                plaqueBorder: '#fcd34d',
                plaqueText: '#92400e',
                btnBg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                btnHover: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                ringColor: '#f59e0b',
                confettiColors: ['#f59e0b', '#fbbf24', '#fde68a', '#d97706', '#3b82f6']
            };
        case 'Best QC Inspector':
            return {
                icon: '🔍',
                badgeText: 'QUALITY & PRECISION',
                title: 'Best QC Inspector',
                primaryColor: '#0284c7',
                secondaryColor: '#0369a1',
                glowColor: 'rgba(2, 132, 199, 0.25)',
                beamGradient: 'radial-gradient(circle at 50% 15%, rgba(2, 132, 199, 0.15) 0%, rgba(56, 189, 248, 0.05) 45%, transparent 70%)',
                pillBg: '#f0f9ff',
                pillBorder: '#bae6fd',
                pillText: '#0369a1',
                plaqueBg: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                plaqueBorder: '#7dd3fc',
                plaqueText: '#0369a1',
                btnBg: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                btnHover: 'linear-gradient(135deg, #0369a1 0%, #075985 100%)',
                ringColor: '#0284c7',
                confettiColors: ['#0284c7', '#38bdf8', '#bae6fd', '#0369a1', '#f59e0b']
            };
        case 'Best 5s Zone':
            return {
                icon: '🏆',
                badgeText: '5S WORKPLACE CHAMPION',
                title: 'Best 5s Zone',
                primaryColor: '#059669',
                secondaryColor: '#047857',
                glowColor: 'rgba(5, 150, 105, 0.25)',
                beamGradient: 'radial-gradient(circle at 50% 15%, rgba(16, 185, 129, 0.15) 0%, rgba(52, 211, 153, 0.05) 45%, transparent 70%)',
                pillBg: '#ecfdf5',
                pillBorder: '#a7f3d0',
                pillText: '#047857',
                plaqueBg: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                plaqueBorder: '#6ee7b7',
                plaqueText: '#065f46',
                btnBg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                btnHover: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                ringColor: '#10b981',
                confettiColors: ['#10b981', '#34d399', '#a7f3d0', '#059669', '#f59e0b']
            };
        case 'Best Operator':
            return {
                icon: '⚙️',
                badgeText: 'OPERATIONS CHAMPION',
                title: 'Best Operator',
                primaryColor: '#4f46e5',
                secondaryColor: '#4338ca',
                glowColor: 'rgba(79, 70, 229, 0.25)',
                beamGradient: 'radial-gradient(circle at 50% 15%, rgba(99, 102, 241, 0.15) 0%, rgba(129, 140, 248, 0.05) 45%, transparent 70%)',
                pillBg: '#eef2ff',
                pillBorder: '#c7d2fe',
                pillText: '#4338ca',
                plaqueBg: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
                plaqueBorder: '#a5b4fc',
                plaqueText: '#3730a3',
                btnBg: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                btnHover: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
                ringColor: '#6366f1',
                confettiColors: ['#6366f1', '#818cf8', '#c7d2fe', '#4f46e5', '#f59e0b']
            };
        default:
            return {
                icon: '🌟',
                badgeText: 'SPECIAL RECOGNITION',
                title: tag || 'Employee Honor',
                primaryColor: '#d97706',
                secondaryColor: '#b45309',
                glowColor: 'rgba(217, 119, 6, 0.25)',
                beamGradient: 'radial-gradient(circle at 50% 15%, rgba(245, 158, 11, 0.15) 0%, transparent 70%)',
                pillBg: '#fffbeb',
                pillBorder: '#fde68a',
                pillText: '#b45309',
                plaqueBg: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                plaqueBorder: '#fcd34d',
                plaqueText: '#92400e',
                btnBg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                btnHover: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                ringColor: '#f59e0b',
                confettiColors: ['#f59e0b', '#fbbf24', '#d97706']
            };
    }
};

const AchievementSpotlightOverlay = () => {
    const { user } = useContext(UserContext);
    const [notifications, setNotifications] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [isExiting, setIsExiting] = useState(false);

    const fetchNotifications = useCallback(async () => {
        if (!user?._id) return;
        try {
            const res = await attendanceAPI.getUnreadAchievementNotifications();
            if (res && Array.isArray(res.notifications) && res.notifications.length > 0) {
                setNotifications(res.notifications);
                setIsOpen(true);
            }
        } catch (err) {
            console.warn('Spotlight fetch notification error:', err);
        }
    }, [user?._id]);

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60 * 1000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    const current = notifications[currentIndex] || notifications[0];

    // Trigger celebratory confetti on reveal
    useEffect(() => {
        if (isOpen && current) {
            const theme = getThemeConfig(current.achievement_tag);
            try {
                confetti({
                    particleCount: 60,
                    spread: 65,
                    origin: { y: 0.6 },
                    colors: theme.confettiColors
                });
                setTimeout(() => {
                    confetti({
                        particleCount: 40,
                        angle: 60,
                        spread: 50,
                        origin: { x: 0.15, y: 0.65 },
                        colors: theme.confettiColors
                    });
                    confetti({
                        particleCount: 40,
                        angle: 120,
                        spread: 50,
                        origin: { x: 0.85, y: 0.65 },
                        colors: theme.confettiColors
                    });
                }, 200);
            } catch (e) {
                // Fallback gracefully
            }
        }
    }, [isOpen, current]);

    // Handle ESC key to dismiss
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen && current) {
                handleDismiss();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, current]);

    const handleDismiss = async () => {
        if (!current) return;
        setIsExiting(true);
        try {
            await attendanceAPI.markAchievementNotificationRead({ notification_id: current._id });
        } catch (e) {
            console.warn('Error marking notification read:', e);
        }

        setTimeout(() => {
            setIsExiting(false);
            setNotifications(prev => {
                const remaining = prev.filter(n => n._id !== current._id);
                if (remaining.length === 0) {
                    setIsOpen(false);
                } else if (currentIndex >= remaining.length) {
                    setCurrentIndex(0);
                }
                return remaining;
            });
        }, 280);
    };

    if (!isOpen || !current) return null;

    const isRecipient = Boolean(
        (current.employee_id && user?._id && String(current.employee_id) === String(user._id)) ||
        (current.employee_username && user?.username && String(current.employee_username).toLowerCase() === String(user.username).toLowerCase())
    );

    const theme = getThemeConfig(current.achievement_tag);

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            opacity: isExiting ? 0 : 1,
            transition: 'opacity 0.28s ease',
            overflow: 'hidden',
            padding: '20px',
            boxSizing: 'border-box',
            fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
            <style>{`
                @keyframes lightCardEntrance {
                    0% { transform: translateY(30px) scale(0.92); opacity: 0; }
                    70% { transform: translateY(-4px) scale(1.01); opacity: 1; }
                    100% { transform: translateY(0) scale(1); opacity: 1; }
                }
                @keyframes subtlePulse {
                    0%, 100% { transform: scale(1); opacity: 0.8; }
                    50% { transform: scale(1.05); opacity: 1; }
                }
            `}</style>

            {/* Soft Ambient Radiance in Background */}
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '650px',
                height: '650px',
                borderRadius: '50%',
                background: theme.beamGradient,
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none',
                filter: 'blur(20px)',
                animation: 'subtlePulse 4s ease-in-out infinite'
            }} />

            {/* Clean White Corporate Card */}
            <div style={{
                position: 'relative',
                maxWidth: '460px',
                width: '100%',
                background: '#ffffff',
                borderRadius: '24px',
                border: '1px solid rgba(226, 232, 240, 0.95)',
                boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.22), 0 0 0 1px rgba(241, 245, 249, 0.6), 0 0 40px ' + theme.glowColor,
                animation: 'lightCardEntrance 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                zIndex: 10,
                overflow: 'hidden'
            }}>
                {/* Top Subtle Color Accent Bar */}
                <div style={{
                    height: '6px',
                    width: '100%',
                    background: theme.btnBg
                }} />

                <div style={{
                    padding: '30px 28px 24px 28px',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '18px',
                    position: 'relative'
                }}>
                    {/* Top Close Button */}
                    <button
                        onClick={handleDismiss}
                        style={{
                            position: 'absolute',
                            top: '16px',
                            right: '16px',
                            background: '#f1f5f9',
                            border: 'none',
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#64748b',
                            fontSize: '15px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.background = '#e2e8f0';
                            e.currentTarget.style.color = '#0f172a';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.background = '#f1f5f9';
                            e.currentTarget.style.color = '#64748b';
                        }}
                        title="Dismiss (Esc)"
                    >
                        ✕
                    </button>

                    {/* Category Tag Pill */}
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '5px 14px',
                        borderRadius: '20px',
                        background: theme.pillBg,
                        border: `1px solid ${theme.pillBorder}`,
                        color: theme.pillText,
                        fontSize: '11px',
                        fontWeight: '800',
                        letterSpacing: '1px',
                        textTransform: 'uppercase'
                    }}>
                        <span>✨</span>
                        <span>{theme.badgeText}</span>
                        <span>✨</span>
                    </div>

                    {/* Employee Profile Photo Circle */}
                    <div style={{ position: 'relative', width: '110px', height: '110px', margin: '2px 0' }}>
                        <div style={{
                            position: 'absolute',
                            inset: '-4px',
                            borderRadius: '50%',
                            background: theme.pillBg,
                            border: `2px solid ${theme.ringColor}`,
                            boxShadow: `0 0 16px ${theme.glowColor}`
                        }} />

                        {/* Photo Container */}
                        <div style={{
                            position: 'relative',
                            width: '100%',
                            height: '100%',
                            borderRadius: '50%',
                            background: `linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)`,
                            border: '3px solid #ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden'
                        }}>
                            {(isRecipient ? (user?.employee_photo || current.employee_photo) : current.employee_photo) ? (
                                <img
                                    src={isRecipient ? (user?.employee_photo || current.employee_photo) : current.employee_photo}
                                    alt={current.employee_name || 'Employee'}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                        display: 'block'
                                    }}
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        if (e.currentTarget.nextSibling) {
                                            e.currentTarget.nextSibling.style.display = 'flex';
                                        }
                                    }}
                                />
                            ) : null}

                            <span style={{
                                display: (isRecipient ? (user?.employee_photo || current.employee_photo) : current.employee_photo) ? 'none' : 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '38px',
                                fontWeight: '900',
                                color: theme.primaryColor
                            }}>
                                {(current.employee_name?.[0] || user?.first_name?.[0] || 'E').toUpperCase()}
                            </span>
                        </div>

                        {/* Corner Award Badge */}
                        <div style={{
                            position: 'absolute',
                            bottom: '-2px',
                            right: '-2px',
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: '#ffffff',
                            border: `2px solid ${theme.ringColor}`,
                            boxShadow: '0 3px 8px rgba(0,0,0,0.12)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px'
                        }}>
                            {theme.icon}
                        </div>
                    </div>

                    {/* Typography / Headings */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                        {isRecipient ? (
                            <>
                                <h2 style={{
                                    margin: 0,
                                    fontSize: '21px',
                                    fontWeight: '800',
                                    color: '#0f172a',
                                    letterSpacing: '-0.3px'
                                }}>
                                    Congratulations, {user?.first_name || current.employee_name}! 🎉
                                </h2>
                                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                                    You have been recognized and awarded
                                </p>
                            </>
                        ) : (
                            <>
                                <p style={{
                                    margin: 0,
                                    fontSize: '11.5px',
                                    fontWeight: '700',
                                    color: '#64748b',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.8px'
                                }}>
                                    Special Employee Recognition
                                </p>
                                <h2 style={{
                                    margin: 0,
                                    fontSize: '22px',
                                    fontWeight: '800',
                                    color: '#0f172a',
                                    letterSpacing: '-0.3px'
                                }}>
                                    {current.employee_name}
                                </h2>
                            </>
                        )}

                        {/* Award Plaque */}
                        <div style={{
                            margin: '10px 0 2px 0',
                            padding: '12px 18px',
                            borderRadius: '14px',
                            background: theme.plaqueBg,
                            border: `1.5px solid ${theme.plaqueBorder}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                        }}>
                            <span style={{ fontSize: '20px' }}>{theme.icon}</span>
                            <span style={{
                                fontSize: '15px',
                                fontWeight: '800',
                                color: theme.plaqueText,
                                letterSpacing: '0.2px'
                            }}>
                                {current.achievement_tag}
                            </span>
                        </div>

                        <p style={{
                            margin: 0,
                            fontSize: '12.5px',
                            color: '#64748b',
                            lineHeight: 1.45,
                            marginTop: '4px'
                        }}>
                            {isRecipient
                                ? 'Your hard work, commitment, and exceptional standards inspire the entire team!'
                                : `Honoring outstanding dedication and performance at ${current.company || 'RABS'}.`}
                        </p>
                    </div>

                    {/* Bottom Action Button */}
                    <div style={{ width: '100%', marginTop: '4px' }}>
                        <button
                            onClick={handleDismiss}
                            style={{
                                width: '100%',
                                padding: '12px 20px',
                                borderRadius: '12px',
                                border: 'none',
                                background: theme.btnBg,
                                color: '#ffffff',
                                fontSize: '13.5px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                boxShadow: '0 4px 14px ' + theme.glowColor,
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px'
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.background = theme.btnHover;
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.background = theme.btnBg;
                            }}
                        >
                            <span>{isRecipient ? 'Accept & Continue' : 'Continue'}</span>
                        </button>
                    </div>

                    {/* Pagination if multiple unread awards */}
                    {notifications.length > 1 && (
                        <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600' }}>
                            {currentIndex + 1} of {notifications.length} awards
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AchievementSpotlightOverlay;
