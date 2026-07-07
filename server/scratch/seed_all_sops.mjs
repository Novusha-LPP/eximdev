import mongoose from "mongoose";
import dotenv from "dotenv";
import FleetInsuranceSopModel from "../model/accounts/fleetInsuranceSop.mjs";
import RmProcurementSopModel from "../model/accounts/rmProcurementSop.mjs";
import TyreProcurementSopModel from "../model/accounts/tyreProcurementSop.mjs";

dotenv.config();

const MONGODB_URI = process.env.DEV_MONGODB_URI || "mongodb://localhost:27017/eximdev";

// Helper to generate dates relative to now
const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const daysAhead = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

const seedFleetInsurance = async () => {
  console.log("Seeding Fleet Insurance SOP...");
  await FleetInsuranceSopModel.deleteMany({});

  const makes = ["Tata Signa 4825.T", "Ashok Leyland 5525", "Mahindra Blazo X 49", "Eicher Pro 6048", "BharatBenz 5528T"];
  const modelTypes = ["Truck", "Trailer", "HCV", "Container Trailer"];
  const sizes = ["40 FT Flat Bed", "20 FT Semi Low Bed", "32 FT Multi-Axle", "40 FT Skeletal"];
  const insurers = ["ICICI Lombard", "HDFC ERGO", "Tata AIG", "Bajaj Allianz", "New India Assurance", "SBI General Insurance"];

  const dummyRecords = [];

  for (let i = 1; i <= 50; i++) {
    const isRenewed = i % 3 === 0 ? "YES" : i % 3 === 1 ? "NO" : "PENDING";
    const regState = i % 2 === 0 ? "MH" : "GJ";
    const regCode = String(Math.floor(10 + Math.random() * 89));
    const regNo = `${regState}-${regCode}-${regState === "MH" ? "TR" : "EX"}-${String(Math.floor(1000 + Math.random() * 9000))}`;
    
    const regDate = daysAgo(365 * 3 + (i * 10));
    const policyFromDate = daysAgo(180 + (i * 5));
    const policyToDate = daysAhead(185 - (i * 5));

    const oldIdv = Math.floor(1200000 + Math.random() * 1800000);
    const newIdv = Math.floor(oldIdv * 0.9);
    const premiumAmount = Math.floor(25000 + Math.random() * 20000);

    const record = {
      srNo: i,
      registrationNo: regNo,
      registrationDate: regDate,
      makeModel: makes[i % makes.length],
      fromOwner: regDate,
      toOwner: new Date(),
      modelType: modelTypes[i % modelTypes.length],
      size: sizes[i % sizes.length],
      owner: i % 2 === 0 ? "Novusha Logistics Pvt Ltd" : "Suraj Forwarders",
      policyFromDate,
      policyToDate,
      insuranceCompany: insurers[i % insurers.length],
      policyNo: `POL-EXIM-${100000 + i * 237}`,
      gvw: 40000 + i * 150,
      idv: oldIdv,
      premiumAmount,
      remarks: `Automated test vehicle record ${i}`,
      ncbPercentage: (i % 5) * 10,
      premium: premiumAmount - 2000,
      thisYearIdv: oldIdv,
      newIdv,
      newNcbPercentage: ((i % 5) + 1) * 10,
      rsdTaken: i % 4 === 0 ? 1 : 0,
      imt23: i % 5 === 0 ? 1200 : Math.floor(200 + Math.random() * 600),
      zeroDepTowingCover: i % 2 === 0 ? "YES" : "NO",
      premiumQuote: premiumAmount + 1500,
      renewed: isRenewed,
      newExpiryDate: isRenewed === "YES" ? daysAhead(365 + 185 - (i * 5)) : null,
      renewedDate: isRenewed === "YES" ? daysAgo(1) : null,

      // F Data-NEW fields
      renewalDate: isRenewed === "YES" ? daysAgo(5 + i) : null,
      engineNumber: `${["NDE", "40M", "51H", "70K", "61G"][i % 5]}${String(400000 + i * 1234).padStart(9, "0")}`,
      chassisNumber: `MAT${String(440000 + i * 2345).padStart(12, "0")}`,
      cubicCapacityKw: `5883 / ${40000 + i * 150}`,
      mfgYear: `${2012 + (i % 10)} / ${String(regDate.getDate()).padStart(2, "0")}-${String(regDate.getMonth() + 1).padStart(2, "0")}-${regDate.getFullYear()}`,
      electricalAccessoriesIdv: i % 3 === 0 ? 12000 : 10000,
      cngKitIdv: i % 4 === 0 ? 50000 : 0,
      totalIdv: oldIdv + (i % 3 === 0 ? 12000 : 10000) + (i % 4 === 0 ? 50000 : 0),
      odPremium: Math.floor(1200 + Math.random() * 3000),
      imt24: i % 3 === 0 ? Math.floor(200 + Math.random() * 400) : 0,
      imt25: i % 4 === 0 ? Math.floor(100 + Math.random() * 300) : 0,
      totalOdPremium: Math.floor(2000 + Math.random() * 3000),
      imt17: i % 2 === 0 ? 50 : 0,
      imt252: i % 5 === 0 ? 60 : 0,
      imt28: i % 3 === 0 ? 50 : 0,
      imt29: i % 4 === 0 ? 50 : 0,
      liabilityPremium: Math.floor(42000 + Math.random() * 4000),
      totalGst: Math.floor(2200 + Math.random() * 1500),
      totalPolicyPremium: premiumAmount + Math.floor(2200 + Math.random() * 1500),

      quotations: [
        { insuranceCompany: "ICICI Lombard", idv: newIdv, odPremium: 18000, liabilityPremium: 12000, totalPremium: 30000 },
        { insuranceCompany: "HDFC ERGO", idv: newIdv - 20000, odPremium: 17500, liabilityPremium: 12000, totalPremium: 29500 },
        { insuranceCompany: "Tata AIG", idv: newIdv + 30000, odPremium: 19000, liabilityPremium: 12000, totalPremium: 31000 }
      ],
      selectedInsurerL1: "HDFC ERGO",
      reasonForSelection: "Lowest commercial premium with matching IDV benefits."
    };
    dummyRecords.push(record);
  }

  await FleetInsuranceSopModel.insertMany(dummyRecords);
  console.log(`Successfully seeded ${dummyRecords.length} Fleet Insurance records.`);
};

