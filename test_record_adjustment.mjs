import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

// Original failing payload from user report
const testPayload = {
  attendance_date: '2026-03-01T18:30:00.000Z',
  employee_id: '6981c69dfd24d48e6c8597b0',
  apply_status_correction: false,
  apply_time_correction: true,
  correction_mode: 'time_correction',
  first_in: '',
  last_out: '',
  half_day_session: 'first_half',
  remarks: 'No record',
  shift_id: '69cd1351ff5301f416796cef',
  status: 'holiday'
};

// JWT token - you'll need to update this with a real admin token
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'your-jwt-token-here';

async function testRecordAdjustment() {
  try {
    console.log('Testing original failing payload (holiday + time correction)...\n');
    console.log('Payload:');
    console.log(JSON.stringify(testPayload, null, 2));
    console.log('\n---\n');

    // Test 1: Create manual adjustment with conflicting payload
    console.log('Test 1: Creating adjustment with conflicting payload...');
    try {
      const res1 = await axios.post(`${API_BASE}/attendance/new`, testPayload, {
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
      });
      console.log('✅ SUCCESS: Manual adjustment created');
      console.log('Result:', JSON.stringify(res1.data, null, 2));
    } catch (err) {
      console.log('❌ FAILED:', err.response?.data?.message || err.message);
      if (err.response?.data?.error) {
        console.log('Error code:', err.response.data.error);
        console.log('Suggestion:', err.response.data.suggested_action);
      }
    }

    console.log('\n---\n');

    // Test 2: With corrected payload (auto-switched)
    const correctedPayload = {
      ...testPayload,
      correction_mode: 'status_correction_time_unchanged',
      apply_status_correction: true,
      apply_time_correction: false,
      first_in: '',
      last_out: ''
    };

    console.log('Test 2: Creating adjustment with auto-switched payload...');
    console.log('Corrected Payload:');
    console.log(JSON.stringify(correctedPayload, null, 2));
    console.log('\n');

    try {
      const res2 = await axios.post(`${API_BASE}/attendance/new`, correctedPayload, {
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
      });
      console.log('✅ SUCCESS: Manual adjustment created with corrected payload');
      console.log('Result status:', res2.data.record?.status);
      console.log('Result half_day_session:', res2.data.record?.half_day_session);
      console.log('Result first_in:', res2.data.record?.first_in);
      console.log('Result last_out:', res2.data.record?.last_out);
    } catch (err) {
      console.log('❌ FAILED:', err.response?.data?.message || err.message);
    }

  } catch (error) {
    console.error('Test error:', error.message);
  }
}

testRecordAdjustment();
