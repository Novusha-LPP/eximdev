import axios from 'axios';

async function testUrl(name, url) {
  try {
    // Just make a blank POST request to see if we get a 404 or 401/400 (which indicates the endpoint exists but has invalid params/headers)
    const res = await axios.post(url, {}, {
      validateStatus: () => true,
      timeout: 10000
    });
    console.log(`${name}: HTTP ${res.status} (url: ${url})`);
    if (res.status !== 404) {
      console.log(`   --> FOUND! Response body snippet:`, JSON.stringify(res.data).substring(0, 100));
    }
  } catch (err) {
    console.log(`${name}: Failed with error ${err.message} (url: ${url})`);
  }
}

async function run() {
  const uatBase = 'https://impexapi.impexcube.in';
  const prodBase = 'https://impexapi.impexcube.in';

  console.log("=== Testing UAT BASE ===");
  await testUrl("UAT with v1", `${uatBase}/api/v1/ImpJobCreation/CreateJob`);
  await testUrl("UAT without v1", `${uatBase}/api/ImpJobCreation/CreateJob`);

  console.log("\n=== Testing PROD BASE ===");
  await testUrl("PROD with v1", `${prodBase}/api/v1/ImpJobCreation/CreateJob`);
  await testUrl("PROD without v1", `${prodBase}/api/ImpJobCreation/CreateJob`);
}

run();
