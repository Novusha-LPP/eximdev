
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAnalytics } from './AnalyticsContext';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import RefreshIcon from '@mui/icons-material/Refresh';
import MenuIcon from '@mui/icons-material/Menu';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import PendingActionsIcon from '@mui/icons-material/PendingActions';

// Icons
import DashboardIcon from '@mui/icons-material/Dashboard';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import GavelIcon from '@mui/icons-material/Gavel';
import DescriptionIcon from '@mui/icons-material/Description';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import ReceiptIcon from '@mui/icons-material/Receipt';
import WarningIcon from '@mui/icons-material/Warning';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import EngineeringIcon from '@mui/icons-material/Engineering';
import TaskIcon from '@mui/icons-material/Task';

import './AnalyticsLayout.css';

const navItems = [
    { name: 'Overview', path: 'overview', icon: <DashboardIcon fontSize="small" /> },
    { name: 'Movement', path: 'movement', icon: <LocalShippingIcon fontSize="small" /> },
    { name: 'Customs', path: 'customs', icon: <GavelIcon fontSize="small" /> },
    { name: 'Documentation', path: 'documentation', icon: <DescriptionIcon fontSize="small" /> },
    { name: 'Submission', path: 'submission', icon: <TaskIcon fontSize="small" /> },
    { name: 'e-Sanchit', path: 'esanchit', icon: <CloudUploadIcon fontSize="small" /> },
    { name: 'Operations', path: 'operations', icon: <EngineeringIcon fontSize="small" /> },
    { name: 'DO Management', path: 'do-management', icon: <AssignmentTurnedInIcon fontSize="small" /> },
    { name: 'Billing', path: 'billing', icon: <ReceiptIcon fontSize="small" /> },
];

