import express from 'express';
import mongoose from 'mongoose';
import Tactic from '../../model/crm/Tactic.mjs';
import TacticLineFit from '../../model/crm/TacticLineFit.mjs';
import Partner from '../../model/crm/Partner.mjs';
import DealTactic from '../../model/crm/DealTactic.mjs';
import Opportunity from '../../model/crm/Opportunity.mjs';
import UserModel from '../../model/userModel.mjs';

const router = express.Router();

const LINE_DEFINITIONS = [
  { code: 'FF', familiar: 'freight forwarding', label: 'Freight Forwarding' },
  { code: 'CC', familiar: 'customs clearance', label: 'Customs Clearance' },
  { code: 'DG', familiar: 'dgft', label: 'DGFT' },
  { code: 'EL', familiar: 'e-lock', label: 'E-Lock' },
  { code: 'CR', familiar: 'paramount', label: 'Paramount' },
  { code: 'AM', familiar: 'autorack', label: 'Autorack' },
  { code: 'CT', familiar: 'transportation', label: 'Transportation' },
  { code: 'SW', familiar: 'client', label: 'AIVision / Software' },
  { code: 'MB', familiar: 'rabs', label: 'RABS' }
];

// Helper to normalize any line code or familiar name to standard code and familiar name
function resolveLine(lineStr) {
  if (!lineStr) return null;
  const lower = lineStr.toString().toLowerCase().trim();
  const found = LINE_DEFINITIONS.find(
    l => l.code.toLowerCase() === lower || l.familiar.toLowerCase() === lower || l.label.toLowerCase() === lower
  );
  return found || null;
}

// ─────────────────────────────────────────────────────────────
// 1. GET /api/crm/tactics
// Returns all 30 tactics. If ?business_line=... or ?service=... provided, annotates with star rating
// ─────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { business_line, service } = req.query;
    const targetLine = resolveLine(business_line || service);

    const tactics = await Tactic.find({ is_active: true })
      .sort({ sort_order: 1 })
      .lean();

    if (targetLine) {
      const lineFits = await TacticLineFit.find({
        $or: [
          { business_line: targetLine.code },
          { business_line: targetLine.familiar }
        ],
        is_starred: true
      }).lean();

      const starredTacticCodes = new Set(lineFits.map(f => f.tactic_code));

      const annotated = tactics.map(t => ({
        ...t,
        is_starred: starredTacticCodes.has(t.code),
        matched_line: targetLine.label
      }));

      return res.json({ success: true, data: annotated });
    }

    res.json({ success: true, data: tactics });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 2. GET /api/crm/tactics/partners
