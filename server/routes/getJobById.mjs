import express from "express";
import JobModel from "../model/jobModel.mjs";
import PurchaseBookEntryModel from "../model/purchaseBookEntryModel.mjs";
import PaymentRequestModel from "../model/paymentRequestModel.mjs";

const escapeRegex = (str) => (str ? String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : "");

const router = express.Router();

router.get("/api/get-job-by-id/:_id", async (req, res) => {
  try {
    const { _id } = req.params;
    const job = await JobModel.findOne({ _id });

    if (!job) {
      return res.status(404).send({ error: "Job not found" });
    }

    // Auto-reconcile charges with rejected PB / PR entries
    let jobModified = false;
    if (Array.isArray(job.charges) && job.charges.length > 0) {
      const pbNos = [...new Set(job.charges.map(c => c.purchase_book_no).filter(Boolean))];
      const prNos = [...new Set(job.charges.map(c => c.payment_request_no).filter(Boolean))];
      const chargeIds = job.charges.map(c => String(c._id));

      let rejectedPbs = new Set();
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
                { entryNo: { $in: pbRegexes } }
              ]
            },
            {
              $or: [{ status: { $regex: /^rejected$/i } }, { isRejected: true }]
            }
          ]
        }).select('entryNo').lean();

        pbs.forEach(p => {
          if (p.entryNo) {
            rejectedPbs.add(p.entryNo.toLowerCase());
            rejectedPbs.add(p.entryNo.replace(/\/\d{2}-\d{2}$/, '').toLowerCase());
          }
        });
      }

      let rejectedPrs = new Set();
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
                { requestNo: { $in: prRegexes } }
              ]
            },
            {
              $or: [{ status: { $regex: /^rejected$/i } }, { isRejected: true }]
            }
          ]
        }).select('requestNo').lean();

        prs.forEach(p => {
          if (p.requestNo) {
            rejectedPrs.add(p.requestNo.toLowerCase());
            rejectedPrs.add(p.requestNo.replace(/\/\d{2}-\d{2}$/, '').toLowerCase());
          }
        });
      }

      // Look up any ACTIVE (non-rejected) PB and PR entries for charges in this job to restore missing linkages
      const activePbs = await PurchaseBookEntryModel.find({
        $and: [
          {
            $or: [
              { chargeRef: { $in: chargeIds } },
              { chargeRefs: { $in: chargeIds } }
            ]
          },
          { status: { $not: /^rejected$/i } },
          { isRejected: { $ne: true } }
        ]
      }).sort({ createdAt: -1 }).lean();

      const activePrs = await PaymentRequestModel.find({
        $and: [
          {
            $or: [
              { chargeRef: { $in: chargeIds } },
              { chargeRefs: { $in: chargeIds } }
            ]
          },
          { status: { $not: /^rejected$/i } },
          { isRejected: { $ne: true } }
        ]
      }).sort({ createdAt: -1 }).lean();

      job.charges.forEach(charge => {
        const cPb = (charge.purchase_book_no || '').trim().toLowerCase();
        const cleanCPb = cPb.replace(/\/\d{2}-\d{2}$/, '');
        const isChargePbRejected = String(charge.purchase_book_status || '').toLowerCase() === 'rejected';

        // 1. If currently assigned PB is rejected, clear it
        if (cPb && (isChargePbRejected || rejectedPbs.has(cPb) || rejectedPbs.has(cleanCPb))) {
          charge.purchase_book_no = null;
          charge.purchase_book_status = null;
          charge.purchase_book_is_approved = false;
          jobModified = true;
        }

        // 2. If charge does NOT have a valid PB, but an active non-rejected PB exists in DB for this charge, restore it!
        if (!charge.purchase_book_no) {
          const matchPb = activePbs.find(p => {
            const rawRefs = [
              ...(p.chargeRef ? String(p.chargeRef).split(',') : []),
              ...((p.chargeRefs || []).map(String))
            ].map(s => s.trim());
            return rawRefs.includes(String(charge._id));
          });
          if (matchPb && matchPb.entryNo) {
            charge.purchase_book_no = matchPb.entryNo;
            charge.purchase_book_status = matchPb.status || 'Active';
            charge.purchase_book_is_approved = Boolean(matchPb.isApproved || matchPb.status === 'Approved' || matchPb.status === 'Paid');
            if (matchPb.requestedBy) charge.purchase_book_requested_by = matchPb.requestedBy;
            jobModified = true;
          }
        }

        const cPr = (charge.payment_request_no || '').trim().toLowerCase();
        const cleanCPr = cPr.replace(/\/\d{2}-\d{2}$/, '');
        const isChargePrRejected = String(charge.payment_request_status || '').toLowerCase() === 'rejected';

        // 3. If currently assigned PR is rejected, clear it
        if (cPr && (isChargePrRejected || rejectedPrs.has(cPr) || rejectedPrs.has(cleanCPr))) {
          charge.payment_request_no = null;
          charge.payment_request_status = null;
          charge.payment_request_is_approved = false;
          jobModified = true;
        }

        // 4. If charge does NOT have a valid PR, but an active non-rejected PR exists in DB for this charge, restore it!
        if (!charge.payment_request_no) {
          const matchPr = activePrs.find(p => {
            const rawRefs = [
              ...(p.chargeRef ? String(p.chargeRef).split(',') : []),
              ...((p.chargeRefs || []).map(String))
            ].map(s => s.trim());
            return rawRefs.includes(String(charge._id));
          });
          if (matchPr && matchPr.requestNo) {
            charge.payment_request_no = matchPr.requestNo;
            charge.payment_request_status = matchPr.status || 'Active';
            charge.payment_request_is_approved = Boolean(matchPr.isApproved || matchPr.status === 'Approved' || matchPr.status === 'Paid');
            if (matchPr.requestedBy) charge.payment_request_requested_by = matchPr.requestedBy;
            jobModified = true;
          }
        }
      });

      if (jobModified) {
        job.markModified('charges');
        await job.save();
      }
    }

    res.status(200).send({
      job: job.toObject(),
      container_nos: job.container_nos || [], // Ensuring container_nos is returned
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({ error: "Internal Server Error" });
  }
});

export default router;
