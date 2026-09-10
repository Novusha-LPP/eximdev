import React, { useState, useEffect } from 'react';
import { Box, Typography, LinearProgress, Chip, Button, IconButton, Collapse, Alert } from '@mui/material';
import ScheduleIcon from '@mui/icons-material/Schedule';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { fetchPreDeadlineTracker } from '../../services/mrmService';

/**
 * Pre-Deadline KPI Submission Tracker
 * Gives HOD real-time visibility into who has/hasn't submitted prior to the monthly deadline
 */
const PreDeadlineTracker = ({ department, month, year, onReminderSent }) => {
    const [trackerData, setTrackerData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [reminderSuccess, setReminderSuccess] = useState('');

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

    const handleChaseMember = (member) => {
        setReminderSuccess(`Reminder ping sent to ${member.name} for KPI submission.`);
        setTimeout(() => setReminderSuccess(''), 4000);
        if (onReminderSent) onReminderSent(member);
    };

    return (
        <Box sx={{ 
            background: 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)', 
            borderRadius: '10px', 
            border: '1px solid #e5e7eb', 
            p: 2, 
            mb: 2.5,
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
                <Box display="flex" alignItems="center" gap={1.5}>
                    <ScheduleIcon sx={{ color: '#4b5563', fontSize: 22 }} />
                    <Typography variant="subtitle1" fontWeight={700} color="#111827">
                        Pre-Deadline KPI Submission Tracker
                    </Typography>
                    <Chip 
                        label={`${submittedCount} / ${totalMembers} Submitted (${submissionRate}%)`} 
                        color={progressColor} 
                        size="small" 
                        sx={{ fontWeight: 700, fontSize: '12px' }}
                    />
                </Box>

                <Box display="flex" alignItems="center" gap={1}>
                    {pendingCount > 0 ? (
                        <Chip 
                            label={`⚠️ ${pendingCount} Pending Submission`} 
                            size="small" 
                            sx={{ 
                                bgcolor: '#fee2e2', 
                                color: '#b91c1c', 
                                fontWeight: 700, 
                                fontSize: '11px',
                                border: '1px solid #fca5a5'
                            }}
                        />
                    ) : (
                        <Chip 
                            icon={<CheckCircleIcon sx={{ fontSize: 16 }} />}
                            label="100% Submitted — Ready for HOD Approval" 
                            size="small" 
                            color="success"
                            sx={{ fontWeight: 700, fontSize: '11px' }}
                        />
                    )}

                    <Button 
                        size="small" 
                        variant="text" 
                        onClick={() => setExpanded(!expanded)}
                        endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        sx={{ textTransform: 'none', color: '#4b5563', fontSize: '12px', fontWeight: 600 }}
                    >
                        {expanded ? 'Hide Details' : 'View Members'}
                    </Button>
                </Box>
            </Box>

            <Box sx={{ width: '100%', mt: 1.5, mb: 0.5 }}>
                <LinearProgress 
                    variant="determinate" 
                    value={Math.min(submissionRate, 100)} 
                    color={progressColor}
                    sx={{ height: 8, borderRadius: 4, bgcolor: '#e5e7eb' }}
                />
            </Box>

            {reminderSuccess && (
                <Alert severity="success" sx={{ mt: 1.5, py: 0.5, fontSize: '12px' }}>
                    {reminderSuccess}
                </Alert>
            )}

            <Collapse in={expanded} timeout="auto" unmountOnExit>
                <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px dashed #e5e7eb' }}>
                    {pending.length > 0 && (
                        <Box mb={2}>
                            <Typography variant="caption" fontWeight={700} color="#b91c1c" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                Pending Submissions ({pending.length}):
                            </Typography>
                            <Box display="flex" flexWrap="wrap" gap={1} mt={0.8}>
                                {pending.map((m) => (
                                    <Box 
                                        key={m.userId}
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1,
                                            p: '4px 10px',
                                            bgcolor: '#fef2f2',
                                            border: '1px solid #fecaca',
                                            borderRadius: '6px'
                                        }}
                                    >
                                        <Typography variant="body2" fontSize="12px" fontWeight={600} color="#991b1b">
                                            {m.name} <span style={{ opacity: 0.7, fontWeight: 400 }}>({m.sub_team})</span>
                                        </Typography>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            startIcon={<NotificationsActiveIcon sx={{ fontSize: 13 }} />}
                                            onClick={() => handleChaseMember(m)}
                                            sx={{
                                                fontSize: '10px',
                                                p: '1px 6px',
                                                minWidth: 'unset',
                                                textTransform: 'none',
                                                color: '#b91c1c',
                                                borderColor: '#fca5a5',
                                                '&:hover': { bgcolor: '#fee2e2', borderColor: '#b91c1c' }
                                            }}
                                        >
                                            Send Reminder
                                        </Button>
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                    )}

                    {submitted.length > 0 && (
                        <Box>
                            <Typography variant="caption" fontWeight={700} color="#047857" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                Submitted ({submitted.length}):
                            </Typography>
                            <Box display="flex" flexWrap="wrap" gap={0.8} mt={0.8}>
                                {submitted.map((m) => (
                                    <Chip
                                        key={m.userId}
                                        label={`${m.name} (${m.sub_team})`}
                                        size="small"
                                        icon={<CheckCircleIcon sx={{ fontSize: 14 }} />}
                                        sx={{
                                            bgcolor: '#ecfdf5',
                                            color: '#065f46',
                                            border: '1px solid #a7f3d0',
                                            fontSize: '11px',
                                            fontWeight: 500
                                        }}
                                    />
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
