import LeaveApplication from '../../model/attendance/LeaveApplication.js';
import LeaveBalance from '../../model/attendance/LeaveBalance.js';
import LeavePolicy from '../../model/attendance/LeavePolicy.js';
import UserModel from '../../model/userModel.mjs';
import moment from 'moment';
import TeamModel from '../../model/teamModel.mjs';
import LeaveCalculationService from '../../services/attendance/LeaveCalculationService.js';
import mongoose from 'mongoose';


// Get Leave Balance
export const getBalance = async (req, res) => {
    try {
        const actor = req.user;
        const currentYear = new Date().getFullYear();
        
        // --- 1. Identify Target Employee ---
        let targetId = actor._id;
        let targetEmployee = actor;

        const { employee_id } = req.query;
        if (employee_id && String(employee_id) !== String(actor._id)) {
            // Role check: Only admin or HOD can see others
            const isAdmin = actor.role === 'ADMIN';
            const isHOD = actor.role === 'HOD';

            if (!isAdmin && !isHOD) {
                return res.status(403).json({ message: 'Unauthorized to view others balance' });
            }

            // Fetch target info
            const employeeFound = await UserModel.findById(employee_id);
            if (!employeeFound) {
                return res.status(404).json({ message: 'Target employee not found' });
            }

            // HOD specific check: Is the target in their team?
            if (isHOD && !isAdmin) {
                const team = await TeamModel.findOne({ 
                    'members.userId': employeeFound._id,
                    'members': { $elemMatch: { userId: actor._id, role: 'HOD' } }
                });
                if (!team) {
                    return res.status(403).json({ message: 'Employee is not in your team' });
                }
            }

            targetId = employeeFound._id;
            targetEmployee = employeeFound;
        }

        const companyId = targetEmployee.company_id?._id || targetEmployee.company_id;
        console.log('[Leave Balance] Requester:', actor.username, 'Target:', targetEmployee.username, 'Company:', companyId);

        // 2. Fetch ALL Active Policies for the Company
        const allPolicies = await LeavePolicy.find({
            company_id: companyId,
            status: 'active'
        });

        console.log('[Leave Balance] Found', allPolicies.length, 'active policies');

        if (!allPolicies || allPolicies.length === 0) {
            console.log('[Leave Balance] No active policies found for company');
            return res.json({ data: [] });
        }

        // --- FILTER BY ELIGIBILITY (CASE-INSENSITIVE) ---
        const policies = allPolicies.filter(policy => {
            let eligible = true;

            // Check Employment Type
            if (policy.eligibility?.employment_types?.length > 0) {
                const userType = (targetEmployee.employment_type || '').toLowerCase().trim();
                const allowedTypes = policy.eligibility.employment_types.map(t => t.toLowerCase().trim());
                if (userType && !allowedTypes.includes(userType)) {
                    eligible = false;
                }
            }

            // Check Gender
            if (policy.eligibility?.gender) {
                const userGender = (targetEmployee.gender || '').toLowerCase().trim();
                const policyGender = (policy.eligibility.gender || '').toLowerCase().trim();
                if (userGender && policyGender && userGender !== policyGender) {
                    eligible = false;
                }
            }

            return eligible;
        });

        console.log('[Leave Balance] After eligibility filter:', policies.length, 'eligible policies');

        if (policies.length === 0) {
            console.log('[Leave Balance] No eligible policies after filtering. User employment_type:', targetEmployee.employment_type, 'gender:', targetEmployee.gender);
            return res.json({ data: [] });
        }

        // 2. Fetch User's Balances
        const balances = await LeaveBalance.find({
            employee_id: targetId,
            year: currentYear
        });

        const yearStart = moment.utc(`${currentYear}-01-01`).startOf('day').toDate();
        const yearEnd = moment.utc(`${currentYear}-12-31`).endOf('day').toDate();
        const usedAgg = await LeaveApplication.aggregate([
            {
                $match: {
                    employee_id: new mongoose.Types.ObjectId(targetId),
                    approval_status: 'approved',
                    from_date: { $lte: yearEnd },
                    to_date: { $gte: yearStart }
                }
            },
            {
                $group: {
                    _id: '$leave_policy_id',
                    used: { $sum: '$total_days' }
                }
            }
        ]);
        const usedByPolicy = new Map(usedAgg.map((row) => [String(row._id), Number(row.used || 0)]));

        // 3. Merge Policies with Balances
        const formattedData = policies.map(policy => {
            const userBalance = balances.find(b =>
                b.leave_policy_id.toString() === policy._id.toString()
            );

            // Balance defaults to ZERO - admin must explicitly set the opening balance
            const available = userBalance ? userBalance.closing_balance : 0;
            const pending = userBalance ? userBalance.pending_approval : 0;
            const used = usedByPolicy.get(String(policy._id)) || userBalance?.used || 0;
            
            return {
                _id: policy._id,
                leave_type: policy.leave_type,
                name: policy.policy_name,
                leave_code: policy.leave_code,

                // Policy Rules
                policy: {
                    max_consecutive_days: policy.rules?.max_days_per_application || 0,
                    document_required_after_days: policy.rules?.document_required_after_days || 0,
                    advance_notice_days: policy.rules?.advance_notice_days || 0,
                    half_day_allowed: policy.rules?.half_day_allowed ?? true,
                    min_days_per_application: policy.rules?.min_days_per_application || 1,
                    max_days_per_application: policy.rules?.max_days_per_application || 10
                },

                // Balance Info
                opening_balance: userBalance ? userBalance.opening_balance : 0,
                used: used,
                pending: pending,
                available: available,
                balance: available,
                
                // Display helpers
                display: {
                    used: used,
                    total: userBalance ? userBalance.opening_balance : 0,
                    pending: pending,
                    remaining: available
                }
            };
        });
        console.log('[Leave Balance] Returning', formattedData.length, 'leave types');
        res.json({ data: formattedData });
    } catch (err) {
        console.error('Error in getBalance:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Get Leave Applications
export const getApplications = async (req, res) => {
    try {
        const user = req.user;
        const applications = await LeaveApplication.find({
            employee_id: user._id
        })
            .populate('leave_policy_id', 'leave_type policy_name')
            .sort({ createdAt: -1 });
        const formattedApps = applications.map(app => ({
            _id: app._id,
            leave_type: app.leave_policy_id ? app.leave_policy_id.leave_type : app.leave_type || 'Unknown',
            from_date: app.from_date,
            to_date: app.to_date,
            total_days: app.total_days,
            is_half_day: app.is_half_day || false,
            half_day_session: app.half_day_session || '',
            attachment_urls: app.attachment_urls || [],
            reason: app.reason || '',
            status: app.approval_status,
            createdAt: app.createdAt
        }));
        res.json({ data: formattedApps });
    } catch (err) {
        console.error('Error in getApplications:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Preview for Leave (Smart Calculation)
export const previewLeave = async (req, res) => {
    try {
        const user = req.user;
        const { leave_policy_id, from_date, to_date, is_half_day } = req.query;

        if (!leave_policy_id || !from_date) {
            return res.status(400).json({ message: 'Missing required parameters' });
        }

        const policy = await LeavePolicy.findById(leave_policy_id);
        if (!policy) return res.status(404).json({ message: 'Policy not found' });

        const result = await LeaveCalculationService.calculateLeaveDays({
            fromDate: from_date,
            toDate: to_date || from_date,
            isHalfDay: is_half_day === 'true',
            policy,
            company: user.company_id
        });

        const currentYear = new Date().getFullYear();
        const balance = await LeaveBalance.findOne({
            employee_id: user._id,
            leave_policy_id: policy._id,
            year: currentYear
        });

        res.json({
            success: true,
            data: {
                ...result,
                available: balance?.closing_balance || 0,
                projected_balance: (balance?.closing_balance || 0) - result.totalDays
            }
        });
    } catch (err) {
        console.error('Preview error:', err);
        res.status(500).json({ message: 'Error calculating leave preview' });
    }
};

// Apply for Leave
export const applyLeave = async (req, res) => {
    try {
        const user = req.user;
        const { leave_policy_id, from_date, to_date, reason } = req.body;

        // Robust ID extraction
        const companyId = user.company_id?._id || user.company_id;
        const departmentId = user.department_id?._id || user.department_id;
        
        // 1. Validate Input
        if (!leave_policy_id || !from_date || !to_date || !reason) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const policy = await LeavePolicy.findOne({
            _id: leave_policy_id,
            company_id: companyId,
            status: 'active'
        });
        if (!policy) {
            return res.status(404).json({ message: 'Leave policy not found or inactive' });
        }

        // 2. Smart Day Calculation (including Sandwich Rule)
        const isHalfDay = req.body.is_half_day === 'true' || req.body.is_half_day === true;
        const calc = await LeaveCalculationService.calculateLeaveDays({
            fromDate: from_date,
            toDate: to_date,
            isHalfDay,
            policy,
            company: companyId
        });

        const total_days = calc.totalDays;
        if (total_days <= 0) {
            return res.status(400).json({ message: 'Invalid date range or no working days selected' });
        }

        const start = moment(from_date).startOf('day');
        const end = moment(isHalfDay ? from_date : to_date).endOf('day');

        // 4. Check Balance (or Create it if missing)
        const currentYear = new Date().getFullYear();
        let balanceRecord = await LeaveBalance.findOne({
            employee_id: user._id,
            leave_policy_id: policy._id,
            year: currentYear
        });

        if (!balanceRecord) {
            // Default to 24 days if policy quota is not set
            const defaultQuota = 24;
            const quota = policy.annual_quota || defaultQuota;
            
            balanceRecord = new LeaveBalance({
                company_id: companyId,
                employee_id: user._id,
                leave_policy_id: policy._id,
                leave_type: policy.leave_type,
                year: currentYear,
                opening_balance: quota,
                closing_balance: quota,
                used: 0,
                pending_approval: 0
            });
            await balanceRecord.save();
        }

        const isUnpaidLeave = ['unpaid', 'lwp'].includes(String(policy.leave_type || '').toLowerCase());
        const isPL = ['privilege', 'pl'].includes(String(policy.leave_type || '').toLowerCase());

        // New specific check for PL already at zero
        if (isPL && balanceRecord.closing_balance <= 0) {
            return res.status(400).json({
                message: 'Contact admin for update PL'
            });
        }

        // Proceed with validation (Skip for unpaid/LWP leave)
        if (!isUnpaidLeave && balanceRecord.closing_balance < total_days) {
            return res.status(400).json({
                message: `Insufficient leave balance. Available: ${balanceRecord.closing_balance}, Required: ${total_days}`
            });
        }

        // 5. Check for Overlapping Applications
        const overlapping = await LeaveApplication.findOne({
            employee_id: user._id,
            approval_status: { $in: ['pending', 'pending_hod', 'hod_approved_pending_admin', 'approved'] },
            $or: [
                { from_date: { $lte: end.toDate() }, to_date: { $gte: start.toDate() } }
            ]
        });

        if (overlapping) {
            return res.status(400).json({
                message: 'You have an overlapping leave application'
            });
        }

        // 6. Get user's team_id (if member of any team)
        let teamId = null;
        try {
            const userTeam = await TeamModel.findOne({
                'members.userId': user._id,
                isActive: { $ne: false }
            });
            if (userTeam) {
                teamId = userTeam._id;
            }
        } catch (err) {
            console.log('[Leave] Could not fetch team_id:', err.message);
        }

        // --- TRANSACTION START ---
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Re-verify balance inside transaction to prevent race conditions
            const currentBalance = await LeaveBalance.findById(balanceRecord._id).session(session);
            
            if (!isUnpaidLeave && currentBalance.closing_balance < total_days) {
                throw new Error(`Insufficient balance during transaction. Available: ${currentBalance.closing_balance}`);
            }

            // 7. Create Application
            const application = new LeaveApplication({
                employee_id: user._id,
                company_id: companyId,
                department_id: departmentId,
                team_id: teamId,
                leave_policy_id: policy._id,
                leave_type: policy.leave_type,
                from_date: start.toDate(),
                to_date: end.toDate(),
                total_days,
                reason,
                is_half_day: isHalfDay,
                contact_during_leave: req.body.contact_during_leave,
                emergency_contact: req.body.emergency_contact,
                is_lop: policy.deduction_rules?.deduct_from_salary || false,
                approval_status: 'pending_hod',
                application_number: `LA-${Date.now()}-${user._id.toString().slice(-4)}`,
                attachment_urls: req.file ? [`uploads/leaves/${req.file.filename}`] : [],
                // Snapshot for audit
                balance_snapshot: {
                    available: currentBalance.closing_balance,
                    used: currentBalance.used || 0,
                    pending: currentBalance.pending_approval
                },
                sandwich_dates: calc.sandwichDays > 0 ? calc.details.filter(d => d.sandwiched).map(d => new Date(d.date)) : [],
                sandwich_days_count: calc.sandwichDays
            });
            
            if (isHalfDay && req.body.half_day_session) {
                application.half_day_session = req.body.half_day_session;
            }

            await application.save({ session });

            // 8. Update Balance (Lock Pending)
            currentBalance.pending_approval += total_days;
            if (!isUnpaidLeave) {
                currentBalance.closing_balance -= total_days;
            }
            await currentBalance.save({ session });

            await session.commitTransaction();
            session.endSession();

            res.json({
                success: true,
                message: 'Leave application submitted successfully',
                application_id: application._id
            });
        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            console.error('[Transaction Error] Leave application failed:', error.message);
            res.status(400).json({ message: error.message || 'Leave application failed due to a system error' });
        }
    } catch (err) {
        console.error('Error in applyLeave:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Cancel Leave
export const cancelLeave = async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;
        const application = await LeaveApplication.findOne({
            _id: id,
            employee_id: user._id
        });

        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }
        if (!['pending', 'pending_hod', 'hod_approved_pending_admin'].includes(application.approval_status)) {
            return res.status(400).json({
                message: 'Can only cancel non-finalized applications'
            });
        }

        // Update Application Status
        application.approval_status = 'cancelled';
        application.cancelled_by = user._id;
        application.cancelled_at = new Date();
        await application.save();

        // Revert Balance
        const currentYear = new Date().getFullYear();
        const balanceRecord = await LeaveBalance.findOne({
            employee_id: user._id,
            leave_policy_id: application.leave_policy_id,
            year: currentYear
        });

        if (balanceRecord) {            
            balanceRecord.pending_approval -= application.total_days;
            if (!['unpaid', 'lwp'].includes(String(application.leave_type || '').toLowerCase())) {
                balanceRecord.closing_balance += application.total_days;
            }
            await balanceRecord.save();
        }
        res.json({ message: 'Leave application cancelled successfully' });
    } catch (err) {
        console.error('Error in cancelLeave:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Admin - Update Leave Balance (Create or Modify)
export const updateBalance = async (req, res) => {
    try {
        console.log('[Leave Update] Request received for employee:', req.params.employee_id, 'Body:', req.body);
        const admin = req.user;
        const { employee_id } = req.params;
        const { leave_policy_id, opening_balance, pending_approval, used, pending } = req.body;
        const normalizedPending = pending_approval !== undefined ? pending_approval : pending;

        const openingNum = Number(opening_balance);
        const usedNum = used !== undefined ? Number(used) : undefined;
        const pendingNum = normalizedPending !== undefined ? Number(normalizedPending) : undefined;

        // Verify admin has permission
        if (!admin || !['ADMIN', 'Admin'].includes(admin.role)) {
            return res.status(403).json({ message: 'Only admins can update leave balances' });
        }

        // Validate inputs
        if (!employee_id || !leave_policy_id) {
            return res.status(400).json({ message: 'employee_id and leave_policy_id are required' });
        }

        if (opening_balance === undefined || opening_balance === null) {
            return res.status(400).json({ message: 'opening_balance is required' });
        }

        if (!Number.isFinite(openingNum)) {
            return res.status(400).json({ message: 'opening_balance must be a valid number' });
        }
        if (used !== undefined && !Number.isFinite(usedNum)) {
            return res.status(400).json({ message: 'used must be a valid number' });
        }
        if (normalizedPending !== undefined && !Number.isFinite(pendingNum)) {
            return res.status(400).json({ message: 'pending_approval must be a valid number' });
        }

        // Get the current year
        const currentYear = new Date().getFullYear();

        // Find or create the leave balance record
        let balanceRecord = await LeaveBalance.findOne({
            employee_id: employee_id,
            leave_policy_id: leave_policy_id,
            year: currentYear
        });

        // Get employee to extract company_id
        const employee = await UserModel.findById(employee_id);
        if (!employee) {
            console.log('[Leave Update] Employee not found:', employee_id);
            return res.status(404).json({ message: `Employee with ID ${employee_id} not found` });
        }

        const companyId = employee.company_id?._id || employee.company_id;
        const policy = await LeavePolicy.findOne({ _id: leave_policy_id, company_id: companyId });
        if (!policy) {
            console.log('[Leave Update] Policy not found for employee/company:', leave_policy_id, companyId);
            return res.status(404).json({ message: 'Selected leave policy not found or does not belong to this company' });
        }

        if (!balanceRecord) {
            // Create new balance record
            const nextUsed = usedNum !== undefined ? usedNum : 0;
            const nextPending = pendingNum !== undefined ? pendingNum : 0;
            
            balanceRecord = new LeaveBalance({
                employee_id: employee_id,
                company_id: companyId,
                leave_policy_id: leave_policy_id,
                leave_type: policy.leave_type,
                year: currentYear,
                opening_balance: openingNum,
                used: nextUsed,
                pending_approval: nextPending,
                closing_balance: openingNum - nextUsed - nextPending
            });
        } else {
            // Update existing balance record
            const nextUsed = usedNum !== undefined ? usedNum : (balanceRecord.used || 0);
            const nextPending = pendingNum !== undefined ? pendingNum : (balanceRecord.pending_approval || 0);

            balanceRecord.opening_balance = openingNum;
            balanceRecord.used = nextUsed;
            balanceRecord.pending_approval = nextPending;
            
            // Recalculate closing balance
            balanceRecord.closing_balance = openingNum - nextUsed - nextPending;
        }

        balanceRecord.last_updated = new Date();
        await balanceRecord.save();

        res.json({
            message: 'Leave balance updated successfully',
            data: {
                employee_id: balanceRecord.employee_id,
                leave_type: balanceRecord.leave_type,
                opening_balance: balanceRecord.opening_balance,
                used: balanceRecord.used,
                pending: balanceRecord.pending_approval,
                pending_approval: balanceRecord.pending_approval,
                closing_balance: balanceRecord.closing_balance,
                year: balanceRecord.year
            }
        });
    } catch (err) {
        console.error('Error in updateBalance:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};