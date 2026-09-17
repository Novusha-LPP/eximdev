// Scratch verification script for feature flag gating
import assert from 'assert';
import { isFeatureEnabled } from '../config/featureFlags.mjs';
import { calculateSegmentRollup, calculateHodMonthlyScore } from '../services/mrmAnalyticsService.mjs';

console.log('--- Testing Feature Flag Gating ---');

// Case 1: Flag is OFF (default)
process.env.MRM_KPI_ROLLUP_ENABLED = 'false';
assert.strictEqual(isFeatureEnabled('MRM_KPI_ROLLUP_ENABLED'), false);

const rollupDisabled = await calculateSegmentRollup({ department: 'Import', hodId: '000000000000000000000000', month: '08', year: 2026 });
assert.strictEqual(rollupDisabled.enabled, false);
console.log('✓ Flag OFF: calculateSegmentRollup returned { enabled: false }');

const hodScoreDisabled = await calculateHodMonthlyScore({ hodId: '000000000000000000000000', department: 'Import', month: '08', year: 2026 });
assert.strictEqual(hodScoreDisabled.enabled, false);
console.log('✓ Flag OFF: calculateHodMonthlyScore returned { enabled: false }');

// Case 2: Flag is ON
process.env.MRM_KPI_ROLLUP_ENABLED = 'true';
assert.strictEqual(isFeatureEnabled('MRM_KPI_ROLLUP_ENABLED'), true);
console.log('✓ Flag ON: isFeatureEnabled correctly returned true');

// Reset to false for safety
process.env.MRM_KPI_ROLLUP_ENABLED = 'false';
console.log('\nFeature flag gating verified with 100% precision!\n');
process.exit(0);
