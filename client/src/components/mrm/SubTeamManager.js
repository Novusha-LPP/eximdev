import React, { useState, useEffect } from 'react';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, 
    Box, Typography, Chip, List, ListItem, ListItemText, Checkbox, 
    Divider, Alert, CircularProgress, MenuItem, Select, FormControl, InputLabel 
} from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import { manageSubTeams } from '../../services/mrmService';

/**
 * SubTeamManager Modal
 * Enables HODs and Administrators to partition department employees into named sub-teams
 */
const SubTeamManager = ({ open, onClose, department, onSaved }) => {
    const [subTeams, setSubTeams] = useState({});
    const [allUsers, setAllUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [selectedUserIds, setSelectedUserIds] = useState([]);
    const [targetSubTeam, setTargetSubTeam] = useState('');
    const [newSubTeamName, setNewSubTeamName] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const loadSubTeams = async () => {
        if (!department) return;
        setLoading(true);
        setErrorMsg('');
        try {
            const res = await manageSubTeams({ department, action: 'list' });
            setSubTeams(res.sub_teams || {});
            setAllUsers(res.users || []);
        } catch (err) {
            setErrorMsg('Failed to load sub-teams. ' + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open) {
            loadSubTeams();
            setSelectedUserIds([]);
            setTargetSubTeam('');
            setNewSubTeamName('');
            setSuccessMsg('');
        }
    }, [open, department]);

    const handleToggleUser = (userId) => {
        setSelectedUserIds(prev => 
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    const handleAssign = async () => {
        const teamToAssign = targetSubTeam === 'NEW' ? newSubTeamName.trim() : targetSubTeam.trim();
        if (!teamToAssign) {
            setErrorMsg('Please specify a sub-team name');
            return;
        }
        if (selectedUserIds.length === 0) {
            setErrorMsg('Please select at least one team member to assign');
            return;
        }

        setSaving(true);
        setErrorMsg('');
        try {
            await manageSubTeams({
                department,
                action: 'assign',
                userIds: selectedUserIds,
                sub_team: teamToAssign
            });
            setSuccessMsg(`Successfully assigned ${selectedUserIds.length} member(s) to "${teamToAssign}".`);
            setSelectedUserIds([]);
            setTargetSubTeam('');
            setNewSubTeamName('');
            await loadSubTeams();
            if (onSaved) onSaved();
        } catch (err) {
            setErrorMsg('Failed to assign sub-team: ' + (err.response?.data?.error || err.message));
        } finally {
            setSaving(false);
        }
    };

    const existingTeamNames = Object.keys(subTeams);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                <GroupsIcon sx={{ color: '#2563eb' }} />
                Manage Sub-Teams — {department} Department
            </DialogTitle>

            <DialogContent dividers>
                {errorMsg && <Alert severity="error" sx={{ mb: 2 }}>{errorMsg}</Alert>}
                {successMsg && <Alert severity="success" sx={{ mb: 2 }}>{successMsg}</Alert>}

                {loading ? (
                    <Box display="flex" justifyContent="center" p={4}>
                        <CircularProgress size={32} />
                    </Box>
                ) : (
                    <Box>
                        {/* Current Sub-Teams Overview */}
                        <Typography variant="subtitle2" fontWeight={700} color="#1e293b" mb={1}>
                            Current Sub-Teams ({existingTeamNames.length}):
                        </Typography>
                        <Box display="flex" flexWrap="wrap" gap={1} mb={3}>
                            {existingTeamNames.map((tName) => (
                                <Chip
                                    key={tName}
                                    label={`${tName} (${(subTeams[tName] || []).length} members)`}
                                    color={tName === 'General' ? 'default' : 'primary'}
                                    variant="outlined"
                                    sx={{ fontWeight: 600 }}
                                />
                            ))}
                        </Box>

                        <Divider sx={{ my: 2 }} />

                        {/* Assignment Controls */}
                        <Typography variant="subtitle2" fontWeight={700} color="#1e293b" mb={1.5}>
                            Assign Members to a Sub-Team:
                        </Typography>

                        <Box display="flex" gap={2} flexWrap="wrap" alignItems="center" mb={2}>
                            <FormControl size="small" sx={{ minWidth: 200 }}>
                                <InputLabel>Target Sub-Team</InputLabel>
                                <Select
                                    value={targetSubTeam}
                                    label="Target Sub-Team"
                                    onChange={(e) => setTargetSubTeam(e.target.value)}
                                >
                                    {existingTeamNames.map((t) => (
                                        <MenuItem key={t} value={t}>{t}</MenuItem>
                                    ))}
                                    <MenuItem value="NEW">+ Create New Sub-Team...</MenuItem>
                                </Select>
                            </FormControl>

                            {targetSubTeam === 'NEW' && (
                                <TextField
                                    size="small"
                                    label="New Sub-Team Name"
                                    placeholder="e.g. DU, Submission, Ops"
                                    value={newSubTeamName}
                                    onChange={(e) => setNewSubTeamName(e.target.value)}
                                    sx={{ minWidth: 220 }}
                                />
                            )}

                            <Button
                                variant="contained"
                                onClick={handleAssign}
                                disabled={saving || selectedUserIds.length === 0 || !targetSubTeam}
                                sx={{ textTransform: 'none', fontWeight: 700 }}
                            >
                                {saving ? 'Assigning...' : `Assign Selected (${selectedUserIds.length})`}
                            </Button>
                        </Box>

                        {/* User Selection List */}
                        <Typography variant="caption" color="#64748b" display="block" mb={1}>
                            Select team members below to assign to the chosen sub-team:
                        </Typography>

                        <Box sx={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                            <List dense disablePadding>
                                {allUsers.map((user) => {
                                    const isSelected = selectedUserIds.includes(user._id);
                                    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username;
                                    const currentSubTeam = user.sub_team || 'General';

                                    return (
                                        <ListItem
                                            key={user._id}
                                            onClick={() => handleToggleUser(user._id)}
                                            sx={{
                                                cursor: 'pointer',
                                                bgcolor: isSelected ? '#eff6ff' : 'transparent',
                                                borderBottom: '1px solid #f1f5f9',
                                                '&:hover': { bgcolor: isSelected ? '#dbeafe' : '#f8fafc' }
                                            }}
                                        >
                                            <Checkbox
                                                edge="start"
                                                checked={isSelected}
                                                tabIndex={-1}
                                                disableRipple
                                                size="small"
                                            />
                                            <ListItemText
                                                primary={fullName}
                                                secondary={user.designation || user.username}
                                                primaryTypographyProps={{ fontSize: '13px', fontWeight: 600 }}
                                                secondaryTypographyProps={{ fontSize: '11px' }}
                                            />
                                            <Chip
                                                label={currentSubTeam}
                                                size="small"
                                                sx={{ fontSize: '10px', height: '20px' }}
                                            />
                                        </ListItem>
                                    );
                                })}
                            </List>
                        </Box>
                    </Box>
                )}
            </DialogContent>

            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose} sx={{ textTransform: 'none' }}>
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default SubTeamManager;
