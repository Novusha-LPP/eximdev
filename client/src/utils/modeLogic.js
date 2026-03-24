export const isAirMode = (mode) => mode === 'AIR';

export const getContainerOrPackageLabel = (mode) => isAirMode(mode) ? 'Package' : 'Container';
export const getAwbOrBlLabel = (mode) => isAirMode(mode) ? 'AWB' : 'BL';
export const getAirlineOrShippingLineLabel = (mode) => isAirMode(mode) ? 'Airline' : 'Shipping Line';

export const HIDDEN_FIELDS_AIR = [
  'container_rail_out_date',
  'emptyContainerOffLoadDate',
  'detention_from',
  'size',
  'by_road_movement_date',
  'seal_no'
];

export const shouldHideField = (fieldName, mode) => {
  if (isAirMode(mode)) {
    return HIDDEN_FIELDS_AIR.includes(fieldName);
  }
  return false;
};

export const sanitizeContainerPayload = (container, mode) => {
  if (!isAirMode(mode)) return container;
  
  const sanitized = { ...container };
  HIDDEN_FIELDS_AIR.forEach(field => {
    delete sanitized[field];
  });
  return sanitized;
};
