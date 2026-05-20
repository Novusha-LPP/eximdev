import axios from 'axios';

async function run() {
  try {
    const res = await axios.get('http://localhost:9006/api/project-nucleus/customer-udyam');
    console.log("Status:", res.status);
    const aanav = res.data.find(c => c.name_of_individual.includes("AANAV"));
    console.log("Aanav from API:", JSON.stringify(aanav, null, 2));
    
    const registered = res.data.filter(c => c.udyam_no && c.udyam_no.trim() !== "");
    console.log("Total Registered in API:", registered.length);
    console.log("Sample Registered:", JSON.stringify(registered.slice(0, 5), null, 2));
  } catch (error) {
    console.error("Error calling API:", error.message);
  }
}

run();
