const axios = require('axios');

async function testSample() {
  const res9006 = await axios.get('http://localhost:9006/api/cashflow');
  console.log('9006 sample row:', res9006.data.data[0]);
  console.log('9006 summary:', res9006.data.summary);
  const res9002 = await axios.get('http://localhost:9002/api/cashflow');
  console.log('9002 sample row:', res9002.data.data[0]);
  console.log('9002 summary:', res9002.data.summary);
}
testSample();
