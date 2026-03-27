import { useContext } from 'react';
import { UserContext } from '../../contexts/UserContext';
import React from 'react';
// CHANGE THIS LINE:

// Import all dashboards
import Dashboard from '../pages/Dashboard';
import HODDashboard from '../pages/HODDashboard';
import AdminDashboard from '../pages/AdminDashboard';

// ... imports ...

const DashboardSwitch = () => {
    const { user } = useContext(UserContext);

    if (!user) {
        return <div>Loading user data...</div>;
    }

    // Unified Dashboard: Everyone lands on the single, role-aware dashboard.
    return <Dashboard />;
};

export default DashboardSwitch;


