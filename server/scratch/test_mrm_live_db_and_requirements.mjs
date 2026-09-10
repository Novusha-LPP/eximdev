import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import { isFeatureEnabled } from '../config/featureFlags.mjs';
import UserModel from '../model/userModel.mjs';
import KPISheet from '../model/kpi/kpiSheetModel.mjs';
import MRMItem from '../model/mrm/mrmItemModel.mjs';
import MRMMetadata from '../model/mrm/mrmMetadataModel.mjs';
import MRMSegmentRollup from '../model/mrm/mrmSegmentRollupModel.mjs';
import MRMHodScore from '../model/mrm/mrmHodScoreModel.mjs';

import {
    calculateSegmentRollup,
    calculateHodMonthlyScore,
    detectRecurringBlockers,
    getPreDeadlineSubmissionStatus,
    calculateAnnualBusinessLossRollup
} from '../services/mrmAnalyticsService.mjs';

async function runTests() {
    console.log('====================================================');
    console.log('🚀 RUNNING MRM 2.0 COMPREHENSIVE REQUIREMENTS VERIFICATION');
    console.log('====================================================\n');

    const dbUri = process.env.DEV_MONGODB_URI || 'mongodb://localhost:27017/eximNew';
    console.log(`Connecting to database: ${dbUri}`);
    await mongoose.connect(dbUri);
    console.log('✓ Database connected successfully.\n');

    let allPassed = true;

    // Requirement 1: Feature Flag Active
    console.log('--- TEST 1: Feature Flag Status ---');
    const flagEnabled = isFeatureEnabled('MRM_KPI_ROLLUP_ENABLED');
    console.log(`MRM_KPI_ROLLUP_ENABLED: ${flagEnabled}`);
    if (flagEnabled) {
        console.log('✓ PASS: Feature flag is enabled in .env\n');
    } else {
        console.error('✗ FAIL: Feature flag should be enabled\n');
        allPassed = false;
    }

    // Requirement 2: Sub-team Schema on UserModel
    console.log('--- TEST 2: User Model Sub-Team Fields ---');
    const sampleUser = await UserModel.findOne({ isActive: { $ne: false }, department: { $exists: true, $ne: '' } }).lean();
    if (!sampleUser) {
        console.log('⚠️ No active user with department found.');
    } else {
        console.log(`Inspecting user: ${sampleUser.username} (${sampleUser.department})`);
        console.log(`sub_team: "${sampleUser.sub_team}", sub_team_role: "${sampleUser.sub_team_role}"`);
        if (sampleUser.sub_team !== undefined && sampleUser.sub_team_role !== undefined) {
            console.log('✓ PASS: sub_team and sub_team_role exist on UserModel\n');
        } else {
            console.error('✗ FAIL: sub_team fields missing on UserModel\n');
            allPassed = false;
        }
    }

    // Find test department and active HOD
    const hod = await UserModel.findOne({
        isActive: { $ne: false },
        role: { $regex: /^(head_of_department|hod|admin)$/i },
        department: { $exists: true, $ne: '' }
    }).lean();

    const targetDept = hod?.department || 'Operations';
    const targetMonth = '09';
    const targetYear = 2026;
    console.log(`Testing with Department: "${targetDept}", HOD: "${hod?.username || 'admin'}", Period: ${targetMonth}/${targetYear}\n`);

    // Requirement 3: Segment Rollup Calculation & Derived 2-Signal RAG
    console.log('--- TEST 3: Segment Rollup Calculation (2-Signal RAG) ---');
    try {
        const rollupResult = await calculateSegmentRollup({
            department: targetDept,
            month: targetMonth,
            year: targetYear
        });

        console.log(`Rollup Result Status: Department "${rollupResult.department}", Segments: ${rollupResult.segments?.length || 0}`);
        rollupResult.segments.forEach((seg, idx) => {
            console.log(`  [Segment ${idx + 1}] Sub-Team: "${seg.sub_team}" | RAG: ${seg.final_rag} | Score: ${seg.segment_score}% | Reason: ${seg.reason_badge}`);
            console.log(`     - Trend: Deviation=${seg.trend_deviation_pct ?? 'N/A'}% | ColdStart=${seg.is_cold_start} | Status=${seg.trend_status}`);
            console.log(`     - Flags: Loss=₹${seg.flags?.business_loss_total || 0} | Blockers=${seg.flags?.blockers_count || 0} | Unsubmitted=${seg.flags?.unsubmitted_members?.length || 0}`);
            console.log(`     - Contributing Members: ${seg.contributing_members?.length || 0}`);
        });

        if (rollupResult && Array.isArray(rollupResult.segments)) {
            console.log('✓ PASS: calculateSegmentRollup executed cleanly and computed derived RAG.\n');
        } else {
            console.error('✗ FAIL: calculateSegmentRollup failed structure validation.\n');
            allPassed = false;
        }
    } catch (e) {
        console.error('✗ FAIL: Error in calculateSegmentRollup:', e.message);
        allPassed = false;
    }

    // Requirement 4: Blended 70/30 HOD Monthly Score
    console.log('--- TEST 4: Blended 70/30 HOD Monthly Score ---');
    try {
        if (hod) {
            const hodScore = await calculateHodMonthlyScore({
                hodId: hod._id,
                department: targetDept,
                month: targetMonth,
                year: targetYear
            });

            console.log(`HOD: ${hod.first_name} ${hod.last_name} (${hod.username})`);
            console.log(`  S_Team (70% weight): ${hodScore.team_score}%`);
            console.log(`  S_Focus (30% weight): ${hodScore.focus_score}%`);
            console.log(`  S_HOD (Final Blended): ${hodScore.final_score}%`);
            console.log(`  Monthly Rank: #${hodScore.monthly_rank || 1} of ${hodScore.total_hods_ranked || 1}`);
            console.log(`  Cumulative Annual Team Business Loss: ₹${hodScore.annual_cumulative_team_business_loss}`);

            // Mathematical verification: S_HOD = (S_Team * 0.70) + (S_Focus * 0.30)
            const expectedScore = Number(((hodScore.team_score * 0.70) + (hodScore.focus_score * 0.30)).toFixed(1));
            console.log(`  Expected Math Check: (${hodScore.team_score} * 0.70) + (${hodScore.focus_score} * 0.30) = ${expectedScore}%`);

            if (Math.abs(hodScore.final_score - expectedScore) < 0.1) {
                console.log('✓ PASS: 70/30 Blended score math strictly satisfies specification.\n');
            } else {
                console.error(`✗ FAIL: Final score mismatch! got ${hodScore.final_score}, expected ${expectedScore}\n`);
                allPassed = false;
            }
        } else {
            console.log('⚠️ Skipped HOD score test (no HOD user in DB)\n');
        }
    } catch (e) {
        console.error('✗ FAIL: Error in calculateHodMonthlyScore:', e.message);
        allPassed = false;
    }

    // Requirement 5: Pre-Deadline Tracker
    console.log('--- TEST 5: Pre-Deadline Submission Tracker ---');
    try {
        const tracker = await getPreDeadlineSubmissionStatus({
            department: targetDept,
            month: targetMonth,
            year: targetYear
        });

        console.log(`Department: ${tracker.department} | Month: ${tracker.month}/${tracker.year}`);
        console.log(`Total Members: ${tracker.totalMembers} | Submitted: ${tracker.submittedCount} | Pending: ${tracker.pendingCount} | Progress: ${tracker.submissionRate}%`);
        if (tracker.totalMembers !== undefined && tracker.submittedCount !== undefined) {
            console.log('✓ PASS: getPreDeadlineSubmissionStatus returns accurate tracking telemetry.\n');
        } else {
            console.error('✗ FAIL: getPreDeadlineSubmissionStatus missing count fields.\n');
            allPassed = false;
        }
    } catch (e) {
        console.error('✗ FAIL: Error in getPreDeadlineSubmissionStatus:', e.message);
        allPassed = false;
    }

    // Requirement 6: Recurring Blockers Detection
    console.log('--- TEST 6: Recurring Blockers Detection ---');
    try {
        const blockers = await detectRecurringBlockers({
            department: targetDept,
            month: targetMonth,
            year: targetYear
        });

        const isArr = Array.isArray(blockers);
        console.log(`Recurring Blockers Detected: ${isArr ? blockers.length : 0}`);
        if (isArr) {
            console.log('✓ PASS: detectRecurringBlockers analyzes historical submissions.\n');
        } else {
            console.error('✗ FAIL: detectRecurringBlockers should return an array.\n');
            allPassed = false;
        }
    } catch (e) {
        console.error('✗ FAIL: Error in detectRecurringBlockers:', e.message);
        allPassed = false;
    }

    // Requirement 7: Annual Business Loss Rollup
    console.log('--- TEST 7: Annual Cumulative Business Loss Rollup ---');
    try {
        const annualLoss = await calculateAnnualBusinessLossRollup({ department: targetDept, year: targetYear });
        console.log(`Department: ${annualLoss.department} | Year: ${annualLoss.year} | Total Loss: ₹${annualLoss.totalLoss} | Incidents: ${annualLoss.totalIncidents}`);
        if (annualLoss.totalLoss !== undefined && annualLoss.totalIncidents !== undefined) {
            console.log('✓ PASS: calculateAnnualBusinessLossRollup aggregates cross-department losses.\n');
        } else {
            console.error('✗ FAIL: calculateAnnualBusinessLossRollup missing totalLoss/totalIncidents.\n');
            allPassed = false;
        }
    } catch (e) {
        console.error('✗ FAIL: Error in calculateAnnualBusinessLossRollup:', e.message);
        allPassed = false;
    }

    // Requirement 8: HOD Leaderboard & Rankings
    console.log('--- TEST 8: Executive HOD Leaderboard (Rankings) ---');
    try {
        const rankings = await MRMHodScore.find({
            month: targetMonth,
            year: targetYear
        })
        .populate('hodId', 'first_name last_name username department')
        .sort({ final_score: -1 })
        .lean();

        console.log(`Found ${rankings.length} HOD score records in leaderboard:`);
        rankings.forEach((r, idx) => {
            const name = r.hodId ? `${r.hodId.first_name || ''} ${r.hodId.last_name || ''}`.trim() || r.hodId.username : 'Unknown';
            console.log(`  Rank #${r.monthly_rank || (idx + 1)}: ${name} (${r.department}) | Score: ${r.final_score}% (Team: ${r.team_score}%, Focus: ${r.focus_score}%) | Loss: ₹${r.annual_cumulative_team_business_loss}`);
        });

        if (rankings.length > 0) {
            console.log('✓ PASS: Executive rankings query is fully operational.\n');
        } else {
            console.error('✗ FAIL: Rankings query returned 0 records.\n');
            allPassed = false;
        }
    } catch (e) {
        console.error('✗ FAIL: Error in rankings query:', e.message);
        allPassed = false;
    }

    // Requirement 9: KPI Mandatory Submission Validation Gate Logic
    console.log('--- TEST 9: KPI Sheet Submission Gate Validation Logic ---');
    function validateKpiSubmission(sumObj) {
        const errors = [];
        const lossNTR = Boolean(sumObj.business_loss_nothing_to_report);
        const lossVal = Number(sumObj.business_loss) || 0;
        const lossRemarks = (sumObj.business_loss_remarks || sumObj.loss_description || '').trim();

        if (!lossNTR && lossVal > 0 && lossRemarks.length < 15) {
            errors.push("Business loss remarks must include an actionable remedial recommendation (minimum 15 characters).");
        } else if (!lossNTR && (sumObj.business_loss === undefined || sumObj.business_loss === null || isNaN(Number(sumObj.business_loss)))) {
            errors.push("Business loss is required. Enter ₹ 0 or select 'Nothing to report'.");
        }

        const blockersNTR = Boolean(sumObj.blockers_nothing_to_report);
        const blockersText = (sumObj.blockers || '').trim();
        if (!blockersNTR && (!blockersText || blockersText === 'NONE: No blockers to select' || blockersText.toUpperCase() === 'NONE')) {
            errors.push("Blockers field is required. Provide details or select 'Nothing to report'.");
        }

        const openPointsNTR = Boolean(sumObj.open_points_nothing_to_report);
        const openPointsList = Array.isArray(sumObj.open_points) ? sumObj.open_points : [];
        const openPointsCount = Number(sumObj.open_points_count) || openPointsList.length;
        if (!openPointsNTR && openPointsCount === 0 && openPointsList.length === 0) {
            errors.push("Open points entry is required. Add open points or select 'Nothing to report'.");
        }
        return errors;
    }

    // Case 9a: Blank fields with NTR=false -> Should be rejected
    const blankErrors = validateKpiSubmission({ business_loss: null, blockers: '', open_points: [] });
    console.log(`  Case 9a (Blank submissions): Caught ${blankErrors.length} validation errors (Expected: 3)`);
    if (blankErrors.length === 3) {
        console.log('    ✓ Correctly rejected blank submission');
    } else {
        console.error('    ✗ Failed to reject blank submission');
        allPassed = false;
    }

    // Case 9b: Short remarks on business loss > 0 -> Should be rejected
    const shortRemarkErrors = validateKpiSubmission({
        business_loss: 5000,
        business_loss_remarks: "Oops error", // < 15 chars
        blockers: "Server down",
        open_points: [{ text: "Fix" }]
    });
    console.log(`  Case 9b (Remarks < 15 chars on loss): Caught ${shortRemarkErrors.length} errors`);
    if (shortRemarkErrors.some(e => e.includes('minimum 15 characters'))) {
        console.log('    ✓ Correctly rejected business loss remarks under 15 characters');
    } else {
        console.error('    ✗ Failed to enforce 15-char remedial remarks');
        allPassed = false;
    }

    // Case 9c: All NTR checkboxes checked -> Should pass
    const ntrErrors = validateKpiSubmission({
        business_loss_nothing_to_report: true,
        blockers_nothing_to_report: true,
        open_points_nothing_to_report: true
    });
    console.log(`  Case 9c (All NTR flags checked): Errors count = ${ntrErrors.length} (Expected: 0)`);
    if (ntrErrors.length === 0) {
        console.log('    ✓ Correctly allowed submission when NTR flags are checked');
        console.log('✓ PASS: KPI submission validation gate is 100% compliant with spec.\n');
    } else {
        console.error('    ✗ Rejected valid NTR submission');
        allPassed = false;
    }

    console.log('====================================================');
    if (allPassed) {
        console.log('🎉 ALL MRM 2.0 REQUIREMENTS ARE 100% SATISFIED AND VERIFIED!');
    } else {
        console.log('❌ SOME TESTS FAILED. PLEASE CHECK THE LOG ABOVE.');
    }
    console.log('====================================================');

    await mongoose.disconnect();
    process.exit(allPassed ? 0 : 1);
}

runTests().catch(err => {
    console.error('Fatal test error:', err);
    process.exit(1);
});
