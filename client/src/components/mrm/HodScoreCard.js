import React from 'react';
import { Box, Typography, Chip, Tooltip } from '@mui/material';
import EmojiEventsOutlinedIcon from '@mui/icons-material/EmojiEventsOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import TrackChangesOutlinedIcon from '@mui/icons-material/TrackChangesOutlined';
import CurrencyRupeeOutlinedIcon from '@mui/icons-material/CurrencyRupeeOutlined';

/**
 * Renders the 70/30 Blended Monthly HOD Performance Scorecard
 * Clean, minimalist executive presentation with interactive view transitions
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

    // Score badge theme: soft pastel tones with clean 1px borders
    const getScoreColor = (score) => {
        if (score >= 85) return { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' };
        if (score >= 70) return { bg: '#fffbeb', text: '#b45309', border: '#fde68a' };
        return { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' };
    };

    const finalTheme = getScoreColor(final_score);

    return (
        <Box sx={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            p: 1.6,
            mb: 0,
            width: '100%',
            boxSizing: 'border-box',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
                {/* Left: Final Composite Score (Clickable to switch to Executive Focus View) */}
                <Box 
                    display="flex" 
                    alignItems="center" 
                    gap={1.8}
                    onClick={() => onSelectView && onSelectView('EXECUTIVE_MEETING')}
                    sx={{
                        cursor: onSelectView ? 'pointer' : 'default',
                        p: 0.5,
                        borderRadius: '8px',
                        transition: 'all 0.15s ease',
                        '&:hover': onSelectView ? { bgcolor: '#f8fafc' } : {}
                    }}
                >
                    <Box sx={{
                        width: 60,
                        height: 54,
                        borderRadius: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: finalTheme.bg,
                        border: `1px solid ${finalTheme.border}`,
                        color: finalTheme.text,
                        boxShadow: activeView === 'EXECUTIVE_MEETING' ? `0 0 0 2px ${finalTheme.border}` : 'none'
                    }}>
                        <Typography variant="h5" fontWeight={800} lineHeight={1} sx={{ letterSpacing: '-0.5px' }}>
                            {final_score}
                        </Typography>
                        <Typography variant="caption" fontSize="9.5px" fontWeight={600} sx={{ opacity: 0.8, mt: 0.2 }}>
                            / 100
                        </Typography>
                    </Box>

                    <Box>
                        <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="subtitle1" fontWeight={700} color="#0f172a" fontSize="14.5px">
                                Monthly HOD Performance Score
                            </Typography>
                            {monthly_rank && (
                                <Chip
                                    icon={<EmojiEventsOutlinedIcon style={{ fontSize: 13, color: '#b45309' }} />}
                                    label={`Rank #${monthly_rank}${total_hods_ranked ? ` of ${total_hods_ranked}` : ''}`}
                                    size="small"
                                    sx={{
                                        bgcolor: '#fffbeb',
                                        color: '#b45309',
                                        fontWeight: 700,
                                        fontSize: '10.5px',
                                        height: '22px',
                                        border: '1px solid #fde68a'
                                    }}
                                />
                            )}
                        </Box>
                        <Typography variant="caption" color="#64748b" sx={{ fontSize: '11.5px', mt: 0.2, display: 'block' }}>
                            70% Team KPI ({segments_count} Sub-Teams) + 30% Strategic Focus ({focus_areas_count} Objectives)
                        </Typography>
                    </Box>
                </Box>

                {/* Right: Component Breakdown & Annual Business Loss */}
                <Box display="flex" alignItems="center" gap={1.2} flexWrap="wrap">
                    {/* Component 1: Team KPI (70%) */}
                    <Tooltip title="Click to view Sub-Team KPI Performance (Weighted at 70%)" arrow>
                        <Box 
                            onClick={() => onSelectView && onSelectView('TEAM_SEGMENTS')}
                            sx={{ 
                                textAlign: 'center', 
                                minWidth: 100,
                                px: 1.4,
                                py: 0.6,
                                borderRadius: '8px',
                                border: activeView === 'TEAM_SEGMENTS' ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                                bgcolor: activeView === 'TEAM_SEGMENTS' ? '#eff6ff' : '#ffffff',
                                cursor: onSelectView ? 'pointer' : 'default',
                                transition: 'all 0.15s ease',
                                '&:hover': onSelectView ? { borderColor: '#93c5fd', bgcolor: '#f8fafc' } : {}
                            }}
                        >
                            <Box display="flex" alignItems="center" justifyContent="center" gap={0.4} mb={0.2}>
                                <GroupsOutlinedIcon sx={{ fontSize: 14, color: activeView === 'TEAM_SEGMENTS' ? '#2563eb' : '#64748b' }} />
                                <Typography variant="caption" fontWeight={600} color={activeView === 'TEAM_SEGMENTS' ? '#1d4ed8' : '#64748b'} fontSize="11px">
                                    Team KPIs (70%)
                                </Typography>
                            </Box>
                            <Typography variant="subtitle2" fontWeight={800} color="#0f172a" fontSize="13.5px" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                                {team_score}
                                <span style={{ fontSize: '10.5px', fontWeight: 500, color: '#64748b' }}> pts</span>
                            </Typography>
                        </Box>
                    </Tooltip>

                    {/* Component 2: Focus Areas (30%) */}
                    <Tooltip title="Click to view HOD Strategic Focus Areas (Weighted at 30%)" arrow>
                        <Box 
                            onClick={() => onSelectView && onSelectView('HOD_OBJECTIVES')}
                            sx={{ 
                                textAlign: 'center', 
                                minWidth: 100,
                                px: 1.4,
                                py: 0.6,
                                borderRadius: '8px',
                                border: activeView === 'HOD_OBJECTIVES' ? '1.5px solid #7c3aed' : '1px solid #e2e8f0',
                                bgcolor: activeView === 'HOD_OBJECTIVES' ? '#f5f3ff' : '#ffffff',
                                cursor: onSelectView ? 'pointer' : 'default',
                                transition: 'all 0.15s ease',
                                '&:hover': onSelectView ? { borderColor: '#c4b5fd', bgcolor: '#f8fafc' } : {}
                            }}
                        >
                            <Box display="flex" alignItems="center" justifyContent="center" gap={0.4} mb={0.2}>
                                <TrackChangesOutlinedIcon sx={{ fontSize: 14, color: activeView === 'HOD_OBJECTIVES' ? '#7c3aed' : '#64748b' }} />
                                <Typography variant="caption" fontWeight={600} color={activeView === 'HOD_OBJECTIVES' ? '#6d28d9' : '#64748b'} fontSize="11px">
                                    Focus Areas (30%)
                                </Typography>
                            </Box>
                            <Typography variant="subtitle2" fontWeight={800} color="#0f172a" fontSize="13.5px" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                                {focus_score}
                                <span style={{ fontSize: '10.5px', fontWeight: 500, color: '#64748b' }}> pts</span>
                            </Typography>
                        </Box>
                    </Tooltip>

                    {/* Annual Team Business Loss */}
                    <Tooltip title="Annual cumulative team business loss rolled up onto HOD scorecard" arrow>
                        <Box sx={{
                            bgcolor: annual_cumulative_team_business_loss > 0 ? '#fef2f2' : '#ffffff',
                            border: `1px solid ${annual_cumulative_team_business_loss > 0 ? '#fecaca' : '#e2e8f0'}`,
                            borderRadius: '8px',
                            minWidth: 95,
                            px: 1.4,
                            py: 0.6,
                            textAlign: 'center'
                        }}>
                            <Box display="flex" alignItems="center" justifyContent="center" gap={0.3} mb={0.2}>
                                <CurrencyRupeeOutlinedIcon sx={{ fontSize: 13, color: annual_cumulative_team_business_loss > 0 ? '#b91c1c' : '#64748b' }} />
                                <Typography variant="caption" fontWeight={600} color={annual_cumulative_team_business_loss > 0 ? '#991b1b' : '#64748b'} fontSize="11px">
                                    Annual Loss
                                </Typography>
                            </Box>
                            <Typography variant="subtitle2" fontWeight={800} color={annual_cumulative_team_business_loss > 0 ? '#b91c1c' : '#0f172a'} fontSize="13px" sx={{ fontVariantNumeric: 'tabular-nums' }}>
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
