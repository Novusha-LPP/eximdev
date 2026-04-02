import LeaveApplication from '../../model/attendance/LeaveApplication.js';
import LeaveBalance from '../../model/attendance/LeaveBalance.js';
import LeavePolicy from '../../model/attendance/LeavePolicy.js';
import moment from 'moment';
import TeamModel from '../../model/teamModel.mjs';


// Get Leave Balance
export const getBalance = async (req, res) => {
    try {
        const user = req.user;
        const currentYear = new Date().getFullYear();
        // Robust ID extraction
        const companyId = user.company_id?._id || user.company_id;

        console.log('[Leave Balance] User:', user.username, 'CompanyID:', companyId);

        // 1. Fetch ALL Active Policies for the Company
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
                const userType = (user.employment_type || '').toLowerCase().trim();
                const allowedTypes = policy.eligibility.employment_types.map(t => t.toLowerCase().trim());
                if (userType && !allowedTypes.includes(userType)) {
                    eligible = false;
                }
            }

            // Check Gender
            if (policy.eligibility?.gender) {
                const userGender = (user.gender || '').toLowerCase().trim();
                const policyGender = (policy.eligibility.gender || '').toLowerCase().trim();
                if (userGender && policyGender && userGender !== policyGender) {
                    eligible = false;
                }
            }

            return eligible;
        });

        console.log('[Leave Balance] After eligibility filter:', policies.length, 'eligible policies');

        if (policies.length === 0) {
            console.log('[Leave Balance] No eligible policies after filtering. User employment_type:', user.employment_type, 'gender:', user.gender);
            return res.json({ data: [] });
        }

        // 2. Fetch User's Balances
        const balances = await LeaveBalance.find({
            employee_id: user._id,
            year: currentYear
        });

        // 3. Merge Policies with Balances
        const formattedData = policies.map(policy => {
            const userBalance = balances.find(b =>
                b.leave_policy_id.toString() === policy._id.toString()
            );

            // Calculate consumed (approved leaves only)
            // Balance defaults to ZERO - admin must explicitly set the opening balance
            const total = userBalance ? (userBalance.opening_balance + (userBalance.credited || 0)) : 0;
            const available = userBalance ? userBalance.closing_balance : 0;
            const pending = userBalance ? userBalance.pending_approval : 0;
            const consumed = userBalance ? userBalance.consumed : 0;
            
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
                total: total,
                consumed: consumed,
                pending: pending,
                available: available,
                balance: available,
                
                // Display helpers
                display: {
                    used: consumed,
                    total: total,
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

        // 2. Initialize Dates
        const start = moment(from_date).startOf('day');
        const toDateVal = (req.body.is_half_day === 'true' || req.body.is_half_day === true) ? from_date : to_date;
        const end = moment(toDateVal).endOf('day');
        
        // Calculate total_days correctly for half-day
        let total_days;
        const isHalfDay = req.body.is_half_day === 'true' || req.body.is_half_day === true;
        if (isHalfDay) {
            total_days = 0.5;
        } else {
            total_days = moment(toDateVal).diff(start, 'days') + 1;
        }
        if (total_days <= 0) {
            return res.status(400).json({ message: 'Invalid date range' });
        }

        // 3. Verify Policy Exists
        const policy = await LeavePolicy.findOne({
            _id: leave_policy_id,
            company_id: companyId,
            status: 'active'
        });
        if (!policy) {
            return res.status(404).json({ message: 'Leave policy not found or inactive' });
        }

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
                credited: 0,
                closing_balance: quota,
                consumed: 0,
                pending_approval: 0
            });
            await balanceRecord.save();
        }

        const isUnpaidLeave = ['unpaid', 'lwp'].includes(String(policy.leave_type || '').toLowerCase());

        // Proceed with validation (Skip for unpaid/LWP leave)
        if (!isUnpaidLeave && balanceRecord.closing_balance < total_days) {
            return res.status(400).json({
                message: `Insufficient leave balance. Available: ${balanceRecord.closing_balance}, Required: ${total_days}`
            });
        }

        // 5. Check for Overlapping Applications
        const overlapping = await LeaveApplication.findOne({
            employee_id: user._id,
            approval_status: { $in: ['pending', 'approved'] },
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
            approval_status: 'pending',
            application_number: `LA-${Date.now()}-${user._id.toString().slice(-4)}`,
            attachment_urls: req.file ? [`uploads/leaves/${req.file.filename}`] : []
        });
        
        if (isHalfDay && req.body.half_day_session) {
            application.half_day_session = req.body.half_day_session;
        }

        await application.save();

        // 7. Update Balance (Lock Pending)
        balanceRecord.pending_approval += total_days;
        if (!isUnpaidLeave) {
            balanceRecord.closing_balance -= total_days;
        }
        await balanceRecord.save();

        res.json({
            message: 'Leave application submitted successfully',
            application_id: application._id
        });
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
        if (application.approval_status !== 'pending') {
            return res.status(400).json({
                message: 'Can only cancel pending applications'
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
        const admin = req.user;
        const { employee_id } = req.params;
        const { leave_policy_id, opening_balance, credited, consumed } = req.body;

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

        // Get the current year
        const currentYear = new Date().getFullYear();

        // Find or create the leave balance record
        let balanceRecord = await LeaveBalance.findOne({
            employee_id: employee_id,
            leave_policy_id: leave_policy_id,
            year: currentYear
        });

        // Get employee to extract company_id
        const employee = await require('../../model/userModel.mjs').default.findById(employee_id);
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        const companyId = employee.company_id?._id || employee.company_id;
        const policy = await LeavePolicy.findOne({ _id: leave_policy_id, company_id: companyId });
        if (!policy) {
            return res.status(404).json({ message: 'Leave policy not found' });
        }

        if (!balanceRecord) {
            // Create new balance record
            balanceRecord = new LeaveBalance({
                employee_id: employee_id,
                company_id: companyId,
                leave_policy_id: leave_policy_id,
                leave_type: policy.leave_type,
                year: currentYear,
                opening_balance: opening_balance || 0,
                credited: credited || 0,
                consumed: consumed || 0,
                pending_approval: 0,
                closing_balance: (opening_balance || 0) + (credited || 0) - (consumed || 0)
            });
        } else {
            // Update existing balance record
            balanceRecord.opening_balance = opening_balance;
            if (credited !== undefined) balanceRecord.credited = credited;
            if (consumed !== undefined) balanceRecord.consumed = consumed;
            // Recalculate closing balance
            balanceRecord.closing_balance = opening_balance + (credited || 0) - (consumed || 0) - (balanceRecord.pending_approval || 0);
        }

        balanceRecord.last_updated = new Date();
        await balanceRecord.save();

        res.json({
            message: 'Leave balance updated successfully',
            data: {
                employee_id: balanceRecord.employee_id,
                leave_type: balanceRecord.leave_type,
                opening_balance: balanceRecord.opening_balance,
                credited: balanceRecord.credited,
                consumed: balanceRecord.consumed,
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