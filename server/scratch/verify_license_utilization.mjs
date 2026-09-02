import dotenv from 'dotenv';
import mongoose from 'mongoose';
import AuthorizationRegistrationModel from '../model/authorizationRegistrationModel.mjs';
import LicenseUtilizationModel from '../model/licenseUtilizationModel.mjs';

dotenv.config();

const uri = process.env.DEV_MONGODB_URI || "mongodb://localhost:27017/exim";

async function verify() {
  try {
    await mongoose.connect(uri);
    console.log("Connected to DB.");

    // Find by registration number
    const auth = await AuthorizationRegistrationModel.findOne({
      $or: [
        { registration_no: "3411007861" },
        { licence_no: "3411007861" },
        { job_no: "32" }
      ]
    }).lean();

    if (!auth) {
      console.log("No authorization found by registration_no 3411007861 or job_no 32");
      // Find all
      const all = await AuthorizationRegistrationModel.find().select("job_no registration_no licence_no").limit(10).lean();
      console.log("Existing authorizations in DB:", all);
      return;
    }

    console.log("=== Authorization Found ===");
    console.log("ID:", auth._id);
    console.log("Job No:", auth.job_no);
    console.log("Registration No:", auth.registration_no);
    console.log("Licence No:", auth.licence_no);
    console.log("Import Details Array:", JSON.stringify(auth.import_details_array, null, 2));

    const searchNos = ["32"];
    if (auth.registration_no) searchNos.push(auth.registration_no);
    if (auth.licence_no) searchNos.push(auth.licence_no);
    if (auth.job_no) {
      searchNos.push(auth.job_no);
      searchNos.push(`LIC/${auth.job_no}`);
      searchNos.push(`lic/${auth.job_no}`);
    }
    const uniqueSearchNos = [...new Set(searchNos.filter(n => n && n.trim() !== ""))];

    console.log("Unique search numbers:", uniqueSearchNos);

    const records = await LicenseUtilizationModel.find({
      authorization_no: { $in: uniqueSearchNos }
    }).lean();

    console.log(`=== License Utilization Records (${records.length}) ===`);
    records.forEach(r => {
      console.log(`- Job No: ${r.job_no}, Job ID: ${r.job_id}, Auth No: ${r.authorization_no}, SR: ${r.license_sr}, Qty: ${r.qty}, BE No: ${r.be_no}, CIF USD: ${r.cif_usd}`);
    });

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.connection.close();
  }
}

verify();
