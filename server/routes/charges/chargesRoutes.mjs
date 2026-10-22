import express from 'express';
import JobModel from '../../model/jobModel.mjs';
import ChargeHeadModel from '../../model/ChargeHead.mjs';
import verifyToken from '../../middleware/authMiddleware.mjs';
import { findChanges, logAuditTrail } from '../../services/auditTrailService.mjs';
import AuditTrailModel from '../../model/auditTrailModel.mjs';
import PurchaseBookEntryModel from '../../model/purchaseBookEntryModel.mjs';
import PaymentRequestModel from '../../model/paymentRequestModel.mjs';

const escapeRegex = (str) => (str ? String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : "");

const router = express.Router();

// --- CHARGE HEADS API ---

router.get('/charge-heads', async (req, res) => {
  try {
    const { search } = req.query;
    let query = { isActive: true };
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    const heads = await ChargeHeadModel.find(query).sort({ isSystem: -1, name: 1 });
    res.json({ success: true, data: heads });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/charge-heads', async (req, res) => {
  try {
    const { name, category, sacHsn, isPurchaseBookMandatory } = req.body;
    
    // Check dupe (case insensitive)
    const existing = await ChargeHeadModel.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existing) {
      return res.status(409).json({ success: false, message: "Charge head already exists" });
    }

    const newHead = new ChargeHeadModel({ name, category, sacHsn, isPurchaseBookMandatory, isSystem: false });
    await newHead.save();
    res.json({ success: true, data: newHead });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Seed API (optional helper to initialize system charges)
router.post('/charge-heads/seed', async (req, res) => {
  try {
    const defaultCharges = [
      { name: 'EDI CHARGES', category: 'Service Charge', isSystem: true },
      { name: 'ODEX INDIA SOLUTIONS PVT LTD', category: 'Reimbursement', isSystem: true },
      { name: 'HASTI PETRO CHEMICALS & SHIPPING LTD - IMPORT', category: 'Freight', isSystem: true },
      { name: 'CONTAINER CORPN OF INDIA LTD.', category: 'Freight', isSystem: true },
      { name: 'SR CONTAINER CARRIERS', category: 'Transport', isSystem: true },
      { name: 'BOND PAPER EXP.', category: 'Document', isSystem: true },
      { name: 'THAR LOGISTICS', category: 'Transport', isSystem: true },
      { name: 'CUSTOMS DUTY', category: 'Customs', isSystem: true },
      { name: 'LABOUR & MISC CHARGES', category: 'Miscellaneous', isSystem: true },
      { name: 'OTHER DOCUMENT', category: 'Document', isSystem: true },
    ];

    let addedCount = 0;
    for (const charge of defaultCharges) {
      const existing = await ChargeHeadModel.findOne({ name: charge.name });
      if (!existing) {
        await ChargeHeadModel.create(charge);
        addedCount++;
      }
    }
    
    res.json({ success: true, message: `Seeded ${addedCount} new system charges.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/charge-heads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, sacHsn, isActive, isPurchaseBookMandatory } = req.body;
    
    // Optional: check dupe name if name is provided
    if (name) {
      const existing = await ChargeHeadModel.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') }, _id: { $ne: id } });
      if (existing) {
        return res.status(409).json({ success: false, message: "Charge head with this name already exists" });
      }
    }

    const updated = await ChargeHeadModel.findByIdAndUpdate(
      id,
      { $set: { name, category, sacHsn, isActive, isPurchaseBookMandatory } },
      { new: true }
    );
    
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Charge head not found' });
    }
    
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/charge-heads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await ChargeHeadModel.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Charge head not found' });
    }
    res.json({ success: true, message: 'Charge head deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- CHARGES API (Embedded in JobModel) ---

router.get('/charges', async (req, res) => {
  try {
    const { parentId, parentModule } = req.query;
    if (!parentId || parentModule !== 'Job') {
      return res.status(400).json({ success: false, message: 'Valid Job parentId required' });
    }
    const job = await JobModel.findById(parentId).populate('charges.createdBy', 'first_name last_name');
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    // Auto-reconcile charges with rejected PB / PR entries
    let jobModified = false;
    if (Array.isArray(job.charges) && job.charges.length > 0) {
      const pbNos = [...new Set(job.charges.map(c => c.purchase_book_no).filter(Boolean))];
      const prNos = [...new Set(job.charges.map(c => c.payment_request_no).filter(Boolean))];
      const chargeIds = job.charges.map(c => String(c._id));

      let rejectedPbs = new Set();
      let rejectedPbChargeIds = new Set();

      if (pbNos.length > 0) {
        const pbRegexes = pbNos.map(no => {
          const clean = escapeRegex(no.replace(/\/\d{2}-\d{2}$/, ''));
          return new RegExp(`^${clean}`, 'i');
        });
        const pbs = await PurchaseBookEntryModel.find({
          $and: [
            {
              $or: [
                { entryNo: { $in: pbNos } },
                { entryNo: { $in: pbRegexes } },
                { chargeRef: { $in: chargeIds } },
                { chargeRefs: { $in: chargeIds } }
              ]
            },
            {
              $or: [{ status: { $regex: /^rejected$/i } }, { isRejected: true }]
            }
          ]
        }).select('entryNo chargeRef chargeRefs').lean();

        pbs.forEach(p => {
          if (p.entryNo) {
            rejectedPbs.add(p.entryNo.toLowerCase());
            rejectedPbs.add(p.entryNo.replace(/\/\d{2}-\d{2}$/, '').toLowerCase());
          }
          if (p.chargeRef) {
            String(p.chargeRef).split(',').forEach(id => rejectedPbChargeIds.add(id.trim()));
          }
          if (Array.isArray(p.chargeRefs)) {
            p.chargeRefs.forEach(id => rejectedPbChargeIds.add(String(id).trim()));
          }
        });
      }

      let rejectedPrs = new Set();
      let rejectedPrChargeIds = new Set();

      if (prNos.length > 0) {
        const prRegexes = prNos.map(no => {
          const clean = escapeRegex(no.replace(/\/\d{2}-\d{2}$/, ''));
          return new RegExp(`^${clean}`, 'i');
        });
        const prs = await PaymentRequestModel.find({
          $and: [
            {
              $or: [
                { requestNo: { $in: prNos } },
                { requestNo: { $in: prRegexes } },
                { chargeRef: { $in: chargeIds } },
                { chargeRefs: { $in: chargeIds } }
              ]
            },
            {
              $or: [{ status: { $regex: /^rejected$/i } }, { isRejected: true }]
            }
          ]
        }).select('requestNo chargeRef chargeRefs').lean();

        prs.forEach(p => {
          if (p.requestNo) {
            rejectedPrs.add(p.requestNo.toLowerCase());
            rejectedPrs.add(p.requestNo.replace(/\/\d{2}-\d{2}$/, '').toLowerCase());
          }
          if (p.chargeRef) {
            String(p.chargeRef).split(',').forEach(id => rejectedPrChargeIds.add(id.trim()));
          }
          if (Array.isArray(p.chargeRefs)) {
            p.chargeRefs.forEach(id => rejectedPrChargeIds.add(String(id).trim()));
          }
        });
      }

      job.charges.forEach(charge => {
        const cPb = (charge.purchase_book_no || '').trim().toLowerCase();
        const cleanCPb = cPb.replace(/\/\d{2}-\d{2}$/, '');
        const isChargePbRejected = String(charge.purchase_book_status || '').toLowerCase() === 'rejected';

        if (cPb && (isChargePbRejected || rejectedPbs.has(cPb) || rejectedPbs.has(cleanCPb) || rejectedPbChargeIds.has(String(charge._id)))) {
          charge.purchase_book_no = null;
          charge.purchase_book_status = null;
          charge.purchase_book_is_approved = false;
          jobModified = true;
        }

        const cPr = (charge.payment_request_no || '').trim().toLowerCase();
        const cleanCPr = cPr.replace(/\/\d{2}-\d{2}$/, '');
        const isChargePrRejected = String(charge.payment_request_status || '').toLowerCase() === 'rejected';

        if (cPr && (isChargePrRejected || rejectedPrs.has(cPr) || rejectedPrs.has(cleanCPr) || rejectedPrChargeIds.has(String(charge._id)))) {
          charge.payment_request_no = null;
          charge.payment_request_status = null;
          charge.payment_request_is_approved = false;
          jobModified = true;
        }
      });

      if (jobModified) {
        job.markModified('charges');
        await job.save();
      }
    }
    
    res.json({ success: true, data: job.charges || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/charges', verifyToken, async (req, res) => {
  try {
    const { parentId, parentModule } = req.body;
    if (!parentId || parentModule !== 'Job') return res.status(400).json({ success: false, message: 'Valid Job parentId required' });
    
    const job = await JobModel.findById(parentId);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    const chargeData = { ...req.body, createdBy: req.user?._id };
    job.charges.push(chargeData);
    await job.save();
    
    const newCharge = job.charges[job.charges.length - 1];
    res.json({ success: true, data: newCharge });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Add multiple charges at once
router.post('/charges/bulk', verifyToken, async (req, res) => {
  try {
    const { charges } = req.body;
    if (!Array.isArray(charges) || charges.length === 0) {
      return res.status(400).json({ success: false, message: "Expected 'charges' array." });
    }
    
    const parentId = charges[0].parentId;
    const job = await JobModel.findById(parentId);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    charges.forEach(chargeData => {
      job.charges.push({ ...chargeData, createdBy: req.user?._id });
    });
    await job.save();
    
    const savedCharges = job.charges.slice(-charges.length);
    res.json({ success: true, data: savedCharges });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/charges/:id', verifyToken, async (req, res) => {
  try {
    const job = await JobModel.findOne({ 'charges._id': req.params.id });
    if (!job) return res.status(404).json({ success: false, message: 'Charge not found' });
    
    const charge = job.charges.id(req.params.id);
    const originalCharge = charge.toObject();

    const role = (req.user.role || "").toLowerCase();
    const isAuthorized = role === 'admin' || role === 'head_of_department' || role === 'hod';

    // If locked and not authorized, we only allow updates to NON-COST fields
    // A charge is locked if it has an ACTIVE (non-rejected) PB or PR number.
    let isPrRejected = String(charge.payment_request_status || '').toLowerCase() === 'rejected' ||
                       String(req.body.payment_request_status || '').toLowerCase() === 'rejected';
    let isPbRejected = String(charge.purchase_book_status || '').toLowerCase() === 'rejected' ||
                       String(req.body.purchase_book_status || '').toLowerCase() === 'rejected';

    // Verify against DB in case charge document was not synced
    if (!isPbRejected && charge.purchase_book_no) {
      const cleanPb = charge.purchase_book_no.replace(/\/\d{2}-\d{2}$/, '');
      const pbEntry = await PurchaseBookEntryModel.findOne({
        $and: [
          {
            $or: [
              { entryNo: charge.purchase_book_no },
              { entryNo: { $regex: new RegExp(`^${escapeRegex(cleanPb)}`, 'i') } },
              { chargeRef: { $regex: new RegExp(escapeRegex(String(charge._id)), 'i') } },
              { chargeRefs: String(charge._id) }
            ]
          },
          { $or: [{ status: { $regex: /^rejected$/i } }, { isRejected: true }] }
        ]
      }).select('_id').lean();

      if (pbEntry) {
        isPbRejected = true;
        charge.purchase_book_no = null;
        charge.purchase_book_status = null;
        charge.purchase_book_is_approved = false;
      }
    }

    if (!isPrRejected && charge.payment_request_no) {
      const cleanPr = charge.payment_request_no.replace(/\/\d{2}-\d{2}$/, '');
      const prEntry = await PaymentRequestModel.findOne({
        $and: [
          {
            $or: [
              { requestNo: charge.payment_request_no },
              { requestNo: { $regex: new RegExp(`^${escapeRegex(cleanPr)}`, 'i') } },
              { chargeRef: { $regex: new RegExp(escapeRegex(String(charge._id)), 'i') } },
              { chargeRefs: String(charge._id) }
            ]
          },
          { $or: [{ status: { $regex: /^rejected$/i } }, { isRejected: true }] }
        ]
      }).select('_id').lean();

      if (prEntry) {
        isPrRejected = true;
        charge.payment_request_no = null;
        charge.payment_request_status = null;
        charge.payment_request_is_approved = false;
      }
    }

    const hasActivePR = Boolean(charge.payment_request_no && !isPrRejected);
    const hasActivePB = Boolean(charge.purchase_book_no && !isPbRejected);
    const isLocked = (hasActivePR || hasActivePB) && !isAuthorized;
    
    // Assign fields
    if (req.body.revenue) {
      if (isLocked) {
        // Only allow updating attachments when locked
        const currentRevenue = charge.revenue ? charge.revenue.toObject() : {};
        const updatedRevenue = { ...currentRevenue };
        if (req.body.revenue.url !== undefined) updatedRevenue.url = req.body.revenue.url;
        if (req.body.revenue.url_draft !== undefined) updatedRevenue.url_draft = req.body.revenue.url_draft;
        if (req.body.revenue.url_final !== undefined) updatedRevenue.url_final = req.body.revenue.url_final;
        charge.revenue = updatedRevenue;
      } else {
        charge.revenue = { ...(charge.revenue ? charge.revenue.toObject() : {}), ...req.body.revenue };
      }
    }
    
    if (req.body.cost) {
      if (isLocked) {
        // Allow updating attachments and virtualBalanceTerminal when locked
        const currentCost = charge.cost ? charge.cost.toObject() : {};
        const updatedCost = { ...currentCost };
        if (req.body.cost.url !== undefined) updatedCost.url = req.body.cost.url;
        if (req.body.cost.url_draft !== undefined) updatedCost.url_draft = req.body.cost.url_draft;
        if (req.body.cost.url_final !== undefined) updatedCost.url_final = req.body.cost.url_final;
        if (req.body.cost.virtualBalanceTerminal !== undefined) updatedCost.virtualBalanceTerminal = req.body.cost.virtualBalanceTerminal;
        if (req.body.cost.virtualBalanceType !== undefined) updatedCost.virtualBalanceType = req.body.cost.virtualBalanceType;
        if (req.body.cost.expenseMadeBy !== undefined) updatedCost.expenseMadeBy = req.body.cost.expenseMadeBy;
        charge.cost = updatedCost;
      } else {
        charge.cost = { ...(charge.cost ? charge.cost.toObject() : {}), ...req.body.cost };
      }
    }
    
    // Other top level fields
    if (!isLocked) {
      const excludedFields = ['revenue', 'cost', '_id', 'createdAt', 'updatedAt', 'parentId', 'parentModule', 'payment_request_no', 'purchase_book_no'];
      for (const key of Object.keys(req.body)) {
        if (!excludedFields.includes(key)) {
          charge[key] = req.body[key];
        }
      }
    } else {
      if (req.body.bill_no !== undefined) charge.bill_no = req.body.bill_no;
      if (req.body.billNo !== undefined) charge.billNo = req.body.billNo;
    }
    job.markModified('charges');
    await job.save();

    // Log targeted audit trail for the charge
    const updatedCharge = charge.toObject();
    const changes = findChanges(originalCharge, updatedCharge, "charge");
    if (changes.length > 0) {
      await logAuditTrail({
        documentId: charge._id,
        documentType: "Charge",
        job_no: job.job_no,
        year: job.year,
        branchId: job.branchId || job.branch_id,
        branch_code: job.branch_code,
        userId: req.user.username,
        username: req.user.username,
        userRole: req.user.role,
        action: "UPDATE",
        heading: `Charge '${charge.chargeHead}' Updated`,
        changes,
        endpoint: req.originalUrl,
        method: "PUT"
      });
    }

    res.json({ success: true, data: charge });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/charges/:id', verifyToken, async (req, res) => {
  try {
    const job = await JobModel.findOne({ 'charges._id': req.params.id });
    if (!job) return res.status(404).json({ success: false, message: 'Charge not found' });
    
    const charge = job.charges.id(req.params.id);

    // Check if locked (exclude rejected)
    const isPrRejected = String(charge.payment_request_status || '').toLowerCase() === 'rejected';
    const isPbRejected = String(charge.purchase_book_status || '').toLowerCase() === 'rejected';
    const hasActivePR = Boolean(charge.payment_request_no && !isPrRejected);
    const hasActivePB = Boolean(charge.purchase_book_no && !isPbRejected);
    const isLocked = hasActivePR || hasActivePB;
    const role = (req.user?.role || "").toLowerCase();
    const isAuthorized = role === 'admin' || role === 'head_of_department' || role === 'hod';

    if (isLocked && !isAuthorized) {
      return res.status(403).json({ 
        success: false, 
        message: 'This charge is locked because a Payment Request or Purchase Book number has been generated. Only Admins or HODs can delete it.' 
      });
    }

    job.charges.pull(req.params.id);
    await job.save();
    
    res.json({ success: true, message: 'Deleted' });
  } catch (error) {
     res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/charges/audit-trail/:id', verifyToken, async (req, res) => {
  try {
    const role = (req.user.role || "").toLowerCase();
    if (role !== 'admin' && role !== 'hod' && role !== 'head_of_department') {
      return res.status(403).json({ success: false, message: 'Admins or HODs only' });
    }
    const logs = await AuditTrailModel.find({ documentId: req.params.id, documentType: "Charge" }).sort({ timestamp: -1 });
    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/reject-purchase-entry', async (req, res) => {
  try {
    const { requestNo: rawRequestNo, reason } = req.body;
    const requestNo = rawRequestNo?.trim();
    if (!requestNo) return res.status(400).json({ success: false, message: 'Request No is required' });

    const cleanReq = requestNo.replace(/\/\d{2}-\d{2}$/, '');
    const pbEntry = await PurchaseBookEntryModel.findOneAndUpdate(
      {
        $or: [
          { entryNo: { $regex: new RegExp(`^${escapeRegex(requestNo)}$`, 'i') } },
          { entryNo: { $regex: new RegExp(`^${escapeRegex(cleanReq)}`, 'i') } }
        ]
      },
      {
        $set: {
          isRejected: true,
          status: 'Rejected',
          rejectionReason: reason || 'Rejected',
          rejectedAt: new Date()
        }
      },
      { new: true }
    );

    const rawRefs = [
      ...(pbEntry?.chargeRef ? String(pbEntry.chargeRef).split(',') : []),
      ...((pbEntry?.chargeRefs || []).map(String))
    ].map(s => s.trim()).filter(Boolean);
    const targetChargeIds = new Set(rawRefs);

    const jobs = await JobModel.find({
      $or: [
        { "charges.purchase_book_no": { $regex: new RegExp(`^${escapeRegex(requestNo)}$`, 'i') } },
        { "charges.purchase_book_no": { $regex: new RegExp(`^${escapeRegex(cleanReq)}`, 'i') } },
        ...(pbEntry?.jobRef ? [{ _id: pbEntry.jobRef }] : []),
        ...(pbEntry?.jobNo ? [{ job_number: pbEntry.jobNo }, { job_no: pbEntry.jobNo }] : []),
        ...(targetChargeIds.size > 0 ? [{ "charges._id": { $in: Array.from(targetChargeIds) } }] : [])
      ]
    });

    for (const job of jobs) {
      let modified = false;
      job.charges.forEach(charge => {
        const chargePb = (charge.purchase_book_no || '').trim().toLowerCase();
        const cleanChargePb = chargePb.replace(/\/\d{2}-\d{2}$/, '');
        const matchPb = chargePb && (chargePb === requestNo.toLowerCase() || cleanChargePb === cleanReq.toLowerCase());
        const matchRef = targetChargeIds.has(String(charge._id));
        if (matchPb || matchRef) {
          charge.purchase_book_no = null;
          charge.purchase_book_status = null;
          charge.purchase_book_is_approved = false;
          charge.purchase_book_requested_by = "";
          charge.remark = (charge.remark ? charge.remark + " | " : "") + `Rejected PB: ${reason || 'No reason'}`;
          modified = true;
        }
      });
      if (modified) {
        job.markModified('charges');
        await job.save();
      }
    }

    res.json({ success: true, message: 'PB Rejected successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/reject-payment-request', async (req, res) => {
  try {
    const { requestNo: rawRequestNo, reason } = req.body;
    const requestNo = rawRequestNo?.trim();
    if (!requestNo) return res.status(400).json({ success: false, message: 'Request No is required' });

    const cleanReq = requestNo.replace(/\/\d{2}-\d{2}$/, '');
    const prEntry = await PaymentRequestModel.findOneAndUpdate(
      {
        $or: [
          { requestNo: { $regex: new RegExp(`^${escapeRegex(requestNo)}$`, 'i') } },
          { requestNo: { $regex: new RegExp(`^${escapeRegex(cleanReq)}`, 'i') } }
        ]
      },
      {
        $set: {
          isRejected: true,
          status: 'Rejected',
          rejectionReason: reason || 'Rejected',
          rejectedAt: new Date()
        }
      },
      { new: true }
    );

    const rawRefs = [
      ...(prEntry?.chargeRef ? String(prEntry.chargeRef).split(',') : []),
      ...((prEntry?.chargeRefs || []).map(String))
    ].map(s => s.trim()).filter(Boolean);
    const targetChargeIds = new Set(rawRefs);

    const jobs = await JobModel.find({
      $or: [
        { "charges.payment_request_no": { $regex: new RegExp(`^${escapeRegex(requestNo)}$`, 'i') } },
        { "charges.payment_request_no": { $regex: new RegExp(`^${escapeRegex(cleanReq)}`, 'i') } },
        ...(prEntry?.jobRef ? [{ _id: prEntry.jobRef }] : []),
        ...(prEntry?.jobNo ? [{ job_number: prEntry.jobNo }, { job_no: prEntry.jobNo }] : []),
        ...(targetChargeIds.size > 0 ? [{ "charges._id": { $in: Array.from(targetChargeIds) } }] : [])
      ]
    });

    for (const job of jobs) {
      let modified = false;
      job.charges.forEach(charge => {
        const chargePr = (charge.payment_request_no || '').trim().toLowerCase();
        const cleanChargePr = chargePr.replace(/\/\d{2}-\d{2}$/, '');
        const matchPr = chargePr && (chargePr === requestNo.toLowerCase() || cleanChargePr === cleanReq.toLowerCase());
        const matchRef = targetChargeIds.has(String(charge._id));
        if (matchPr || matchRef) {
          charge.payment_request_no = null;
          charge.payment_request_status = null;
          charge.payment_request_is_approved = false;
          charge.payment_request_requested_by = "";
          charge.remark = (charge.remark ? charge.remark + " | " : "") + `Rejected PR: ${reason || 'No reason'}`;
          modified = true;
        }
      });
      if (modified) {
        job.markModified('charges');
        await job.save();
      }
    }

    res.json({ success: true, message: 'PR Rejected successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
