import axios from 'axios';

async function run() {
  try {
    const res = await axios.get('http://localhost:9006/api/customer-trainings');
    console.log("Status:", res.status);
    console.log("Total Trainings:", res.data.length);
    if (res.data.length > 0) {
      console.log("Sample Training Record:", JSON.stringify(res.data[0], null, 2));
    }
  } catch (error) {
    console.error("Error calling API:", error.message);
  }
}

run();
