import express from 'express';
import OpportunityForecast from '../../model/crm/OpportunityForecast.mjs';
import Opportunity from '../../model/crm/Opportunity.mjs';

const router = express.Router();

// CREATE forecast for opportunity
router.post('/', async (req, res) => {
  try {
    const { opportunityId, probability, adjustments = [] } = req.body;

    // Get opportunity details
    const opportunity = await Opportunity.findOne({ _id: opportunityId });
    if (!opportunity) return res.status(404).json({ message: 'Opportunity not found' });

    // Calculate expected value
    const expectedValue = opportunity.value * (probability / 100);

    // Calculate adjusted value
    let weightedValue = expectedValue;
    adjustments.forEach(adj => {
      weightedValue *= (1 + adj.adjustment / 100);
    });

    // Determine forecast month
    const now = new Date();
    const forecastMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const newForecast = new OpportunityForecast({
      opportunityId,
      forecastMonth,
      opportunityName: opportunity.name,
      accountId: opportunity.accountId,
      stage: opportunity.stage,
      baseValue: opportunity.value,
      probability,
      expectedValue,
      weightedValue,
      adjustments,
      stageEnteredDate: opportunity.stageEnteredDate || new Date(),
      ownerId: opportunity.ownerId,
      forecastedBy: req.userId
    });

    await newForecast.save();
    await newForecast.populate('opportunityId accountId ownerId');

    res.status(201).json(newForecast);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET forecasts for period (month/quarterly)
router.get('/period/:period', async (req, res) => {
  try {
    const { period } = req.params;
    const { ownerId, teamId, stage } = req.query;

    let query = {};

    // Filter by period
    const now = new Date();
    if (period === 'current-month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      query.forecastMonth = { $gte: monthStart, $lte: monthEnd };
    }

    // Filter by owner/team/stage
    if (ownerId) query.ownerId = ownerId;
    if (teamId) query.teamId = teamId;
    if (stage) query.stage = stage;

    const forecasts = await OpportunityForecast.find(query)
      .populate('opportunityId accountId ownerId')
      .sort({ expectedValue: -1 });

    // Calculate aggregate metrics
    const total = forecasts.reduce((sum, f) => sum + f.expectedValue, 0);
    const weighted = forecasts.reduce((sum, f) => sum + f.weightedValue, 0);

    res.json({
      forecasts,
      metrics: {
        totalExpectedRevenue: total,
        totalWeightedRevenue: weighted,
        forecastCount: forecasts.length,
        avgProbability: forecasts.length > 0
          ? Math.round(forecasts.reduce((sum, f) => sum + f.probability, 0) / forecasts.length)
          : 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET single forecast
router.get('/:id', async (req, res) => {
  try {
    const forecast = await OpportunityForecast.findOne({ _id: req.params.id })
      .populate('opportunityId accountId ownerId teamId');

    if (!forecast) return res.status(404).json({ message: 'Forecast not found' });
    res.json(forecast);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// UPDATE forecast
router.put('/:id', async (req, res) => {
  try {
    const { probability, adjustments, probabilityFactors } = req.body;

    const forecast = await OpportunityForecast.findOne({ _id: req.params.id });
    if (!forecast) return res.status(404).json({ message: 'Forecast not found' });

    if (probability !== undefined) {
      forecast.probability = probability;
      forecast.expectedValue = forecast.baseValue * (probability / 100);

      // Recalculate weighted value
      let weightedValue = forecast.expectedValue;
      if (adjustments) {
        forecast.adjustments = adjustments;
        adjustments.forEach(adj => {
          weightedValue *= (1 + adj.adjustment / 100);
        });
      }
      forecast.weightedValue = weightedValue;
    }

    if (probabilityFactors) {
      forecast.probabilityFactors = { ...forecast.probabilityFactors, ...probabilityFactors };
    }

    await forecast.save();
    res.json(forecast);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Close forecast (set actual value when deal closes)
router.post('/:id/close', async (req, res) => {
  try {
    const { actualValue, outcome } = req.body;

    const forecast = await OpportunityForecast.findOne({ _id: req.params.id });
    if (!forecast) return res.status(404).json({ message: 'Forecast not found' });

    forecast.accuracy = {
      actualValue,
      actualOutcome: outcome, // 'won' or 'lost'
      closedAt: new Date(),
      variance: actualValue - forecast.expectedValue,
      variancePercent: Math.round(((actualValue - forecast.expectedValue) / forecast.expectedValue) * 100)
    };

    await forecast.save();
    res.json(forecast);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get forecast dashboard
router.get('/dashboard/summary', async (req, res) => {
  try {
    const { period = 'current-month', ownerId } = req.query;

    let query = {};
    if (ownerId) query.ownerId = ownerId;

    // Get all active forecasts
    const forecasts = await OpportunityForecast.find(query);

    // Group by stage
    const byStage = {};
    const byProbability = { high: [], medium: [], low: [] };
    let totalExpected = 0;
    let totalWeighted = 0;

    forecasts.forEach(f => {
      if (!byStage[f.stage]) byStage[f.stage] = { count: 0, value: 0, weight: 0 };
      byStage[f.stage].count++;
      byStage[f.stage].value += f.expectedValue;
      byStage[f.stage].weight += f.weightedValue;

      if (f.probability >= 70) byProbability.high.push(f);
      else if (f.probability >= 40) byProbability.medium.push(f);
      else byProbability.low.push(f);

      totalExpected += f.expectedValue;
      totalWeighted += f.weightedValue;
    });

    res.json({
      summary: {
        totalExpectedRevenue: totalExpected,
        totalWeightedRevenue: totalWeighted,
        forecastCount: forecasts.length,
        avgProbability: forecasts.length > 0
          ? Math.round(forecasts.reduce((sum, f) => sum + f.probability, 0) / forecasts.length)
          : 0
      },
      byStage,
      byProbability: {
        high: byProbability.high.length,
        medium: byProbability.medium.length,
        low: byProbability.low.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get pipeline health (aging deals)
router.get('/health/aging-deals', async (req, res) => {
  try {
    const now = new Date();
    const query = {};

    const forecasts = await OpportunityForecast.find(query);

    const aging = {
      current: [],
      thirty_days: [],
      sixty_days: [],
      ninety_plus_days: []
    };

    forecasts.forEach(f => {
      const stageAge = (now - f.stageEnteredDate) / (1000 * 60 * 60 * 24); // in days

      if (stageAge < 30) aging.current.push(f);
      else if (stageAge < 60) aging.thirty_days.push(f);
      else if (stageAge < 90) aging.sixty_days.push(f);
      else aging.ninety_plus_days.push(f);
    });

    res.json({
      aging: {
        current: aging.current.length,
        thirty_days: aging.thirty_days.length,
        sixty_days: aging.sixty_days.length,
        ninety_plus_days: aging.ninety_plus_days.length
      },
      deals: aging
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
