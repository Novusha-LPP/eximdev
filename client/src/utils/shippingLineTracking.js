// Tracking page for a shipping line, found by the carrier's name. Shipping line names are free
// text ("CMA CGM AGENCIES INDIA PVT. LTD.", "CMA CGM LINE", "cma cgm"...), so matching is by
// name, ignoring case, punctuation and extra spaces, not by exact spelling.

const MSC_URL = "https://www.msc.com/en/track-a-shipment";
const CMA_CGM_URL = "https://www.cma-cgm.com/ebusiness/tracking/search";
const ONE_URL = "https://ecomm.one-line.com/one-ecom/manage-shipment/cargo-tracking";
const HMM_URL = "https://www.hmm21.com/e-service/general/trackNTrace/TrackNTrace.do";
const COSCO_URL = "https://elines.coscoshipping.com/ebusiness/cargotracking";

// Checked in order; the first rule that matches the name wins
const CARRIERS = [
  { name: "MSC", test: /\bM\s?S\s?C\b|MEDITERRANEAN SHIPPING/, url: () => MSC_URL },
  { name: "Maersk", test: /MAERSK/, url: (num) => `https://www.maersk.com/tracking/${num}` },
  { name: "CMA CGM", test: /CMA\s?CGM/, url: () => CMA_CGM_URL },
  {
    name: "Hapag-Lloyd",
    test: /HAPAG/,
    url: (num) => `https://www.hapag-lloyd.com/en/online-business/track/track-by-booking-solution.html?blno=${num}`,
  },
  {
    name: "Trans Asia",
    test: /TRANS\s?ASIA/,
    url: (num, containerFirst) =>
      `http://182.72.192.230/TASFREIGHT/AppTasnet/ContainerTracking.aspx?&containerno=${containerFirst}&blNo=${num}`,
  },
  { name: "ONE", test: /\bONE LINE\b|OCEAN NETWORK EXPRESS/, url: () => ONE_URL },
  { name: "HMM", test: /\bHMM\b|HYUNDAI|HYUNDI/, url: () => HMM_URL },
  { name: "COSCO", test: /COSCO/, url: () => COSCO_URL },
  {
    name: "Unifeeder",
    test: /UNIFEEDER/,
    url: (num) =>
      num
        ? `https://www.unifeeder.cargoes.com/tracking?ID=${num.slice(0, 3)}%2F${num.slice(3, 6)}%2F${num.slice(6, 8)}%2F${num.slice(8)}`
        : "#",
  },
];

const normalise = (name) =>
  String(name || "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * @returns {string} the tracking URL, or "#" when the shipping line has no tracking page here
 */
export function getShippingLineTrackingUrl(shippingLine, blNumber = "", containerFirst = "") {
  const name = normalise(shippingLine);
  if (!name) return "#";
  const carrier = CARRIERS.find((c) => c.test.test(name));
  return carrier ? carrier.url(String(blNumber || ""), containerFirst || "") : "#";
}
