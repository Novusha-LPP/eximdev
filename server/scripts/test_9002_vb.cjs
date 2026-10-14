const axios = require('axios');

async function test9002() {
  try {
    const res = await axios.get('http://localhost:9002/api/virtual-balance?limit=5');
    console.log('9002 keys:', Object.keys(res.data));
    console.log('9002 data keys:', res.data.data ? Object.keys(res.data.data) : 'no data key');
    console.log('9002 response snippet:', JSON.stringify(res.data).slice(0, 300));
  } catch (e) {
    console.error(e.message);
  }
}
test9002();
