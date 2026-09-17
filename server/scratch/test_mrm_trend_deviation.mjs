// Scratch verification script for MRM 2.0 Trend Deviation & Cold Start Rules
import assert from 'assert';

console.log('--- Testing MRM 2.0 Trend Deviation & RAG Engine ---');

function evaluateTrend(currentTasks, historical3M) {
    if (historical3M.length < 3) {
        return {
            isColdStart: true,
            trailing3mAvg: null,
            trendDeviationPct: null,
            trendStatus: 'ColdStart'
        };
    }

    const trailing3mAvg = Number((historical3M.reduce((a, b) => a + b, 0) / 3).toFixed(1));
    let trendDeviationPct = 0;
    if (trailing3mAvg > 0) {
        trendDeviationPct = Number((((currentTasks - trailing3mAvg) / trailing3mAvg) * 100).toFixed(1));
    }

    let trendStatus = 'Green';
    if (trendDeviationPct <= -20.0) {
        trendStatus = 'Red';
    } else if (trendDeviationPct <= -10.0) {
        trendStatus = 'Amber';
    }

    return {
        isColdStart: false,
        trailing3mAvg,
        trendDeviationPct,
        trendStatus
    };
}

function evaluateWorstCaseRag(trendResult, flags) {
    const { hasBusinessLoss, hasBlockers, hasUnsubmitted, unsubmittedMembers } = flags;
    const flagStatus = (hasBusinessLoss || hasBlockers || hasUnsubmitted) ? 'Red' : 'Green';

    if (hasUnsubmitted) {
        return {
            finalRag: 'Red',
            segmentScore: 0,
            reason: `[Missed Submission: ${unsubmittedMembers.join(', ')}]`
        };
    }

    if (trendResult.isColdStart) {
        if (flagStatus === 'Red') {
            return {
                finalRag: 'Red',
                segmentScore: 40,
                reason: '[Operational Flag: Blockers/Loss (Cold Start)]'
            };
        }
        return {
            finalRag: 'Green',
            segmentScore: 100,
            reason: '[Clean (Cold Start)]'
        };
    }

    const isTrendRed = trendResult.trendStatus === 'Red';
    const isTrendAmber = trendResult.trendStatus === 'Amber';
    const isFlagRed = flagStatus === 'Red';

    if (isTrendRed && isFlagRed) {
        return {
            finalRag: 'Red',
            segmentScore: 20,
            reason: `[Trend Deviation (${trendResult.trendDeviationPct}%) & Operational Flags]`
        };
    }
    if (isTrendRed && !isFlagRed) {
        return {
            finalRag: 'Red',
            segmentScore: 40,
            reason: `[Trend Deviation (${trendResult.trendDeviationPct}%)]`
        };
    }
    if (!isTrendRed && isFlagRed) {
        return {
            finalRag: 'Red',
            segmentScore: 40,
            reason: '[Operational Flag: Loss / Blocker]'
        };
    }
    if (isTrendAmber && !isFlagRed) {
        return {
            finalRag: 'Amber',
            segmentScore: 70,
            reason: `[Trend Deviation (${trendResult.trendDeviationPct}%)]`
        };
    }

    return {
        finalRag: 'Green',
        segmentScore: 100,
        reason: '[On Trend & Clean]'
    };
}

// Test Case 1: Cold start (only 2 months exist)
const coldStartRes = evaluateTrend(380, [400, 450]);
assert.strictEqual(coldStartRes.isColdStart, true);
assert.strictEqual(coldStartRes.trendStatus, 'ColdStart');
const coldStartRagClean = evaluateWorstCaseRag(coldStartRes, { hasBusinessLoss: false, hasBlockers: false, hasUnsubmitted: false });
assert.strictEqual(coldStartRagClean.finalRag, 'Green');
assert.strictEqual(coldStartRagClean.segmentScore, 100);
console.log('✓ Cold Start (Clean) -> Green (Score: 100)');

const coldStartRagFlagged = evaluateWorstCaseRag(coldStartRes, { hasBusinessLoss: true, hasBlockers: false, hasUnsubmitted: false });
assert.strictEqual(coldStartRagFlagged.finalRag, 'Red');
assert.strictEqual(coldStartRagFlagged.segmentScore, 40);
console.log('✓ Cold Start (With Loss) -> Red (Score: 40)');

// Test Case 2: Post Cold Start - Red Trend (-24.2%) + Clean Flag
const redTrendRes = evaluateTrend(380, [500, 500, 503]); // avg ~ 501, (380-501)/501 = -24.15% -> -24.2%
assert.strictEqual(redTrendRes.trendStatus, 'Red');
const redTrendClean = evaluateWorstCaseRag(redTrendRes, { hasBusinessLoss: false, hasBlockers: false, hasUnsubmitted: false });
assert.strictEqual(redTrendClean.finalRag, 'Red');
assert.strictEqual(redTrendClean.segmentScore, 40);
console.log('✓ Red Trend Alone -> Red (Score: 40)');

// Test Case 3: Post Cold Start - Red Trend (-24.2%) + Flagged Blocker (2 triggers)
const redTrendBoth = evaluateWorstCaseRag(redTrendRes, { hasBusinessLoss: false, hasBlockers: true, hasUnsubmitted: false });
assert.strictEqual(redTrendBoth.finalRag, 'Red');
assert.strictEqual(redTrendBoth.segmentScore, 20);
console.log('✓ Red Trend + Flagged Blocker -> Red (Score: 20)');

// Test Case 4: Post Cold Start - Amber Trend (-15%) + Clean Flag
const amberTrendRes = evaluateTrend(425, [500, 500, 500]); // 425 vs 500 = -15.0%
assert.strictEqual(amberTrendRes.trendStatus, 'Amber');
const amberClean = evaluateWorstCaseRag(amberTrendRes, { hasBusinessLoss: false, hasBlockers: false, hasUnsubmitted: false });
assert.strictEqual(amberClean.finalRag, 'Amber');
assert.strictEqual(amberClean.segmentScore, 70);
console.log('✓ Amber Trend Alone -> Amber (Score: 70)');

// Test Case 5: Post Cold Start - Green Trend (+4.1%) + Clean Flag
const greenTrendRes = evaluateTrend(520, [500, 500, 500]); // 520 vs 500 = +4.0%
assert.strictEqual(greenTrendRes.trendStatus, 'Green');
const greenClean = evaluateWorstCaseRag(greenTrendRes, { hasBusinessLoss: false, hasBlockers: false, hasUnsubmitted: false });
assert.strictEqual(greenClean.finalRag, 'Green');
assert.strictEqual(greenClean.segmentScore, 100);
console.log('✓ Green Trend & Clean -> Green (Score: 100)');

// Test Case 6: Unsubmitted Member -> Immediate Red with Score 0
const unsubmittedCase = evaluateWorstCaseRag(greenTrendRes, { hasBusinessLoss: false, hasBlockers: false, hasUnsubmitted: true, unsubmittedMembers: ['Deepak Joshi'] });
assert.strictEqual(unsubmittedCase.finalRag, 'Red');
assert.strictEqual(unsubmittedCase.segmentScore, 0);
console.log('✓ Unsubmitted Member -> Red (Score: 0)');

console.log('\nAll Trend Deviation and RAG test cases passed with 100% precision!\n');
