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

if (isNaN(step) || step < 1 || step > 6) {
  console.log("Usage: node scratch/test_tyre_flow.mjs <step_number> [document_id]");
  process.exit(1);
}

if (step > 1 && !id) {
  console.log("Error: document_id is required for steps 2 to 6");
  process.exit(1);
}

const getPrNumber = () => {
  const ts = Math.floor(Date.now() / 1000) % 10000;
  return `PR-TYRE-2026-${String(ts).padStart(4, '0')}`;
};

async function execute() {
  try {
    switch (step) {
      case 1: {
        const prNumber = getPrNumber();
        const payload = {
          prNumber,
          poNumber: `PO-TYRE-${prNumber.split("-").pop()}`,
          status: "PR Raised",
          stage1: {
            prNumber,
            prDate: new Date(),
            preparedBy: "Ramesh Sharma (Fleet Ops)",
            contactNumber: "+91 98765 43210",
            departmentLocation: "Mundra Port Workshop",
            neededByDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // +10 days
            hodValidation: {
              validatedBy: "Amit Patel (HoD Fleet)",
              designation: "General Manager - Operations",
              approvalMode: "WhatsApp",
              dateTimeOfApproval: new Date(),
              hodSignature: "AP-APPROVED"
            },
            itemsRequired: [
              {
                sNo: 1,
                tyreType: "New Tyre",
                brandPreference: "MRF",
                sizeSpec: "10.00R20",
                loadRating: "146/143K",
                rimSize: "7.5-20",
                qty: 4,
                estUnitCost: 16500,
                estTotal: 66000
              },
              {
                sNo: 2,
                tyreType: "Remould Tyre",
                brandPreference: "Apollo (Retread)",
                sizeSpec: "10.00R20",
                loadRating: "146/143K",
                rimSize: "7.5-20",
                qty: 2,
                estUnitCost: 8500,
                estTotal: 17000
              }
            ],
            estimatedTotalCost: 83000,
            specificationDetails: "Heavy load radial steel belt tyres for trailer trucks.",
            preferredSupplier: "MRF Authorized Mundra Dealer",
            supplierContact: "+91 99988 77766",
            currentStockNew: 1,
            currentStockUsedRemould: 3,
            comments: "Urgent requirements as 3 trailers are grounded due to worn out tyres.",
            routingChecklist: [
              { step: "Step 1", action: "PR Raised by Requester", responsible: "Ramesh Sharma", date: new Date(), status: "Done" },
              { step: "Step 2", action: "Validated by HoD", responsible: "Amit Patel", date: new Date(), status: "Done" },
              { step: "Step 3", action: "Forwarded to Purchase Officer", responsible: "Amit Patel", date: new Date(), status: "Done" }
            ]
          }
        };

        console.log(`[Step 1] Sending POST request to create Tyre PR: ${prNumber}`);
        const res = await axios.post(`${BASE_URL}/tyre-procurement`, payload, { headers });
        console.log("✅ Stage 1 Complete!");
        console.log("Document ID:", res.data.data._id);
        console.log("PR Number:", res.data.data.prNumber);
        console.log("Status:", res.data.data.status);
        console.log("Estimated Total Cost:", res.data.data.stage1.estimatedTotalCost);
        break;
      }

      case 2: {
        const payload = {
          status: "Quotation Received",
          stage2: {
            prNumber: "PR-TEMP", // Backend normalizes it
            poNumber: "PO-TEMP",
            purchaseOfficerName: "Sanjay Shah (Purchase Officer)",
            poDate: new Date(),
            suppliers: [
              {
                supplierName: "Mundra Tyre Zone",
                contactPerson: "Kirti Bhai",
                phoneNumber: "+91 98989 12345",
                emailWhatsApp: "kirti@mundratyres.com",
                gstNumber: "24AAAHT9988A1ZA",
                tyreBrand: "MRF S3C8 / Apollo",
                sizeSpecification: "10.00R20",
                unitPriceNew: 16200,
                unitPriceRemould: 8200,
                qtyAvailable: 10,
                freightCharges: 1500,
                deliveryTimeline: "2 Days",
                deliveryLocation: "Mundra Workshop",
                warrantyGuarantee: "1 Year against mfg defects",
                paymentTerms: "30 days credit",
                discountOffered: 500,
                remarks: "L1 for New Tyres. Direct dealer."
              },
              {
                supplierName: "Kutch Fleet Solutions",
                contactPerson: "Dhiren Vyas",
                phoneNumber: "+91 97777 66666",
                emailWhatsApp: "dhiren@kutchfleet.com",
                gstNumber: "24BBBHT1122B1ZB",
                tyreBrand: "Apollo / Bridgestone",
                sizeSpecification: "10.00R20",
                unitPriceNew: 16800,
                unitPriceRemould: 8000,
                qtyAvailable: 6,
                freightCharges: 0,
                deliveryTimeline: "4 Days",
                deliveryLocation: "Mundra Workshop",
                warrantyGuarantee: "No warranty on remould",
                paymentTerms: "50% advance, 50% on delivery",
                discountOffered: 0,
                remarks: "Quoted lower for remould tyres"
              },
              {
                supplierName: "Gujarat Tyre Distributors",
                contactPerson: "Naresh Patel",
                phoneNumber: "+91 94444 33333",
                emailWhatsApp: "naresh@gujarattyre.com",
                gstNumber: "24CCCHT4455C1ZC",
                tyreBrand: "MRF / Ceat",
                sizeSpecification: "10.00R20",
                unitPriceNew: 16500,
                unitPriceRemould: 8500,
                qtyAvailable: 15,
                freightCharges: 2000,
                deliveryTimeline: "3 Days",
                deliveryLocation: "Mundra Workshop",
                warrantyGuarantee: "6 Months standard",
                paymentTerms: "100% advance",
                discountOffered: 300,
                remarks: "Higher freight cost"
              }
            ],
            selectedSupplierL1: "Mundra Tyre Zone",
            l1PriceQuoted: 16200,
            reasonForSelection: "Mundra Tyre Zone is the authorized dealer offering the lowest rate per new unit (16,200) and quick delivery within 2 days with standard credit terms.",
            totalOrderValue: 82200, // 4 * 16200 + 2 * 8200 + 1500 (freight) - 500 (discount) = 64800 + 16400 + 1500 - 500 = 82200
            declaration: "I confirm that quotations were collected from three vendors and L1 selected based on commercial and delivery timeline suitability.",
            routingChecklist: [
              { step: "Step 1", action: "Quotations collected (min. 3)", responsible: "Sanjay Shah", date: new Date(), status: "Done" },
              { step: "Step 2", action: "L1 Supplier selected", responsible: "Sanjay Shah", date: new Date(), status: "Done" },
              { step: "Step 3", action: "Sent to Finance Manager for approval", responsible: "Sanjay Shah", date: new Date(), status: "Done" }
            ]
          }
        };

        console.log(`[Step 2] Updating Tyre PR with ID: ${id} to stage 2`);
        const res = await axios.put(`${BASE_URL}/tyre-procurement/${id}`, payload, { headers });
        console.log("✅ Stage 2 Complete!");
        console.log("Selected Supplier L1:", res.data.data.stage2.selectedSupplierL1);
        console.log("Total Order Value (₹):", res.data.data.stage2.totalOrderValue);
        break;
      }

      case 3: {
        const payload = {
          status: "Finance Approved",
          stage3: {
            poNumber: "PO-TYRE-9999",
            poDate: new Date(),
            selectedSupplierL1: "Mundra Tyre Zone",
            totalOrderValue: 82200,
            purchaseOfficerName: "Sanjay Shah",
            dateReceivedByFinance: new Date(),
            reviewChecklist: {
              budgetAvailable: "Yes",
              priceReasonable: "Yes",
              gstVerified: "Yes",
              paymentTermsAccepted: "Yes",
              docsAttached: "Yes"
            },
            decision: {
              decision: "APPROVED",
              remarksRejectionReason: "L1 rates verified and compared against last PO. Approved within budgeted maintenance costs."
            },
            signOff: {
              financeManagerName: "Kamlesh Mehta",
              dateOfApproval: new Date(),
              signatureDigitalApprovalRef: "FIN-AUTH-TYRE-2026-902",
              timeOfApproval: new Date().toLocaleTimeString()
            }
          }
        };

        console.log(`[Step 3] Updating Tyre PR with ID: ${id} to stage 3`);
        const res = await axios.put(`${BASE_URL}/tyre-procurement/${id}`, payload, { headers });
        console.log("✅ Stage 3 Complete!");
        console.log("Finance Decision:", res.data.data.stage3.decision.decision);
        console.log("Finance Manager Name:", res.data.data.stage3.signOff.financeManagerName);
        break;
      }

      case 4: {
        const payload = {
          status: "Payment Done",
          stage4: {
            poNumberDate: "PO-TYRE-9999 dated 2026-06-19",
            financeApprovalDate: new Date(),
            supplierName: "Mundra Tyre Zone",
            totalPaymentAmount: 82200,
            supplierBankDetails: {
              accountName: "Mundra Tyre Zone Proprietorship",
              bankName: "State Bank of India",
              accountNumber: "330011223344",
              ifscCode: "SBIN0001234",
              accountType: "Current Account",
              branch: "Mundra Port Branch",
              upiVpa: "mundratyres@sbi"
            },
            paymentDetails: {
              paymentMethod: "RTGS",
              paymentDate: new Date(),
              amountPaid: 82200,
              paymentReferenceUtr: "SBINR52026061988877",
              bankAppUsed: "SBI Corporate NetBanking",
              timeOfTransfer: new Date().toLocaleTimeString()
            },
            accountingSignOff: {
              processedByName: "Narendra Joshi (Accounts)",
              designation: "Assistant Accountant",
              signatureApprovalRef: "PAY-TYRE-88219",
              dateConfirmed: new Date()
            },
            utrSharing: {
              utrSharedWithPoOn: new Date(),
              modeOfSharing: "WhatsApp"
            }
          }
        };

        console.log(`[Step 4] Updating Tyre PR with ID: ${id} to stage 4`);
        const res = await axios.put(`${BASE_URL}/tyre-procurement/${id}`, payload, { headers });
        console.log("✅ Stage 4 Complete!");
        console.log("UTR Number:", res.data.data.stage4.paymentDetails.paymentReferenceUtr);
        console.log("Amount Paid (₹):", res.data.data.stage4.paymentDetails.amountPaid);
        break;
      }

      case 5: {
        const payload = {
          status: "Order Placed",
          stage5: {
            prNumber: "PR-TEMP",
            poNumber: "PO-TYRE-9999",
            supplierName: "Mundra Tyre Zone",
            utrNumber: "SBINR52026061988877",
            orderPlacedBy: "Sanjay Shah",
            orderPlacedDate: new Date(),
            orderConfirmation: "RP-TYRE-CONF-02",
            modeOfConfirmation: "Email",
            dispatchDetails: {
              dispatchDate: new Date(),
              expectedDeliveryDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // Expected tomorrow
              vehicleNumber: "GJ-12-AT-4455",
              transporterName: "Mundra Local Logistics",
              driverName: "Sohan Singh",
              driverContactNumber: "+91 90000 55555",
              dcNumber: "DC-MTZ-988",
              lrNumber: "LR-MLL-5511",
              invoiceNumber: "INV-MTZ-2026-102",
              invoiceAmount: 82200,
              deliveryLocationSite: "Mundra Workshop",
              noOfTyresDispatched: 6
            },
            remarks: "Material dispatched by supplier, expected arrival tomorrow morning."
          }
        };

        console.log(`[Step 5] Updating Tyre PR with ID: ${id} to stage 5`);
        const res = await axios.put(`${BASE_URL}/tyre-procurement/${id}`, payload, { headers });
        console.log("✅ Stage 5 Complete!");
        console.log("Dispatch Vehicle Number:", res.data.data.stage5.dispatchDetails.vehicleNumber);
        console.log("Invoice Number:", res.data.data.stage5.dispatchDetails.invoiceNumber);
        break;
      }

      case 6: {
        const payload = {
          status: "GRN Done",
          stage6: {
            grnSeriesNo: "GRN-TYRE-2026-0033",
            dateOfReceipt: new Date(),
            prNumber: "PR-TEMP",
            poNumber: "PO-TYRE-9999",
            supplierName: "Mundra Tyre Zone",
            supplierContactNo: "+91 98989 12345",
            deliveryNoteDcNo: "DC-MTZ-988",
            lrNumber: "LR-MLL-5511",
            vehicleNumber: "GJ-12-AT-4455",
            deliveryLocation: "Mundra Workshop",
            itemsReceived: [
              { sNo: 1, tyreNumber: "MRF-R889012", tyreBrand: "MRF", sizeSpec: "10.00R20", type: "New", hotStampDone: "Yes", photoTaken: "Yes", acceptedRejected: "Accepted", remarks: "Physically verified" },
              { sNo: 2, tyreNumber: "MRF-R889013", tyreBrand: "MRF", sizeSpec: "10.00R20", type: "New", hotStampDone: "Yes", photoTaken: "Yes", acceptedRejected: "Accepted", remarks: "Physically verified" },
              { sNo: 3, tyreNumber: "MRF-R889014", tyreBrand: "MRF", sizeSpec: "10.00R20", type: "New", hotStampDone: "Yes", photoTaken: "Yes", acceptedRejected: "Accepted", remarks: "Physically verified" },
              { sNo: 4, tyreNumber: "MRF-R889015", tyreBrand: "MRF", sizeSpec: "10.00R20", type: "New", hotStampDone: "Yes", photoTaken: "Yes", acceptedRejected: "Accepted", remarks: "Physically verified" },
              { sNo: 5, tyreNumber: "APL-REM-5541", tyreBrand: "Apollo (Retread)", sizeSpec: "10.00R20", type: "Remould", hotStampDone: "Yes", photoTaken: "Yes", acceptedRejected: "Accepted", remarks: "Quality looks OK" },
              { sNo: 6, tyreNumber: "APL-REM-5542", tyreBrand: "Apollo (Retread)", sizeSpec: "10.00R20", type: "Remould", hotStampDone: "Yes", photoTaken: "Yes", acceptedRejected: "Accepted", remarks: "Quality looks OK" }
            ],
            qualityConformanceCheck: {
              tyresVerified: "Yes",
              tyreNumbersMatched: "Yes",
              hotStampingCompleted: "Yes",
              photosTaken: "Yes",
              invoiceVerified: "Yes",
              returnClauseReviewed: "Yes"
            },
            inspectionNotes: "All 6 tyres received in good condition. Serial numbers recorded in system. Hot branding done with SRCC identification.",
            approvals: [
              { role: "Received By (Site Person)", name: "Harish Gadhvi", date: new Date(), signature: "Harish" },
              { role: "Validated by – Maintenance Manager", name: "Devendra Rawat", date: new Date(), signature: "D-Rawat" },
              { role: "Reviewed by – Purchase Officer", name: "Sanjay Shah", date: new Date(), signature: "Sanjay" }
            ]
          }
        };

        console.log(`[Step 6] Updating Tyre PR with ID: ${id} to stage 6`);
        const res = await axios.put(`${BASE_URL}/tyre-procurement/${id}`, payload, { headers });
        console.log("✅ Stage 6 Complete!");
        console.log("GRN Series No:", res.data.data.stage6.grnSeriesNo);
        console.log("Items count:", res.data.data.stage6.itemsReceived.length);
        console.log("PR marked GRN DONE.");
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
