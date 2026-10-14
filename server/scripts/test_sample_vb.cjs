const axios = require('axios');

async function testVB() {
  const r1 = await axios.get('http://localhost:9006/api/virtual-balance?limit=2');
  console.log('9006 VB sample:', r1.data.data?.entries?.[0]);
  const r2 = await axios.get('http://localhost:9002/api/virtual-balance?limit=2');
  console.log('9002 VB sample:', r2.data.data?.[0]);
}
testVB();
