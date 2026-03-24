export const isAirMode = (mode) => mode === 'AIR';

export const HIDDEN_FIELDS_AIR = [
  'container_rail_out_date',
  'emptyContainerOffLoadDate',
  'detention_from',
  'size',
  'by_road_movement_date',
  'seal_no',
  'seal_number'
];

export const sanitizeJobPayload = (payload) => {
  const { mode, container_nos } = payload;
  if (!isAirMode(mode)) return payload;

  const sanitizedPayload = { ...payload };
  
  if (Array.isArray(container_nos)) {
    sanitizedPayload.container_nos = container_nos.map(container => {
      const sanitizedContainer = { ...container };
      HIDDEN_FIELDS_AIR.forEach(field => {
        delete sanitizedContainer[field];
      });
      return sanitizedContainer;
    });
  }

  return sanitizedPayload;
};
