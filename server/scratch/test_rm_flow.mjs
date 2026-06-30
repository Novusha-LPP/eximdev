import axios from "axios";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

const API_KEY = process.env.JWT_SECRET || "3c7c6bab80b4ca6f1980fe6c99ca20e6265ea2ed27b83fc355ab30bee18030ad";
const BASE_URL = "http://localhost:9006/api";

const headers = {
  "x-api-key": API_KEY,
  "Content-Type": "application/json"
};

const args = process.argv.slice(2);
const step = parseInt(args[0], 10);
const id = args[1];

if (isNaN(step) || step < 1 || step > 8) {
  console.log("Usage: node scratch/test_rm_flow.mjs <step_number> [document_id]");
  process.exit(1);
}

if (step > 1 && !id) {
  console.log("Error: document_id is required for steps 2 to 8");
  process.exit(1);
}

// Generate unique PR Number based on timestamp to avoid collision
const getPrNumber = () => {
  const ts = Math.floor(Date.now() / 1000) % 10000;
  return `PR-HDPE-2026-${String(ts).padStart(4, '0')}`;
};

async function execute() {
  try {
    switch (step) {
      case 1: {
        const prNumber = getPrNumber();
        const payload = {
          prNumber,
          salesOrderRefNo: "SO-2026-0088",
          status: "Sales Order",
          stage1: {
            customerName: "Reliance Industries Ltd",
            customerContactPoNo: "PO-987654",
            orderDate: new Date(),
            requiredDeliveryDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // +20 days
            salesPersonName: "Rajesh Kumar",
            salesOrderRefNo: "SO-2026-0088",
            productLines: [
              {
                sNo: 1,
                productType: "HDPE Crate",
                binSize: "600x400x300 mm",
                bottomType: "Flat",
                handleType: "Open",
                lidRequired: "Yes",
                colour: "Blue",
                qtyOrdered: 1000,
                estUnitWeight: 1.5
              }
            ],
            rmEstimates: [
              {
                rmType: "Virgin HDPE Granule",
                grade: "ICOL-180M50",
                requiredQty: 1200,
                unit: "kg",
                currentStock: 500,
                netRmToPurchase: 700
              },
              {
                rmType: "rHDPE Granule (Recycled)",
                grade: "Blue / Grey Grade",
                requiredQty: 300,
                unit: "kg",
                currentStock: 100,
                netRmToPurchase: 200
              },
              {
                rmType: "Colour Masterbatch",
                grade: "Blue / Grey",
                requiredQty: 30,
                unit: "kg",
                currentStock: 10,
                netRmToPurchase: 20
              },
              {
                rmType: "UV Masterbatch",
                grade: "Standard UV Grade",
                requiredQty: 10,
                unit: "kg",
                currentStock: 2,
                netRmToPurchase: 8
              }
            ],
            partitionDetails: {
              binCrateSize: "600x400x300 mm",
              noOfPartitions: "2",
              partitionSize: "580x280 mm",
              noOfPocketPartitions: "0",
              partitionMaterialColour: "Grey PP",
              specialInstructions: "Handle with care, heavy load bins."
            },
            productionTimeline: {
              estProductionStartDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // +5 days
              estCompletionDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // +15 days
              productionHeadIntimatedOn: new Date(),
              rmRequiredByDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000)
            },
            signOff: {
              salesPersonSignatureName: "Rajesh Kumar",
              salesPersonDate: new Date(),
              reviewedByProductionHead: "Amit Sharma",
              productionHeadDate: new Date()
            }
          }
        };

        console.log(`[Step 1] Sending POST request to create PR: ${prNumber}`);
        const res = await axios.post(`${BASE_URL}/rm-procurement`, payload, { headers });
        console.log("✅ Stage 1 Complete!");
        console.log("Document ID:", res.data.data._id);
        console.log("PR Number:", res.data.data.prNumber);
        console.log("Status:", res.data.data.status);
        console.log("Created Customer Name:", res.data.data.stage1.customerName);
        break;
      }

      case 2: {
        const payload = {
          status: "PR Raised",
          stage2: {
            prNumber: "PR-HDPE-2026-TEMP", // Will be normalized on backend
            prDate: new Date(),
            raisedBy: "Vijay Singh (Store)",
            contactNumber: "+91 99999 88888",
            salesOrderRefNo: "SO-2026-0088",
            rmRequiredByDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
            rawMaterials: [
              { sNo: 1, rmType: "Virgin HDPE Granule", grade: "ICOL-180M50", requiredQty: 700, unit: "kg", preferredSupplier: "Reliance Poly", requiredCertificatesDocuments: "COA, MSDS, Test Report" },
              { sNo: 2, rmType: "rHDPE Granule (Recycled)", grade: "Blue / Grey Grade", requiredQty: 200, unit: "kg", preferredSupplier: "Eco Recycling Ltd", requiredCertificatesDocuments: "Material Quality Declaration" },
              { sNo: 3, rmType: "Colour Masterbatch", grade: "Blue / Grey", requiredQty: 20, unit: "kg", preferredSupplier: "Spectrum Colours", requiredCertificatesDocuments: "TDS" },
              { sNo: 4, rmType: "UV Masterbatch", grade: "Standard UV Grade", requiredQty: 8, unit: "kg", preferredSupplier: "Spectrum Colours", requiredCertificatesDocuments: "TDS" }
            ],
            binProductReference: {
              binCrateTypesRequired: "Flat Bottom Open Handle – 600×400×300",
              totalProductionQuantity: "1000 Bins",
              totalEstimatedRmWeight: "1500 kg"
            },
            productionHeadApproval: {
              productionHeadName: "Amit Sharma",
              approvalDate: new Date(),
              approvalDecision: "APPROVED",
              remarks: "PR is correct. Forward to Purchase Officer.",
              signatureApprovalMode: "In-Person"
            },
            actionLog: [
              { step: 1, actionTask: "PR raised by factory person", responsiblePerson: "Vijay Singh", dateTime: new Date(), status: "Done" },
              { step: 2, actionTask: "Reviewed & approved by Production Head", responsiblePerson: "Amit Sharma", dateTime: new Date(), status: "Done" }
            ]
          }
        };

        console.log(`[Step 2] Sending PUT request to update PR with ID: ${id}`);
        const res = await axios.put(`${BASE_URL}/rm-procurement/${id}`, payload, { headers });
        console.log("✅ Stage 2 Complete!");
        console.log("PR Number:", res.data.data.prNumber);
        console.log("Status:", res.data.data.status);
        console.log("PR Raised By:", res.data.data.stage2.raisedBy);
        break;
      }

      case 3: {
        const payload = {
          status: "Quotation Received",
          stage3: {
            prNumber: "PR-HDPE-2026-TEMP",
            comparisonDate: new Date(),
            purchaseOfficerName: "Nitin Patil",
            contactNumber: "+91 88888 77777",
            suppliers: [
              {
                supplierName: "Reliance Poly",
                contactPerson: "Dinesh Shah",
                phone: "+91 98222 11111",
                email: "dinesh@reliancepoly.com",
                gstNumber: "24AAACR1234A1Z1",
                virginHdpe: { ratePerKg: 110, qtyAvailable: 5000, brandOrigin: "Reliance Reliance", certificatesProvided: "COA, MSDS, Test Report" },
                rhdpe: { ratePerKg: 65, materialQualityDeclarationProvided: "Yes" },
                colourMasterbatch: { ratePerKg: 180, tdsProvided: "Yes" },
                uvMasterbatch: { ratePerKg: 220, tdsProvided: "Yes" },
                general: { paymentTerms: "30 days credit", deliveryTimeline: "3 days", minimumOrderQuantity: "1000 kg", discountSpecialOffer: "2% on immediate payment", remarks: "Reputed supplier, direct distributor" }
              },
              {
                supplierName: "Eco Recycling Ltd",
                contactPerson: "Mahesh Pal",
                phone: "+91 98111 22222",
                email: "mahesh@ecorecycling.com",
                gstNumber: "27BBBPS5678B1Z2",
                virginHdpe: { ratePerKg: 115, qtyAvailable: 2000, brandOrigin: "IOCL", certificatesProvided: "COA" },
                rhdpe: { ratePerKg: 60, materialQualityDeclarationProvided: "Yes" },
                colourMasterbatch: { ratePerKg: 190, tdsProvided: "Yes" },
                uvMasterbatch: { ratePerKg: 240, tdsProvided: "Yes" },
                general: { paymentTerms: "Advance payment", deliveryTimeline: "5 days", minimumOrderQuantity: "500 kg", discountSpecialOffer: "None", remarks: "Quoted lower rHDPE rate" }
              }
            ],
            selectedSupplierL1: "Reliance Poly",
            l1OverallRate: 110,
            reasonForSelection: "Reliance Poly has direct distribution authorization and offers lowest unit rates for HDPE. Document verification completed.",
            estTotalOrderValue: 94360, // Calculated manually: (700*110) + (200*65) + (20*180) + (8*220) = 77000 + 13000 + 3600 + 1760 = 95360
            documentsVerified: { coa: true, msds: true, mfgCert: true, materialQualityDecl: true, tdsCm: true, tdsUv: true },
            declaration: "I confirm the above comparison sheet is accurate and L1 selected based on best commercial terms and technical compliance.",
            actionLog: [
              { step: 1, actionTask: "Quotations collected (min 2–3 per RM type)", responsiblePerson: "Nitin Patil", dateTime: new Date(), status: "Done" },
              { step: 2, actionTask: "Document checklist verified for L1 supplier", responsiblePerson: "Nitin Patil", dateTime: new Date(), status: "Done" },
              { step: 3, actionTask: "Sent to Pricing Team for validation", responsiblePerson: "Nitin Patil", dateTime: new Date(), status: "Done" }
            ]
          }
        };

        console.log(`[Step 3] Sending PUT request to update PR with ID: ${id}`);
        const res = await axios.put(`${BASE_URL}/rm-procurement/${id}`, payload, { headers });
        console.log("✅ Stage 3 Complete!");
        console.log("Status:", res.data.data.status);
        console.log("Selected Supplier L1:", res.data.data.stage3.selectedSupplierL1);
        console.log("Est Total Order Value (₹):", res.data.data.stage3.estTotalOrderValue);
        break;
      }

      case 4: {
        const payload = {
          status: "Pricing Validated",
          stage4: {
            prNumber: "PR-HDPE-2026-TEMP",
            dateReceivedFromPo: new Date(),
            selectedSupplierL1: "Reliance Poly",
            totalOrderValue: 95360,
            pricingTeamMember: "Karan Mehta (Costing)",
            validationDate: new Date(),
            rateValidations: [
              { rmType: "Virgin HDPE Granule (ICOL-180M50)", l1QuotedRate: 110, marketRate: 108, acceptable: "Yes", remarks: "Slight variance of 1.8%, within acceptable limit (+/- 5%)" },
              { rmType: "rHDPE Granule (Blue / Grey)", l1QuotedRate: 65, marketRate: 64, acceptable: "Yes", remarks: "Matches recent PO price" },
              { rmType: "Colour Masterbatch (Blue / Grey)", l1QuotedRate: 180, marketRate: 180, acceptable: "Yes", remarks: "Standard rate" },
              { rmType: "UV Masterbatch", l1QuotedRate: 220, marketRate: 225, acceptable: "Yes", remarks: "L1 rate is lower than market benchmark" }
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
              remarks: "Rates are validated against market benchmarks. Forwarding to Finance Manager for approval.",
              validatedBy: "Karan Mehta",
              signatureDate: new Date()
            },
            actionLog: [
              { step: 1, actionTask: "Rate validation completed against market benchmark", responsiblePerson: "Karan Mehta", dateTime: new Date(), status: "Done" },
              { step: 2, actionTask: "Document checklist confirmed", responsiblePerson: "Karan Mehta", dateTime: new Date(), status: "Done" },
              { step: 3, actionTask: "Forwarded to Finance Manager for approval", responsiblePerson: "Karan Mehta", dateTime: new Date(), status: "Done" }
            ]
          }
        };

        console.log(`[Step 4] Sending PUT request to update PR with ID: ${id}`);
        const res = await axios.put(`${BASE_URL}/rm-procurement/${id}`, payload, { headers });
        console.log("✅ Stage 4 Complete!");
        console.log("Status:", res.data.data.status);
        console.log("Validation Result:", res.data.data.stage4.decision.validationResult);
        console.log("Validated By:", res.data.data.stage4.pricingTeamMember);
        break;
      }

      case 5: {
        const payload = {
          status: "Finance Approved",
          stage5: {
            prNumber: "PR-HDPE-2026-TEMP",
            pricingValidationDate: new Date(),
            selectedSupplierL1: "Reliance Poly",
            totalOrderValue: 95360,
            purchaseOfficerName: "Nitin Patil",
            dateReceivedByFinance: new Date(),
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
              remarksRejectionReason: "Budget approved. Proceed to process advance/payment terms."
            },
            signOff: {
              financeManagerName: "Siddharth Sen",
              dateOfApproval: new Date(),
              signatureDigitalApprovalRef: "FIN-RM-2026-883",
              timeOfApproval: new Date().toLocaleTimeString()
            },
            actionLog: [
              { step: 1, actionTask: "Finance review checklist completed", responsiblePerson: "Siddharth Sen", dateTime: new Date(), status: "Done" },
              { step: 2, actionTask: "Purchase APPROVED decision recorded", responsiblePerson: "Siddharth Sen", dateTime: new Date(), status: "Done" },
              { step: 3, actionTask: "Forwarded to Accounting Team for payment processing", responsiblePerson: "Siddharth Sen", dateTime: new Date(), status: "Done" }
            ]
          }
        };

        console.log(`[Step 5] Sending PUT request to update PR with ID: ${id}`);
        const res = await axios.put(`${BASE_URL}/rm-procurement/${id}`, payload, { headers });
        console.log("✅ Stage 5 Complete!");
        console.log("Status:", res.data.data.status);
        console.log("Finance Decision:", res.data.data.stage5.decision.decision);
        console.log("Finance Manager Sign-Off Name:", res.data.data.stage5.signOff.financeManagerName);
        break;
      }

      case 6: {
        const payload = {
          status: "Payment Done",
          stage6: {
            prNumber: "PR-HDPE-2026-TEMP",
            financeApprovalDate: new Date(),
            supplierName: "Reliance Poly",
            totalPaymentAmount: 95360,
            supplierBankDetails: {
              accountName: "Reliance Poly Distributors Ltd",
              bankName: "HDFC Bank",
              accountNumber: "50200012345678",
              ifscCode: "HDFC0000123",
              accountType: "Current",
              branch: "Mumbai Main Branch",
              upiVpa: ""
            },
            paymentDetails: {
              paymentMethod: "NEFT",
              paymentDate: new Date(),
              amountPaid: 95360,
              utrReferenceNo: "HDFCN26171988883",
              bankPlatformUsed: "HDFC NetBanking",
              timeOfTransfer: new Date().toLocaleTimeString()
            },
            accountingSignOff: {
              processedByName: "Ashok Verma (Accounts)",
              designation: "Sr. Accountant",
              signatureApprovalRef: "TXN-998822",
              dateConfirmed: new Date()
            },
            utrIntimation: {
              utrSharedWithPurchaseOfficerOn: new Date(),
              modeOfSharing: "WhatsApp"
            },
            actionLog: [
              { step: 1, actionTask: "Payment processed and UTR recorded", responsiblePerson: "Ashok Verma", dateTime: new Date(), status: "Done" },
              { step: 2, actionTask: "Payment confirmation intimated to Purchase Officer", responsiblePerson: "Ashok Verma", dateTime: new Date(), status: "Done" },
              { step: 3, actionTask: "Purchase Officer authorised to place RM order", responsiblePerson: "Ashok Verma", dateTime: new Date(), status: "Done" }
            ]
          }
        };

        console.log(`[Step 6] Sending PUT request to update PR with ID: ${id}`);
        const res = await axios.put(`${BASE_URL}/rm-procurement/${id}`, payload, { headers });
        console.log("✅ Stage 6 Complete!");
        console.log("Status:", res.data.data.status);
        console.log("UTR Ref No:", res.data.data.stage6.paymentDetails.utrReferenceNo);
        console.log("Amount Paid (₹):", res.data.data.stage6.paymentDetails.amountPaid);
        break;
      }

      case 7: {
        const payload = {
          status: "Order Placed",
          stage7: {
            prNumber: "PR-HDPE-2026-TEMP",
            utrPaymentReference: "HDFCN26171988883",
            supplierName: "Reliance Poly",
            supplierContactNo: "+91 98222 11111",
            orderPlacedBy: "Nitin Patil",
            orderPlacedDate: new Date(),
            supplierOrderConfirmationRef: "RP-CONF-9833",
            confirmationMode: "Email",
            followUpLog: [
              { date: new Date(), followUpMode: "Phone", personSpokenTo: "Dinesh Shah", supplierUpdateCommitment: "Order processed, dispatch scheduled tomorrow.", nextFollowUpDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000) }
            ],
            dispatchDetails: {
              dispatchDate: new Date(),
              expectedDeliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // +2 days
              pickUpLoadingLocation: "Reliance Plant (Dahej, Gujarat)",
              deliveryLocation: "SRCC Factory Store (Amdavad)",
              lrNumber: "LR-99882",
              dcNumber: "DC-112233",
              invoiceNumber: "INV-RP-2026-4455",
              invoiceAmount: 95360,
              transportCompanyName: "Gujarat Road Carrier",
              transporterContactNo: "+91 98980 98980",
              driverName: "Ram Singh",
              driverContactNumber: "+91 90000 11111",
              vehicleNumber: "GJ-16-Z-1234",
              noOfBagsPackagesDispatched: "38 Bags",
              totalWeightDispatchedKg: 938, // 700 + 200 + 20 + 8 = 928kg + bag weights
              materialTrackingEWayBillNo: "EW-8822993388"
            },
            rmDispatchBreakdown: [
              { rmType: "Virgin HDPE Granule", grade: "ICOL-180M50", qtyDispatchedKg: 700, noOfBags: "28 Bags", batchNo: "LOT-HDPE-992", remarks: "Excellent grade" },
              { rmType: "rHDPE Granule", grade: "Blue / Grey", qtyDispatchedKg: 200, noOfBags: "8 Bags", batchNo: "LOT-RHDPE-004", remarks: "Recycled" },
              { rmType: "Colour Masterbatch", grade: "Blue / Grey", qtyDispatchedKg: 20, noOfBags: "1 Bag", batchNo: "LOT-CM-91", remarks: "Blue shade" },
              { rmType: "UV Masterbatch", grade: "Standard UV", qtyDispatchedKg: 8, noOfBags: "1 Bag", batchNo: "LOT-UV-32", remarks: "UV additive" }
            ]
          }
        };

        console.log(`[Step 7] Sending PUT request to update PR with ID: ${id}`);
        const res = await axios.put(`${BASE_URL}/rm-procurement/${id}`, payload, { headers });
        console.log("✅ Stage 7 Complete!");
        console.log("Status:", res.data.data.status);
        console.log("Vehicle Number:", res.data.data.stage7.dispatchDetails.vehicleNumber);
        console.log("Invoice Number:", res.data.data.stage7.dispatchDetails.invoiceNumber);
        break;
      }

      case 8: {
        const payload = {
          status: "GRN Done",
          stage8: {
            grnNumber: "GRN-RM-2026-0045",
            dateOfReceipt: new Date(),
            prNumber: "PR-HDPE-2026-TEMP",
            poOrderReferenceNo: "RP-CONF-9833",
            supplierName: "Reliance Poly",
            supplierContactNo: "+91 98222 11111",
            lrDcNumber: "LR-99882 / DC-112233",
            invoiceNumber: "INV-RP-2026-4455",
            vehicleNumber: "GJ-16-Z-1234",
            noOfBagsPackagesReceived: "38 Bags",
            rmReceiptInspection: [
              { rmType: "Virgin HDPE Granule", grade: "ICOL-180M50", orderedQty: 700, receivedQty: 700, physicalCondition: "OK", documentsReceived: { coa: true, tds: false, mqd: false }, acceptedRejected: "Accepted", batchLotNo: "LOT-HDPE-992" },
              { rmType: "rHDPE Granule", grade: "Blue / Grey", orderedQty: 200, receivedQty: 200, physicalCondition: "OK", documentsReceived: { coa: false, tds: false, mqd: true }, acceptedRejected: "Accepted", batchLotNo: "LOT-RHDPE-004" },
              { rmType: "Colour Masterbatch", grade: "Blue / Grey", orderedQty: 20, receivedQty: 20, physicalCondition: "OK", documentsReceived: { coa: false, tds: true, mqd: false }, acceptedRejected: "Accepted", batchLotNo: "LOT-CM-91" },
              { rmType: "UV Masterbatch", grade: "Standard UV", orderedQty: 8, receivedQty: 8, physicalCondition: "OK", documentsReceived: { coa: false, tds: true, mqd: false }, acceptedRejected: "Accepted", batchLotNo: "LOT-UV-32" }
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
            qualityInspectionNotes: "All raw materials received in proper physical condition. Quantity matches exactly with dispatch documents. Test reports and certificates verified. Approved for inventory storage.",
            returnRejectionNote: {
              rmToBeReturnedRejected: "",
              actionTakenSupplierNotifiedOn: null,
              creditReplacementExpectedBy: null
            },
            approvals: [
              { role: "Received & Inspected By (QC / Store Manager)", name: "Satish Dave", signature: "Satish", date: new Date(), status: "GRN Done" },
              { role: "GRN Verified By (Production Head)", name: "Amit Sharma", signature: "Amit", date: new Date(), status: "GRN Done" },
              { role: "PR Closed By (Purchase Officer)", name: "Nitin Patil", signature: "Nitin", date: new Date(), status: "PR Closed" }
            ]
          }
        };

        console.log(`[Step 8] Sending PUT request to update PR with ID: ${id}`);
        const res = await axios.put(`${BASE_URL}/rm-procurement/${id}`, payload, { headers });
        console.log("✅ Stage 8 Complete!");
        console.log("Status:", res.data.data.status);
        console.log("GRN Number:", res.data.data.stage8.grnNumber);
        console.log("Inspection Notes:", res.data.data.stage8.qualityInspectionNotes);
        console.log("PR marked CLOSED in inventory.");
        break;
      }
    }
  } catch (error) {
    console.error("❌ Step execution failed!");
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error("Message:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
}

execute();
