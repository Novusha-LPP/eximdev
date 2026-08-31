import React, { useState, useCallback, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
    FiHome, FiClock, FiFileText, FiCalendar, FiUser,
    FiCheckSquare, FiUsers, FiActivity, FiLogIn, FiLogOut,
    FiBarChart2, FiDollarSign
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
    { path: '/attendance/my-salary', icon: FiDollarSign, label: 'My Salary' },
    { path: '/attendance/leave', icon: FiFileText, label: 'Apply Leave' },
    { section: 'Calendar' },
    { path: '/attendance/holiday-calendar', icon: FiCalendar, label: 'Holidays' },
];

const HOD_MENU = [
    { section: 'Overview' },
    { path: '/attendance/dashboard', icon: FiHome, label: 'Dashboard' },
    { section: 'My Attendance & Leave' },
    { path: '/attendance/my-attendance', icon: FiClock, label: 'My Attendance' },
    { path: '/attendance/my-salary', icon: FiDollarSign, label: 'My Salary' },
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
    { path: '/attendance/my-salary', icon: FiDollarSign, label: 'My Salary' },
    { path: '/attendance/leave', icon: FiFileText, label: 'Apply Leave' },
];

const ADMIN_PRIVILEGED_MENU = [
    { section: 'Company' },
    { path: '/attendance/hod/report', icon: FiActivity, label: 'Team Report', requiresAllowedAdmin: true },
    { path: '/attendance/admin/attendance', icon: FiUsers, label: 'Company Report', requiresAllowedAdmin: true },
    { path: '/attendance/teams', icon: FiUser, label: 'Employee Directory', requiresAllowedAdmin: true },
    { path: '/attendance/hod/leave-approval', icon: FiCheckSquare, label: 'Approvals', requiresAllowedAdmin: true },
    { path: '/attendance/admin/reports', icon: FiBarChart2, label: 'Reports', requiresAllowedAdmin: true },
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
    const location = useLocation();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [punchStatus, setPunchStatus] = useState(null);
    const [punching, setPunching] = useState(false);
    const [pendingCorrectionCount, setPendingCorrectionCount] = useState(0);
    const [pendingLeavesCount, setPendingLeavesCount] = useState(0);

    const isOperatorDesk = location.pathname.includes('/operator-attendance');

    // Provide a fallback in case user is not loaded yet
    const role = user?.role || 'EMPLOYEE';
    const username = (user?.username || '').toLowerCase();
    const isDynamicAdmin = user?.isAttendanceAllowedAdmin === true;
    const isAdmin = isAdminRole(role) || isDynamicAdmin;
    const isHOD = isHodRole(role);

    const isAllowedAdmin = ALLOWED_USERNAMES.has(username) || isDynamicAdmin;
    const isRabs = user?.company && /RABS/i.test(user.company);
    const isAjith = username === 'ajith_sivadasan';
    const showOperatorDesk = (isAdmin || isHOD) && (isRabs || isAjith);

    // Choose the right menu depending on the user's role mapped by EXIM/Auth middleware
    // Allowed admins manage holidays via 'Holiday Policies' — hide the user-facing calendar from them
    let baseMenu = isAllowedAdmin
        ? ADMIN_BASE_MENU.filter(item => !item.hideForAllowedAdmin)
        : ADMIN_BASE_MENU;
    let privilegedMenu = isAllowedAdmin
        ? ADMIN_PRIVILEGED_MENU.filter(item => item.label !== 'Team Report' && item.label !== 'Company Report')
        : ADMIN_PRIVILEGED_MENU;

    const configIndex = privilegedMenu.findIndex(item => item.section === 'Configuration');
    if (configIndex !== -1) {
        const firstPart = privilegedMenu.slice(0, configIndex);
        const secondPart = privilegedMenu.slice(configIndex);

        // 1. Insert Operations under 'Payroll' in the first part
        const operationsMenu = [
            { section: 'Payroll' },
            // { path: '/attendance/admin/payroll-dashboard', icon: FiHome, label: 'Payroll Dashboard', requiresAllowedAdmin: true },
            { path: '/attendance/admin/payroll-entries', icon: FiCheckSquare, label: 'Payroll Entries', requiresAllowedAdmin: true },
            { path: '/attendance/admin/payslip-generator', icon: FiFileText, label: 'Payslip Generator', requiresAllowedAdmin: true },
            { path: '/attendance/admin/bank-transfer', icon: FiActivity, label: 'Bank Transfer', requiresAllowedAdmin: true },
            { path: '/attendance/admin/payroll-reports', icon: FiBarChart2, label: 'Payroll Reports', requiresAllowedAdmin: true },
        ];

        // 2. Insert Employee Payroll Master right under 'Configuration' section in the second part
        const configMenu = [
            secondPart[0], // { section: 'Configuration' }
            { path: '/attendance/admin/payroll-master', icon: FiUsers, label: 'Employee Payroll Master', requiresAllowedAdmin: true },
            ...secondPart.slice(1)
        ];

        privilegedMenu = [
            ...firstPart,
            ...operationsMenu,
            ...configMenu
        ];
    } else {
        // Fallback flat-list if Configuration section is not found
        privilegedMenu = [
            privilegedMenu[0],
            { section: 'Payroll' },
            // { path: '/attendance/admin/payroll-dashboard', icon: FiHome, label: 'Payroll Dashboard', requiresAllowedAdmin: true },
            { path: '/attendance/admin/payroll-entries', icon: FiCheckSquare, label: 'Payroll Entries', requiresAllowedAdmin: true },
            { path: '/attendance/admin/payroll-master', icon: FiUsers, label: 'Employee Payroll Master', requiresAllowedAdmin: true },
            { path: '/attendance/admin/payslip-generator', icon: FiFileText, label: 'Payslip Generator', requiresAllowedAdmin: true },
            { path: '/attendance/admin/bank-transfer', icon: FiActivity, label: 'Bank Transfer', requiresAllowedAdmin: true },
            { path: '/attendance/admin/payroll-reports', icon: FiBarChart2, label: 'Payroll Reports', requiresAllowedAdmin: true },
            ...privilegedMenu.slice(1)
        ];
    }

    let menu = isAdmin
        ? [...baseMenu, ...(isAllowedAdmin ? privilegedMenu : [])]
        : (isHOD ? [...HOD_MENU] : [...EMPLOYEE_MENU]);

    if (!isRabs) {
        menu = menu.filter(item => {
            if (item.path === '/attendance/my-salary') return false;
            if (item.section === 'Payroll') return false;
            if (item.path && item.path.includes('/payroll')) return false;
            if (item.path === '/attendance/admin/payslip-generator') return false;
            if (item.path === '/attendance/admin/bank-transfer') return false;
            return true;
        });
    }

    if (username === 'chirag_shah') {
        const hasReports = menu.some(item => item.path === '/attendance/admin/reports');
        if (!hasReports) {
            menu.push(
                { section: 'Reports' },
                { path: '/attendance/admin/reports', icon: FiBarChart2, label: 'Reports' }
            );
        }
    }

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

    // Add Company Management for allowed users (restricted to static/global allowed admins)
    if (isAdmin && ALLOWED_USERNAMES.has(username)) {
        menu.push(
            { section: 'Administration' },
            { path: '/attendance/admin/companies', icon: FiUsers, label: 'Manage Companies' }
        );
    }

    if (showOperatorDesk) {
        menu.push(
            { section: 'RABS Operations' },
            { path: '/attendance/admin/operator-attendance', icon: FiUsers, label: 'Operator Desk' }
        );
    }

    menu = removeEmptySections(menu);

    const fetchPunchStatus = useCallback(async () => {
        try {
            const res = await attendanceAPI.getTodayStatus();
            setPunchStatus(res);
        } catch { /* silently fail */ }
    }, []);

    const fetchPendingCorrectionCount = useCallback(async () => {
        try {
            const res = await attendanceAPI.getPendingCorrectionCount();
            if (res && typeof res.count === 'number') {
                setPendingCorrectionCount(res.count);
            }
        } catch { /* silently fail */ }
    }, []);

    const fetchPendingLeavesCount = useCallback(async () => {
        try {
            const res = await attendanceAPI.getPendingLeavesCount();
            if (res && typeof res.count === 'number') {
                setPendingLeavesCount(res.count);
            }
        } catch { /* silently fail */ }
    }, []);

    useEffect(() => { fetchPunchStatus(); }, [fetchPunchStatus]);

    useEffect(() => {
        if (user) {
            fetchPendingCorrectionCount();
            if (isAdmin || isHOD) {
                fetchPendingLeavesCount();
            }
            const interval = setInterval(() => {
                fetchPendingCorrectionCount();
                if (isAdmin || isHOD) {
                    fetchPendingLeavesCount();
                }
            }, 5 * 60 * 1000);
            return () => clearInterval(interval);
        }
    }, [user, isAdmin, isHOD, fetchPendingCorrectionCount, fetchPendingLeavesCount]);

    useEffect(() => {
        const handler = () => {
            fetchPendingCorrectionCount();
            if (isAdmin || isHOD) {
                fetchPendingLeavesCount();
            }
        };
        window.addEventListener('attendance-updated', handler);
        window.addEventListener('leave-balance-updated', handler);
        return () => {
            window.removeEventListener('attendance-updated', handler);
            window.removeEventListener('leave-balance-updated', handler);
        };
    }, [isAdmin, isHOD, fetchPendingCorrectionCount, fetchPendingLeavesCount]);

    const handleQuickPunch = async () => {
        const isIn = punchStatus?.isInSession ?? (punchStatus?.first_in && !punchStatus?.last_out);
        setPunching(true);
        try {
            let location = null;
            try {
                const pos = await new Promise((res, rej) =>
                    navigator.geolocation.getCurrentPosition(res, rej, {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 0
                    })
                );
                location = {
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                    accuracy: pos.coords.accuracy,
                    altitude: pos.coords.altitude,
                    heading: pos.coords.heading,
                    speed: pos.coords.speed,
                    timestamp: pos.timestamp
                };
            } catch (e) {
                console.warn("Geolocation failed:", e);
            }
            await attendanceAPI.punch({ type: isIn ? 'OUT' : 'IN', method: 'WEB', location });
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
                                <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <item.icon className="nav-icon" />

                                </div>
                                {!isSidebarCollapsed && (
                                    <span className="nav-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        {item.label}
                                        {['Teams', 'Team Attendance'].includes(item.label) && pendingCorrectionCount > 0 && (
                                            <span style={{
                                                width: '6px',
                                                height: '6px',
                                                backgroundColor: '#dc2626',
                                                borderRadius: '50%',
                                                display: 'inline-block'
                                            }} />
                                        )}
                                        {item.label === 'Approvals' && pendingLeavesCount > 0 && (
                                            <span style={{
                                                width: '6px',
                                                height: '6px',
                                                backgroundColor: '#dc2626',
                                                borderRadius: '50%',
                                                display: 'inline-block'
                                            }} />
                                        )}
                                    </span>
                                )}
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
            {!isOperatorDesk && <FloatingPunchButton />}
        </div>
    );
};

export default AttendanceLayout;
