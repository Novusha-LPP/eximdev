import { useContext } from 'react';
import { UserContext } from '../../contexts/UserContext';
import React from 'react';

// Import dashboards from the correct locations in eximdev
import Dashboard from './Dashboard';
import HODDashboard from './HODDashboard';
import AdminDashboard from './AdminDashboard';

const DashboardSwitch = () => {
    const { user } = useContext(UserContext);

    if (!user) {
        return <div>Loading user data...</div>;
    }

    const role = user.role || 'EMPLOYEE';

    // Role-based dashboard selection
    if (role === 'Admin' || role === 'ADMIN') {
        return <AdminDashboard />;
    } else if (role === 'Head_of_Department' || role === 'HOD') {
        return <HODDashboard />;
    }

    return <Dashboard />;
};

export default DashboardSwitch;


