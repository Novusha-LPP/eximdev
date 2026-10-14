const axios = require('axios');

async function testApis() {
  try {
    const res1 = await axios.get('http://localhost:9006/api/cashflow');
    console.log('9006 /api/cashflow success:', res1.data?.success, 'records count:', res1.data?.data?.entries?.length);
  } catch (e) {
    console.log('9006 /api/cashflow error:', e.message);
  }

  try {
    const res2 = await axios.get('http://localhost:9002/api/cashflow');
    console.log('9002 /api/cashflow success:', res2.data?.success, 'records count:', res2.data?.data?.entries?.length);
  } catch (e) {
    console.log('9002 /api/cashflow error:', e.message);
  }

  try {
    const res3 = await axios.get('http://localhost:9006/api/virtual-balance?limit=5');
    console.log('9006 /api/virtual-balance success:', res3.data?.success, 'total:', res3.data?.data?.total);
  } catch (e) {
    console.log('9006 /api/virtual-balance error:', e.message);
  }

  try {
    const res4 = await axios.get('http://localhost:9002/api/virtual-balance?limit=5');
    console.log('9002 /api/virtual-balance success:', res4.data?.success, 'total:', res4.data?.data?.total);
  } catch (e) {
    console.log('9002 /api/virtual-balance error:', e.message);
  }

  try {
    const res5 = await axios.get('http://localhost:9006/api/cfs-virtual-balance?limit=5');
    console.log('9006 /api/cfs-virtual-balance success:', res5.data?.success, 'total:', res5.data?.data?.total);
  } catch (e) {
    console.log('9006 /api/cfs-virtual-balance error:', e.message);
  }

  try {
    const res6 = await axios.get('http://localhost:9002/api/cfs-virtual-balance?limit=5');
    console.log('9002 /api/cfs-virtual-balance success:', res6.data?.success, 'total:', res6.data?.data?.total);
  } catch (e) {
    console.log('9002 /api/cfs-virtual-balance error:', e.message);
  }
}

testApis();
