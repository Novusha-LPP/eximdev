import React from 'react';
import { Box, Typography, Chip, Tooltip } from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import GroupsIcon from '@mui/icons-material/Groups';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';

/**
 * Renders the 70/30 Blended Monthly HOD Performance Scorecard
 * Supports interactive jumps to specific review views
 */
const HodScoreCard = ({ scoreData, activeView = 'ALL', onSelectView }) => {
    if (!scoreData || (!scoreData.final_score && scoreData.final_score !== 0)) {
        return null;
    }

    const {
        final_score = 0,
        team_score = 0,
        focus_score = 0,
        monthly_rank,
        total_hods_ranked,
        annual_cumulative_team_business_loss = 0,
        segments_count = 0,
        focus_areas_count = 0
    } = scoreData;

    // Score badge color
    const getScoreColor = (score) => {
        if (score >= 85) return { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' };
        if (score >= 70) return { bg: '#fffbeb', text: '#b45309', border: '#fde68a' };
        return { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' };
    };

    const finalTheme = getScoreColor(final_score);

    return (
        <Box sx={{
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            p: 1.8,
            mb: 2,
            boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
        }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
                {/* Left: Final Composite Score (Clickable to switch to Executive Reds Meeting View) */}
                <Box 
                    display="flex" 
                    alignItems="center" 
                    gap={2}
                    onClick={() => onSelectView && onSelectView('EXECUTIVE_MEETING')}
                    sx={{
                        cursor: onSelectView ? 'pointer' : 'default',
                        p: 0.5,
                        borderRadius: '10px',
                        transition: 'all 0.15s ease',
                        '&:hover': onSelectView ? { bgcolor: 'rgba(241, 245, 249, 0.7)' } : {}
                    }}
                >
                    <Box sx={{
                        width: 58,
                        height: 58,
                        borderRadius: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: finalTheme.bg,
                        border: `2px solid ${finalTheme.border}`,
                        color: finalTheme.text,
                        boxShadow: activeView === 'EXECUTIVE_MEETING' ? `0 0 0 3px ${finalTheme.border}` : 'none'
                    }}>
                        <Typography variant="h5" fontWeight={800} lineHeight={1}>
                            {final_score}
                        </Typography>
                        <Typography variant="caption" fontSize="9px" fontWeight={700} sx={{ opacity: 0.8 }}>
                            / 100
                        </Typography>
                    </Box>

                    <Box>
                        <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="subtitle1" fontWeight={800} color="#0f172a" fontSize="15px">
                                Monthly HOD Performance Score
                            </Typography>
                            {monthly_rank && (
                                <Chip
                                    icon={<EmojiEventsIcon style={{ fontSize: 14, color: '#b45309' }} />}
                                    label={`Rank #${monthly_rank}${total_hods_ranked ? ` of ${total_hods_ranked}` : ''}`}
                                    size="small"
                                    sx={{
                                        bgcolor: '#fef3c7',
                                        color: '#92400e',
                                        fontWeight: 700,
                                        fontSize: '11px',
                                        border: '1px solid #fde68a'
                                    }}
                                />
                            )}
                        </Box>
                        <Typography variant="caption" color="#64748b">
                            70% Team KPI ({segments_count} Sub-Teams) + 30% Strategic Focus ({focus_areas_count} Objectives)
                        </Typography>
                    </Box>
                </Box>

                {/* Right: Component Breakdown & Annual Business Loss */}
                <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
                    {/* Component 1: Team KPI (70%) (Interactive Tab Jump) */}
                    <Tooltip title="Click to view Sub-Team KPI Performance (Weighted at 70%)" arrow>
                        <Box 
                            onClick={() => onSelectView && onSelectView('TEAM_SEGMENTS')}
                            sx={{ 
                                textAlign: 'center', 
                                minWidth: 105,
                                px: 1.5,
                                py: 0.8,
                                borderRadius: '8px',
                                border: activeView === 'TEAM_SEGMENTS' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                                bgcolor: activeView === 'TEAM_SEGMENTS' ? '#eff6ff' : '#ffffff',
                                cursor: onSelectView ? 'pointer' : 'default',
                                transition: 'all 0.15s ease',
                                '&:hover': onSelectView ? { borderColor: '#3b82f6', bgcolor: '#f0f9ff' } : {}
                            }}
                        >
                            <Box display="flex" alignItems="center" justifyContent="center" gap={0.5} mb={0.2}>
                                <GroupsIcon sx={{ fontSize: 15, color: '#2563eb' }} />
                                <Typography variant="caption" fontWeight={700} color={activeView === 'TEAM_SEGMENTS' ? '#1d4ed8' : '#475569'}>
                                    Team KPIs (70%)
                                </Typography>
                            </Box>
                            <Typography variant="subtitle2" fontWeight={800} color="#1e293b" fontSize="14px">
                                {team_score}
                                <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}> pts</span>
                            </Typography>
                        </Box>
                    </Tooltip>

                    {/* Component 2: Focus Areas (30%) (Interactive Tab Jump) */}
                    <Tooltip title="Click to view HOD Strategic Focus Areas (Weighted at 30%)" arrow>
                        <Box 
                            onClick={() => onSelectView && onSelectView('HOD_OBJECTIVES')}
                            sx={{ 
                                textAlign: 'center', 
                                minWidth: 105,
                                px: 1.5,
                                py: 0.8,
                                borderRadius: '8px',
                                border: activeView === 'HOD_OBJECTIVES' ? '2px solid #7c3aed' : '1px solid #e2e8f0',
                                bgcolor: activeView === 'HOD_OBJECTIVES' ? '#f5f3ff' : '#ffffff',
                                cursor: onSelectView ? 'pointer' : 'default',
                                transition: 'all 0.15s ease',
                                '&:hover': onSelectView ? { borderColor: '#8b5cf6', bgcolor: '#faf5ff' } : {}
                            }}
                        >
                            <Box display="flex" alignItems="center" justifyContent="center" gap={0.5} mb={0.2}>
                                <TrackChangesIcon sx={{ fontSize: 15, color: '#7c3aed' }} />
                                <Typography variant="caption" fontWeight={700} color={activeView === 'HOD_OBJECTIVES' ? '#6d28d9' : '#475569'}>
                                    Focus Areas (30%)
                                </Typography>
                            </Box>
                            <Typography variant="subtitle2" fontWeight={800} color="#1e293b" fontSize="14px">
                                {focus_score}
                                <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}> pts</span>
                            </Typography>
                        </Box>
                    </Tooltip>

                    {/* Annual Team Business Loss */}
                    <Tooltip title="Annual cumulative team business loss rolled up onto HOD scorecard" arrow>
                        <Box sx={{
                            bgcolor: annual_cumulative_team_business_loss > 0 ? '#fef2f2' : '#f8fafc',
                            border: `1px solid ${annual_cumulative_team_business_loss > 0 ? '#fecaca' : '#e2e8f0'}`,
                            borderRadius: '8px',
                            px: 1.5,
                            py: 0.8,
                            textAlign: 'right'
                        }}>
                            <Box display="flex" alignItems="center" justifyContent="flex-end" gap={0.3}>
                                <CurrencyRupeeIcon sx={{ fontSize: 14, color: annual_cumulative_team_business_loss > 0 ? '#b91c1c' : '#64748b' }} />
                                <Typography variant="caption" fontWeight={700} color={annual_cumulative_team_business_loss > 0 ? '#991b1b' : '#64748b'}>
                                    Annual Loss
                                </Typography>
                            </Box>
                            <Typography variant="subtitle2" fontWeight={800} color={annual_cumulative_team_business_loss > 0 ? '#b91c1c' : '#334155'} fontSize="13px">
                                ₹ {annual_cumulative_team_business_loss.toLocaleString('en-IN')}
                            </Typography>
                        </Box>
                    </Tooltip>
                </Box>
            </Box>
        </Box>
    );
};

export default HodScoreCard;
