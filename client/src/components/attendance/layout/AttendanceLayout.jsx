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
  { section: 'My Attendance' },
  { path: '/attendance/my-attendance', icon: FiClock, label: 'My Attendance' },
  { section: 'Leave' },
  { path: '/attendance/leave', icon: FiFileText, label: 'Apply Leave' },
  { section: 'Calendar' },
  { path: '/attendance/holiday-calendar', icon: FiCalendar, label: 'Holidays' },
];

const HOD_MENU = [
  { section: 'Overview' },
  { path: '/attendance/dashboard', icon: FiHome, label: 'Dashboard' },
  { section: 'My Attendance' },
  { path: '/attendance/my-attendance', icon: FiClock, label: 'My Report' },
  { section: 'My Leave' },
  { path: '/attendance/leave', icon: FiFileText, label: 'Apply Leave' },
  { section: 'Team' },
  { path: '/attendance/hod/report', icon: FiActivity, label: 'Team Report' },
  { path: '/attendance/hod/leave-approval', icon: FiCheckSquare, label: 'Leave Approvals' },
  { section: 'Calendar' },
  { path: '/attendance/holiday-calendar', icon: FiCalendar, label: 'Holidays' },
];

const ADMIN_MENU = [
  { section: 'Overview' },
  { path: '/attendance/dashboard', icon: FiHome, label: 'Dashboard' },
  { section: 'My Attendance' },
  { path: '/attendance/my-attendance', icon: FiClock, label: 'My Attendance' },
  { section: 'Company' },
  { path: '/attendance/admin/attendance', icon: FiUsers, label: 'Company Report' },
  { section: 'Leave' },
  { path: '/attendance/hod/leave-approval', icon: FiFileText, label: 'Leave Approvals' },
  { section: 'Configuration' },
  { path: '/attendance/admin/holidays', icon: FiCalendar, label: 'Holidays' },
  { path: '/attendance/admin/shifts', icon: FiClock, label: 'Shifts' },
  { path: '/attendance/admin/leave-policies', icon: FiFileText, label: 'Leave Policies' },
];

const AttendanceLayout = () => {
    const { user } = useContext(UserContext);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [punchStatus, setPunchStatus] = useState(null);
    const [punching, setPunching] = useState(false);

    // Provide a fallback in case user is not loaded yet
    const role = user?.role || 'EMPLOYEE';
    
    // Choose the right menu depending on the user's role mapped by EXIM/Auth middleware
    const menu = role === 'Admin' || role === 'ADMIN' ? ADMIN_MENU :
                 role === 'Head_of_Department' || role === 'HOD' ? HOD_MENU : 
                 EMPLOYEE_MENU;

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
                            <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
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
