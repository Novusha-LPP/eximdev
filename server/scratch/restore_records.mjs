import mongoose from "mongoose";
import dotenv from "dotenv";
import FleetInsuranceSopModel from "../model/accounts/fleetInsuranceSop.mjs";

dotenv.config();

const prodUri = process.env.PROD_MONGODB_URI;

async function run() {
  const conn = await mongoose.createConnection(prodUri).asPromise();
  console.log("Connected to PROD DB");
  const Model = conn.model("FleetInsuranceSop", FleetInsuranceSopModel.schema);

  // 1. Reset GJ-18-BV-5224
  const res5224 = await Model.updateOne(
    { registrationNo: "GJ-18-BV-5224" },
    {
      $set: {
        renewed: "NO",
        renewalStatus: "Pending",
        financialApprovalStatus: "Pending",
        prNumber: "",
        paymentUtr: "",
        readyForPr: "No",
        newInsuranceCompany: "",
        newPolicyNo: "",
        newPolicyFromDate: null,
        newPolicyToDate: null,
        newIdv: null,
        newElectricalAccessoriesIdv: null,
        newCngKitIdv: null,
        newHydraulicJackCover: null,
        newHydrolicJackCover: null,
        newModerationAmount: null,
        newModerationAmountTipper: null,
        newTotalIdv: null,
        newPremiumAmount: null,
        newNcb: null,
        newPremium: null,
        newRemarks: "",
        newOdPremium: null,
        newImt23: null,
        newImt24: null,
        newImt25: null,
        newTotalOdPremium: null,
        newImt17: null,
        newImt252: null,
        newImt28: null,
        newImt29: null,
        newLiabilityPremium: null,
        newTotalGst: null,
        newTotalPolicyPremium: null
      }
    }
  );
  console.log("Updated GJ-18-BV-5224:", res5224);

  // 2. Remove test duplicate records created during testing
  const testIdsToDelete = [
    "6a4cd3fd5f7684b92a145df9",
    "6a4cc8895f7684b92a13df03",
    "6a6dcde84b9b46ea3bee22ea",
    "6a6dcdc74b9b46ea3bee223a",
    "6a6dcdb3541e0e3016c0bdf3",
    "6a6dcd94b016cc56087cd58c",
    "6a6dcc51541e0e3016c0afcd",
    "6a6d98f74b9b46ea3beb20c1",
    "6a45ed676780678a11f0cffb"
  ];

  const deleteRes = await Model.deleteMany({ _id: { $in: testIdsToDelete.map(id => new mongoose.Types.ObjectId(id)) } });
  console.log("Deleted test records:", deleteRes);

  // 3. Reset any remaining records that have test approval or renewed status without payment
  const resetRes = await Model.updateMany(
    { paymentUtr: { $in: ["", null] } },
    {
      $set: {
        financialApprovalStatus: "Pending",
        renewalStatus: "Pending"
      }
    }
  );
  console.log("Reset non-paid records status:", resetRes);

  await conn.close();
}

run().catch(console.error);
