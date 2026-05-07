import express from 'express';
import JobModel from '../../model/jobModel.mjs';
import ChargeHeadModel from '../../model/ChargeHead.mjs';
import verifyToken from '../../middleware/authMiddleware.mjs';
import { findChanges, logAuditTrail } from '../../services/auditTrailService.mjs';
import AuditTrailModel from '../../model/auditTrailModel.mjs';
import crypto from 'crypto';

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

router.get('/jobs/search-by-number', verifyToken, async (req, res) => {
  try {
    const { search, year, branch_code } = req.query;
    if (!search) return res.json({ success: true, data: [] });

    const query = {
      $or: [
        { job_number: { $regex: search, $options: 'i' } },
        { job_no: { $regex: search, $options: 'i' } }
      ]
    };

    if (year) query.year = year;
    if (branch_code) query.branch_code = branch_code;

    const jobs = await JobModel.find(query)
    .select('job_number job_no importer year branch_code')
    .limit(10)
    .lean();

    res.json({ success: true, data: jobs });
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
    // A charge is locked if it has a PB or PR number that is NOT rejected.
    const hasActivePR = charge.payment_request_no && charge.payment_request_status !== 'Rejected';
    const hasActivePB = charge.purchase_book_no && charge.purchase_book_status !== 'Rejected';
    const isLocked = (hasActivePR || hasActivePB) && !isAuthorized;
    
    // Assign fields
    if (req.body.revenue) {
        charge.revenue = { ...(charge.revenue ? charge.revenue.toObject() : {}), ...req.body.revenue };
    }
    
    if (req.body.cost) {
        if (isLocked) {
            // Allow updating attachments even if locked
            if (req.body.cost.url) {
                const currentCost = charge.cost ? charge.cost.toObject() : {};
                charge.cost = { ...currentCost, url: req.body.cost.url };
            }
        } else {
            charge.cost = { ...(charge.cost ? charge.cost.toObject() : {}), ...req.body.cost };
        }
    }
    
    // Other top level fields
    const excludedFields = ['revenue', 'cost', '_id', 'createdAt', 'updatedAt', 'parentId', 'parentModule'];
    for (const key of Object.keys(req.body)) {
      if (!excludedFields.includes(key)) {
        if (isLocked && (key === 'payment_request_no' || key === 'purchase_book_no' || key === 'payment_request_status' || key === 'purchase_book_status')) {
            // Skip
        } else {
            charge[key] = req.body[key];
        }
      }
    }
    await job.save();

    // --- SHARED CHARGE SYNC LOGIC ---
    if (charge.sharedWith && charge.sharedWith.length > 0) {
      if (!charge.sharedGroupId) {
        charge.sharedGroupId = crypto.randomUUID();
        await job.save();
      }

      const syncData = charge.toObject();
      const sharedWithList = Array.isArray(charge.sharedWith) ? charge.sharedWith : [];
      
      const normalizedSharedWith = sharedWithList.map(item => 
        typeof item === 'string' ? { jobNo: item, amount: null } : item
      );

      for (const sharedItem of normalizedSharedWith) {
        const otherJobNo = sharedItem.jobNo;
        if (!otherJobNo || otherJobNo === job.job_number) continue;

        const otherJob = await JobModel.findOne({ job_number: otherJobNo });
        if (!otherJob) continue;

        let otherCharge = otherJob.charges.find(c => c.sharedGroupId === charge.sharedGroupId);
        
        const specificAmount = sharedItem.amount != null ? parseFloat(sharedItem.amount) : null;
        let costOverrides = {};
        
        if (specificAmount !== null && !isNaN(specificAmount) && syncData.cost) {
            const amount = specificAmount;
            const gstRate = parseFloat(syncData.cost.gstRate) || 18;
            const includeGst = syncData.cost.isGst !== false;
            let derivedBasic, derivedGst;

            if (syncData.category === 'Margin') {
                if (includeGst) {
                    derivedBasic = amount;
                    derivedGst = derivedBasic * (gstRate / 100);
                    costOverrides.amount = derivedBasic + derivedGst;
                } else {
                    derivedBasic = amount;
                    derivedGst = 0;
                    costOverrides.amount = amount;
                }
            } else if (syncData.category === 'Reimbursement') {
                derivedBasic = Number((amount / (1 + (gstRate / 100))).toFixed(2));
                derivedGst = 0;
                costOverrides.amount = amount;
            } else {
                derivedBasic = Number((amount / (1 + (gstRate / 100))).toFixed(2));
                derivedGst = amount - derivedBasic;
                costOverrides.amount = amount;
            }

            costOverrides.amountINR = costOverrides.amount * (syncData.cost.exchangeRate || 1);
            costOverrides.rate = costOverrides.amount;
            costOverrides.qty = 1;
            costOverrides.basicAmount = derivedBasic;
            costOverrides.gstAmount = derivedGst;
            
            if (syncData.cost.gstAmount > 0) {
                const ratio = derivedGst / syncData.cost.gstAmount;
                costOverrides.cgst = (syncData.cost.cgst || 0) * ratio;
                costOverrides.sgst = (syncData.cost.sgst || 0) * ratio;
                costOverrides.igst = (syncData.cost.igst || 0) * ratio;
            } else {
                costOverrides.cgst = 0;
                costOverrides.sgst = 0;
                costOverrides.igst = 0;
            }

            const isTds = syncData.cost.isTds || false;
            const tdsPercent = parseFloat(syncData.cost.tdsPercent) || 0;
            let tdsAmount = 0;
            if (isTds) {
                tdsAmount = derivedBasic * (tdsPercent / 100);
            }
            costOverrides.tdsAmount = tdsAmount;
            
            if (syncData.category === 'Reimbursement' || includeGst) {
                costOverrides.netPayable = Math.round(costOverrides.amount - tdsAmount);
            } else {
                costOverrides.netPayable = Math.round(derivedBasic - tdsAmount);
            }
        }

        const filteredSharedList = sharedWithList.filter(item => {
            const jno = typeof item === 'string' ? item : item.jobNo;
            return jno !== otherJobNo;
        });

        const mainJobAmount = syncData.cost ? syncData.cost.amount : (syncData.revenue ? syncData.revenue.amount : null);
        const otherChargeSharedWith = [
            { jobNo: job.job_number, amount: mainJobAmount },
            ...filteredSharedList
        ];

        if (!otherCharge) {
          // Create new charge in other job
          const newChargeData = {
            ...syncData,
            _id: undefined,
            createdAt: undefined,
            updatedAt: undefined,
            purchase_book_no: charge.purchase_book_no,
            purchase_book_status: charge.purchase_book_status,
            payment_request_no: charge.payment_request_no,
            payment_request_status: charge.payment_request_status,
            sharedWith: otherChargeSharedWith
          };
          if (specificAmount !== null && !isNaN(specificAmount) && newChargeData.cost) {
              newChargeData.cost = { ...newChargeData.cost, ...costOverrides };
          }
          otherJob.charges.push(newChargeData);
        } else {
          // Update existing charge
          const excludedSyncFields = ['_id', 'createdAt', 'updatedAt', 'sharedWith', 'revenue'];
          const costExcludes = (specificAmount !== null && !isNaN(specificAmount)) 
              ? [] // Overwrite all amounts if explicitly specified
              : ['amount', 'amountINR', 'basicAmount', 'gstAmount', 'tdsAmount', 'netPayable', 'cgst', 'sgst', 'igst'];

          for (const key of Object.keys(syncData)) {
            if (excludedSyncFields.includes(key)) continue;

            if (key === 'cost' && syncData.cost) {
              if (!otherCharge.cost) otherCharge.cost = {};
              for (const costKey of Object.keys(syncData.cost)) {
                if (!costExcludes.includes(costKey)) {
                  otherCharge.cost[costKey] = syncData.cost[costKey];
                }
              }
              if (specificAmount !== null && !isNaN(specificAmount)) {
                  for (const costKey of Object.keys(costOverrides)) {
                      otherCharge.cost[costKey] = costOverrides[costKey];
                  }
              }
            } else {
              otherCharge[key] = syncData[key];
            }
          }
          otherCharge.sharedWith = otherChargeSharedWith;
        }
        await otherJob.save();
      }
    }
    // --------------------------------

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
    const hasActivePR = charge.payment_request_no && charge.payment_request_status !== 'Rejected';
    const hasActivePB = charge.purchase_book_no && charge.purchase_book_status !== 'Rejected';
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

router.post('/by-shared-groups', verifyToken, async (req, res) => {
  try {
    const { groupIds } = req.body;
    if (!groupIds || !Array.isArray(groupIds)) {
      return res.status(400).json({ success: false, message: 'groupIds array required' });
    }
    const jobs = await JobModel.find({ "charges.sharedGroupId": { $in: groupIds } });
    const matchingCharges = [];
    for (const job of jobs) {
      for (const charge of job.charges) {
        if (groupIds.includes(charge.sharedGroupId)) {
          matchingCharges.push({ 
            ...charge.toObject(), 
            jobId: job._id, 
            jobDisplayNumber: job.job_number, 
            cthNo: job.cth_no 
          });
        }
      }
    }
    res.json({ success: true, data: matchingCharges });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
