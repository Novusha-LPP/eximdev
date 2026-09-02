import React, { useState, useEffect, useCallback, useContext } from 'react';
import { 
    FiChevronLeft, FiChevronRight, FiSearch, FiCalendar, 
    FiUsers, FiCheck, FiX, FiAlertTriangle, FiRefreshCw,
    FiLogIn, FiLogOut
} from 'react-icons/fi';
import attendanceAPI from '../../../api/attendance/attendance.api';
import masterAPI from '../../../api/attendance/master.api';
import payrollAPI from '../../../api/attendance/payroll.api';
import leaveAPI from '../../../api/attendance/leave.api';
import { UserContext } from '../../../contexts/UserContext';
import moment from 'moment';
import toast from 'react-hot-toast';
import './OperatorAttendance.css';

const THEME = {
    indigo: '#4f46e5',
    success: '#10b981',
    danger: '#ef4444',
    warning: '#f59e0b',
    muted: '#64748b',
    border: '#e2e8f0',
    bg: '#f8fafc',
    white: '#ffffff'
};

const OperatorAttendance = () => {
    const { user } = useContext(UserContext);
    const [selectedDate, setSelectedDate] = useState(moment().format('YYYY-MM-DD'));
    
    // Data states
    const [loading, setLoading] = useState(true);
    const [companies, setCompanies] = useState([]);
    const [rabsCompany, setRabsCompany] = useState(null);
    const [operators, setOperators] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [attendanceRecords, setAttendanceRecords] = useState({}); // mapped by employeeId
    const [savingStates, setSavingStates] = useState({}); // mapped by employeeId

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDept, setSelectedDept] = useState('all');
    const [showOnlyNonSmartphone, setShowOnlyNonSmartphone] = useState(true);

    // Override Dialog state
    const [overrideDialog, setOverrideDialog] = useState({
        open: false,
        employee: null,
        status: null,
        message: '',
        actionType: null // 'absent', 'leave', 'present'
    });

    const selectedDateIsToday = moment(selectedDate).isSame(moment(), 'day');

    // Leave application modal state
    const [leaveModal, setLeaveModal] = useState({
        open: false,
        employee: null,
        balances: [],
        loadingBalances: false,
        form: {
            leave_policy_id: '',
            from_date: '',
            to_date: '',
            reason: '',
            is_half_day: false,
            half_day_session: 'first_half'
        },
        submitting: false
    });

    const handleOpenLeaveModal = async (employee) => {
        setLeaveModal(prev => ({
            ...prev,
            open: true,
            employee,
            loadingBalances: true,
            balances: [],
            form: {
                leave_policy_id: '',
                from_date: selectedDate,
                to_date: selectedDate,
                reason: '',
                is_half_day: false,
                half_day_session: 'first_half'
            }
        }));
        
        try {
            const res = await leaveAPI.getBalance(employee._id);
            const list = res?.data || [];
            setLeaveModal(prev => ({
                ...prev,
                balances: list,
                loadingBalances: false,
                form: {
                    ...prev.form,
                    leave_policy_id: list[0]?._id || ''
                }
            }));
        } catch (err) {
            console.error('Failed to load leave balances:', err);
            toast.error('Failed to load employee leave balances');
            setLeaveModal(prev => ({ ...prev, loadingBalances: false }));
        }
    };

    const handleApplyLeaveSubmit = async (e) => {
        e.preventDefault();
        setLeaveModal(prev => ({ ...prev, submitting: true }));
        try {
            const { employee, form } = leaveModal;
            const payload = {
                employee_id: employee._id,
                leave_policy_id: form.leave_policy_id,
                from_date: form.from_date,
                to_date: form.to_date,
                reason: form.reason,
                is_half_day: form.is_half_day,
                half_day_session: form.is_half_day ? form.half_day_session : undefined
            };

            await leaveAPI.applyLeave(payload);
            toast.success(`Leave applied successfully for ${employee.first_name || employee.username}`);
            setLeaveModal(prev => ({ ...prev, open: false }));
            fetchData();
            window.dispatchEvent(new CustomEvent('attendance-updated'));
        } catch (err) {
            console.error('Failed to apply leave:', err);
            toast.error(err?.message || err?.response?.data?.message || 'Failed to apply leave');
        } finally {
            setLeaveModal(prev => ({ ...prev, submitting: false }));
        }
    };

    // Fetch initial configuration (Companies and Departments)
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                // Fetch companies to find RABS dynamically
                const compsRes = await masterAPI.getCompanies();
                const comps = compsRes?.data || [];
                setCompanies(comps);
                
                const foundRabs = comps.find(c => /RABS/i.test(c.company_name));
                if (foundRabs) {
                    setRabsCompany(foundRabs);
                } else {
                    toast.error('RABS Company not found. Falling back to default company.');
                }

                // Fetch departments for filtering
                const deptsRes = await masterAPI.getDepartments();
                setDepartments(deptsRes?.data || []);
            } catch (err) {
                console.error('Failed to load initial configuration:', err);
                toast.error('Failed to load companies or departments');
            }
        };
        fetchInitialData();
    }, []);

    // Fetch operators and attendance records for selectedDate
    const fetchData = useCallback(async () => {
        if (!rabsCompany && companies.length > 0) return; // Wait for company resolution
        
        setLoading(true);
        try {
            const companyId = rabsCompany?._id || user?.company_id;
            
            // 1. Fetch active RABS users
            const usersRes = await masterAPI.getUsers({
                company_id: companyId,
                isActive: true
            });
            const users = usersRes?.data || [];
            setOperators(users);

            // 2. Fetch attendance records for the selected date
            const historyRes = await attendanceAPI.getHistory({
                startDate: selectedDate,
                endDate: selectedDate,
                limit: 500
            });
            const records = historyRes?.data || [];
            
            // Map records by employee_id for O(1) lookup
            const recordMap = {};
            records.forEach(r => {
                const empId = r.employee_id?._id || r.employee_id || r.id;
                if (empId) recordMap[String(empId)] = r;
            });
            setAttendanceRecords(recordMap);
        } catch (err) {
            console.error('Failed to load Operator Desk data:', err);
            toast.error('Failed to load daily attendance data');
        } finally {
            setLoading(false);
        }
    }, [rabsCompany, selectedDate, companies.length, user?.company_id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Handle shift timings display
    const getShiftDisplay = (emp) => {
        if (emp.shift_id) {
            const name = emp.shift_id.shift_name || 'Shift';
            const start = emp.shift_id.start_time || '--:--';
            const end = emp.shift_id.end_time || '--:--';
            return `${name} (${start} - ${end})`;
        }
        return 'Not Assigned';
    };

    // Toggle smartphone setting
    const handleToggleDevice = async (employee, newHasSmartphone) => {
        const empId = String(employee._id);
        setSavingStates(prev => ({ ...prev, [empId]: true }));
        try {
            await payrollAPI.updateUserProfile(employee._id, {
                attendance_settings: {
                    has_smartphone: newHasSmartphone
                }
            });
            toast.success(`${employee.first_name || employee.username}'s device setting updated`);
            
            // Update the local operators list setting
            setOperators(prev => prev.map(op => {
                if (op._id === employee._id) {
                    return {
                        ...op,
                        attendance_settings: {
                            ...op.attendance_settings,
                            has_smartphone: newHasSmartphone
                        }
                    };
                }
                return op;
            }));
        } catch (err) {
            console.error('Failed to toggle device setting:', err);
            toast.error('Failed to update device setting');
        } finally {
            setSavingStates(prev => ({ ...prev, [empId]: false }));
        }
    };

    // Action: Punch In
    const handlePunchIn = async (employee, force = false) => {
        const empId = String(employee._id);
        setSavingStates(prev => ({ ...prev, [empId]: true }));

        try {
            if (selectedDateIsToday) {
                // Today: Realtime check-in punch
                await attendanceAPI.punch({
                    type: 'IN',
                    employee_id: employee._id,
                    method: 'manual'
                });
                toast.success(`${employee.first_name || employee.username} Punched In successfully`);
            } else {
                // Past Date: Manual adjustment to Present (populates standard shift start/end times)
                await attendanceAPI.createManualAdjustment({
                    employee_id: employee._id,
                    attendance_date: selectedDate,
                    status: 'present',
                    correction_mode: 'status_correction',
                    apply_status_correction: true,
                    apply_time_correction: false,
                    force_override: force
                });
                toast.success(`${employee.first_name || employee.username} marked Present (Shift Timings Applied)`);
            }
            window.dispatchEvent(new CustomEvent('attendance-updated'));
        } catch (err) {
            console.error('Punch In failed:', err);
            const apiMessage = err?.message || err?.response?.data?.message || '';
            const isLeaveConflict = err?.status === 409 || err?.response?.status === 409 || apiMessage.includes('leave');

            if (isLeaveConflict && !selectedDateIsToday) {
                setOverrideDialog({
                    open: true,
                    employee,
                    status: 'present',
                    actionType: 'present',
                    message: apiMessage || `Approved leave exists for ${employee.first_name || employee.username}. Force mark Present?`
                });
            } else {
                toast.error(apiMessage || 'Punch In failed');
            }
        } finally {
            setSavingStates(prev => ({ ...prev, [empId]: false }));
            fetchData();
        }
    };

    // Action: Punch Out
    const handlePunchOut = async (employee) => {
        const empId = String(employee._id);
        
        if (!selectedDateIsToday) {
            toast.error('Real-time Punch Out is only available for today. To adjust past dates, use standard Present/Absent controls.');
            return;
        }

        setSavingStates(prev => ({ ...prev, [empId]: true }));
        try {
            await attendanceAPI.punch({
                type: 'OUT',
                employee_id: employee._id,
                method: 'manual'
            });
            toast.success(`${employee.first_name || employee.username} Punched Out successfully`);
            window.dispatchEvent(new CustomEvent('attendance-updated'));
        } catch (err) {
            console.error('Punch Out failed:', err);
            toast.error(err?.message || err?.response?.data?.message || 'Punch Out failed');
        } finally {
            setSavingStates(prev => ({ ...prev, [empId]: false }));
            fetchData();
        }
    };

    // Action: Mark Absent or Leave
    const handleMarkStatus = async (employee, targetStatus, force = false) => {
        const empId = String(employee._id);
        
        setSavingStates(prev => ({ ...prev, [empId]: true }));
        try {
            const payload = {
                employee_id: employee._id,
                attendance_date: selectedDate,
                status: targetStatus,
                correction_mode: 'status_correction',
                apply_status_correction: true,
                apply_time_correction: false,
                force_override: force
            };

            await attendanceAPI.createManualAdjustment(payload);
            toast.success(`${employee.first_name || employee.username} marked as ${targetStatus.toUpperCase()}`);
            window.dispatchEvent(new CustomEvent('attendance-updated'));
        } catch (err) {
            console.error(`Failed to mark ${targetStatus}:`, err);
            const apiMessage = err?.message || err?.response?.data?.message || '';
            const isLeaveConflict = err?.status === 409 || err?.response?.status === 409 || apiMessage.includes('leave');

            if (isLeaveConflict && targetStatus === 'absent') {
                setOverrideDialog({
                    open: true,
                    employee,
                    status: 'absent',
                    actionType: 'absent',
                    message: apiMessage || `Approved leave exists for ${employee.first_name || employee.username}. Force mark Absent?`
                });
            } else {
                toast.error(apiMessage || `Failed to update status to ${targetStatus}`);
            }
        } finally {
            setSavingStates(prev => ({ ...prev, [empId]: false }));
            fetchData();
        }
    };

    // Confirm Dialog Override
    const confirmLeaveOverride = () => {
        const { employee, status, actionType } = overrideDialog;
        setOverrideDialog({ open: false, employee: null, status: null, message: '', actionType: null });
        if (employee && status) {
            if (actionType === 'present') {
                handlePunchIn(employee, true);
            } else {
                handleMarkStatus(employee, status, true);
            }
        }
    };

    // Handle Bulk Action
    const handleBulkAction = async (targetStatus) => {
        const filteredOps = getFilteredOperators();
        if (filteredOps.length === 0) {
            toast.error('No operators found to update');
            return;
        }

        const confirmMsg = `Are you sure you want to mark all ${filteredOps.length} filtered operators as ${targetStatus.toUpperCase()} for ${moment(selectedDate).format('DD MMM YYYY')}?`;
        if (!window.confirm(confirmMsg)) return;

        toast.loading(`Processing bulk ${targetStatus} update...`, { id: 'bulk-update' });
        
        let successCount = 0;
        let failCount = 0;

        for (const op of filteredOps) {
            try {
                const payload = {
                    employee_id: op._id,
                    attendance_date: selectedDate,
                    status: targetStatus,
                    correction_mode: 'status_correction',
                    apply_status_correction: true,
                    apply_time_correction: false,
                    force_override: true // Auto-override leaves on bulk command
                };
                await attendanceAPI.createManualAdjustment(payload);
                successCount++;
            } catch (err) {
                console.error(`Bulk update failed for ${op.username}:`, err);
                failCount++;
            }
        }

        toast.dismiss('bulk-update');
        toast.success(`Bulk update finished! Successfully marked ${successCount} operators. ${failCount > 0 ? `Failed ${failCount} records.` : ''}`);
        
        // Refresh data
        fetchData();
        window.dispatchEvent(new CustomEvent('attendance-updated'));
    };

    // Date Navigation helpers
    const handlePrevDay = () => {
        setSelectedDate(prev => moment(prev).subtract(1, 'days').format('YYYY-MM-DD'));
    };

    const handleNextDay = () => {
        // Prevent going into the future
        const nextDay = moment(selectedDate).add(1, 'days');
        if (nextDay.isAfter(moment(), 'day')) {
            toast.error("Cannot mark attendance for future dates.");
            return;
        }
        setSelectedDate(nextDay.format('YYYY-MM-DD'));
    };

    // Filter logic
    const getFilteredOperators = () => {
        return operators.filter(op => {
            // 1. Smartphone owner filter
            const usesPhone = op.attendance_settings?.has_smartphone !== false;
            if (showOnlyNonSmartphone && usesPhone) return false;

            // 2. Search term filter
            const name = `${op.first_name || ''} ${op.last_name || ''} ${op.username || ''}`.toLowerCase();
            const code = (op.employee_code || '').toLowerCase();
            const search = searchTerm.toLowerCase();
            if (searchTerm && !name.includes(search) && !code.includes(search)) return false;

            // 3. Department filter
            if (selectedDept !== 'all') {
                const opDeptId = op.department_id?._id || op.department_id;
                if (String(opDeptId) !== String(selectedDept)) return false;
            }

            return true;
        });
    };

    const filteredOperators = getFilteredOperators();

    // Stats calculations
    const stats = {
        total: filteredOperators.length,
        present: filteredOperators.filter(op => attendanceRecords[op._id]?.status === 'present').length,
        absent: filteredOperators.filter(op => attendanceRecords[op._id]?.status === 'absent').length,
        leave: filteredOperators.filter(op => attendanceRecords[op._id]?.status === 'leave').length,
        notMarked: filteredOperators.filter(op => {
            const status = attendanceRecords[op._id]?.status;
            return !status || !['present', 'absent', 'leave'].includes(status);
        }).length
    };

    return (
        <div className="operator-attendance-container">
            {/* Header & Date Navigation */}
            <div className="operator-header">
                <div className="header-info">
                    <h1>RABS Operator Attendance Desk</h1>
                    <p>Register real-time punches, log leaves, and mark daily operator logs.</p>
                </div>
                
                <div className="date-navigator">
                    <button className="nav-btn" onClick={handlePrevDay} title="Previous Day">
                        <FiChevronLeft size={20} />
                    </button>
                    <div className="date-display">
                        <FiCalendar className="calendar-icon" />
                        <input 
                            type="date" 
                            value={selectedDate} 
                            max={moment().format('YYYY-MM-DD')}
                            onChange={e => setSelectedDate(e.target.value)}
                        />
                        <span className="readable-date">{moment(selectedDate).format('dddd, DD MMM YYYY')}</span>
                    </div>
                    <button 
                        className="nav-btn" 
                        onClick={handleNextDay} 
                        disabled={moment(selectedDate).isSame(moment(), 'day')}
                        title="Next Day"
                    >
                        <FiChevronRight size={20} />
                    </button>
                </div>
            </div>

            {/* Metrics Row */}
            <div className="metrics-row">
                <div className="metric-card total">
                    <div className="metric-icon"><FiUsers /></div>
                    <div className="metric-vals">
                        <span className="val">{stats.total}</span>
                        <span className="lbl">Filtered Staff</span>
                    </div>
                </div>
                <div className="metric-card present">
                    <div className="metric-icon"><FiCheck /></div>
                    <div className="metric-vals">
                        <span className="val">{stats.present}</span>
                        <span className="lbl">Marked Present</span>
                    </div>
                </div>
                <div className="metric-card absent">
                    <div className="metric-icon"><FiX /></div>
                    <div className="metric-vals">
                        <span className="val">{stats.absent}</span>
                        <span className="lbl">Marked Absent</span>
                    </div>
                </div>
                <div className="metric-card warning">
                    <div className="metric-icon"><FiCalendar /></div>
                    <div className="metric-vals">
                        <span className="val">{stats.leave}</span>
                        <span className="lbl">On Leave</span>
                    </div>
                </div>
            </div>

            {/* Filter Dashboard */}
            <div className="filter-dashboard">
                <div className="search-box">
                    <FiSearch className="search-icon" />
                    <input 
                        type="text" 
                        placeholder="Search by operator name or employee code..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <button className="clear-search" onClick={() => setSearchTerm('')}>
                            <FiX size={14} />
                        </button>
                    )}
                </div>

                <div className="filter-actions">
                    <select 
                        value={selectedDept} 
                        onChange={e => setSelectedDept(e.target.value)}
                        className="dept-select"
                    >
                        <option value="all">All Departments</option>
                        {departments.map(d => (
                            <option key={d._id} value={d._id}>{d.department_name}</option>
                        ))}
                    </select>

                    <label className="checkbox-label">
                        <input 
                            type="checkbox"
                            checked={showOnlyNonSmartphone}
                            onChange={e => setShowOnlyNonSmartphone(e.target.checked)}
                        />
                        <span>Only Non-Smartphone Operators</span>
                    </label>

                    <button 
                        className="refresh-btn" 
                        onClick={fetchData} 
                        title="Reload Data"
                        disabled={loading}
                    >
                        <FiRefreshCw className={loading ? 'spinning' : ''} />
                    </button>
                </div>
            </div>

            {/* Bulk Control Ribbon */}
            <div className="bulk-ribbon">
                <span className="bulk-title">Bulk Actions (For Filtered Operators):</span>
                <div className="bulk-buttons">
                    <button 
                        className="bulk-btn present" 
                        onClick={() => handleBulkAction('present')}
                    >
                        <FiCheck size={14} style={{ marginRight: '6px' }} /> Mark All Present
                    </button>
                    <button 
                        className="bulk-btn absent" 
                        onClick={() => handleBulkAction('absent')}
                    >
                        <FiX size={14} style={{ marginRight: '6px' }} /> Mark All Absent
                    </button>
                </div>
            </div>

            {/* Main Listing Desk */}
            <div className="desk-table-container">
                {loading ? (
                    <div className="desk-loader">
                        <FiRefreshCw className="spinning" size={32} color={THEME.indigo} />
                        <p>Loading operator directory and attendance logs...</p>
                    </div>
                ) : filteredOperators.length === 0 ? (
                    <div className="empty-desk">
                        <FiUsers size={48} color={THEME.muted} />
                        <h3>No operators found</h3>
                        <p>Try resetting filters or checking the "Only Non-Smartphone" toggle settings.</p>
                    </div>
                ) : (
                    <table className="desk-table">
                        <thead>
                            <tr>
                                <th>Operator Profile</th>
                                <th>Assigned Shift</th>
                                <th>Device Setting</th>
                                <th>Status</th>
                                <th>Punch In Time</th>
                                <th>Punch Out Time</th>
                                <th style={{ textAlign: 'center' }}>Desk Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOperators.map(op => {
                                const record = attendanceRecords[op._id];
                                const isSaving = savingStates[op._id];
                                const hasPhone = op.attendance_settings?.has_smartphone !== false;
                                const isCurrentlyPunchedIn = record?.total_punches 
                                    ? (record.total_punches % 2 !== 0) 
                                    : (record?.first_in && !record?.last_out);
                                
                                // Determine status classes
                                let statusClass = 'not-marked';
                                let statusLabel = 'Not Marked';
                                if (record) {
                                    statusClass = record.status || 'not-marked';
                                    statusLabel = record.status ? record.status.toUpperCase() : 'NOT MARKED';
                                }

                                return (
                                    <tr key={op._id} className={isSaving ? 'row-saving' : ''}>
                                        <td>
                                            <div className="profile-cell">
                                                <div className="profile-avatar">
                                                    {String(op.first_name || op.username || 'U').charAt(0).toUpperCase()}
                                                </div>
                                                <div className="profile-details">
                                                    <span className="profile-name">
                                                        {op.first_name ? `${op.first_name} ${op.last_name || ''}` : op.username}
                                                    </span>
                                                    <span className="profile-meta">
                                                        {op.employee_code || 'No Code'} • {op.department_id?.department_name || 'No Dept'}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        
                                        <td>
                                            <span className="shift-badge">
                                                {getShiftDisplay(op)}
                                            </span>
                                        </td>

                                        <td>
                                            <button 
                                                className={`device-toggle-btn ${hasPhone ? 'has-phone' : 'no-phone'}`}
                                                onClick={() => handleToggleDevice(op, !hasPhone)}
                                                title="Click to toggle smartphone access setting"
                                                disabled={isSaving}
                                            >
                                                {hasPhone ? 'Smartphone' : 'No Phone'}
                                            </button>
                                        </td>

                                        <td>
                                            <span className={`status-pill ${statusClass}`}>
                                                {statusLabel}
                                            </span>
                                        </td>

                                        <td>
                                            <span className="time-text">
                                                {record?.first_in ? moment(record.first_in).format('hh:mm A') : '—'}
                                            </span>
                                        </td>

                                        <td>
                                            <span className="time-text">
                                                {(record?.last_out && !isCurrentlyPunchedIn) ? moment(record.last_out).format('hh:mm A') : '—'}
                                            </span>
                                        </td>

                                        <td>
                                            <div className="actions-cell">
                                                {/* Dynamic Punch Button: Punch In → Punch Out → Punch In (cycle) */}
                                                {isCurrentlyPunchedIn ? (
                                                    <button 
                                                        className="action-btn punch-out"
                                                        onClick={() => handlePunchOut(op)}
                                                        disabled={isSaving || !selectedDateIsToday}
                                                    >
                                                        {isSaving ? (
                                                            <FiRefreshCw className="spinning" size={14} />
                                                        ) : (
                                                            <><FiLogOut size={14} /><span>Punch Out</span></>
                                                        )}
                                                    </button>
                                                ) : (
                                                    <button 
                                                        className={`action-btn punch-in ${record?.first_in ? 'active' : ''}`}
                                                        onClick={() => handlePunchIn(op)}
                                                        disabled={isSaving || (!selectedDateIsToday && record?.first_in)}
                                                    >
                                                        {isSaving ? (
                                                            <FiRefreshCw className="spinning" size={14} />
                                                        ) : (
                                                            <><FiLogIn size={14} /><span>{selectedDateIsToday ? 'Punch In' : 'Present'}</span></>
                                                        )}
                                                    </button>
                                                )}

                                                {/* Leave Application Modal Trigger */}
                                                <button 
                                                    className={`action-btn leave ${record?.status === 'leave' ? 'active' : ''}`}
                                                    onClick={() => handleOpenLeaveModal(op)}
                                                    disabled={isSaving}
                                                >
                                                    {isSaving ? (
                                                        <FiRefreshCw className="spinning" size={14} />
                                                    ) : (
                                                        <><FiCalendar size={14} /><span>Leave</span></>
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Leave Conflict Warning Modal */}
            {overrideDialog.open && (
                <div className="od-overlay">
                    <div className="dialog-box">
                        <div className="dialog-header">
                            <FiAlertTriangle className="warn-icon" size={24} />
                            <h3>Leave Conflict Override</h3>
                        </div>
                        <div className="dialog-body">
                            <p>{overrideDialog.message}</p>
                            <p className="danger-sub">Marking them will override and suppress their leave calculations for this specific calendar date.</p>
                        </div>
                        <div className="dialog-actions">
                            <button 
                                className="dialog-btn secondary"
                                onClick={() => setOverrideDialog({ open: false, employee: null, status: null, message: '', actionType: null })}
                            >
                                Cancel
                            </button>
                            <button 
                                className="dialog-btn primary warn"
                                onClick={confirmLeaveOverride}
                            >
                                Yes, Force Override
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* HOD/Admin Leave Application Modal */}
            {leaveModal.open && (
                <div className="od-overlay">
                    <div className="dialog-box" style={{ maxWidth: '480px' }}>
                        <div className="dialog-header">
                            <FiCalendar size={20} style={{ color: '#4f46e5' }} />
                            <h3>Apply Leave for {leaveModal.employee?.first_name || leaveModal.employee?.username}</h3>
                        </div>
                        <div className="dialog-body">
                            {leaveModal.loadingBalances ? (
                                <div className="od-modal-loader">
                                    <FiRefreshCw className="spinning" size={22} color="#4f46e5" />
                                    <span>Loading leave balances…</span>
                                </div>
                            ) : (
                                <form onSubmit={handleApplyLeaveSubmit} className="od-form">
                                    <div className="od-field">
                                        <label className="od-label">Leave Type</label>
                                        <select 
                                            value={leaveModal.form.leave_policy_id} 
                                            onChange={e => setLeaveModal(prev => ({
                                                ...prev,
                                                form: { ...prev.form, leave_policy_id: e.target.value }
                                            }))}
                                            className="od-input"
                                            required
                                        >
                                            {leaveModal.balances.map(b => {
                                                const netBalance = String(b.leave_type).toLowerCase() === 'lwp'
                                                    ? 'Unlimited'
                                                    : (b.available ?? (b.opening_balance - (b.used || 0) - (b.pending || 0)));
                                                return (
                                                    <option key={b._id} value={b._id}>
                                                        {b.policy_name} ({b.leave_type}) • {netBalance} days left
                                                    </option>
                                                );
                                            })}
                                            {leaveModal.balances.length === 0 && (
                                                <option value="">No leave policies assigned</option>
                                            )}
                                        </select>
                                    </div>

                                    <div className="od-field-row">
                                        <div className="od-field">
                                            <label className="od-label">From Date</label>
                                            <input 
                                                type="date" 
                                                value={leaveModal.form.from_date}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    setLeaveModal(prev => {
                                                        const newToDate = prev.form.is_half_day ? val : (prev.form.to_date || val);
                                                        return {
                                                            ...prev,
                                                            form: { ...prev.form, from_date: val, to_date: newToDate }
                                                        };
                                                    });
                                                }}
                                                className="od-input"
                                                required
                                            />
                                        </div>

                                        {!leaveModal.form.is_half_day && (
                                            <div className="od-field">
                                                <label className="od-label">To Date</label>
                                                <input 
                                                    type="date" 
                                                    value={leaveModal.form.to_date}
                                                    min={leaveModal.form.from_date}
                                                    onChange={e => setLeaveModal(prev => ({
                                                        ...prev,
                                                        form: { ...prev.form, to_date: e.target.value }
                                                    }))}
                                                    className="od-input"
                                                    required
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <label className="od-checkbox">
                                        <input 
                                            type="checkbox" 
                                            checked={leaveModal.form.is_half_day}
                                            onChange={e => {
                                                const checked = e.target.checked;
                                                setLeaveModal(prev => ({
                                                    ...prev,
                                                    form: { 
                                                        ...prev.form, 
                                                        is_half_day: checked, 
                                                        to_date: checked ? prev.form.from_date : prev.form.to_date 
                                                    }
                                                }));
                                            }}
                                        />
                                        <span>Apply as Half Day</span>
                                    </label>

                                    {leaveModal.form.is_half_day && (
                                        <div className="od-field">
                                            <label className="od-label">Session</label>
                                            <select 
                                                value={leaveModal.form.half_day_session}
                                                onChange={e => setLeaveModal(prev => ({
                                                    ...prev,
                                                    form: { ...prev.form, half_day_session: e.target.value }
                                                }))}
                                                className="od-input"
                                            >
                                                <option value="first_half">First Half (Morning)</option>
                                                <option value="second_half">Second Half (Afternoon)</option>
                                            </select>
                                        </div>
                                    )}

                                    <div className="od-field">
                                        <label className="od-label">Reason for Leave</label>
                                        <textarea 
                                            value={leaveModal.form.reason}
                                            onChange={e => setLeaveModal(prev => ({
                                                ...prev,
                                                form: { ...prev.form, reason: e.target.value }
                                            }))}
                                            placeholder="Enter reason…"
                                            className="od-input od-textarea"
                                            required
                                        />
                                    </div>

                                    <div className="od-form-actions">
                                        <button 
                                            type="button"
                                            className="dialog-btn secondary"
                                            onClick={() => setLeaveModal(prev => ({ ...prev, open: false }))}
                                            disabled={leaveModal.submitting}
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            type="submit"
                                            className="dialog-btn primary od-primary-btn"
                                            disabled={leaveModal.submitting || !leaveModal.form.leave_policy_id}
                                        >
                                            {leaveModal.submitting ? 'Applying…' : 'Apply Leave'}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OperatorAttendance;
