/**
 * Script to add all leave types to a specific company
 * Run: node server/scripts/add_leave_policies_for_company.mjs
 */

import mongoose from 'mongoose';
import LeavePolicy from '../model/attendance/LeavePolicy.js';

const MONGODB_URI = process.env.DEV_MONGODB_URI || process.env.SERVER_MONGODB_URI || 'mongodb://localhost:27017/exim';

async function addLeavePolicies() {
    try {
        console.log('🔌 Connecting to database...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Get all companies that have users
        const db = mongoose.connection.db;
        const usersCollection = db.collection('users');
        const companies = await usersCollection.distinct('company_id', { company_id: { $exists: true } });
        
        console.log(`📋 Found ${companies.length} companies\n`);

        let policiesCreated = 0;

        for (const companyId of companies) {
            console.log(`🏢 Processing company: ${companyId}`);
            
            // Check existing policies
            const existingPolicies = await LeavePolicy.find({
                company_id: companyId,
                status: 'active'
            }).select('leave_type');
            
            const existingTypes = existingPolicies.map(p => p.leave_type);
            console.log(`  Existing types: ${existingTypes.join(', ') || 'none'}`);

            // All policy templates
            const allPolicies = [
                {
                    company_id: companyId,
                    policy_name: 'Casual Leave',
                    leave_type: 'casual',
                    leave_code: 'CL',
                    annual_quota: 24,
                    status: 'active',
                    eligibility: { employment_types: [], min_service_months: 0 },
                    rules: { min_days_per_application: 1, max_days_per_application: 10, advance_notice_days: 1, half_day_allowed: true, can_apply_on_probation: true },
                    deduction_rules: { deduct_from_salary: false, affects_attendance_percentage: false, counted_as_absence: false }
                },
                {
                    company_id: companyId,
                    policy_name: 'Sick Leave',
                    leave_type: 'sick',
                    leave_code: 'SL',
                    annual_quota: 24,
                    status: 'active',
                    eligibility: { employment_types: [], min_service_months: 0 },
                    rules: { min_days_per_application: 1, max_days_per_application: 15, advance_notice_days: 0, half_day_allowed: true, can_apply_on_probation: true },
                    deduction_rules: { deduct_from_salary: false, affects_attendance_percentage: false, counted_as_absence: false }
                },
                {
                    company_id: companyId,
                    policy_name: 'Earned Leave',
                    leave_type: 'earned',
                    leave_code: 'EL',
                    annual_quota: 24,
                    status: 'active',
                    eligibility: { employment_types: [], min_service_months: 6 },
                    rules: { min_days_per_application: 1, max_days_per_application: 21, advance_notice_days: 7, half_day_allowed: false, can_apply_on_probation: false },
                    carry_forward: { allowed: true, max_days: 10 },
                    deduction_rules: { deduct_from_salary: false, affects_attendance_percentage: false, counted_as_absence: false }
                },
                {
                    company_id: companyId,
                    policy_name: 'Privilege Leave',
                    leave_type: 'privilege',
                    leave_code: 'PL',
                    annual_quota: 24,
                    status: 'active',
                    eligibility: { employment_types: [], min_service_months: 0 },
                    rules: { min_days_per_application: 1, max_days_per_application: 15, advance_notice_days: 7, half_day_allowed: true, can_apply_on_probation: true },
                    carry_forward: { allowed: true, max_days: 15 },
                    deduction_rules: { deduct_from_salary: false, affects_attendance_percentage: false, counted_as_absence: false }
                },
                {
                    company_id: companyId,
                    policy_name: 'Unpaid Leave',
                    leave_type: 'unpaid',
                    leave_code: 'UL',
                    annual_quota: 999,
                    status: 'active',
                    eligibility: { employment_types: [], min_service_months: 0 },
                    rules: { min_days_per_application: 1, max_days_per_application: 30, advance_notice_days: 1, half_day_allowed: true, can_apply_on_probation: true },
                    deduction_rules: { deduct_from_salary: true, affects_attendance_percentage: true, counted_as_absence: true }
                }
            ];

            // Filter out existing types
            const newPolicies = allPolicies.filter(p => !existingTypes.includes(p.leave_type));
            
            if (newPolicies.length > 0) {
                const result = await LeavePolicy.insertMany(newPolicies);
                policiesCreated += result.length;
                console.log(`  ✅ Created ${result.length} new policies: ${newPolicies.map(p => p.leave_type).join(', ')}\n`);
            } else {
                console.log(`  ✅ All leave types already exist\n`);
            }
        }

        console.log('\n📈 SUMMARY');
        console.log('═══════════════════════════════════════');
        console.log(`Companies processed: ${companies.length}`);
        console.log(`New policies created: ${policiesCreated}`);
        console.log('═══════════════════════════════════════\n');

    } catch (error) {
        console.error('❌ Script failed:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('👋 Database connection closed');
        process.exit(0);
    }
}

addLeavePolicies();
