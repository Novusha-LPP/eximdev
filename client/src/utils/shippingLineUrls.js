// shippingLineUrls.js
export const shippingLineUrls = {
    MSC: "https://www.msc.com/en/track-a-shipment",
    "M S C": "https://www.msc.com/en/track-a-shipment",
    "MSC LINE": "https://www.msc.com/en/track-a-shipment",
    "Maersk Line": (blNumber) => `https://www.maersk.com/tracking/${blNumber}`,
    "Hapag-Lloyd": (blNumber) =>
      `https://www.hapag-lloyd.com/en/online-business/track/track-by-booking-solution.html?blno=${blNumber}`,
    "Trans Asia": (blNumber, containerFirst) =>
      `http://182.72.192.230/TASFREIGHT/AppTasnet/ContainerTracking.aspx?&containerno=${containerFirst}&blNo=${blNumber}`,
    UNIFEEDER: (blNumber) =>
      `https://www.unifeeder.cargoes.com/tracking?ID=${blNumber}`,
  };
  