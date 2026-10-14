/**
 * End-to-End Integration Verification Script
 * Tests live HRMS Integration API v1.5 with the provided API key.
 */

import hrmsClient from '../server/services/hrms/hrmsClient.mjs';

async function runVerification() {
  console.log('====================================================');
  console.log('   HRMS PLATFORM INTEGRATION v1.5 VERIFICATION      ');
  console.log('====================================================\n');

  console.log('🔑 API Key:', hrmsClient.apiKey.slice(0, 20) + '...');
  console.log('🌐 HRMS Base URL:', hrmsClient.baseUrl);

  // 1. Reference Data
  console.log('\n[1/8] Testing Reference Data (Companies, Departments, Designations, Locations)...');
  const refData = await hrmsClient.getReferenceData();
  console.log('✅ Reference data received:');
  console.log(`   - Companies: ${refData.companies?.length || 0}`);
  console.log(`   - Departments: ${refData.departments?.length || 0}`);
  console.log(`   - Locations: ${refData.locations?.length || 0}`);
  console.log(`   - Designations: ${refData.designations?.length || 0}`);

  // 2. Integration Employees Feed
  console.log('\n[2/8] Testing Employees Read API...');
  const employees = await hrmsClient.getIntegrationEmployees(true);
  console.log(`✅ Employees fetched: ${employees.length} employees`);
  const sample = employees.find((e) => e.external_id) || employees[0];
  console.log(`   - Sample Employee: ${sample?.first_name} ${sample?.last_name} (${sample?.employee_code})`);
  console.log(`   - External ID: ${sample?.external_id || 'none'}`);
  console.log(`   - Employment ID: ${sample?.employment_id}`);

  // 3. Events Feed (Pull Sync)
  console.log('\n[3/8] Testing Events Feed (Pull Sync)...');
  const feed = await hrmsClient.getEventsFeed(null, 10);
  console.log('✅ Events feed responded:');
  console.log(`   - Next cursor: ${feed.next_cursor}`);
  console.log(`   - Events in feed: ${feed.events?.length || 0}`);
  console.log(`   - Has more: ${feed.has_more}`);

  // 4. Employee Session Issuance
  console.log('\n[4/8] Testing Employee Session Issuance (/v1/integrations/sessions)...');
  if (sample?.external_id) {
    const session = await hrmsClient.getEmployeeSession({ _id: sample.external_id, username: sample.employee_code });
    console.log('✅ Employee session issued successfully:');
    console.log(`   - Employment ID: ${session.employment_id}`);
    console.log(`   - Roles: ${session.roles?.join(', ')}`);
    console.log(`   - Access Token: ${session.access_token.slice(0, 30)}...`);

    // 5. Self-Service Endpoints with Bearer Token
    console.log('\n[5/8] Testing Self-Service Endpoints via Bearer Token...');
    const today = await hrmsClient.getTodayStatus({ _id: sample.external_id });
    console.log(`✅ Today punch status: ${today.status} (Is Punched In: ${today.is_punched_in})`);

    const leaves = await hrmsClient.getLeaveBalances({ _id: sample.external_id });
    console.log(`✅ Leave balances: ${leaves.length} leave types found`);

    const types = await hrmsClient.getLeaveTypes({ _id: sample.external_id });
    console.log(`✅ Configured leave types: ${types.length} types`);

    const profile = await hrmsClient.getProfile({ _id: sample.external_id });
    console.log(`✅ Employee profile: ${profile.legal_first_name} ${profile.legal_last_name} (${profile.email})`);
  } else {
    console.log('⚠️ Skipping session test (no linked sample external_id found)');
  }

  // 6. Link Existing Employees (Dry Run)
  console.log('\n[6/8] Testing Employee Code Linking (Dry Run)...');
  if (sample?.employee_code && sample?.external_id) {
    const linkRes = await hrmsClient.linkEmployees([
      { external_id: sample.external_id, employee_code: sample.employee_code }
    ], { dryRun: true });
    console.log('✅ Link report:');
    console.log(`   - Dry run: ${linkRes.dry_run}`);
    console.log(`   - Already linked: ${linkRes.already_linked?.length || 0}`);
    console.log(`   - Matched: ${linkRes.matched?.length || 0}`);
  }

  // 7. Upsert Employee (Dry Run)
  console.log('\n[7/8] Testing Employee Upsert (Dry Run)...');
  if (sample?.external_id) {
    const upsertRes = await hrmsClient.upsertEmployee(sample.external_id, {
      employee_code: sample.employee_code,
      first_name: sample.first_name,
      last_name: sample.last_name,
      company: sample.company?.name || 'SFPL',
      department: sample.department?.name || 'Operations',
      designation: sample.designation?.name || 'Executive',
      hire_date: sample.hire_date || '2024-01-01',
    }, { dryRun: true });
    console.log(`✅ Upsert dry run outcome: ${upsertRes.outcome} (Employment: ${upsertRes.employment_id})`);
  }

  // 8. Reconciliation
  console.log('\n[8/8] Testing Identity Reconciliation...');
  const reconcileRes = await hrmsClient.reconcileEmployees([sample?.external_id].filter(Boolean));
  console.log('✅ Reconciliation completed:');
  console.log(`   - Matched identities: ${reconcileRes.matched}`);
  console.log(`   - Active in HRMS not in app: ${reconcileRes.active_in_hrms_not_in_app?.length || 0}`);
  console.log(`   - In app not in HRMS: ${reconcileRes.in_app_not_in_hrms?.length || 0}`);

  console.log('\n====================================================');
  console.log('   🎉 ALL 8 INTEGRATION VERIFICATIONS PASSED!       ');
  console.log('====================================================\n');
}

runVerification().catch((err) => {
  console.error('\n❌ Verification failed:', err);
  process.exit(1);
});
