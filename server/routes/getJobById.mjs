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
