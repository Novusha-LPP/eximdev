export const LOST_REASONS = [
  {
    code: 'LR01',
    value: 'Lost on price',
    label: 'Lost on price',
    description: 'Competitor quoted a lower rate. Record competitor name and the rate gap.',
    mostSeenIn: 'SFPL, SRCC, E-Locks'
  },
  {
    code: 'LR02',
    value: 'Volume split, we were not primary',
    label: 'Volume split, we were not primary',
    description: 'Customer uses 3–4 vendors and gave us a small share or none of a lane/job.',
    mostSeenIn: 'SFPL, SRCC'
  },
  {
    code: 'LR03',
    value: 'Credit terms not matched',
    label: 'Credit terms not matched',
    description: 'Rival offered longer or looser credit (customers often repay ~60 days after upfront charges).',
    mostSeenIn: 'SFPL'
  },
  {
    code: 'LR04',
    value: 'Discount not agreed',
    label: 'Discount not agreed',
    description: 'Customer asked for a discount and we refused, or the cut made the deal unviable.',
    mostSeenIn: 'E-Locks, all'
  },
  {
    code: 'LR05',
    value: 'Incumbent relationship',
    label: 'Incumbent relationship',
    description: 'Customer stayed with existing vendor due to ties or switching effort.',
    mostSeenIn: 'All'
  },
  {
    code: 'LR06',
    value: 'Slow / no follow-up',
    label: 'Slow / no follow-up',
    description: 'Quote sent, then no follow-up cadence; the deal went cold.',
    mostSeenIn: 'All'
  },
  {
    code: 'LR07',
    value: 'Decision-maker not reached',
    label: 'Decision-maker not reached',
    description: 'Stuck with a non-decision contact; never met the person who signs off.',
    mostSeenIn: 'All'
  },
  {
    code: 'LR08',
    value: 'Benefit not proven',
    label: 'Benefit not proven',
    description: 'Customer did not see the time or cost saving (e.g. DPD/DPE vs normal route).',
    mostSeenIn: 'SFPL, E-Locks, AIVision'
  },
  {
    code: 'LR09',
    value: 'Scope mismatch',
    label: 'Scope mismatch',
    description: 'Customer wanted a bundled or end-to-end offer; we quoted a single service.',
    mostSeenIn: 'SFPL, SRCC'
  },
  {
    code: 'LR10',
    value: 'Past service issue',
    label: 'Past service issue',
    description: 'Earlier delay, documentation error or service gap counted against us.',
    mostSeenIn: 'SFPL, SRCC'
  },
  {
    code: 'LR11',
    value: 'No trial / reference',
    label: 'No trial / reference',
    description: 'No pilot, demo, sample or same-sector reference available to close.',
    mostSeenIn: 'AIVision, Rabs, Paramount'
  },
  {
    code: 'LR12',
    value: 'Timing / customer freeze',
    label: 'Timing / customer freeze',
    description: 'Locked into a contract, no current need, or project postponed. Not a fixable loss.',
    mostSeenIn: 'All'
  }
];

export const STANDARD_LOST_REASON_VALUES = LOST_REASONS.map(r => r.value);

export const ALLOWED_SERVICES = [
  'freight forwarding',
  'dgft',
  'e-lock',
  'client',
  'transportation',
  'paramount',
  'rabs',
  'autorack'
];

