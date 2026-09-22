import express from "express";
import AirlineModel from "../../model/airlineModel.mjs";
import CountryModel from "../../model/countryModel.mjs";
import UnitModel from "../../model/unitModel.mjs";
import CustomerKycModel from "../../model/CustomerKyc/customerKycModel.mjs";
import ShippingLineModel from "../../model/shippingLineModel.mjs";
import SupplierModel from "../../model/supplierModel.mjs";
import CurrencyModel from "../../model/currencyModel.mjs";
import PortModel from "../../model/portModel.mjs";
import IndianPortModel from "../../model/indianPortModel.mjs";
import CustomHouseModel from "../../model/customHouseModel.mjs";
import CfsModel from "../../model/cfsModel.mjs";
import TransporterModel from "../../model/transporterModel.mjs";
import GeneralOrgModel from "../../model/generalOrgModel.mjs";
import EmptyOffLocationModel from "../../model/emptyOffLocationModel.mjs";
import ItemDutyNotificationModel from "../../model/notifications/itemDutyNotificationModel.mjs";

const router = express.Router();

/**
 * GET /api/master-directory/global-search?q=...&limit=6
 * Searches across all master directories in Import platform simultaneously
 */
router.get("/global-search", async (req, res) => {
  try {
    const rawQuery = (req.query.q || req.query.query || "").trim();
    const limit = Math.min(parseInt(req.query.limit, 10) || 6, 20);

    if (!rawQuery || rawQuery.length < 2) {
      return res.json({
        success: true,
        query: rawQuery,
        total: 0,
        results: []
      });
    }

    const escaped = rawQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");

    // Execute queries in parallel across all master directories with strict, validated schema fields
    const [
      organizations,
      ports,
      indianPorts,
      shippingLines,
      airlines,
      transporters,
      customHouses,
      cfsList,
      suppliers,
      generalOrgs,
      countries,
      currencies,
      units,
      emptyOffLocations,
      notifications
    ] = await Promise.all([
      // 1. Organizations (Customer KYC)
      CustomerKycModel.find({
        $or: [
          { name_of_individual: regex },
          { iec_no: regex },
          { gst_no: regex },
          { pan_no: regex },
          { permanent_address_city: regex }
        ]
      }).select("name_of_individual iec_no gst_no pan_no permanent_address_city").limit(limit).lean().catch(() => []),

      // 2. Ports
      PortModel.find({
        $or: [
          { port_name: regex },
          { port_code: regex },
          { country: regex }
        ]
      }).select("port_name port_code mode country").limit(limit).lean().catch(() => []),

      // 3. Indian Ports
      IndianPortModel.find({
        $or: [
          { port_code: regex },
          { place: regex },
          { address: regex }
        ]
      }).select("port_code place address pincode").limit(limit).lean().catch(() => []),

      // 4. Shipping Lines
      ShippingLineModel.find({
        $or: [
          { name: regex },
          { "branches.branchName": regex },
          { "branches.gst": regex },
          { "branches.pan": regex },
          { "branches.city": regex }
        ]
      }).select("name branches").limit(limit).lean().catch(() => []),

      // 5. Airlines
      AirlineModel.find({
        $or: [
          { name: regex },
          { code: regex },
          { prefix: regex },
          { "branches.branchName": regex },
          { "branches.city": regex }
        ]
      }).select("name code prefix branches").limit(limit).lean().catch(() => []),

      // 6. Transporters
      TransporterModel.find({
        $or: [
          { name: regex },
          { "branches.branchName": regex },
          { "branches.gst": regex },
          { "branches.pan": regex },
          { "branches.city": regex }
        ]
      }).select("name branches").limit(limit).lean().catch(() => []),

      // 7. Custom Houses
      CustomHouseModel.find({
        $or: [
          { name: regex },
          { code: regex }
        ]
      }).select("name code").limit(limit).lean().catch(() => []),

      // 8. Terminals / CFS
      CfsModel.find({
        $or: [
          { name: regex },
          { "branches.branchName": regex },
          { "branches.city": regex },
          { "branches.gst": regex }
        ]
      }).select("name branches").limit(limit).lean().catch(() => []),

      // 9. Suppliers
      SupplierModel.find({
        $or: [
          { name: regex },
          { "branches.branch_name": regex },
          { "branches.address": regex },
          { "branches.city": regex },
          { "branches.country": regex }
        ]
      }).select("name branches").limit(limit).lean().catch(() => []),

      // 10. General Orgs
      GeneralOrgModel.find({
        $or: [
          { name: regex },
          { "branches.branchName": regex },
          { "branches.gst": regex },
          { "branches.pan": regex },
          { "branches.city": regex }
        ]
      }).select("name branches").limit(limit).lean().catch(() => []),

      // 11. Countries
      CountryModel.find({
        $or: [
          { name: regex },
          { code: regex }
        ]
      }).select("name code").limit(limit).lean().catch(() => []),

      // 12. Currencies
      CurrencyModel.find({
        $or: [
          { name: regex },
          { code: regex },
          { country: regex }
        ]
      }).select("name code country").limit(limit).lean().catch(() => []),

      // 13. Units
      UnitModel.find({
        $or: [
          { name: regex },
          { code: regex },
          { unitType: regex }
        ]
      }).select("name code unitType").limit(limit).lean().catch(() => []),

      // 14. Empty Off Locations
      EmptyOffLocationModel.find({
        $or: [
          { name: regex },
          { "branches.branchName": regex },
          { "branches.city": regex },
          { "branches.address": regex }
        ]
      }).select("name branches").limit(limit).lean().catch(() => []),

      // 15. Notifications
      ItemDutyNotificationModel.find({
        $or: [
          { notn_no: regex },
          { cth_code: regex },
          { duty_head: regex }
        ]
      }).select("notn_no notn_sno duty_head cth_code current_rate").limit(limit).lean().catch(() => [])
    ]);

    const formatted = [];

    // Map Organizations
    organizations.forEach(item => {
      formatted.push({
        directory: "Organization",
        directoryKey: "organization",
        path: "/organization-directory",
        id: item._id,
        title: item.name_of_individual || "Unnamed Organization",
        subtitle: [
          item.iec_no ? `IEC: ${item.iec_no}` : null,
          item.gst_no ? `GST: ${item.gst_no}` : null,
          item.pan_no ? `PAN: ${item.pan_no}` : null,
          item.permanent_address_city ? `City: ${item.permanent_address_city}` : null
        ].filter(Boolean).join(" • "),
        tagColor: "#4f46e5",
        badgeBg: "#eef2ff",
        badgeColor: "#4338ca"
      });
    });

    // Map Ports
    ports.forEach(item => {
      formatted.push({
        directory: "Ports",
        directoryKey: "ports",
        path: "/port-directory",
        id: item._id,
        title: `${item.port_name} (${item.port_code || ""})`,
        subtitle: [
          item.mode ? `Mode: ${item.mode}` : null,
          item.country ? `Country: ${item.country}` : null
        ].filter(Boolean).join(" • "),
        tagColor: "#0284c7",
        badgeBg: "#e0f2fe",
        badgeColor: "#0369a1"
      });
    });

    // Map Indian Ports
    indianPorts.forEach(item => {
      formatted.push({
        directory: "Indian Ports",
        directoryKey: "indian-ports",
        path: "/indian-port-directory",
        id: item._id,
        title: `${item.place || item.port_code} (${item.port_code})`,
        subtitle: [
          item.place ? `Place: ${item.place}` : null,
          item.address ? `Address: ${item.address}` : null,
          item.pincode ? `PIN: ${item.pincode}` : null
        ].filter(Boolean).join(" • "),
        tagColor: "#0d9488",
        badgeBg: "#ccfbf1",
        badgeColor: "#0f766e"
      });
    });

    // Map Shipping Lines
    shippingLines.forEach(item => {
      const bGst = item.branches?.find(b => b.gst)?.gst;
      const bPan = item.branches?.find(b => b.pan)?.pan;
      const bCity = item.branches?.find(b => b.city)?.city;
      formatted.push({
        directory: "Shipping Lines",
        directoryKey: "shipping-lines",
        path: "/shipping-line-directory",
        id: item._id,
        title: item.name,
        subtitle: [
          bGst ? `GST: ${bGst}` : null,
          bPan ? `PAN: ${bPan}` : null,
          bCity ? `City: ${bCity}` : null
        ].filter(Boolean).join(" • "),
        tagColor: "#0891b2",
        badgeBg: "#ecfeff",
        badgeColor: "#0e7490"
      });
    });

    // Map Airlines
    airlines.forEach(item => {
      const bCity = item.branches?.find(b => b.city)?.city;
      formatted.push({
        directory: "Airlines",
        directoryKey: "airlines",
        path: "/airlines-directory",
        id: item._id,
        title: `${item.name} (${item.code || ""})`,
        subtitle: [
          item.code ? `Code: ${item.code}` : null,
          item.prefix ? `Prefix: ${item.prefix}` : null,
          bCity ? `City: ${bCity}` : null
        ].filter(Boolean).join(" • "),
        tagColor: "#7c3aed",
        badgeBg: "#ede9fe",
        badgeColor: "#6d28d9"
      });
    });

    // Map Transporters
    transporters.forEach(item => {
      const bGst = item.branches?.find(b => b.gst)?.gst;
      const bCity = item.branches?.find(b => b.city)?.city;
      formatted.push({
        directory: "Transporters",
        directoryKey: "transporters",
        path: "/transporter-directory",
        id: item._id,
        title: item.name,
        subtitle: [
          bGst ? `GST: ${bGst}` : null,
          bCity ? `City: ${bCity}` : null,
          item.branches?.length ? `${item.branches.length} Branches` : null
        ].filter(Boolean).join(" • "),
        tagColor: "#ea580c",
        badgeBg: "#ffedd5",
        badgeColor: "#c2410c"
      });
    });

    // Map Custom Houses
    customHouses.forEach(item => {
      formatted.push({
        directory: "Custom Houses",
        directoryKey: "custom-houses",
        path: "/custom-house-directory",
        id: item._id,
        title: `${item.name} (${item.code})`,
        subtitle: `Custom House Code: ${item.code}`,
        tagColor: "#b45309",
        badgeBg: "#fef3c7",
        badgeColor: "#92400e"
      });
    });

    // Map Terminals / CFS
    cfsList.forEach(item => {
      const bCity = item.branches?.find(b => b.city)?.city;
      const bGst = item.branches?.find(b => b.gst)?.gst;
      formatted.push({
        directory: "Terminals",
        directoryKey: "terminals",
        path: "/terminal-directory",
        id: item._id,
        title: item.name,
        subtitle: [
          bCity ? `City: ${bCity}` : null,
          bGst ? `GST: ${bGst}` : null,
          item.branches?.length ? `${item.branches.length} Branches` : null
        ].filter(Boolean).join(" • ") || "Terminal Partner",
        tagColor: "#059669",
        badgeBg: "#d1fae5",
        badgeColor: "#047857"
      });
    });

    // Map Suppliers
    suppliers.forEach(item => {
      const city = item.branches?.[0]?.city;
      const country = item.branches?.[0]?.country;
      formatted.push({
        directory: "Suppliers",
        directoryKey: "suppliers",
        path: "/supplier-directory",
        id: item._id,
        title: item.name,
        subtitle: [city, country].filter(Boolean).join(", ") || "Supplier Directory Partner",
        tagColor: "#475569",
        badgeBg: "#f1f5f9",
        badgeColor: "#334155"
      });
    });

    // Map General Orgs
    generalOrgs.forEach(item => {
      const bGst = item.branches?.find(b => b.gst)?.gst;
      formatted.push({
        directory: "General Org",
        directoryKey: "general-org",
        path: "/general-org-directory",
        id: item._id,
        title: item.name,
        subtitle: [
          bGst ? `GST: ${bGst}` : null,
          item.branches?.length ? `${item.branches.length} Branches` : null
        ].filter(Boolean).join(" • "),
        tagColor: "#64748b",
        badgeBg: "#f8fafc",
        badgeColor: "#475569"
      });
    });

    // Map Countries
    countries.forEach(item => {
      formatted.push({
        directory: "Countries",
        directoryKey: "countries",
        path: "/country-directory",
        id: item._id,
        title: `${item.name} (${item.code})`,
        subtitle: `Country Code: ${item.code}`,
        tagColor: "#16a34a",
        badgeBg: "#dcfce7",
        badgeColor: "#15803d"
      });
    });

    // Map Currencies
    currencies.forEach(item => {
      formatted.push({
        directory: "Currencies",
        directoryKey: "currencies",
        path: "/currency-directory",
        id: item._id,
        title: `${item.name} (${item.code})`,
        subtitle: `Code: ${item.code} • Country: ${item.country || "N/A"}`,
        tagColor: "#d97706",
        badgeBg: "#fef3c7",
        badgeColor: "#b45309"
      });
    });

    // Map Units
    units.forEach(item => {
      formatted.push({
        directory: "Units",
        directoryKey: "units",
        path: "/unit-directory",
        id: item._id,
        title: `${item.name} (${item.code})`,
        subtitle: `Type: ${item.unitType || "Standard Unit"}`,
        tagColor: "#6366f1",
        badgeBg: "#e0e7ff",
        badgeColor: "#4338ca"
      });
    });

    // Map Empty Off Locations
    emptyOffLocations.forEach(item => {
      const bCity = item.branches?.find(b => b.city)?.city;
      const bAddress = item.branches?.find(b => b.address)?.address;
      formatted.push({
        directory: "Empty Off Location",
        directoryKey: "empty-off-locations",
        path: "/empty-off-location-directory",
        id: item._id,
        title: item.name,
        subtitle: [
          bCity ? `City: ${bCity}` : null,
          bAddress ? `Address: ${bAddress}` : null
        ].filter(Boolean).join(" • ") || "Container Off-Load Location",
        tagColor: "#0891b2",
        badgeBg: "#cffafe",
        badgeColor: "#0e7490"
      });
    });

    // Map Notifications
    notifications.forEach(item => {
      formatted.push({
        directory: "Notification Directory",
        directoryKey: "notifications",
        path: "/notification-directory",
        id: item._id,
        title: `Notn ${item.notn_no} (Sr: ${item.notn_sno || "N/A"})`,
        subtitle: `Duty Head: ${item.duty_head || "N/A"} • CTH: ${item.cth_code || "ALL"} • Rate: ${item.current_rate ?? "N/A"}`,
        tagColor: "#be123c",
        badgeBg: "#ffe4e6",
        badgeColor: "#9f1239"
      });
    });

    res.json({
      success: true,
      query: rawQuery,
      total: formatted.length,
      results: formatted
    });
  } catch (error) {
    console.error("Error in globalDirectorySearch:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