const seedRmProcurement = async () => {
  console.log("Seeding RM Procurement SOP...");
  await RmProcurementSopModel.deleteMany({});

  const statuses = [
    "Draft",
    "Sales Order",
    "PR Raised",
    "Quotation Received",
    "Pricing Validated",
    "Finance Approved",
    "Payment Done",
    "Order Placed",
    "GRN Done",
    "Closed"
  ];

  const customers = [
    "Reliance Industries Ltd",
    "Supreme Industries",
    "Nilkamal Crates",
    "Wipro Enterprises",
    "Amul Dairy Products",
    "Adani Ports & SEZ"
  ];

  const suppliersList = [
    { name: "Reliance Poly Distributors", contact: "Dinesh Shah", email: "dinesh@reliancepoly.com", phone: "+91 98222 11111", gst: "24AAACR1234A1Z1" },
    { name: "Eco Recycling Solutions", contact: "Mahesh Pal", email: "mahesh@ecorecycling.com", phone: "+91 98111 22222", gst: "27BBBPS5678B1Z2" },
    { name: "Spectrum Colours & Masterbatch", contact: "Naresh Patel", email: "naresh@spectrum.com", phone: "+91 94444 33333", gst: "24CCCHT4455C1ZC" }
  ];

  const dummyPRs = [];

  for (let i = 1; i <= 15; i++) {
    // Distribute statuses across the 15 records
    const status = statuses[(i - 1) % statuses.length];
    const prNumber = `PR-RM-2026-${String(1000 + i)}`;
    const salesOrderRefNo = `SO-2026-${String(200 + i)}`;

    // Base Stage 1
    const stage1 = {
      customerName: customers[i % customers.length],
      customerContactPoNo: `PO-RM-${90000 + i * 47}`,
      orderDate: daysAgo(30 - i),
      requiredDeliveryDate: daysAhead(15 + i),
      salesPersonName: ["Rajesh Kumar", "Vijay Sharma", "Nisha Patel"][i % 3],
      salesOrderRefNo,
      productLines: [
        { sNo: 1, productType: "HDPE Crate Model A", binSize: "600x400x300 mm", bottomType: "Flat", handleType: "Open", lidRequired: "Yes", colour: "Blue", qtyOrdered: 500 + i * 50, estUnitWeight: 1.5 }
      ],
      rmEstimates: [
        { rmType: "Virgin HDPE Granule", grade: "ICOL-180M50", requiredQty: 1000 + i * 100, unit: "kg", currentStock: 200, netRmToPurchase: 800 + i * 100 },
        { rmType: "rHDPE Granule (Recycled)", grade: "Blue / Grey Grade", requiredQty: 300, unit: "kg", currentStock: 50, netRmToPurchase: 250 },
        { rmType: "Colour Masterbatch", grade: "Blue / Grey", requiredQty: 50, unit: "kg", currentStock: 10, netRmToPurchase: 40 }
      ],
      partitionDetails: {
        binCrateSize: "600x400x300 mm",
        noOfPartitions: "2",
        partitionSize: "580x280 mm",
        noOfPocketPartitions: "0",
        partitionMaterialColour: "Grey PP",
        specialInstructions: "Heavy-duty reinforcement required for structural base."
      },
      productionTimeline: {
        estProductionStartDate: daysAgo(10 - i),
        estCompletionDate: daysAhead(10 + i),
        productionHeadIntimatedOn: daysAgo(12 - i),
        rmRequiredByDate: daysAgo(8 - i)
      },
      signOff: {
        salesPersonSignatureName: ["Rajesh Kumar", "Vijay Sharma", "Nisha Patel"][i % 3],
        salesPersonDate: daysAgo(30 - i),
        reviewedByProductionHead: "Amit Sharma",
        productionHeadDate: daysAgo(29 - i)
      }
    };

    // Stage 2
    let stage2 = {};
    if (i > 1) { // Populate Stage 2 for statuses other than Draft
      stage2 = {
        prNumber,
        prDate: daysAgo(28 - i),
        raisedBy: "Vijay Singh (Store)",
        contactNumber: "+91 99999 88888",
        salesOrderRefNo,
        rmRequiredByDate: daysAgo(8 - i),
        rawMaterials: [
          { sNo: 1, rmType: "Virgin HDPE Granule", grade: "ICOL-180M50", requiredQty: 800 + i * 100, unit: "kg", preferredSupplier: "Reliance Poly Distributors", requiredCertificatesDocuments: "COA, MSDS, Test Report" },
          { sNo: 2, rmType: "rHDPE Granule (Recycled)", grade: "Blue / Grey Grade", requiredQty: 250, unit: "kg", preferredSupplier: "Eco Recycling Solutions", requiredCertificatesDocuments: "Material Quality Declaration" }
        ],
        binProductReference: {
          binCrateTypesRequired: "HDPE Crate Model A",
          totalProductionQuantity: `${500 + i * 50} Crates`,
          totalEstimatedRmWeight: `${1000 + i * 100} kg`
        },
        productionHeadApproval: {
          productionHeadName: "Amit Sharma",
          approvalDate: daysAgo(27 - i),
          approvalDecision: "APPROVED",
          remarks: "Requirement validated. Proceed with procurement.",
          signatureApprovalMode: "In-Person"
        },
        actionLog: [
          { step: 1, actionTask: "PR raised by factory person", responsiblePerson: "Vijay Singh", dateTime: daysAgo(28 - i), status: "Done" },
          { step: 2, actionTask: "Reviewed & approved by Production Head", responsiblePerson: "Amit Sharma", dateTime: daysAgo(27 - i), status: "Done" }
        ]
      };
    }

    // Stage 3
    let stage3 = {};
    if (i > 3) { // Populate Stage 3 onwards
      stage3 = {
        prNumber,
        comparisonDate: daysAgo(26 - i),
        purchaseOfficerName: "Nitin Patil",
        contactNumber: "+91 88888 77777",
        suppliers: suppliersList.map(s => ({
          supplierName: s.name,
          contactPerson: s.contact,
          phone: s.phone,
          email: s.email,
          gstNumber: s.gst,
          virginHdpe: { ratePerKg: 105 + (i % 3), qtyAvailable: 5000, brandOrigin: "Reliance Industries", certificatesProvided: "COA, MSDS" },
          rhdpe: { ratePerKg: 62 + (i % 2), materialQualityDeclarationProvided: "Yes" },
          colourMasterbatch: { ratePerKg: 175, tdsProvided: "Yes" },
          uvMasterbatch: { ratePerKg: 210, tdsProvided: "Yes" },
          general: { paymentTerms: "30 days credit", deliveryTimeline: "3 days", minimumOrderQuantity: "1000 kg", discountSpecialOffer: "2% early payment discount", remarks: "L1 for bulk purchase" }
        })),
        selectedSupplierL1: "Reliance Poly Distributors",
        l1OverallRate: 105 + (i % 3),
        reasonForSelection: "Lowest quote for Virgin HDPE with quick delivery timeframe.",
        estTotalOrderValue: 85000 + i * 2000,
        documentsVerified: { coa: true, msds: true, mfgCert: true, materialQualityDecl: true, tdsCm: true, tdsUv: true },
        declaration: "Quotations verified against checklist. Selecting L1 supplier.",
        actionLog: [
          { step: 1, actionTask: "Quotations collected (min 2-3 per RM type)", responsiblePerson: "Nitin Patil", dateTime: daysAgo(26 - i), status: "Done" },
          { step: 2, actionTask: "Document checklist verified for L1 supplier", responsiblePerson: "Nitin Patil", dateTime: daysAgo(25 - i), status: "Done" }
        ]
      };
    }

    // Stage 4
    let stage4 = {};
    if (i > 4) {
      stage4 = {
        prNumber,
        dateReceivedFromPo: daysAgo(24 - i),
        selectedSupplierL1: "Reliance Poly Distributors",
        totalOrderValue: 85000 + i * 2000,
        pricingTeamMember: "Karan Mehta (Costing)",
        validationDate: daysAgo(23 - i),
        rateValidations: [
          { rmType: "Virgin HDPE Granule", l1QuotedRate: 105 + (i % 3), marketRate: 104, acceptable: "Yes", remarks: "Within +/- 5% range" },
          { rmType: "rHDPE Granule", l1QuotedRate: 62 + (i % 2), marketRate: 60, acceptable: "Yes", remarks: "Valid rate" }
        ],
        overallChecklist: {
          last3PoRatesCompared: "Yes",
          marketBenchmarkVerified: "Yes",
          rmDocumentsAttachedVerified: "Yes",
          supplierGstCredentialsChecked: "Yes",
          noAbnormalDeviation: "Yes"
        },
        decision: {
          validationResult: "VALIDATED",
          remarks: "Pricing is in line with current index rates.",
          validatedBy: "Karan Mehta",
          signatureDate: daysAgo(23 - i)
        },
        actionLog: [
          { step: 1, actionTask: "Rate validation completed against market benchmark", responsiblePerson: "Karan Mehta", dateTime: daysAgo(23 - i), status: "Done" }
        ]
      };
    }

    // Stage 5
    let stage5 = {};
    if (i > 5) {
      stage5 = {
        prNumber,
        pricingValidationDate: daysAgo(23 - i),
        selectedSupplierL1: "Reliance Poly Distributors",
        totalOrderValue: 85000 + i * 2000,
        purchaseOfficerName: "Nitin Patil",
        dateReceivedByFinance: daysAgo(22 - i),
        reviewChecklist: {
          budgetAvailable: "Yes",
          pricingValidationAttached: "Yes",
          l1RateWithinBudget: "Yes",
          supplierGstVerified: "Yes",
          paymentTermsAcceptable: "Yes",
          supportingDocumentsComplete: "Yes"
        },
        decision: {
          decision: "APPROVED",
          remarksRejectionReason: "Approved for direct procurement."
        },
        signOff: {
          financeManagerName: "Siddharth Sen",
          dateOfApproval: daysAgo(21 - i),
          signatureDigitalApprovalRef: `FIN-APP-RM-${8000 + i}`,
          timeOfApproval: "11:30 AM"
        },
        actionLog: [
          { step: 1, actionTask: "Finance review checklist completed", responsiblePerson: "Siddharth Sen", dateTime: daysAgo(21 - i), status: "Done" }
        ]
      };
    }

    // Stage 6
    let stage6 = {};
    if (i > 6) {
      stage6 = {
        prNumber,
        financeApprovalDate: daysAgo(21 - i),
        supplierName: "Reliance Poly Distributors",
        totalPaymentAmount: 85000 + i * 2000,
        supplierBankDetails: {
          accountName: "Reliance Poly Distributors Ltd",
          bankName: "HDFC Bank",
          accountNumber: `9090123456${10 + i}`,
          ifscCode: "HDFC0000123",
          accountType: "Current Account",
          branch: "Navrangpura Branch",
          upiVpa: ""
        },
        paymentDetails: {
          paymentMethod: "NEFT",
          paymentDate: daysAgo(20 - i),
          amountPaid: 85000 + i * 2000,
          utrReferenceNo: `HDFCN${2600000 + i * 987}`,
          bankPlatformUsed: "HDFC NetBanking",
          timeOfTransfer: "03:15 PM"
        },
        accountingSignOff: {
          processedByName: "Ashok Verma (Accounts)",
          designation: "Sr. Accountant",
          signatureApprovalRef: `TXN-RM-${5000 + i}`,
          dateConfirmed: daysAgo(20 - i)
        },
        utrIntimation: {
          utrSharedWithPurchaseOfficerOn: daysAgo(20 - i),
          modeOfSharing: "WhatsApp"
        },
        actionLog: [
          { step: 1, actionTask: "Payment processed and UTR recorded", responsiblePerson: "Ashok Verma", dateTime: daysAgo(20 - i), status: "Done" }
        ]
      };
    }

    // Stage 7
    let stage7 = {};
    if (i > 7) {
      stage7 = {
        prNumber,
        utrPaymentReference: `HDFCN${2600000 + i * 987}`,
        supplierName: "Reliance Poly Distributors",
        supplierContactNo: "+91 98222 11111",
        orderPlacedBy: "Nitin Patil",
        orderPlacedDate: daysAgo(19 - i),
        supplierOrderConfirmationRef: `CONF-RP-${4000 + i}`,
        confirmationMode: "Email",
        followUpLog: [
          { date: daysAgo(18 - i), followUpMode: "Phone", personSpokenTo: "Dinesh Shah", supplierUpdateCommitment: "Dispatched from plant today.", nextFollowUpDate: daysAgo(17 - i) }
        ],
        dispatchDetails: {
          dispatchDate: daysAgo(18 - i),
          expectedDeliveryDate: daysAgo(16 - i),
          pickUpLoadingLocation: "Reliance Plant (Dahej, Gujarat)",
          deliveryLocation: "SRCC Factory Store (Amdavad)",
          lrNumber: `LR-GRC-${12000 + i}`,
          dcNumber: `DC-RP-${8900 + i}`,
          invoiceNumber: `INV-RP-${7600 + i}`,
          invoiceAmount: 85000 + i * 2000,
          transportCompanyName: "Gujarat Road Carrier",
          transporterContactNo: "+91 98980 98980",
          driverName: "Ram Singh",
          driverContactNumber: "+91 90000 11111",
          vehicleNumber: `GJ-16-Z-${1000 + i}`,
          noOfBagsPackagesDispatched: `${20 + i} Bags`,
          totalWeightDispatchedKg: 1000 + i * 100,
          materialTrackingEWayBillNo: `EW-${45000000 + i * 324}`
        },
        rmDispatchBreakdown: [
          { rmType: "Virgin HDPE Granule", grade: "ICOL-180M50", qtyDispatchedKg: 800 + i * 100, noOfBags: `${16 + i} Bags`, batchNo: `B-HDPE-${300 + i}`, remarks: "Standard delivery" }
        ]
      };
    }

    // Stage 8
    let stage8 = {};
    if (i > 8) {
      stage8 = {
        grnNumber: `GRN-RM-2026-${String(400 + i)}`,
        dateOfReceipt: daysAgo(15 - i),
        prNumber,
        poOrderReferenceNo: `CONF-RP-${4000 + i}`,
        supplierName: "Reliance Poly Distributors",
        supplierContactNo: "+91 98222 11111",
        lrDcNumber: `LR-GRC-${12000 + i} / DC-RP-${8900 + i}`,
        invoiceNumber: `INV-RP-${7600 + i}`,
        vehicleNumber: `GJ-16-Z-${1000 + i}`,
        noOfBagsPackagesReceived: `${20 + i} Bags`,
        rmReceiptInspection: [
          { rmType: "Virgin HDPE Granule", grade: "ICOL-180M50", orderedQty: 800 + i * 100, receivedQty: 800 + i * 100, physicalCondition: "OK", documentsReceived: { coa: true, tds: false, mqd: false }, acceptedRejected: "Accepted", batchLotNo: `B-HDPE-${300 + i}` }
        ],
        documentChecklist: {
          virginHdpeCoa: "Yes",
          virginHdpeMsds: "Yes",
          virginHdpeMfgCert: "Yes",
          virginHdpeTestReport: "Yes",
          rhdpeMqd: "Yes",
          colourMasterbatchTds: "Yes",
          uvMasterbatchTds: "Yes",
          invoiceMatchesPo: "Yes",
          eWayBillReceived: "Yes"
        },
        qualityInspectionNotes: "Material received in perfect condition. Certificates verified.",
        approvals: [
          { role: "Received & Inspected By (QC / Store Manager)", name: "Satish Dave", signature: "Satish", date: daysAgo(15 - i), status: "GRN Done" },
          { role: "GRN Verified By (Production Head)", name: "Amit Sharma", signature: "Amit", date: daysAgo(14 - i), status: "GRN Done" },
          { role: "PR Closed By (Purchase Officer)", name: "Nitin Patil", signature: "Nitin", date: daysAgo(13 - i), status: "PR Closed" }
        ]
      };
    }

    dummyPRs.push({
      prNumber,
      salesOrderRefNo,
      status,
      stage1,
      stage2,
      stage3,
      stage4,
      stage5,
      stage6,
      stage7,
      stage8
    });
  }

  for (const record of dummyPRs) {
    try {
      await RmProcurementSopModel.create([record], { validateBeforeSave: false });
    } catch (err) {
      console.error(`Error inserting PR ${record.prNumber}:`, err.message);
    }
  }

  console.log(`Successfully seeded ${dummyPRs.length} RM Procurement records.`);
};

