// Scratch verification script for MRM 2.0 70/30 Blended HOD Scoring
import assert from 'assert';

console.log('--- Testing MRM 2.0 70/30 HOD Performance Scoring ---');

function computeHodScore(segmentScores, focusCounts) {
    // 1. Team Score (70% weight)
    const teamScore = Number((segmentScores.reduce((a, b) => a + b, 0) / segmentScores.length).toFixed(1));

    // 2. Focus Score (30% weight)
    const { green = 0, yellow = 0, red = 0 } = focusCounts;
    const totalFocus = green + yellow + red;
    let focusScore = 100;
    if (totalFocus > 0) {
        focusScore = Number((((green * 100) + (yellow * 60) + (red * 0)) / totalFocus).toFixed(1));
    }

    // 3. Final Blended Score
    const finalScore = Number(((teamScore * 0.70) + (focusScore * 0.30)).toFixed(1));

    return {
        teamScore,
        focusScore,
        finalScore
    };
}

// Test Case 1: Example from brief
// 3 Sub-Teams:
// Segment 1 (Green): 100
// Segment 2 (Red - 1 trigger): 40
// Segment 3 (Green): 100
// Team Score = (100 + 40 + 100) / 3 = 80.0
// HOD Focus Areas: 4 Green, 1 Yellow, 0 Red
// Focus Score = ((4 * 100) + (1 * 60) + 0) / 5 = 460 / 5 = 92.0
// Final Score = (80.0 * 0.70) + (92.0 * 0.30) = 56.0 + 27.6 = 83.6
const res1 = computeHodScore([100, 40, 100], { green: 4, yellow: 1, red: 0 });
assert.strictEqual(res1.teamScore, 80.0);
assert.strictEqual(res1.focusScore, 92.0);
assert.strictEqual(res1.finalScore, 83.6);
console.log(`✓ Test 1: Team=${res1.teamScore}, Focus=${res1.focusScore} -> Final Score: ${res1.finalScore} (matches expected 83.6)`);

// Test Case 2: Perfect performance
// 5 Green Segments, 5 Green Focus areas
const res2 = computeHodScore([100, 100, 100, 100, 100], { green: 5, yellow: 0, red: 0 });
assert.strictEqual(res2.teamScore, 100.0);
assert.strictEqual(res2.focusScore, 100.0);
assert.strictEqual(res2.finalScore, 100.0);
console.log(`✓ Test 2: Perfect HOD -> Final Score: ${res2.finalScore} (matches 100.0)`);

// Test Case 3: Heavy team penalty (one segment with missed submission = 0)
// Segments: 100, 70, 0 (Avg: 56.7)
// Focus: 2 Green, 0 Yellow, 1 Red (Avg: 66.7)
// Final = (56.7 * 0.7) + (66.7 * 0.3) = 39.69 + 20.01 = 59.7
const res3 = computeHodScore([100, 70, 0], { green: 2, yellow: 0, red: 1 });
assert.strictEqual(res3.teamScore, 56.7);
assert.strictEqual(res3.focusScore, 66.7);
assert.strictEqual(res3.finalScore, 59.7);
console.log(`✓ Test 3: Missed submission penalty -> Final Score: ${res3.finalScore} (matches 59.7)`);

console.log('\nAll 70/30 HOD Scoring test cases passed with 100% precision!\n');