export const formatServiceName = (s) => {
  if (!s) return '';
  const lower = s.toString().toLowerCase().trim();
  if (lower === 'autorack' || lower === 'auto rack') return 'AUTORACK';
  if (lower === 'dgft') return 'DGFT';
  if (lower === 'rabs') return 'RABS';
  if (lower === 'e-lock' || lower === 'elock') return 'E-Lock';
  return s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

// Zoho-style GST Treatment Options
export const GST_TREATMENT_OPTIONS = [
  { value: 'Registered Business - Regular', label: 'Registered Business - Regular', desc: 'Business that is registered under GST' },
  { value: 'Registered Business - Composition', label: 'Registered Business - Composition', desc: 'Business that is registered under the Composition Scheme in GST' },
  { value: 'Unregistered Business', label: 'Unregistered Business', desc: 'Business that has not been registered under GST' },
  { value: 'Consumer', label: 'Consumer', desc: 'A customer who is a regular consumer' },
  { value: 'Overseas', label: 'Overseas', desc: 'Persons / entities located outside India' },
  { value: 'Special Economic Zone (SEZ)', label: 'Special Economic Zone (SEZ)', desc: 'Business unit or developer located in SEZ' },
  { value: 'Deemed Export', label: 'Deemed Export', desc: 'Supply treated as deemed export under GST' }
];

// Indian States with GST Codes for Place of Supply
export const INDIAN_STATES_GST = [
  { code: '01', state: 'Jammu & Kashmir', label: '[01] - Jammu & Kashmir' },
  { code: '02', state: 'Himachal Pradesh', label: '[02] - Himachal Pradesh' },
  { code: '03', state: 'Punjab', label: '[03] - Punjab' },
  { code: '04', state: 'Chandigarh', label: '[04] - Chandigarh' },
  { code: '05', state: 'Uttarakhand', label: '[05] - Uttarakhand' },
  { code: '06', state: 'Haryana', label: '[06] - Haryana' },
  { code: '07', state: 'Delhi', label: '[07] - Delhi' },
  { code: '08', state: 'Rajasthan', label: '[08] - Rajasthan' },
  { code: '09', state: 'Uttar Pradesh', label: '[09] - Uttar Pradesh' },
  { code: '10', state: 'Bihar', label: '[10] - Bihar' },
  { code: '11', state: 'Sikkim', label: '[11] - Sikkim' },
  { code: '12', state: 'Arunachal Pradesh', label: '[12] - Arunachal Pradesh' },
  { code: '13', state: 'Nagaland', label: '[13] - Nagaland' },
  { code: '14', state: 'Manipur', label: '[14] - Manipur' },
  { code: '15', state: 'Mizoram', label: '[15] - Mizoram' },
  { code: '16', state: 'Tripura', label: '[16] - Tripura' },
  { code: '17', state: 'Meghalaya', label: '[17] - Meghalaya' },
  { code: '18', state: 'Assam', label: '[18] - Assam' },
  { code: '19', state: 'West Bengal', label: '[19] - West Bengal' },
  { code: '20', state: 'Jharkhand', label: '[20] - Jharkhand' },
  { code: '21', state: 'Odisha', label: '[21] - Odisha' },
  { code: '22', state: 'Chhattisgarh', label: '[22] - Chhattisgarh' },
  { code: '23', state: 'Madhya Pradesh', label: '[23] - Madhya Pradesh' },
  { code: '24', state: 'Gujarat', label: '[24] - Gujarat' },
  { code: '26', state: 'Dadra & Nagar Haveli and Daman & Diu', label: '[26] - Dadra & Nagar Haveli and Daman & Diu' },
  { code: '27', state: 'Maharashtra', label: '[27] - Maharashtra' },
  { code: '29', state: 'Karnataka', label: '[29] - Karnataka' },
  { code: '30', state: 'Goa', label: '[30] - Goa' },
  { code: '31', state: 'Lakshadweep', label: '[31] - Lakshadweep' },
  { code: '32', state: 'Kerala', label: '[32] - Kerala' },
  { code: '33', state: 'Tamil Nadu', label: '[33] - Tamil Nadu' },
  { code: '34', state: 'Puducherry', label: '[34] - Puducherry' },
  { code: '35', state: 'Andaman & Nicobar Islands', label: '[35] - Andaman & Nicobar Islands' },
  { code: '36', state: 'Telangana', label: '[36] - Telangana' },
  { code: '37', state: 'Andhra Pradesh', label: '[37] - Andhra Pradesh' },
  { code: '38', state: 'Ladakh', label: '[38] - Ladakh' },
  { code: '97', state: 'Other Territory', label: '[97] - Other Territory' }
];

export const PAYMENT_TERMS_OPTIONS = [
  'Due on Receipt',
  'Net 15',
  'Net 30',
  'Net 45',
  'Net 60',
  'Due end of the month',
  'Due end of next month'
];

export const CURRENCY_OPTIONS = [
  { value: 'INR', label: 'INR - Indian Rupee (₹)' },
  { value: 'USD', label: 'USD - United States Dollar ($)' },
  { value: 'EUR', label: 'EUR - Euro (€)' },
  { value: 'GBP', label: 'GBP - British Pound (£)' },
  { value: 'AED', label: 'AED - UAE Dirham' },
  { value: 'SGD', label: 'SGD - Singapore Dollar (S$)' }
];

/**
 * Extracts 2-digit GST state code and returns matching Place of Supply label
 */
export const getStateFromGstin = (gstin) => {
  if (!gstin || typeof gstin !== 'string' || gstin.length < 2) return '';
  const code = gstin.substring(0, 2);
  const found = INDIAN_STATES_GST.find(s => s.code === code);
  return found ? found.label : '';
};

/**
 * Extracts 10-character PAN from 15-character GSTIN (characters 3-12)
 */
export const getPanFromGstin = (gstin) => {
  if (!gstin || typeof gstin !== 'string' || gstin.length < 12) return '';
  const clean = gstin.trim().toUpperCase();
  if (clean.length >= 12) {
    const panCandidate = clean.substring(2, 12);
    // Basic PAN format validation: 5 letters, 4 digits, 1 letter
    if (/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(panCandidate)) {
      return panCandidate;
    }
  }
  return '';
};
