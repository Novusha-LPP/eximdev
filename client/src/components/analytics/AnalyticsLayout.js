import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, Navigate } from 'react-router-dom';
import { useAnalytics } from './AnalyticsContext';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import RefreshIcon from '@mui/icons-material/Refresh';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LocalShippingIcon from '@mui/icons-material/LocalShipping'; // Movement
import GavelIcon from '@mui/icons-material/Gavel'; // Customs
import DescriptionIcon from '@mui/icons-material/Description'; // Docs
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn'; // DO
import ReceiptIcon from '@mui/icons-material/Receipt'; // Billing
import WarningIcon from '@mui/icons-material/Warning'; // Exceptions
import './AnalyticsLayout.css';

const navItems = [
    { name: 'Overview', path: 'overview', icon: <DashboardIcon /> },
    { name: 'Movement', path: 'movement', icon: <LocalShippingIcon /> },
    { name: 'Customs', path: 'customs', icon: <GavelIcon /> },
    { name: 'Documentation', path: 'documentation', icon: <DescriptionIcon /> },
    { name: 'DO Management', path: 'do-management', icon: <AssignmentTurnedInIcon /> },
    { name: 'Billing', path: 'billing', icon: <ReceiptIcon /> },
];

const AnalyticsLayout = () => {
    const { startDate, endDate, setRange } = useAnalytics();
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);

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
    };

    const handleRefresh = () => {
        setRefreshKey(prev => prev + 1);
        // This key can be passed to children to trigger refetch
        // Or simply context update
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
            <div className="analytics-container">
                <aside className={`analytics-sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
                    <div className="sidebar-header">
                        <h2>Analytics</h2>
                        <button className="toggle-btn" onClick={() => setSidebarOpen(!isSidebarOpen)}>
                            {isSidebarOpen ? '«' : '»'}
                        </button>
                    </div>
                    <nav>
                        {navItems.map(item => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                            >
                                <span className="icon">{item.icon}</span>
                                {isSidebarOpen && <span className="label">{item.name}</span>}
                            </NavLink>
                        ))}
                    </nav>
                </aside>

                <main className="analytics-main">
                    <header className="analytics-header">
                        <div className="header-left">
                            <h1>Import Operations</h1>
                        </div>
                        <div className="header-controls">
                            <div className="date-presets">
                                <Button variant="outlined" size="small" onClick={() => handleDatePreset('Today')}>Today</Button>
                                <Button variant="outlined" size="small" onClick={() => handleDatePreset('Yesterday')}>Yesterday</Button>
                                <Button variant="outlined" size="small" onClick={() => handleDatePreset('This Month')}>This Month</Button>
                            </div>

                            <div className="date-picker-group">
                                <DatePicker
                                    label="Start Date"
                                    value={startDate}
                                    onChange={(newValue) => setRange('Custom', newValue, endDate)}
                                    slotProps={{ textField: { size: 'small', sx: { width: 140 } } }}
                                />
                                <span className="sep">-</span>
                                <DatePicker
                                    label="End Date"
                                    value={endDate}
                                    onChange={(newValue) => setRange('Custom', startDate, newValue)}
                                    slotProps={{ textField: { size: 'small', sx: { width: 140 } } }}
                                />
                            </div>

                            <Button
                                variant="contained"
                                color="primary"
                                startIcon={<RefreshIcon />}
                                onClick={handleRefresh}
                            >
                                Refresh
                            </Button>
                        </div>
                    </header>

                    <div className="analytics-content" key={refreshKey}>
                        <Outlet />
                    </div>
                </main>
            </div>
        </LocalizationProvider>
    );
};

export default AnalyticsLayout;
