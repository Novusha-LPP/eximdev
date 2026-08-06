// ─── Priority Score & Data Completeness Service ──────────────────
// services/gateway/src/modules/companies/PriorityScoreService.ts
// PRD §4.5 Account Priority Score (0-100) & PRD §8.3 Completeness Score

export interface PriorityScoreBreakdown {
  turnover_pts: number;
  gap_pts: number;
  growth_pts: number;
  contact_pts: number;
  recency_pts: number;
  penalty_pts: number;
  total_score: number;
  calculated_at: Date;
}

export class PriorityScoreService {
  /**
   * PRD §4.5 Account Priority Score Formula (0-100 pts)
   * 1. Turnover band (max 25 pts)
   * 2. Service gaps count (max 30 pts: 6 pts per unengaged service)
   * 3. Revenue growth trend (max 20 pts)
   * 4. Contact quality (max 15 pts)
   * 5. Interaction recency (max 10 pts)
   * 6. Penalties (up to -15 pts: 90+ days inactive = -5, High Financial Risk = -10)
   */
  static calculatePriorityScore(company: Record<string, any>, contactsCount: number = 0, hasDecisionMakerMobile: boolean = false, daysSinceLastInteraction: number = 999): PriorityScoreBreakdown {
    // 1. Turnover Band Points (Max 25)
    let turnover_pts = 5;
    const band = company.turnover_band;
    if (band === '1000Cr+') turnover_pts = 25;
    else if (band === '200-1000Cr') turnover_pts = 20;
    else if (band === '50-200Cr') turnover_pts = 15;
    else if (band === '10-50Cr') turnover_pts = 10;
    else if (band === '1-10Cr') turnover_pts = 5;
    else if (band === '<1Cr') turnover_pts = 2;

    // 2. Service Gaps Points (Max 30: 6 pts per unengaged service)
    const services = Array.isArray(company.services) ? company.services : [];
    const unengagedCount = services.filter((s: any) => !s.engaged).length;
    const gap_pts = Math.min(30, unengagedCount * 6);

    // 3. Revenue Growth Trend Points (Max 20)
    let growth_pts = 5;
    const growth = company.growth_trend;
    if (growth === 'Growing fast') growth_pts = 20;
    else if (growth === 'Growing steadily') growth_pts = 15;
    else if (growth === 'Flat') growth_pts = 8;
    else if (growth === 'Declining') growth_pts = 0;
    else if (growth === 'Unknown') growth_pts = 5;

    // 4. Contact Quality Points (Max 15)
    let contact_pts = 0;
    if (hasDecisionMakerMobile) contact_pts = 15;
    else if (contactsCount > 0) contact_pts = 8;

    // 5. Interaction Recency Points (Max 10)
    let recency_pts = 10; // Never approached
    if (daysSinceLastInteraction === 999) recency_pts = 10;
    else if (daysSinceLastInteraction < 30) recency_pts = 5;
    else if (daysSinceLastInteraction <= 90) recency_pts = 8;
    else if (daysSinceLastInteraction <= 180) recency_pts = 3;
    else recency_pts = 1;

    // 6. Penalties (Up to -15)
    let penalty_pts = 0;
    if (daysSinceLastInteraction >= 90 && daysSinceLastInteraction < 999) {
      penalty_pts += 5; // 90+ days inactive
    }
    if (company.credit_rating === 'High') {
      penalty_pts += 10; // High financial risk
    }

    const rawTotal = turnover_pts + gap_pts + growth_pts + contact_pts + recency_pts - penalty_pts;
    const total_score = Math.max(0, Math.min(100, rawTotal));

    return {
      turnover_pts,
      gap_pts,
      growth_pts,
      contact_pts,
      recency_pts,
      penalty_pts,
      total_score,
      calculated_at: new Date(),
    };
  }

  /**
   * PRD §8.3 Record Completeness Score (0-100%)
   * Evaluates presence of core identity, manufacturing, regulatory, financial, and contact fields.
   */
  static calculateCompletenessScore(company: Record<string, any>, contactsCount: number = 0): number {
    const fieldsToTrack = [
      Boolean(company.company_name),
      Boolean(company.gstin),
      Boolean(company.city),
      Boolean(company.area),
      Boolean(company.primary_industry),
      Boolean(company.turnover_band),
      Boolean(company.growth_trend),
      Boolean(company.iec_code),
      Boolean(company.gst_filing_status),
      Boolean(company.best_approach_window),
      Boolean(company.account_owner),
      contactsCount > 0,
    ];

    const filledCount = fieldsToTrack.filter(Boolean).length;
    return Math.round((filledCount / fieldsToTrack.length) * 100);
  }
}
