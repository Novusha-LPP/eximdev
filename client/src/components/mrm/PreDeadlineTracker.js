import React, { useState, useEffect } from 'react';
import { 
    Box, Typography, LinearProgress, Chip, Button, IconButton, Collapse, 
    Alert, Avatar, Tooltip 
} from '@mui/material';
import ScheduleIcon from '@mui/icons-material/Schedule';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import PersonIcon from '@mui/icons-material/Person';
import { fetchPreDeadlineTracker } from '../../services/mrmService';

/**
 * Pre-Deadline KPI Submission Tracker
 * Gives HOD real-time executive visibility and 1-click chase capabilities
 * for all pending team submissions prior to the monthly deadline.
 */
const PreDeadlineTracker = ({ department, month, year, onReminderSent }) => {
    const [trackerData, setTrackerData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [reminderSuccess, setReminderSuccess] = useState('');
    const [pingingAll, setPingingAll] = useState(false);

    const loadTracker = async () => {
        if (!department || !month || !year) return;
        setLoading(true);
        try {
            const data = await fetchPreDeadlineTracker({ department, month, year });
            setTrackerData(data);
        } catch (err) {
            console.error('Failed to load pre-deadline tracker:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTracker();
    }, [department, month, year]);

    if (!trackerData || trackerData.totalMembers === 0) {
        return null;
    }

    const { totalMembers, submittedCount, pendingCount, submissionRate, pending = [], submitted = [] } = trackerData;
    const progressColor = submissionRate >= 90 ? 'success' : (submissionRate >= 70 ? 'warning' : 'error');

    const getInitials = (name) => {
        if (!name) return '?';
        return name
            .split(' ')
            .filter(Boolean)
            .map(n => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();
    };

    const handleChaseMember = (member) => {
        setReminderSuccess(`Reminder ping sent to ${member.name} for monthly KPI submission.`);
        setTimeout(() => setReminderSuccess(''), 4000);
        if (onReminderSent) onReminderSent(member);
    };

    const handleRemindAll = () => {
        if (pending.length === 0) return;
        setPingingAll(true);
        pending.forEach((m) => {
            if (onReminderSent) onReminderSent(m);
        });
        setReminderSuccess(`Bulk reminder ping sent to all ${pending.length} pending members!`);
        setTimeout(() => {
            setPingingAll(false);
            setReminderSuccess('');
        }, 4000);
    };

    return (
        <Box sx={{ 
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', 
            borderRadius: '12px', 
            border: '1px solid #e2e8f0', 
            p: 2.2, 
            mb: 2.5,
            boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
            transition: 'all 0.2s ease'
        }}>
            {/* Top Bar: Title, Progress Status, and Quick Actions */}
            <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1.5}>
                <Box display="flex" alignItems="center" gap={1.5}>
                    <Box sx={{
                        width: 36,
                        height: 36,
                        borderRadius: '10px',
                        bgcolor: submissionRate >= 100 ? '#ecfdf5' : '#fef2f2',
                        color: submissionRate >= 100 ? '#047857' : '#b91c1c',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: `1px solid ${submissionRate >= 100 ? '#a7f3d0' : '#fecaca'}`
                    }}>
                        <ScheduleIcon sx={{ fontSize: 20 }} />
                    </Box>
                    <Box>
                        <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="subtitle1" fontWeight={800} color="#0f172a" lineHeight={1.2}>
                                Pre-Deadline KPI Submission Tracker
                            </Typography>
                            <Chip 
                                label={`${submittedCount} / ${totalMembers} Submitted (${submissionRate}%)`} 
                                color={progressColor} 
                                size="small" 
                                sx={{ fontWeight: 700, fontSize: '11px', height: '22px' }}
                            />
                        </Box>
                        <Typography variant="caption" color="#64748b">
                            {department} Department • {month}/{year}
                        </Typography>
                    </Box>
                </Box>

                <Box display="flex" alignItems="center" gap={1.2} flexWrap="wrap">
                    {pendingCount > 0 ? (
                        <>
                            <Chip 
                                label={`⚠️ ${pendingCount} Pending Submission${pendingCount > 1 ? 's' : ''}`} 
                                size="small" 
                                sx={{ 
                                    bgcolor: '#fee2e2', 
                                    color: '#b91c1c', 
                                    fontWeight: 700, 
                                    fontSize: '11px',
                                    border: '1px solid #fca5a5',
                                    height: '24px'
                                }}
                            />
                            <Button
                                size="small"
                                variant="contained"
                                startIcon={<NotificationsActiveIcon sx={{ fontSize: 14 }} />}
                                onClick={handleRemindAll}
                                disabled={pingingAll}
                                sx={{
                                    bgcolor: '#b91c1c',
                                    '&:hover': { bgcolor: '#991b1b' },
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    textTransform: 'none',
                                    height: '28px',
                                    px: 1.5,
                                    borderRadius: '6px'
                                }}
                            >
                                {pingingAll ? 'Pinging All...' : `Remind All (${pendingCount})`}
                            </Button>
                        </>
                    ) : (
                        <Chip 
                            icon={<CheckCircleIcon sx={{ fontSize: 16, color: '#047857' }} />}
                            label="100% Submitted — Ready for HOD Approval" 
                            size="small" 
                            color="success"
                            sx={{ fontWeight: 700, fontSize: '11px', height: '26px' }}
                        />
                    )}

                    <Button 
                        size="small" 
                        variant="outlined" 
                        onClick={() => setExpanded(!expanded)}
                        endIcon={expanded ? <ExpandLessIcon sx={{ fontSize: 16 }} /> : <ExpandMoreIcon sx={{ fontSize: 16 }} />}
                        sx={{ 
                            textTransform: 'none', 
                            color: '#475569', 
                            borderColor: '#cbd5e1',
                            fontSize: '12px', 
                            fontWeight: 600,
                            height: '28px',
                            '&:hover': { borderColor: '#94a3b8', bgcolor: '#f1f5f9' }
                        }}
                    >
                        {expanded ? 'Hide Roster' : `View Roster (${totalMembers})`}
                    </Button>
                </Box>
            </Box>

            {/* Progress Bar */}
            <Box sx={{ width: '100%', mt: 1.8, mb: 0.5 }}>
                <LinearProgress 
                    variant="determinate" 
                    value={Math.min(submissionRate, 100)} 
                    color={progressColor}
                    sx={{ 
                        height: 7, 
                        borderRadius: 4, 
                        bgcolor: '#f1f5f9',
                        '& .MuiLinearProgress-bar': { borderRadius: 4 }
                    }}
                />
            </Box>

            {/* Notification Feedback */}
            {reminderSuccess && (
                <Alert 
                    severity="success" 
                    icon={<DoneAllIcon fontSize="inherit" />}
                    sx={{ mt: 1.5, py: 0.4, px: 1.5, fontSize: '12px', fontWeight: 600, borderRadius: '8px' }}
                >
                    {reminderSuccess}
                </Alert>
            )}

            {/* Expandable Member Roster Drawer */}
            <Collapse in={expanded} timeout="auto" unmountOnExit>
                <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #f1f5f9' }}>
                    {/* Section 1: Pending Submissions */}
                    {pending.length > 0 && (
                        <Box mb={2}>
                            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                                <Typography variant="caption" fontWeight={700} color="#b91c1c" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <span>⚠️ Pending Submissions ({pending.length})</span>
                                </Typography>
                                <Typography variant="caption" color="#94a3b8">
                                    Click "Ping" to send an automated reminder notification
                                </Typography>
                            </Box>
                            
                            <Box display="grid" gridTemplateColumns="repeat(auto-fill, minmax(280px, 1fr))" gap={1.2}>
                                {pending.map((m) => (
                                    <Box 
                                        key={m.userId}
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            p: '8px 12px',
                                            bgcolor: '#fff5f5',
                                            border: '1px solid #fed7d7',
                                            borderRadius: '8px',
                                            transition: 'border-color 0.2s',
                                            '&:hover': { borderColor: '#feb2b2' }
                                        }}
                                    >
                                        <Box display="flex" alignItems="center" gap={1.2}>
                                            <Avatar 
                                                sx={{ 
                                                    width: 28, 
                                                    height: 28, 
                                                    fontSize: '11px', 
                                                    fontWeight: 700,
                                                    bgcolor: '#fee2e2', 
                                                    color: '#991b1b',
                                                    border: '1px solid #fca5a5'
                                                }}
                                            >
                                                {getInitials(m.name)}
                                            </Avatar>
                                            <Box>
                                                <Typography variant="body2" fontSize="12px" fontWeight={700} color="#0f172a" lineHeight={1.2}>
                                                    {m.name}
                                                </Typography>
                                                <Typography variant="caption" fontSize="10px" color="#64748b">
                                                    {department || 'Department'} Team
                                                </Typography>
                                            </Box>
                                        </Box>
                                        
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            startIcon={<NotificationsActiveIcon sx={{ fontSize: 12 }} />}
                                            onClick={() => handleChaseMember(m)}
                                            sx={{
                                                fontSize: '11px',
                                                py: '2px',
                                                px: '8px',
                                                minWidth: 'unset',
                                                textTransform: 'none',
                                                fontWeight: 600,
                                                color: '#b91c1c',
                                                borderColor: '#fca5a5',
                                                bgcolor: '#ffffff',
                                                '&:hover': { bgcolor: '#fee2e2', borderColor: '#b91c1c' }
                                            }}
                                        >
                                            Ping
                                        </Button>
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                    )}

                    {/* Section 2: Submitted Members */}
                    {submitted.length > 0 && (
                        <Box>
                            <Typography variant="caption" fontWeight={700} color="#047857" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                                <span>✅ Submitted ({submitted.length})</span>
                            </Typography>
                            <Box display="grid" gridTemplateColumns="repeat(auto-fill, minmax(280px, 1fr))" gap={1.2}>
                                {submitted.map((m) => (
                                    <Box
                                        key={m.userId}
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            p: '8px 12px',
                                            bgcolor: '#f0fdf4',
                                            border: '1px solid #bbf7d0',
                                            borderRadius: '8px'
                                        }}
                                    >
                                        <Box display="flex" alignItems="center" gap={1.2}>
                                            <Avatar 
                                                sx={{ 
                                                    width: 28, 
                                                    height: 28, 
                                                    fontSize: '11px', 
                                                    fontWeight: 700,
                                                    bgcolor: '#dcfce7', 
                                                    color: '#166534',
                                                    border: '1px solid #86efac'
                                                }}
                                            >
                                                {getInitials(m.name)}
                                            </Avatar>
                                            <Box>
                                                <Typography variant="body2" fontSize="12px" fontWeight={700} color="#0f172a" lineHeight={1.2}>
                                                    {m.name}
                                                </Typography>
                                                <Typography variant="caption" fontSize="10px" color="#64748b">
                                                    {department || 'Department'} Team
                                                </Typography>
                                            </Box>
                                        </Box>

                                        <Chip
                                            label={m.status || 'SUBMITTED'}
                                            size="small"
                                            icon={<CheckCircleIcon sx={{ fontSize: 13, color: '#166534' }} />}
                                            sx={{
                                                bgcolor: '#dcfce7',
                                                color: '#166534',
                                                border: '1px solid #86efac',
                                                fontSize: '10px',
                                                fontWeight: 700,
                                                height: '20px'
                                            }}
                                        />
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                    )}
                </Box>
            </Collapse>
        </Box>
    );
};

export default PreDeadlineTracker;