const seedTyreProcurement = async () => {
  console.log("Seeding Tyre Procurement SOP...");
  await TyreProcurementSopModel.deleteMany({});

  const statuses = [
    "Draft",
    "PR Raised",
    "Quotation Received",
    "Finance Approved",
    "Payment Done",
    "Order Placed",
    "GRN Done",
    "Closed"
  ];

  const preparedByNames = ["Ramesh Sharma", "Subhash Chandra", "Deepak Roy", "Amit Patel"];
  const suppliers = [
    { name: "Mundra Tyre Zone", contact: "Kirti Bhai", phone: "+91 98989 12345", email: "kirti@mundratyres.com", gst: "24AAAHT9988A1ZA" },
    { name: "Kutch Fleet Solutions", contact: "Dhiren Vyas", phone: "+91 97777 66666", email: "dhiren@kutchfleet.com", gst: "24BBBHT1122B1ZB" },
    { name: "Gujarat Tyre Distributors", contact: "Naresh Patel", phone: "+91 94444 33333", email: "naresh@gujarattyre.com", gst: "24CCCHT4455C1ZC" }
  ];

  const dummyTyres = [];

  for (let i = 1; i <= 15; i++) {
    const status = statuses[(i - 1) % statuses.length];
    const prNumber = `PR-TYRE-2026-${String(1000 + i)}`;
    const poNumber = `PO-TYRE-${String(3000 + i)}`;

    // Stage 1
    const stage1 = {
      prNumber,
      prDate: daysAgo(25 - i),
      preparedBy: preparedByNames[i % preparedByNames.length],
      contactNumber: `+91 98765 000${10 + i}`,
      departmentLocation: "Mundra Workshop Base",
      neededByDate: daysAhead(10 + i),
      hodValidation: {
        validatedBy: "Amit Patel (HoD Fleet)",
        designation: "Fleet Operations Head",
        approvalMode: "WhatsApp",
        dateTimeOfApproval: daysAgo(24 - i),
        hodSignature: "AP-APPROVED"
      },
      itemsRequired: [
        { sNo: 1, tyreType: "New Tyre", brandPreference: "MRF", sizeSpec: "10.00R20", loadRating: "146/143K", rimSize: "7.5-20", qty: 4, estUnitCost: 16000, estTotal: 64000 },
        { sNo: 2, tyreType: "Remould Tyre", brandPreference: "Apollo Retread", sizeSpec: "10.00R20", loadRating: "146/143K", rimSize: "7.5-20", qty: 2, estUnitCost: 8000, estTotal: 16000 }
      ],
      estimatedTotalCost: 80000,
      specificationDetails: "High performance radial tires for long-distance multi-axle trailers.",
      preferredSupplier: "Mundra Tyre Zone",
      supplierContact: "+91 98989 12345",
      currentStockNew: 2,
      currentStockUsedRemould: 4,
      comments: `Fleet vehicle maintenance batch ${i}`,
      routingChecklist: [
        { step: "Step 1", action: "PR Raised by Requester", responsible: preparedByNames[i % preparedByNames.length], date: daysAgo(25 - i), status: "Done" },
        { step: "Step 2", action: "Validated by HoD", responsible: "Amit Patel", date: daysAgo(24 - i), status: "Done" }
      ]
    };

    // Stage 2
    let stage2 = {};
    if (i > 1) {
      stage2 = {
        prNumber,
        poNumber,
        purchaseOfficerName: "Sanjay Shah (Purchase Officer)",
        poDate: daysAgo(23 - i),
        suppliers: suppliers.map(s => ({
          supplierName: s.name,
          contactPerson: s.contact,
          phoneNumber: s.phone,
          emailWhatsApp: s.email,
          gstNumber: s.gst,
          tyreBrand: "MRF S3C8 / Apollo",
          sizeSpecification: "10.00R20",
          unitPriceNew: 15800 + i * 50,
          unitPriceRemould: 7800 + i * 50,
          qtyAvailable: 12,
          freightCharges: 1000,
          deliveryTimeline: "2 Days",
          deliveryLocation: "Mundra Workshop",
          warrantyGuarantee: "1 Year Standard Warranty",
          paymentTerms: "30 Days Credit",
          discountOffered: 500,
          remarks: "Approved dealer rates"
        })),
        selectedSupplierL1: "Mundra Tyre Zone",
        l1PriceQuoted: 15800 + i * 50,
        reasonForSelection: "Lowest commercial quote with favorable delivery timeline.",
        totalOrderValue: 80000 + i * 150,
        declaration: "Quotations obtained and qualified L1 vendor selected.",
        routingChecklist: [
          { step: "Step 1", action: "Quotations collected", responsible: "Sanjay Shah", date: daysAgo(23 - i), status: "Done" }
        ]
      };
    }

    // Stage 3
    let stage3 = {};
    if (i > 3) {
      stage3 = {
        poNumber,
        poDate: daysAgo(22 - i),
        selectedSupplierL1: "Mundra Tyre Zone",
        totalOrderValue: 80000 + i * 150,
        purchaseOfficerName: "Sanjay Shah",
        dateReceivedByFinance: daysAgo(21 - i),
        reviewChecklist: {
          budgetAvailable: "Yes",
          priceReasonable: "Yes",
          gstVerified: "Yes",
          paymentTermsAccepted: "Yes",
          docsAttached: "Yes"
        },
        decision: {
          decision: "APPROVED",
          remarksRejectionReason: "Verified within workshop budget limits."
        },
        signOff: {
          financeManagerName: "Kamlesh Mehta",
          dateOfApproval: daysAgo(21 - i),
          signatureDigitalApprovalRef: `FIN-TYRE-${7000 + i}`,
          timeOfApproval: "02:00 PM"
        }
      };
    }

    // Stage 4
    let stage4 = {};
    if (i > 4) {
      stage4 = {
        poNumberDate: `${poNumber} dated ${daysAgo(22 - i).toLocaleDateString("en-GB")}`,
        financeApprovalDate: daysAgo(21 - i),
        supplierName: "Mundra Tyre Zone",
        totalPaymentAmount: 80000 + i * 150,
        supplierBankDetails: {
          accountName: "Mundra Tyre Zone",
          bankName: "State Bank of India",
          accountNumber: `3300112233${40 + i}`,
          ifscCode: "SBIN0001234",
          accountType: "Current Account",
          branch: "Mundra Port Branch",
          upiVpa: "mundratyres@sbi"
        },
        paymentDetails: {
          paymentMethod: "RTGS",
          paymentDate: daysAgo(20 - i),
          amountPaid: 80000 + i * 150,
          paymentReferenceUtr: `SBINR5202606${10000 + i}`,
          bankAppUsed: "SBI Corporate NetBanking",
          timeOfTransfer: "04:30 PM"
        },
        accountingSignOff: {
          processedByName: "Narendra Joshi (Accounts)",
          designation: "Assistant Accountant",
          signatureApprovalRef: `PAY-TYRE-${9000 + i}`,
          dateConfirmed: daysAgo(20 - i)
        },
        utrSharing: {
          utrSharedWithPoOn: daysAgo(20 - i),
          modeOfSharing: "WhatsApp"
        }
      };
    }

    // Stage 5
    let stage5 = {};
    if (i > 5) {
      stage5 = {
        prNumber,
        poNumber,
        supplierName: "Mundra Tyre Zone",
        utrNumber: `SBINR5202606${10000 + i}`,
        orderPlacedBy: "Sanjay Shah",
        orderPlacedDate: daysAgo(19 - i),
        orderConfirmation: `CONF-TYRE-${1000 + i}`,
        modeOfConfirmation: "Email",
        dispatchDetails: {
          dispatchDate: daysAgo(18 - i),
          expectedDeliveryDate: daysAgo(17 - i),
          vehicleNumber: `GJ-12-AT-${2000 + i}`,
          transporterName: "Mundra Local Logistics",
          driverName: "Sohan Singh",
          driverContactNumber: "+91 90000 55555",
          dcNumber: `DC-MTZ-${900 + i}`,
          lrNumber: `LR-MLL-${500 + i}`,
          invoiceNumber: `INV-MTZ-${600 + i}`,
          invoiceAmount: 80000 + i * 150,
          deliveryLocationSite: "Mundra Workshop",
          noOfTyresDispatched: 6
        },
        remarks: "Tyres loaded and in transit."
      };
    }

    // Stage 6
    let stage6 = {};
    if (i > 6) {
      stage6 = {
        grnSeriesNo: `GRN-TYRE-2026-${String(200 + i)}`,
        dateOfReceipt: daysAgo(16 - i),
        prNumber,
        poNumber,
        supplierName: "Mundra Tyre Zone",
        supplierContactNo: "+91 98989 12345",
        deliveryNoteDcNo: `DC-MTZ-${900 + i}`,
        lrNumber: `LR-MLL-${500 + i}`,
        vehicleNumber: `GJ-12-AT-${2000 + i}`,
        deliveryLocation: "Mundra Workshop Base",
        itemsReceived: [
          { sNo: 1, tyreNumber: `MRF-R-${99000 + i * 10}`, tyreBrand: "MRF", sizeSpec: "10.00R20", type: "New", hotStampDone: "Yes", photoTaken: "Yes", acceptedRejected: "Accepted", remarks: "Verified OK" },
          { sNo: 2, tyreNumber: `APL-REM-${55000 + i * 10}`, tyreBrand: "Apollo", sizeSpec: "10.00R20", type: "Remould", hotStampDone: "Yes", photoTaken: "Yes", acceptedRejected: "Accepted", remarks: "Verified OK" }
        ],
        qualityConformanceCheck: {
          tyresVerified: "Yes",
          tyreNumbersMatched: "Yes",
          hotStampingCompleted: "Yes",
          photosTaken: "Yes",
          invoiceVerified: "Yes",
          returnClauseReviewed: "Yes"
        },
        inspectionNotes: "Received goods conform to PO details. Unique codes stenciled.",
        approvals: [
          { role: "Received By (Site Person)", name: "Harish Gadhvi", date: daysAgo(16 - i), signature: "Harish" },
          { role: "Validated by – Maintenance Manager", name: "Devendra Rawat", date: daysAgo(15 - i), signature: "Devendra" },
          { role: "Reviewed by – Purchase Officer", name: "Sanjay Shah", date: daysAgo(14 - i), signature: "Sanjay" }
        ]
      };
    }

    dummyTyres.push({
      prNumber,
      poNumber,
      status,
      stage1,
      stage2,
      stage3,
      stage4,
      stage5,
      stage6
    });
  }

  for (const record of dummyTyres) {
    try {
      await TyreProcurementSopModel.create([record], { validateBeforeSave: false });
    } catch (err) {
      console.error(`Error inserting Tyre PR ${record.prNumber}:`, err.message);
    }
  }

  console.log(`Successfully seeded ${dummyTyres.length} Tyre Procurement records.`);
};

const runSeeding = async () => {
  try {
    console.log(`Connecting to MongoDB at: ${MONGODB_URI}`);
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected successfully to DB.");

    await seedFleetInsurance();
    await seedRmProcurement();
    await seedTyreProcurement();

    console.log("All tables seeded successfully!");
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
    process.exit(0);
  } catch (error) {
    console.error("Seeding process failed:", error);
    process.exit(1);
  }
};

runSeeding();
