// Tracking page for a shipping line, found by the carrier's name. Shipping line names are free
// text ("CMA CGM AGENCIES INDIA PVT. LTD.", "CMA CGM LINE", "cma cgm"...), so matching is by
// name, ignoring case, punctuation and extra spaces, not by exact spelling.

const MSC_URL = "https://www.msc.com/en/track-a-shipment";
const CMA_CGM_URL = "https://www.cma-cgm.com/ebusiness/tracking/search";
const ONE_URL = "https://ecomm.one-line.com/one-ecom/manage-shipment/cargo-tracking";
const HMM_URL = "https://www.hmm21.com/e-service/general/trackNTrace/TrackNTrace.do";
const COSCO_URL = "https://elines.coscoshipping.com/ebusiness/cargotracking";
const KMTC_URL = "https://www.ekmtc.com/index.html#/main";
const OOCL_URL = "https://www.oocl.com/eng/ourservices/eservices/cargotracking/pages/cargotracking.aspx";
const EVERGREEN_URL = "https://ct.shipmentlink.com/servlet/TDB1_CargoTracking.do";
const SUNMARINE_URL = "https://www.sunmarine.com/";
const EMIRATES_URL = "https://esea.emiratesline.com/ecomonline/Welcome.do";
const INTERASIA_URL = "https://www.interasia.cc/Service/Form?servicetype=0";
const RCL_URL = "https://eservice.rclgroup.com/CargoTracking/";
const CORDELIA_URL = "https://cordelialine.com/";
const PIL_URL = "https://www.pilship.com/";
const WAN_HAI_URL = "https://www.wanhai.com/views/cargo_track_v2/tracking_query.xhtml";
const ECONSHIP_URL = "https://erp.econshipping.com/#/";

// Checked in order; the first rule that matches the name wins
const CARRIERS = [
  { name: "MSC", test: /\bM\s?S\s?C\b|MEDITERRANEAN SHIPPING/, url: () => MSC_URL },
  { name: "Maersk", test: /MAERSK/, url: (num) => `https://www.maersk.com/tracking/${num}` },
  { name: "CMA CGM", test: /CMA\s?CG[MA]/, url: () => CMA_CGM_URL },
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
  { name: "HMM", test: /\bHMM\b|HYUNDAI|HYUNDI|SEABRIDGE MARINE/, url: () => HMM_URL },
  { name: "COSCO", test: /COSCO/, url: () => COSCO_URL },
  { name: "KMTC", test: /\bKMTC\b/, url: () => KMTC_URL },
  { name: "OOCL", test: /\bOOCL\b|ORIENT OVERSEAS/, url: () => OOCL_URL },
  { name: "Evergreen", test: /EVER\s?GREEN/, url: () => EVERGREEN_URL },
  { name: "Sun Marine", test: /FREIGHT CONNECTION INDIA|SUN\s?MARINE/, url: () => SUNMARINE_URL },
  { name: "Emirates Shipping", test: /EMIRATES SHIPPING/, url: () => EMIRATES_URL },
  { name: "Interasia", test: /INTER\s?ASIA|AISSA MARITIME/, url: () => INTERASIA_URL },
  { name: "RCL", test: /\bRCL\b/, url: () => RCL_URL },
  { name: "Cordelia", test: /CORDELIA/, url: () => CORDELIA_URL },
  { name: "PIL", test: /\bPIL\b|PACIFIC INTERNATIONAL LINES/, url: () => PIL_URL },
  { name: "Wan Hai", test: /WAN\s?HAI/, url: () => WAN_HAI_URL },
  { name: "Econship", test: /ECONSHIP/, url: () => ECONSHIP_URL },
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
