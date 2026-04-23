import React, { useState, useCallback, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
    FiHome, FiClock, FiFileText, FiCalendar, FiUser,
    FiCheckSquare, FiUsers, FiActivity, FiLogIn, FiLogOut
} from 'react-icons/fi';
import { useContext } from 'react';
import { UserContext } from '../../../contexts/UserContext';
import FloatingPunchButton from '../common/FloatingPunchButton';
import attendanceAPI from '../../../api/attendance/attendance.api';
import toast from 'react-hot-toast';
import '../styles/variables.css';
import './AttendanceLayout.css';

const EMPLOYEE_MENU = [
    { section: 'Overview' },
    { path: '/attendance/dashboard', icon: FiHome, label: 'Dashboard' },
    { section: 'My Attendance & Leave' },
    { path: '/attendance/my-attendance', icon: FiClock, label: 'My Attendance' },
    { path: '/attendance/leave', icon: FiFileText, label: 'Apply Leave' },
    { section: 'Calendar' },
    { path: '/attendance/holiday-calendar', icon: FiCalendar, label: 'Holidays' },
];

const HOD_MENU = [
    { section: 'Overview' },
    { path: '/attendance/dashboard', icon: FiHome, label: 'Dashboard' },
    { section: 'My Attendance & Leave' },
    { path: '/attendance/my-attendance', icon: FiClock, label: 'My Attendance' },
    { path: '/attendance/leave', icon: FiFileText, label: 'Apply Leave' },
    { section: 'Team' },
    { path: '/attendance/hod/report', icon: FiActivity, label: 'Team Attendance' },
    { path: '/attendance/hod/leave-approval', icon: FiCheckSquare, label: 'Approvals' },
    { section: 'Calendar' },
    { path: '/attendance/holiday-calendar', icon: FiCalendar, label: 'Holidays' },
];

const ADMIN_BASE_MENU = [
    { section: 'Overview' },
    { path: '/attendance/dashboard', icon: FiHome, label: 'Dashboard' },
    { section: 'My Attendance & Leave' },
    { path: '/attendance/my-attendance', icon: FiClock, label: 'My Attendance' },
    { path: '/attendance/leave', icon: FiFileText, label: 'Apply Leave' },
    { section: 'Calendar' },
    { path: '/attendance/holiday-calendar', icon: FiCalendar, label: 'Holidays', hideForAllowedAdmin: true },
];

const ADMIN_PRIVILEGED_MENU = [
    { section: 'Company' },
    { path: '/attendance/hod/report', icon: FiActivity, label: 'Team Report', requiresAllowedAdmin: true },
    { path: '/attendance/admin/attendance', icon: FiUsers, label: 'Company Report', requiresAllowedAdmin: true },
    { path: '/attendance/teams', icon: FiUser, label: 'Teams', requiresAllowedAdmin: true },
    { path: '/attendance/hod/leave-approval', icon: FiCheckSquare, label: 'Approvals', requiresAllowedAdmin: true },
    { section: 'Configuration' },
    { path: '/attendance/admin/holidays', icon: FiCalendar, label: 'Holiday Policies', requiresAllowedAdmin: true },
    { path: '/attendance/admin/weekoff-policies', icon: FiClock, label: 'Week-Off Policies', requiresAllowedAdmin: true },
    { path: '/attendance/admin/shifts', icon: FiClock, label: 'Shifts', requiresAllowedAdmin: true },
    { path: '/attendance/admin/leave-policies', icon: FiFileText, label: 'Leave Policies', requiresAllowedAdmin: true },
];


const ALLOWED_USERNAMES = new Set([
    'shalini_arun',
    'manu_pillai',
    'suraj_rajan',
    'rajan_aranamkatte',
    'uday_zope'
]);

const normalizeRole = (role) => String(role || '').trim().toUpperCase().replace(/[^A-Z]/g, '');
const isAdminRole = (role) => normalizeRole(role) === 'ADMIN';
const isHodRole = (role) => {
    const n = normalizeRole(role);
    return n === 'HOD' || n === 'HEADOFDEPARTMENT';
};

