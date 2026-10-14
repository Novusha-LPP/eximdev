const axios = require('axios');

async function testCashflow() {
  try {
    const res9006 = await axios.get('http://localhost:9006/api/cashflow');
    console.log('9006 cashflow res keys:', Object.keys(res9006.data));
    console.log('9006 cashflow data keys:', Object.keys(res9006.data.data || {}));
    console.log('9006 cashflow sample:', res9006.data.data?.entries?.[0] || 'no entries');
  } catch (e) {
    console.log('9006 error:', e.message);
  }

  try {
    const res9002 = await axios.get('http://localhost:9002/api/cashflow');
    console.log('9002 cashflow res keys:', Object.keys(res9002.data));
    console.log('9002 cashflow data keys:', Object.keys(res9002.data.data || {}));
    console.log('9002 cashflow sample:', res9002.data.data?.entries?.[0] || 'no entries');
  } catch (e) {
    console.log('9002 error:', e.message);
  }
}
testCashflow();
