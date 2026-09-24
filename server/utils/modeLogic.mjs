export const isAirMode = (mode) => mode === "AIR";

export const HIDDEN_FIELDS_AIR = [
  "container_rail_out_date",
  "emptyContainerOffLoadDate",
  "detention_from",
  "size",
  "by_road_movement_date",
  "seal_no",
  "seal_number"
];

export const normalizeTermsOfInvoice = (val) => {
  if (!val || typeof val !== "string") return val;
  const trimmed = val.trim().toUpperCase();
  if (trimmed === "CF" || trimmed === "C&F" || trimmed === "C & F") return "C&F";
  if (trimmed === "CI" || trimmed === "C&I" || trimmed === "C & I") return "C&I";
  return val.trim();
};

export const sanitizeJobPayload = (payload) => {
  if (!payload || typeof payload !== "object") return payload;
  const sanitizedPayload = { ...payload };

  // Normalize TOI and import_terms in backend
  if (sanitizedPayload.import_terms !== undefined) {
    sanitizedPayload.import_terms = normalizeTermsOfInvoice(sanitizedPayload.import_terms);
  }
  if (sanitizedPayload.toi !== undefined) {
    sanitizedPayload.toi = normalizeTermsOfInvoice(sanitizedPayload.toi);
  } else if (sanitizedPayload.import_terms) {
    sanitizedPayload.toi = sanitizedPayload.import_terms;
  }

  if (Array.isArray(sanitizedPayload.invoice_details)) {
    sanitizedPayload.invoice_details = sanitizedPayload.invoice_details.map(inv => {
      if (!inv || typeof inv !== "object") return inv;
      const normalizedInv = { ...inv };
      if (normalizedInv.toi !== undefined) {
        normalizedInv.toi = normalizeTermsOfInvoice(normalizedInv.toi);
      }
      return normalizedInv;
    });
  }

  const { mode, container_nos } = sanitizedPayload;
  if (!isAirMode(mode)) return sanitizedPayload;

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
