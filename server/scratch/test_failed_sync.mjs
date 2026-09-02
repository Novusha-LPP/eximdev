import fetch from 'node-fetch';

async function testFailedSync() {
  console.log("Triggering a failed Purchase Entry sync...");
  try {
    const payload = {
      // Missing required fields will cause Mongoose validation to fail
      "Job No": "JOB/TEST/001",
      "Job No": "JOB/TEST/001",
      "Supplier Name": "Test Supplier",
      "Supplier Bill Amount": 1000
    };

    const res = await fetch("http://localhost:9006/api/tally/purchase-entry", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": "ee30006ba8a59c0becb30a598764e8410965f1c90e1fe066c7eb47202d1fa79d"
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    console.log("Response Status:", res.status);
    console.log("Response Data:", data);
  } catch (error) {
    console.error("Test Request Failed:", error);
  }
}

testFailedSync();
