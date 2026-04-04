/**
 * Script to create default leave policies for companies with no policies
 * 
 * This script:
 * 1. Finds companies with 0 active leave policies
 * 2. Creates basic leave types (Casual, Sick, Earned Leave)
 * 3. Sets default 24 days quota for each
 * 
 * Run: node server/scripts/create_default_leave_policies.js
 */

import mongoose from 'mongoose';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const require = createRequire(import.meta.url);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Database connection
const MONGODB_URI =  process.env.PROD_MONGODB_URI
  
async function createDefaultLeavePolicies() {
    try {
        console.log('🔌 Connecting to database...');
        if (!MONGODB_URI) {
            throw new Error('MONGODB_URI not found in .env (DEV/PROD/SERVER)');
        }
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Use dynamic import for the LeavePolicy model
        const LeavePolicyModule = await import('../model/attendance/LeavePolicy.js');
        const LeavePolicy = LeavePolicyModule.default;
        
        // Get companies from the database directly
        const db = mongoose.connection.db;
        const usersCollection = db.collection('users');
        const companies = await usersCollection.distinct('company_id', { company_id: { $exists: true } });
        console.log(`📋 Found ${companies.length} companies with users\n`);

        let policiesCreated = 0;

        for (const companyId of companies) {
            console.log(`🏢 Processing company: ${companyId}`);
            
            // Check if company already has leave policies
            const existingPolicies = await LeavePolicy.countDocuments({
                company_id: companyId,
                status: 'active'
            });

            if (existingPolicies > 0) {
                console.log(`  ✅ Already has ${existingPolicies} policies, skipping\n`);
                continue;
            }

            // Create default leave policies
            const defaultPolicies = [
                {
                    company_id: companyId,
                    policy_name: 'Privilege Leave',
                    leave_type: 'privilege',
                    leave_code: 'PL',
                    annual_quota: 25,
                    status: 'active',
                    eligibility: {
                        employment_types: [],
                        min_service_months: 0
                    },
                    rules: {
                        min_days_per_application: 1,
                        max_days_per_application: 15,
                        advance_notice_days: 7,
                        half_day_allowed: true,
                        can_apply_on_probation: true
                    },
                    carry_forward: {
                        allowed: true,
                        max_days: 15
                    },
                    deduction_rules: {
                        deduct_from_salary: false,
                        affects_attendance_percentage: false,
                        counted_as_absence: false
                    }
                },
                {
                    company_id: companyId,
                    policy_name: 'Leave Without Pay',
                    leave_type: 'lwp',
                    leave_code: 'LWP',
                    annual_quota: 999, // Unlimited (no balance check)
                    status: 'active',
                    eligibility: {
                        employment_types: [],
                        min_service_months: 0
                    },
                    rules: {
                        min_days_per_application: 1,
                        max_days_per_application: 30,
                        advance_notice_days: 1,
                        half_day_allowed: true,
                        can_apply_on_probation: true
                    },
                    deduction_rules: {
                        deduct_from_salary: true,
                        affects_attendance_percentage: true,
                        counted_as_absence: true
                    }
                }
            ];

            // Insert policies
            const result = await LeavePolicy.insertMany(defaultPolicies);
            policiesCreated += result.length;
            console.log(`  ✅ Created ${result.length} leave policies\n`);
        }

        // Summary
        console.log('📈 SUMMARY');
        console.log('═══════════════════════════════════════');
        console.log(`Companies processed:      ${companies.length}`);
        console.log(`Leave policies created:   ${policiesCreated}`);
        console.log('═══════════════════════════════════════');
        console.log('✅ Default leave policies created!\n');

        // Verification
        console.log('🔍 Running verification queries...');
        const totalPolicies = await LeavePolicy.countDocuments({ status: 'active' });
        const companiesWithPolicies = await LeavePolicy.distinct('company_id', { status: 'active' });
        
        console.log('\n📊 VERIFICATION RESULTS');
        console.log('═══════════════════════════════════════');
        console.log(`Total active policies:    ${totalPolicies}`);
        console.log(`Companies with policies:  ${companiesWithPolicies.length}`);
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

// Run script
createDefaultLeavePolicies();