const AnalyticsLayout = () => {
    const { startDate, endDate, setRange, importer, setImporter } = useAnalytics();
    const navigate = useNavigate();
    const location = useLocation();
    const [anchorEl, setAnchorEl] = useState(null);
    const [dateAnchorEl, setDateAnchorEl] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const [importersList, setImportersList] = useState([]);

    const currentModule = navItems.find(item => location.pathname.includes(item.path)) || navItems[0];
    const [selectedPreset, setSelectedPreset] = useState('Today');

    useEffect(() => {
        const fetchImporters = async () => {
            try {
                // Calculate current financial year or use a default compatible with the API
                // For now, hardcoding '24-25' as seen in other files or logic derived
                // Or better, fetch 'all' years if possible? The API seems to require a year.
                // Let's use '24-25' as a safe default based on recent files
                const response = await axios.get(`${process.env.REACT_APP_API_STRING}/get-importer-list/24-25`);
                setImportersList(response.data);
            } catch (error) {
                console.error("Error fetching importers", error);
            }
        };
        fetchImporters();
    }, []);

    const handleMenuOpen = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleDateMenuOpen = (event) => {
        setDateAnchorEl(event.currentTarget);
    };

    const handleDateMenuClose = () => {
        setDateAnchorEl(null);
    };

    const handleNavigate = (path) => {
        navigate(path);
        handleMenuClose();
    };

    const handleDatePreset = (preset) => {
        const today = new Date();
        let start = new Date();
        let end = new Date();

        if (preset === 'Today') {
            // default
        } else if (preset === 'Yesterday') {
            start.setDate(today.getDate() - 1);
            end.setDate(today.getDate() - 1);
        } else if (preset === 'This Month') {
            start.setDate(1);
        }
        setRange(preset, start, end);
        setSelectedPreset(preset);
        handleDateMenuClose();
    };

    const handleRefresh = () => {
        setRefreshKey(prev => prev + 1);
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
            <div className="analytics-container">
                {/* Modern Header Navigation */}
                <header className="analytics-header-nav">
                    <div className="brand-section">
                        <h1>Analytics Platform</h1>
                        <Button
                            variant="text"
                            onClick={handleMenuOpen}
                            endIcon={<KeyboardArrowDownIcon />}
                            sx={{ color: '#1e293b', textTransform: 'none', fontSize: '1rem', fontWeight: 500 }}
                        >
                            {currentModule.name}
                        </Button>
                        <Menu
                            anchorEl={anchorEl}
                            open={Boolean(anchorEl)}
                            onClose={handleMenuClose}
                            PaperProps={{
                                sx: {
                                    bgcolor: 'white',
                                    color: '#1e293b',
                                    border: '1px solid #e2e8f0',
                                    mt: 1,
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                }
                            }}
                        >
                            {navItems.map((item) => (
                                <MenuItem
                                    key={item.path}
                                    onClick={() => handleNavigate(item.path)}
                                    selected={location.pathname.includes(item.path)}
                                    sx={{ gap: 2, '&.Mui-selected': { bgcolor: '#eff6ff', color: '#3b82f6' } }}
                                >
                                    {item.icon} {item.name}
                                </MenuItem>
                            ))}
                        </Menu>
                    </div>

                    <div className="header-controls">
                        <Autocomplete
                            options={importersList}
                            getOptionLabel={(option) => option.importer || ''}
                            value={importersList.find(i => i.importer === importer) || null}
                            onChange={(event, newValue) => {
                                setImporter(newValue ? newValue.importer : '');
                            }}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Select Importer"
                                    size="small"
                                    sx={{ width: 200, bgcolor: 'white', borderRadius: 1 }}
                                />
                            )}
                            sx={{ mr: 2 }}
                        />
                        <div className="control-group" style={{ background: 'transparent', border: 'none' }}>
                            <Button
                                variant="outlined"
                                onClick={handleDateMenuOpen}
                                endIcon={<KeyboardArrowDownIcon />}
                                sx={{
                                    color: '#0f172a',
                                    borderColor: '#cbd5e1',
                                    textTransform: 'none',
                                    fontWeight: 500
                                }}
                            >
                                {selectedPreset}
                            </Button>
                            <Menu
                                anchorEl={dateAnchorEl}
                                open={Boolean(dateAnchorEl)}
                                onClose={handleDateMenuClose}
                                PaperProps={{
                                    sx: {
                                        bgcolor: 'white',
                                        color: '#1e293b',
                                        border: '1px solid #e2e8f0',
                                        mt: 1,
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                    }
                                }}
                            >
                                <MenuItem onClick={() => handleDatePreset('Today')}>Today</MenuItem>
                                <MenuItem onClick={() => handleDatePreset('Yesterday')}>Yesterday</MenuItem>
                                <MenuItem onClick={() => handleDatePreset('This Month')}>This Month</MenuItem>
                            </Menu>
                        </div>

                        <div className="date-picker-group">
                            <DatePicker
                                value={startDate}
                                onChange={(newValue) => setRange('Custom', newValue, endDate)}
                                slotProps={{
                                    textField: {
                                        size: 'small',
                                        sx: { width: 130 }
                                    }
                                }}
                            />
                            <span style={{ color: '#0f172a', margin: '0 8px' }}>—</span>
                            <DatePicker
                                value={endDate}
                                onChange={(newValue) => setRange('Custom', startDate, newValue)}
                                slotProps={{
                                    textField: {
                                        size: 'small',
                                        sx: { width: 130 }
                                    }
                                }}
                            />
                        </div>

                        <IconButton
                            onClick={handleRefresh}
                            sx={{
                                bgcolor: 'rgba(59, 130, 246, 0.2)',
                                color: '#60a5fa',
                                '&:hover': { bgcolor: 'rgba(59, 130, 246, 0.4)' }
                            }}
                        >
                            <RefreshIcon />
                        </IconButton>
                    </div>
                </header>

                <main className="analytics-main">
                    <div key={refreshKey} style={{ height: '100%' }}>
                        <Outlet />
                    </div>
                </main>
            </div>
        </LocalizationProvider >
    );
};

export default AnalyticsLayout;
