import mongoose from "mongoose";

const uri = process.env.DEV_MONGODB_URI || "mongodb://127.0.0.1:27017/eximdev";

async function run() {
  await mongoose.connect(uri);
  console.log("Connected to DB");
  const collection = mongoose.connection.collection("tyreprocurementsops");

  const docs = await collection.find({}).toArray();
  console.log(`Found ${docs.length} documents`);

  for (const doc of docs) {
    const s6 = doc.stage6 || {};
    const s5 = doc.stage5 || {};
    const s4 = doc.stage4 || {};
    const s3 = doc.stage3 || {};
    const s2 = doc.stage2 || {};
    const s1 = doc.stage1 || {};

    let newStatus = doc.status || "Draft";
    const s6Approvals = s6.approvals || [];

    if (doc.status === "Closed" || s6Approvals.some((a) => a && a.date)) {
      newStatus = "GRN Done";
    } else if (s5.orderPlacedDate || s5.dispatchDetails?.dispatchDate) {
      newStatus = "Order Placed";
    } else if (
      s4.paymentDetails?.paymentReferenceUtr?.trim() ||
      s4.paymentDetails?.paymentDate ||
      s4.utrSharing?.utrSharedWithPoOn ||
      doc.status === "Payment Done"
    ) {
      newStatus = "Payment Done";
    } else if (s3.decision?.decision === "APPROVED" || s3.signOff?.dateOfApproval) {
      newStatus = "Finance Approved";
    } else if (s2.routingChecklist?.[0]?.status === "Done" || s2.routingChecklist?.[0]?.date) {
      newStatus = "Quotation Received";
    } else if (s1.routingChecklist?.[1]?.status === "Done" || s1.routingChecklist?.[1]?.date || s1.hodValidation?.dateTimeOfApproval) {
      newStatus = "Preparing for Quotation";
    } else if (s1.routingChecklist?.[0]?.status === "Done" || s1.routingChecklist?.[0]?.date) {
      newStatus = "PR Raised";
    }

    if (newStatus !== doc.status) {
      console.log(`Updating ${doc.prNumber}: ${doc.status} -> ${newStatus}`);
      await collection.updateOne({ _id: doc._id }, { $set: { status: newStatus } });
    }
  }

  await mongoose.disconnect();
  console.log("Done updating statuses");
}

run().catch(console.error);
