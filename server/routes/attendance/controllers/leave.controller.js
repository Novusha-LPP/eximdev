const LeaveApplication = require('../models/LeaveApplication');
const LeaveBalance = require('../models/LeaveBalance');
const LeavePolicy = require('../models/LeavePolicy');
const moment = require('moment');

// Get Leave Balance
exports.getBalance = async (req, res) => {
    try {
        const user = req.user;
        const currentYear = new Date().getFullYear();
        // Robust ID extraction
        const companyId = user.company_id?._id || user.company_id;

        // 1. Fetch ALL Active Policies for the Company
        const allPolicies = await LeavePolicy.find({
            company_id: companyId,
            status: 'active'
        });

        if (!allPolicies || allPolicies.length === 0) {            return res.json({ data: [] });
        }

        // --- FILTER BY ELIGIBILITY ---
        const policies = allPolicies.filter(policy => {
            let eligible = true;

            // Check Employment Type
            if (policy.eligibility?.employment_types?.length > 0) {
                const userType = (user.employment_type || '').toLowerCase().trim();
                const allowedTypes = policy.eligibility.employment_types.map(t => t.toLowerCase().trim());
                
                if (!allowedTypes.includes(userType)) {                    eligible = false;
                }
            }

            // Check Gender
            if (policy.eligibility?.gender) {
                if (user.gender && policy.eligibility.gender !== user.gender) {                    eligible = false;
                }
            }

            return eligible;
        });        // --- END FILTER ---

        if (policies.length === 0) {            return res.json({ data: [] });
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
            const total = userBalance ? (userBalance.opening_balance + (userBalance.credited || 0)) : policy.annual_quota;
            const balance = userBalance ? userBalance.closing_balance : policy.annual_quota;
            const pending = userBalance ? userBalance.pending_approval : 0;
            const consumed = userBalance ? userBalance.consumed : 0;
            
            // Available = closing_balance (which accounts for pending deductions)
            // For display: show "consumed/total" for approved, and pending separately
            const available = balance; // This already has pending deducted

            const result = {
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

                // Balance Info - Enhanced
                total: total,                    // Total allocated days
                consumed: consumed,              // Actually consumed (approved)
                pending: pending,                // Pending approval
                available: available,            // Available to apply (total - consumed - pending)
                balance: available,              // Same as available for backward compatibility
                hasRecord: !!userBalance,
                
                // Display helpers
                display: {
                    used: consumed,              // Days actually used (approved)
                    total: total,                // Total quota
                    pending: pending,            // Days pending approval
                    remaining: available         // Days still available
                }
            };            return result;
        });
        res.json({ data: formattedData });
    } catch (err) {
        console.error('Error in getBalance:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Get Leave Applications
exports.getApplications = async (req, res) => {
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
exports.applyLeave = async (req, res) => {
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
        // If half day, to_date should be same as from_date if not provided correctly
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

        // --- NEW RULE VALIDATIONS ---
        const now = moment().startOf('day');

        // 1. Probation Check
        if (user.employment_type === 'probation' && policy.rules?.can_apply_on_probation === false) {
            return res.status(400).json({ message: 'Leave not allowed during probation period' });
        }

        // 2. Service Period Check
        if (user.joining_date && policy.eligibility?.min_service_months > 0) {
            const serviceMonths = moment().diff(moment(user.joining_date, 'YYYY-MM-DD'), 'months');
            if (serviceMonths < policy.eligibility.min_service_months) {
                return res.status(400).json({
                    message: `Minimum ${policy.eligibility.min_service_months} months of service required for this leave type`
                });
            }
        }

        // 3. Advance Notice Check (Disabled/Relaxed as requested to allow flexibility)
        /*
        const noticeDays = start.diff(now, 'days');
        if (noticeDays < (policy.rules?.advance_notice_days || 0)) {
            if (start.isSameOrAfter(now)) {
                return res.status(400).json({
                    message: `Minimum ${policy.rules.advance_notice_days} days advance notice required`
                });
            }
        }
        */

        // 4. Backdated Check (Allowed as requested)
        if (start.isBefore(now)) {
            const backdatedDays = now.diff(start, 'days');
            const maxBackdated = policy.rules?.backdated_max_days || 30; // Default to 30 if not set
            if (backdatedDays > maxBackdated) {
                // We'll allow it but log a warning, or keep a generous limit
                console.warn(`Backdated leave applied for ${backdatedDays} days ago`);
            }
        }
        // --- END RULE VALIDATIONS ---

        // 4. Check Balance (or Create it if missing)
        const currentYear = new Date().getFullYear();
        let balanceRecord = await LeaveBalance.findOne({
            employee_id: user._id,
            leave_policy_id: policy._id,
            year: currentYear
        });
        // If no record exists, create one based on the policy
        if (!balanceRecord) {            
            balanceRecord = new LeaveBalance({
                company_id: companyId,
                employee_id: user._id,
                leave_policy_id: policy._id,
                leave_type: policy.leave_type,
                year: currentYear,
                opening_balance: policy.annual_quota,
                credited: 0,
                closing_balance: policy.annual_quota,
                consumed: 0,
                pending_approval: 0
            });

            await balanceRecord.save();
        }

        // Now proceed with validation (Skip for unpaid leave)
        if (policy.leave_type !== 'unpaid' && balanceRecord.closing_balance < total_days) {
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

        // 6. Create Application
        const application = new LeaveApplication({
            employee_id: user._id,
            company_id: companyId,
            department_id: departmentId,
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
        
        // Only set half_day_session if it's a half day and has a valid value
        if (req.body.is_half_day && req.body.half_day_session) {
            application.half_day_session = req.body.half_day_session;
        }

        await application.save();
        // 7. Update Balance (Lock Pending)
        // For unpaid leave, we track pending/consumption but don't strictly deduct from a fixed quota since it's unlimited
        balanceRecord.pending_approval += total_days;
        if (policy.leave_type !== 'unpaid') {
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
exports.cancelLeave = async (req, res) => {
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
            // Only revert closing balance if it was deducted (non-unpaid)
            if (application.leave_type !== 'unpaid') {
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