const removeEmptySections = (items) => {
    const cleaned = [];
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.section) {
            const hasLinkAhead = items.slice(i + 1).some((next) => !next.section);
            if (hasLinkAhead) cleaned.push(item);
            continue;
        }
        cleaned.push(item);
    }
    return cleaned;
};

const AttendanceLayout = () => {
    const { user } = useContext(UserContext);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [punchStatus, setPunchStatus] = useState(null);
    const [punching, setPunching] = useState(false);

    // Provide a fallback in case user is not loaded yet
    const role = user?.role || 'EMPLOYEE';
    const username = (user?.username || '').toLowerCase();
    const isAdmin = isAdminRole(role);
    const isHOD = isHodRole(role);

    const isAllowedAdmin = ALLOWED_USERNAMES.has(username);

    // Choose the right menu depending on the user's role mapped by EXIM/Auth middleware
    // Allowed admins manage holidays via 'Holiday Policies' — hide the user-facing calendar from them
    let baseMenu = isAllowedAdmin
        ? ADMIN_BASE_MENU.filter(item => !item.hideForAllowedAdmin)
        : ADMIN_BASE_MENU;
    let menu = isAdmin
        ? [...baseMenu, ...(isAllowedAdmin ? ADMIN_PRIVILEGED_MENU : [])]
        : (isHOD ? [...HOD_MENU] : [...EMPLOYEE_MENU]);

    // IF ADMIN and NOT ALLOWED but isHOD (from API), Inject HOD menu items
    // This allows Admins with their own teams to see approvals and manage their members
    const shouldShowHODItems = (isAdmin && !isAllowedAdmin && punchStatus?.isHOD);
    
    if (shouldShowHODItems) {
        menu.push(
            { section: 'Team' },
            { path: '/attendance/hod/report', icon: FiActivity, label: 'Team Attendance' },
            { path: '/attendance/hod/leave-approval', icon: FiCheckSquare, label: 'Approvals' }
            // Teams link removed for non-allowed admins
        );
    }

    // Add Company Management for allowed users
    if (isAdmin && isAllowedAdmin) {
        menu.push(
            { section: 'Administration' },
            { path: '/attendance/admin/companies', icon: FiUsers, label: 'Manage Companies' }
        );
    }

    menu = removeEmptySections(menu);

    const fetchPunchStatus = useCallback(async () => {
        try {
            const res = await attendanceAPI.getTodayStatus();
            setPunchStatus(res);
        } catch { /* silently fail */ }
    }, []);

    useEffect(() => { fetchPunchStatus(); }, [fetchPunchStatus]);

    const handleQuickPunch = async () => {
        const isIn = punchStatus?.isInSession ?? (punchStatus?.first_in && !punchStatus?.last_out);
        setPunching(true);
        try {
            await attendanceAPI.punch({ type: isIn ? 'OUT' : 'IN', method: 'WEB' });
            toast.success(`Punched ${isIn ? 'OUT' : 'IN'} successfully!`);
            fetchPunchStatus();
        } catch (e) {
            toast.error(e?.message || 'Punch failed');
        } finally {
            setPunching(false);
        }
    };

    return (
        <div className="attendance-layout">
            {/* Left Sidebar Navigation */}
            <div className={`attendance-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
                <div className="attendance-brand">
                    {!isSidebarCollapsed && (
                        <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="brand-dot"></span>
                                <span>Attendance</span>
                            </div>
                        </>
                    )}
                    <button
                        className="sidebar-toggle-btn"
                        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    >
                        {isSidebarCollapsed ? '»' : '«'}
                    </button>
                </div>

                <nav className="nav-categories">
                    {menu.map((item, idx) =>
                        item.section ? (
                            <div key={`s${idx}`} className="nav-section-label">
                                {item.section}
                            </div>
                        ) : (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                                title={isSidebarCollapsed ? item.label : ''}
                            >
                                <item.icon className="nav-icon" />
                                {!isSidebarCollapsed && <span className="nav-label">{item.label}</span>}
                            </NavLink>
                        )
                    )}
                </nav>

                {/* Quick Punch Widget at the bottom of sidebar */}

            </div>

            {/* Main Content Area */}
            <div className="attendance-main-content">
                <Outlet />
            </div>

            {/* Global Floating Punch Button */}
            <FloatingPunchButton />
        </div>
    );
};

export default AttendanceLayout;
