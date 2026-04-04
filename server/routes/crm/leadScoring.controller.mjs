import express from 'express';
import LeadScore from '../../model/crm/LeadScore.mjs';
import Lead from '../../model/crm/Lead.mjs';

const router = express.Router();

// Calculate or update lead score
router.post('/leads/:leadId/score', async (req, res) => {
  try {
    const { leadId } = req.params;
    const { baseScore, sourceScore, activityScore, engagementScore, ruleFactors = [] } = req.body;

    // Verify lead exists
    const lead = await Lead.findOne({ _id: leadId });
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    // Calculate total score
    const totalScore = Math.min(100, (baseScore || 0) + (sourceScore || 0) + (activityScore || 0) + (engagementScore || 0));

    // Determine grade
    let grade = 'D';
    if (totalScore >= 80) grade = 'A';
    else if (totalScore >= 60) grade = 'B';
    else if (totalScore >= 40) grade = 'C';

    // Update or create lead score
    let leadScore = await LeadScore.findOneAndUpdate(
      { leadId },
      {
        baseScore,
        sourceScore,
        activityScore,
        engagementScore,
        totalScore,
        grade,
        isQualified: grade === 'A' || grade === 'B',
        rulesApplied: ruleFactors,
        lastCalculated: new Date()
      },
      { new: true, upsert: true }
    );

    res.json(leadScore);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get lead score
router.get('/leads/:leadId/score', async (req, res) => {
  try {
    const leadScore = await LeadScore.findOne({ leadId: req.params.leadId });
    if (!leadScore) return res.status(404).json({ message: 'Score not found' });
    res.json(leadScore);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all lead scores (with pagination)
router.get('/scores', async (req, res) => {
  try {
    const { grade, minScore, maxScore, page = 1, limit = 20 } = req.query;
    let query = {};

    if (grade) query.grade = grade;
    if (minScore) query.totalScore = { ...query.totalScore, $gte: Number(minScore) };
    if (maxScore) query.totalScore = { ...query.totalScore, $lte: Number(maxScore) };

    const scores = await LeadScore.find(query)
      .populate('leadId', 'firstName lastName email company')
      .sort({ totalScore: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await LeadScore.countDocuments(query);

    res.json({
      scores,
      pagination: { page: Number(page), limit: Number(limit), total }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Auto-qualify leads based on scoring rules
router.post('/leads/auto-qualify', async (req, res) => {
  try {
    const { minScoreForQualification = 70 } = req.body;

    // Find leads with score above threshold
    const qualifyingLeads = await LeadScore.find({
      totalScore: { $gte: minScoreForQualification },
      isQualified: false
    });

    // Update them
    const updates = await Promise.all(
      qualifyingLeads.map(score =>
        LeadScore.updateOne(
          { _id: score._id },
          { isQualified: true, qualificationReason: 'Auto-qualified by scoring system' }
        )
      )
    );

    res.json({
      message: `Auto-qualified ${qualifyingLeads.length} leads`,
      leadCount: qualifyingLeads.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get scoring dashboard stats
router.get('/scores/dashboard/stats', async (req, res) => {
  try {
    const stats = await LeadScore.aggregate([
      {
        $facet: {
          byGrade: [
            { $group: { _id: '$grade', count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
          ],
          scoreDistribution: [
            {
              $group: {
                _id: {
                  $cond: [
                    { $gte: ['$totalScore', 80] },
                    'A',
                    { $cond: [{ $gte: ['$totalScore', 60] }, 'B', 'C'] }
                  ]
                },
                count: { $sum: 1 }
              }
            }
          ],
          avgScore: [{ $group: { _id: null, average: { $avg: '$totalScore' } } }],
          qualified: [{ $match: { isQualified: true } }, { $count: 'count' }],
          activeLeads: [{ $match: { isQualified: true } }, { $count: 'count' }]
        }
      }
    ]);

    res.json(stats[0]);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
