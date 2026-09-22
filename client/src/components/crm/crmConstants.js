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
