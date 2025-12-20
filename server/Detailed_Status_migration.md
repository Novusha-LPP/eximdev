// Run with mongosh connected to your DB:
// mongosh "mongodb+srv://user:pass@cluster/yourDb" --file d:\eximdev\migrations\2025-11-24-update-detailed-status-year-25-26.mongo.js

(function () {
  const isValidDate = function (date) {
    if (date === undefined || date === null) return false;
    const d = new Date(date);
    return !isNaN(d.getTime());
  };

  function determineDetailedStatus(job) {
    const be_no = job.be_no;
    const container_nos = Array.isArray(job.container_nos) ? job.container_nos : [];
    const out_of_charge = job.out_of_charge;
    const pcv_date = job.pcv_date;
    const discharge_date = job.discharge_date;
    const gateway_igm_date = job.gateway_igm_date;
    const vessel_berthing = job.vessel_berthing;
    const type_of_b_e = job.type_of_b_e;
    const consignment_type = job.consignment_type;

    const anyArrival = container_nos.length > 0
      ? container_nos.some(function (c) { return c && isValidDate(c.arrival_date); })
      : false;

    const anyRailOut = container_nos.length > 0
      ? container_nos.some(function (c) { return c && isValidDate(c.container_rail_out_date); })
      : false;

    const hasContainers = container_nos.length > 0;

    const allDelivered = hasContainers
      ? container_nos.every(function (c) { return c && isValidDate(c.delivery_date); })
      : false;

    const allEmptyOffloaded = hasContainers
      ? container_nos.every(function (c) { return c && isValidDate(c.emptyContainerOffLoadDate); })
      : false;

    const validOOC = isValidDate(out_of_charge);
    const validPCV = isValidDate(pcv_date);
    const validDischarge = isValidDate(discharge_date);
    const validIGM = isValidDate(gateway_igm_date);
    const validETA = isValidDate(vessel_berthing);

    const norm = function (s) { return String(s || "").trim().toLowerCase(); };
    const isExBond = norm(type_of_b_e) === "ex-bond";
    const isLCL = norm(consignment_type) === "lcl";

    // Ex-Bond rules
    if (isExBond) {
      if (be_no && validOOC && allDelivered) return "Billing Pending";
      if (be_no && validOOC) return "Custom Clearance Completed";
      if (be_no && validPCV) return "PCV Done, Duty Payment Pending";
      return "ETA Date Pending";
    }

    // Non Ex-Bond
    const billingComplete = isLCL ? allDelivered : allEmptyOffloaded;

    if (be_no && anyArrival && validOOC && billingComplete) return "Billing Pending";
    if (be_no && anyArrival && validOOC) return "Custom Clearance Completed";
    if (be_no && anyArrival && validPCV) return "PCV Done, Duty Payment Pending";
    if (be_no && anyArrival) return "BE Noted, Clearance Pending";
    if (!be_no && anyArrival) return "Arrived, BE Note Pending";
    if (be_no && !anyArrival) return "BE Noted, Arrival Pending";
    if (anyRailOut) return "Rail Out";
    if (validDischarge) return "Discharged";
    if (validIGM) return "Gateway IGM Filed";
    if (validETA) return "Estimated Time of Arrival";
    return "ETA Date Pending";
  }

  const batchSize = 500;
  let ops = [];
  let checked = 0;
  let updated = 0;

  // Filter by year: "25-26"
  const query = { year: "25-26" };

  // Project only the fields needed to compute status
  const cursor = db.jobs.find(
    query,
    {
      be_no: 1,
      container_nos: 1,
      out_of_charge: 1,
      pcv_date: 1,
      discharge_date: 1,
      gateway_igm_date: 1,
      vessel_berthing: 1,
      type_of_b_e: 1,
      consignment_type: 1,
      detailed_status: 1,
      year: 1,
    }
  );

  while (cursor.hasNext()) {
    const doc = cursor.next();
    checked++;
    const newStatus = determineDetailedStatus(doc);
    const oldStatus = doc.hasOwnProperty("detailed_status") ? doc.detailed_status : null;

    if (newStatus !== oldStatus) {
      ops.push({
        updateOne: {
          filter: { _id: doc._id },
          update: { $set: { detailed_status: newStatus } },
        },
      });
      updated++;
    }

    if (ops.length >= batchSize) {
      const res = db.jobs.bulkWrite(ops);
      print(`Bulk write (batch): matched ${res.matchedCount || res.nMatched || "-"} modified ${res.modifiedCount || res.nModified || "-"} — total updated so far: ${updated}`);
      ops = [];
    }
  }

  if (ops.length > 0) {
    const res = db.jobs.bulkWrite(ops);
    print(`Final bulk write: matched ${res.matchedCount || res.nMatched || "-"} modified ${res.modifiedCount || res.nModified || "-"}`);
  }

  print(`Migration complete. Year: 25-26 | Checked: ${checked} | Updated: ${updated}`);
})();