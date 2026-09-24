// Scratch test script to verify user-wise measures and team score calculation

function calculateMemberComposite(attendanceScore, kpiScore, karmaNorm, userCw) {
    const uAttWeight = userCw.attendance != null ? Number(userCw.attendance) : 34;
    const uKpiWeight = userCw.kpi != null ? Number(userCw.kpi) : 33;
    const uKarmaWeight = userCw.karma != null ? Number(userCw.karma) : 33;
    const uCwTotal = uAttWeight + uKpiWeight + uKarmaWeight;

    const uAttPct = uCwTotal > 0 ? (uAttWeight / uCwTotal) : (1 / 3);
    const uKpiPct = uCwTotal > 0 ? (uKpiWeight / uCwTotal) : (1 / 3);
    const uKarmaPct = uCwTotal > 0 ? (uKarmaWeight / uCwTotal) : (1 / 3);

    const attNorm = Math.min(100, Math.max(0, attendanceScore));
    const kpiNorm = Math.min(100, Math.max(0, kpiScore));
    const compositeScore = Number((attNorm * uAttPct + kpiNorm * uKpiPct + karmaNorm * uKarmaPct).toFixed(1));

    return {
        compositeScore,
        uAttPct,
        uKpiPct,
        uKarmaPct
    };
}

// User 1: Has Attendance (90%) and KPI (80%), but No Karma (0%)
const u1 = calculateMemberComposite(90, 80, 0, { attendance: 50, kpi: 50, karma: 0 });
console.log('User 1 (50% Att, 50% KPI, 0% Karma):', u1);
// Expected: (90 * 0.5) + (80 * 0.5) + (0 * 0) = 45 + 40 = 85.0
if (u1.compositeScore !== 85.0) {
    console.error('FAIL: User 1 expected 85.0, got', u1.compositeScore);
    process.exit(1);
}

// User 2: Support staff - Attendance only (95%), 0% KPI, 0% Karma
const u2 = calculateMemberComposite(95, 0, 0, { attendance: 100, kpi: 0, karma: 0 });
console.log('User 2 (100% Att, 0% KPI, 0% Karma):', u2);
// Expected: 95.0
if (u2.compositeScore !== 95.0) {
    console.error('FAIL: User 2 expected 95.0, got', u2.compositeScore);
    process.exit(1);
}

// User 3: Balanced standard (Att 90%, KPI 90%, Karma 100%) with 34/33/33
const u3 = calculateMemberComposite(90, 90, 100, { attendance: 34, kpi: 33, karma: 33 });
console.log('User 3 (34% Att, 33% KPI, 33% Karma):', u3);
// Expected: (90 * 0.34 + 90 * 0.33 + 100 * 0.33) = 30.6 + 29.7 + 33.0 = 93.3
if (Math.abs(u3.compositeScore - 93.3) > 0.1) {
    console.error('FAIL: User 3 expected ~93.3, got', u3.compositeScore);
    process.exit(1);
}

// Team Score with weights: User 1 (40%), User 2 (30%), User 3 (30%)
const members = [
    { compositeScore: u1.compositeScore, weight_pct: 40 },
    { compositeScore: u2.compositeScore, weight_pct: 30 },
    { compositeScore: u3.compositeScore, weight_pct: 30 },
];

const totalWeight = members.reduce((sum, m) => sum + m.weight_pct, 0);
const teamScore = Number(members.reduce((sum, m) => sum + (m.compositeScore * (m.weight_pct / 100)), 0).toFixed(1));
console.log('Team Score (40% * 85.0 + 30% * 95.0 + 30% * 93.3):', teamScore);
// Expected: 34 + 28.5 + 27.99 = 90.49 -> 90.5
if (Math.abs(teamScore - 90.5) > 0.1) {
    console.error('FAIL: Team Score expected ~90.5, got', teamScore);
    process.exit(1);
}

console.log('ALL TESTS PASSED SUCCESSFULLY!');