// Returns active partners, filterable by partner_type, office, or search
// ─────────────────────────────────────────────────────────────
router.get('/partners', async (req, res) => {
  try {
    const { partner_type, office, search } = req.query;
    const query = { is_active: true };

    if (partner_type && partner_type !== 'all') {
      query.partner_type = partner_type;
    }
    if (office && office !== 'all') {
      query.$or = [{ office: office }, { office: 'All' }, { office: null }];
    }
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const partners = await Partner.find(query).sort({ name: 1 }).lean();
    res.json({ success: true, data: partners });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 3. POST /api/crm/tactics/partners
// Creates a new partner (sales heads / managers / admin)
// ─────────────────────────────────────────────────────────────
router.post('/partners', async (req, res) => {
  try {
    const { name, partner_type, office, contact_person, contact_phone, contact_email } = req.body;
    if (!name || !partner_type) {
      return res.status(400).json({ success: false, message: 'Name and partner_type are required.' });
    }

    const userId = req.user?._id || req.headers['user-id'];
    const newPartner = new Partner({
      name: name.trim(),
      partner_type,
      office: office || null,
      contact_person,
      contact_phone,
      contact_email,
      created_by: userId,
      is_active: true
    });

    await newPartner.save();
    res.status(201).json({ success: true, data: newPartner });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 4. GET /api/crm/tactics/report & GET /api/crm/reports/tactics
// Core Analytics Report: By Tactic, By Line, By Salesperson, and 30x9 Matrix
// ─────────────────────────────────────────────────────────────
export async function generateTacticsReport(req, res) {
  try {
    const {
      view = 'by_tactic', // 'by_tactic' | 'by_line' | 'by_salesperson' | 'matrix'
      tactic_id,
      tactic_code,
      business_line,
      service,
      salesperson_id,
      month,
      date_from,
      date_to,
      format
    } = req.query;

    // 1. Build Opportunity Match Criteria (Non-legacy only)
    const oppMatch = {
      tactics_legacy: { $ne: true }
    };

    if (salesperson_id && salesperson_id !== 'all' && mongoose.Types.ObjectId.isValid(salesperson_id)) {
      oppMatch.ownerId = new mongoose.Types.ObjectId(salesperson_id);
    }

    const targetLine = resolveLine(business_line || service);
    if (targetLine) {
      oppMatch.$or = [
        { businessLine: targetLine.code },
        { services: { $regex: new RegExp(targetLine.familiar, 'i') } }
      ];
    }

    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const startOfMonth = new Date(`${month}-01T00:00:00.000Z`);
      const endOfMonth = new Date(new Date(startOfMonth).setMonth(startOfMonth.getMonth() + 1));
      oppMatch.createdAt = { $gte: startOfMonth, $lt: endOfMonth };
    } else if (date_from || date_to) {
      oppMatch.createdAt = {};
      if (date_from) oppMatch.createdAt.$gte = new Date(date_from);
      if (date_to) oppMatch.createdAt.$lte = new Date(date_to);
    }

    // 2. Fetch all matching opportunities
    const opportunities = await Opportunity.find(oppMatch)
      .select('_id name value stage ownerId businessLine services discountPercent discountAmount createdAt')
      .populate('ownerId', 'username first_name last_name')
      .lean();

    const oppMap = new Map();
    opportunities.forEach(o => oppMap.set(o._id.toString(), o));
    const oppIds = Array.from(oppMap.keys()).map(id => new mongoose.Types.ObjectId(id));

    // 3. Fetch DealTactic records for these opportunities
    const dtMatch = { deal_id: { $in: oppIds } };
    if (tactic_code) {
      dtMatch.tactic_code = tactic_code.toUpperCase();
    } else if (tactic_id && mongoose.Types.ObjectId.isValid(tactic_id)) {
      dtMatch.tactic_id = new mongoose.Types.ObjectId(tactic_id);
    }

    const dealTactics = await DealTactic.find(dtMatch)
      .populate('tactic_id')
      .populate('added_by', 'username first_name last_name')
      .lean();

    // Fetch master tactics list
    const allTactics = await Tactic.find({ is_active: true }).sort({ sort_order: 1 }).lean();
    const starFits = await TacticLineFit.find({ is_starred: true }).lean();
    const starSet = new Set(starFits.map(f => `${f.tactic_code}_${f.business_line}`));

    // 4. Calculate Aggregate Views
    if (view === 'matrix') {
      // 30 x 9 Grid
      const matrix = allTactics.map(tactic => {
        const row = {
          code: tactic.code,
          name: tactic.name,
          stage: tactic.stage,
          lines: {}
        };

        for (const line of LINE_DEFINITIONS) {
          // Find deal tactics matching this tactic and line
          const matchingDTs = dealTactics.filter(dt => {
            if (dt.tactic_code !== tactic.code) return false;
            const opp = oppMap.get(dt.deal_id.toString());
            if (!opp) return false;
            const matchesCode = opp.businessLine === line.code;
            const matchesService = Array.isArray(opp.services) && opp.services.some(s => s.toLowerCase().includes(line.familiar));
            return matchesCode || matchesService;
          });

          const distinctDeals = new Set(matchingDTs.map(dt => dt.deal_id.toString()));
          let wonCount = 0;
          let lostCount = 0;
          let workedCount = 0;
          let didNotWorkCount = 0;

          distinctDeals.forEach(dealId => {
            const opp = oppMap.get(dealId);
            if (opp?.stage === 'won') wonCount++;
            if (opp?.stage === 'lost') lostCount++;
          });

          matchingDTs.forEach(dt => {
            if (dt.result === 'worked') workedCount++;
            if (dt.result === 'did_not_work') didNotWorkCount++;
          });

          const closedCount = wonCount + lostCount;
          const winRate = closedCount > 0 ? Math.round((wonCount / closedCount) * 100) : 0;
          const workedRate = (workedCount + didNotWorkCount) > 0 ? Math.round((workedCount / (workedCount + didNotWorkCount)) * 100) : 0;
          const isStarred = starSet.has(`${tactic.code}_${line.code}`) || starSet.has(`${tactic.code}_${line.familiar}`);

          row.lines[line.familiar] = {
            lineCode: line.code,
            lineLabel: line.label,
            isStarred,
            dealsTagged: distinctDeals.size,
            wonCount,
            lostCount,
            winRate,
            workedRate,
            isSmallSample: distinctDeals.size < 5
          };
        }

        return row;
      });

      if (format === 'csv') {
        let csv = 'Tactic Code,Tactic Name,Stage,' + LINE_DEFINITIONS.map(l => `${l.label} Win Rate (%),${l.label} Deals`).join(',') + '\n';
        matrix.forEach(r => {
          csv += `"${r.code}","${r.name}","${r.stage}",` +
            LINE_DEFINITIONS.map(l => {
              const d = r.lines[l.familiar];
              return `${d.winRate}%,${d.dealsTagged}`;
            }).join(',') + '\n';
        });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="tactic_matrix_report_${new Date().toISOString().substring(0, 10)}.csv"`);
        return res.send(csv);
      }

      return res.json({ success: true, view: 'matrix', data: matrix, lines: LINE_DEFINITIONS });
    }

    if (view === 'by_line') {
      const lineData = LINE_DEFINITIONS.map(line => {
        const matchingDTs = dealTactics.filter(dt => {
          const opp = oppMap.get(dt.deal_id.toString());
          if (!opp) return false;
          return opp.businessLine === line.code ||
            (Array.isArray(opp.services) && opp.services.some(s => s.toLowerCase().includes(line.familiar)));
        });

        const distinctDeals = new Set(matchingDTs.map(dt => dt.deal_id.toString()));
        let wonCount = 0;
        let lostCount = 0;
        let totalValue = 0;
        let wonValue = 0;

        distinctDeals.forEach(dealId => {
          const opp = oppMap.get(dealId);
          if (opp) {
            totalValue += opp.value || 0;
            if (opp.stage === 'won') {
              wonCount++;
              wonValue += opp.value || 0;
            } else if (opp.stage === 'lost') {
              lostCount++;
            }
          }
        });

        const closedCount = wonCount + lostCount;
        const winRate = closedCount > 0 ? Math.round((wonCount / closedCount) * 100) : 0;
        const avgDealValue = wonCount > 0 ? Math.round(wonValue / wonCount) : 0;

        return {
          code: line.code,
          label: line.label,
          familiar: line.familiar,
          dealsTagged: distinctDeals.size,
          wonCount,
          lostCount,
          winRate,
          avgDealValue,
          isSmallSample: distinctDeals.size < 5
        };
      });

      if (format === 'csv') {
        let csv = 'Business Line,Deals Tagged,Won,Lost,Win Rate (%),Avg Won Value (INR)\n';
        lineData.forEach(l => {
          csv += `"${l.label}",${l.dealsTagged},${l.wonCount},${l.lostCount},${l.winRate}%,${l.avgDealValue}\n`;
        });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="tactic_by_line_report_${new Date().toISOString().substring(0, 10)}.csv"`);
        return res.send(csv);
      }

      return res.json({ success: true, view: 'by_line', data: lineData });
    }

    if (view === 'by_salesperson') {
      // Group by Owner
      const ownerGroups = new Map();
      dealTactics.forEach(dt => {
        const opp = oppMap.get(dt.deal_id.toString());
        if (!opp) return;
        const owner = opp.ownerId;
        const ownerId = owner?._id ? owner._id.toString() : 'unassigned';
        const ownerName = owner ? `${owner.first_name || ''} ${owner.last_name || ''}`.trim() || owner.username : 'Unassigned';

        if (!ownerGroups.has(ownerId)) {
          ownerGroups.set(ownerId, {
            ownerId,
            ownerName,
            dealsSet: new Set(),
            wonDeals: new Set(),
            lostDeals: new Set(),
            tacticsUsed: new Map()
          });
        }

        const og = ownerGroups.get(ownerId);
        og.dealsSet.add(opp._id.toString());
        if (opp.stage === 'won') og.wonDeals.add(opp._id.toString());
        if (opp.stage === 'lost') og.lostDeals.add(opp._id.toString());

        if (!og.tacticsUsed.has(dt.tactic_code)) {
          og.tacticsUsed.set(dt.tactic_code, { code: dt.tactic_code, count: 0, worked: 0 });
        }
        const tStat = og.tacticsUsed.get(dt.tactic_code);
        tStat.count++;
        if (dt.result === 'worked') tStat.worked++;
      });

      const repData = Array.from(ownerGroups.values()).map(og => {
        const totalClosed = og.wonDeals.size + og.lostDeals.size;
        const winRate = totalClosed > 0 ? Math.round((og.wonDeals.size / totalClosed) * 100) : 0;
        return {
          ownerId: og.ownerId,
          ownerName: og.ownerName,
          dealsTagged: og.dealsSet.size,
          wonCount: og.wonDeals.size,
          lostCount: og.lostDeals.size,
          winRate,
          tacticsCount: og.tacticsUsed.size,
          topTactics: Array.from(og.tacticsUsed.values()).sort((a, b) => b.count - a.count).slice(0, 3),
          isSmallSample: og.dealsSet.size < 5
        };
      });

      if (format === 'csv') {
        let csv = 'Salesperson,Deals Tagged,Won,Lost,Win Rate (%),Distinct Tactics Used\n';
        repData.forEach(r => {
          csv += `"${r.ownerName}",${r.dealsTagged},${r.wonCount},${r.lostCount},${r.winRate}%,${r.tacticsCount}\n`;
        });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="tactic_by_salesperson_report_${new Date().toISOString().substring(0, 10)}.csv"`);
        return res.send(csv);
      }

      return res.json({ success: true, view: 'by_salesperson', data: repData });
    }

    // Default View: 'by_tactic'
    const tacticStats = allTactics.map(tactic => {
      const matchingDTs = dealTactics.filter(dt => dt.tactic_code === tactic.code);
      const distinctDeals = new Set(matchingDTs.map(dt => dt.deal_id.toString()));

      let wonCount = 0;
      let lostCount = 0;
      let openCount = 0;
      let totalValue = 0;
      let wonValue = 0;
      let totalDiscountPercent = 0;
      let dealsWithDiscount = 0;

      let workedCount = 0;
      let didNotWorkCount = 0;
      let notUsedCount = 0;

      distinctDeals.forEach(dealId => {
        const opp = oppMap.get(dealId);
        if (opp) {
          totalValue += opp.value || 0;
          if (opp.discountPercent) {
            totalDiscountPercent += opp.discountPercent;
            dealsWithDiscount++;
          }
          if (opp.stage === 'won') {
            wonCount++;
            wonValue += opp.value || 0;
          } else if (opp.stage === 'lost') {
            lostCount++;
          } else {
            openCount++;
          }
        }
      });

      matchingDTs.forEach(dt => {
        if (dt.result === 'worked') workedCount++;
        else if (dt.result === 'did_not_work') didNotWorkCount++;
        else if (dt.result === 'not_used') notUsedCount++;
      });

      const closedCount = wonCount + lostCount;
      const winRate = closedCount > 0 ? Math.round((wonCount / closedCount) * 100) : 0;
      const workedRate = (workedCount + didNotWorkCount) > 0 ? Math.round((workedCount / (workedCount + didNotWorkCount)) * 100) : 0;
      const avgWonValue = wonCount > 0 ? Math.round(wonValue / wonCount) : 0;
      const avgDiscountPercent = dealsWithDiscount > 0 ? Number((totalDiscountPercent / dealsWithDiscount).toFixed(1)) : 0;

      return {
        code: tactic.code,
        name: tactic.name,
        stage: tactic.stage,
        dealsTagged: distinctDeals.size,
        wonCount,
        lostCount,
        openCount,
        winRate,
        workedCount,
        didNotWorkCount,
        notUsedCount,
        workedRate,
        avgWonValue,
        avgDiscountPercent,
        isSmallSample: distinctDeals.size < 5
      };
    });

    if (format === 'csv') {
      let csv = 'Tactic Code,Tactic Name,Stage,Deals Tagged,Won,Lost,Open,Win Rate (%),Worked,Did Not Work,Not Used,Worked Rate (%),Avg Won Value (INR),Avg Discount (%)\n';
      tacticStats.forEach(t => {
        csv += `"${t.code}","${t.name}","${t.stage}",${t.dealsTagged},${t.wonCount},${t.lostCount},${t.openCount},${t.winRate}%,${t.workedCount},${t.didNotWorkCount},${t.notUsedCount},${t.workedRate}%,${t.avgWonValue},${t.avgDiscountPercent}%\n`;
      });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="tactic_by_tactic_report_${new Date().toISOString().substring(0, 10)}.csv"`);
      return res.send(csv);
    }

    res.json({
      success: true,
      view: 'by_tactic',
      data: tacticStats,
      totalDealsTagged: opportunities.length,
      note: 'Multi-tactic attribution: A deal with multiple tactics is counted once under each applied tactic.'
    });
  } catch (error) {
    console.error('Tactics report error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

router.get('/report', generateTacticsReport);

// Immutability: Block DELETE on tactics master and routes (Rule R2)
router.delete('*', (req, res) => {
  res.status(405).json({
    success: false,
    message: 'Tactics cannot be deleted or removed. Tactic assignment history is immutable per sales governance.'
  });
});

export default router;
