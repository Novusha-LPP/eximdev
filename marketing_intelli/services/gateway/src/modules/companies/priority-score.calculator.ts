// ─── PRD v1.1 Account Priority Score Calculator ─────────────────
// services/gateway/src/modules/companies/priority-score.calculator.ts

export interface PriorityScoreInput {
  turnoverBand?: string;
  serviceGapsCount: number;
  revenueGrowthTrend?: string;
  hasDecisionMakerContact?: boolean;
  hasMobileContact?: boolean;
  hasWhatsAppContact?: boolean;
  lastInteractionDays?: number | null;
  hasFinancialRisk?: boolean;
}

export interface PriorityScoreResult {
  totalScore: number;
  breakdown: {
    turnoverPts: number;
    gapPts: number;
    growthPts: number;
    contactPts: number;
    recencyPts: number;
    penaltyPts: number;
  };
}

export function calculatePriorityScore(input: PriorityScoreInput): PriorityScoreResult {
  // 1. Turnover Band (max 25 pts)
  let turnoverPts = 5;
  const turnover = (input.turnoverBand || "").toLowerCase();
  if (turnover.includes("1000cr") || turnover.includes("1000 cr")) turnoverPts = 25;
  else if (turnover.includes("200-1000") || turnover.includes("200cr")) turnoverPts = 20;
  else if (turnover.includes("50-200")) turnoverPts = 15;
  else if (turnover.includes("10-50")) turnoverPts = 10;
  else if (turnover.includes("1-10")) turnoverPts = 5;
  else if (turnover.includes("<1cr")) turnoverPts = 2;

  // 2. Service Gaps Count (max 30 pts: 6 pts per gap)
  const gapCount = Math.min(Math.max(input.serviceGapsCount || 0, 0), 5);
  const gapPts = gapCount * 6;

  // 3. Revenue Growth Trend (max 20 pts)
  let growthPts = 5;
  const growth = (input.revenueGrowthTrend || "").toLowerCase();
  if (growth.includes("fast")) growthPts = 20;
  else if (growth.includes("steadily") || growth.includes("growing")) growthPts = 15;
  else if (growth.includes("flat")) growthPts = 8;
  else if (growth.includes("declining")) growthPts = 0;

  // 4. Contact Quality (max 15 pts)
  let contactPts = 0;
  if (input.hasDecisionMakerContact && input.hasMobileContact && input.hasWhatsAppContact) {
    contactPts = 15;
  } else if (input.hasMobileContact) {
    contactPts = 10;
  } else if (input.hasDecisionMakerContact) {
    contactPts = 5;
  }

  // 5. Interaction Recency (max 10 pts)
  let recencyPts = 10; // Default for never approached
  if (input.lastInteractionDays !== undefined && input.lastInteractionDays !== null) {
    const days = input.lastInteractionDays;
    if (days < 30) recencyPts = 5;
    else if (days <= 90) recencyPts = 8;
    else if (days <= 180) recencyPts = 3;
    else recencyPts = 1;
  }

  // 6. Penalties (up to -15 pts)
  let penaltyPts = 0;
  if (input.lastInteractionDays !== undefined && input.lastInteractionDays !== null && input.lastInteractionDays > 90) {
    penaltyPts -= 5;
  }
  if (input.hasFinancialRisk) {
    penaltyPts -= 10;
  }

  const rawTotal = turnoverPts + gapPts + growthPts + contactPts + recencyPts + penaltyPts;
  const totalScore = Math.min(Math.max(rawTotal, 0), 100);

  return {
    totalScore,
    breakdown: {
      turnoverPts,
      gapPts,
      growthPts,
      contactPts,
      recencyPts,
      penaltyPts,
    },
  };
}
