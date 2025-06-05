// Test file for status logic validation
// This file can be run in the browser console to test status determination logic

function testStatusLogic() {
  // Test cases for different status conditions
  const testCases = [
    {
      name: "ETA Date Pending",
      data: {
        vessel_berthing: null,
        gateway_igm_date: null,
        discharge_date: null,
        be_no: null,
        containers: [],
        out_of_charge: null,
        pcv_date: null,
        type_of_b_e: null,
        consignment_type: null
      },
      expected: "ETA Date Pending"
    },
    {
      name: "Estimated Time of Arrival",
      data: {
        vessel_berthing: "2025-06-10",
        gateway_igm_date: null,
        discharge_date: null,
        be_no: null,
        containers: [],
        out_of_charge: null,
        pcv_date: null,
        type_of_b_e: null,
        consignment_type: null
      },
      expected: "Estimated Time of Arrival"
    },
    {
      name: "Gateway IGM Filed",
      data: {
        vessel_berthing: "2025-06-10",
        gateway_igm_date: "2025-06-11",
        discharge_date: null,
        be_no: null,
        containers: [],
        out_of_charge: null,
        pcv_date: null,
        type_of_b_e: null,
        consignment_type: null
      },
      expected: "Gateway IGM Filed"
    },
    {
      name: "Discharged",
      data: {
        vessel_berthing: "2025-06-10",
        gateway_igm_date: "2025-06-11",
        discharge_date: "2025-06-12",
        be_no: null,
        containers: [],
        out_of_charge: null,
        pcv_date: null,
        type_of_b_e: null,
        consignment_type: null
      },
      expected: "Discharged"
    },
    {
      name: "Arrived, BE Note Pending",
      data: {
        vessel_berthing: "2025-06-10",
        gateway_igm_date: "2025-06-11",
        discharge_date: "2025-06-12",
        be_no: null,
        containers: [{ arrival_date: "2025-06-13" }],
        out_of_charge: null,
        pcv_date: null,
        type_of_b_e: null,
        consignment_type: null
      },
      expected: "Arrived, BE Note Pending"
    },
    {
      name: "BE Noted, Arrival Pending",
      data: {
        vessel_berthing: "2025-06-10",
        gateway_igm_date: "2025-06-11",
        discharge_date: "2025-06-12",
        be_no: "BE123456",
        containers: [],
        out_of_charge: null,
        pcv_date: null,
        type_of_b_e: null,
        consignment_type: null
      },
      expected: "BE Noted, Arrival Pending"
    },
    {
      name: "BE Noted, Clearance Pending",
      data: {
        vessel_berthing: "2025-06-10",
        gateway_igm_date: "2025-06-11",
        discharge_date: "2025-06-12",
        be_no: "BE123456",
        containers: [{ arrival_date: "2025-06-13" }],
        out_of_charge: null,
        pcv_date: null,
        type_of_b_e: null,
        consignment_type: null
      },
      expected: "BE Noted, Clearance Pending"
    },
    {
      name: "PCV Done, Duty Payment Pending",
      data: {
        vessel_berthing: "2025-06-10",
        gateway_igm_date: "2025-06-11",
        discharge_date: "2025-06-12",
        be_no: "BE123456",
        containers: [{ arrival_date: "2025-06-13" }],
        out_of_charge: null,
        pcv_date: "2025-06-14",
        type_of_b_e: null,
        consignment_type: null
      },
      expected: "PCV Done, Duty Payment Pending"
    },
    {
      name: "Custom Clearance Completed",
      data: {
        vessel_berthing: "2025-06-10",
        gateway_igm_date: "2025-06-11",
        discharge_date: "2025-06-12",
        be_no: "BE123456",
        containers: [{ arrival_date: "2025-06-13" }],
        out_of_charge: "2025-06-15",
        pcv_date: "2025-06-14",
        type_of_b_e: null,
        consignment_type: null
      },
      expected: "Custom Clearance Completed"
    },
    {
      name: "Billing Pending - Ex-Bond with delivery",
      data: {
        vessel_berthing: "2025-06-10",
        gateway_igm_date: "2025-06-11",
        discharge_date: "2025-06-12",
        be_no: "BE123456",
        containers: [{ 
          arrival_date: "2025-06-13",
          delivery_date: "2025-06-16"
        }],
        out_of_charge: "2025-06-15",
        pcv_date: "2025-06-14",
        type_of_b_e: "Ex-Bond",
        consignment_type: null
      },
      expected: "Billing Pending"
    },
    {
      name: "Billing Pending - LCL with delivery",
      data: {
        vessel_berthing: "2025-06-10",
        gateway_igm_date: "2025-06-11",
        discharge_date: "2025-06-12",
        be_no: "BE123456",
        containers: [{ 
          arrival_date: "2025-06-13",
          delivery_date: "2025-06-16"
        }],
        out_of_charge: "2025-06-15",
        pcv_date: "2025-06-14",
        type_of_b_e: null,
        consignment_type: "LCL"
      },
      expected: "Billing Pending"
    },
    {
      name: "Billing Pending - FCL with empty container off-load",
      data: {
        vessel_berthing: "2025-06-10",
        gateway_igm_date: "2025-06-11",
        discharge_date: "2025-06-12",
        be_no: "BE123456",
        containers: [{ 
          arrival_date: "2025-06-13",
          emptyContainerOffLoadDate: "2025-06-16"
        }],
        out_of_charge: "2025-06-15",
        pcv_date: "2025-06-14",
        type_of_b_e: "FCL",
        consignment_type: null
      },
      expected: "Billing Pending"
    }
  ];

  // Status determination logic (copied from EditableDateCell.js)
  function determineStatus(data) {
    const {
      vessel_berthing: eta,
      gateway_igm_date: gatewayIGMDate,
      discharge_date: dischargeDate,
      out_of_charge: outOfChargeDate,
      pcv_date: pcvDate,
      be_no: billOfEntryNo,
      containers,
      type_of_b_e,
      consignment_type
    } = data;

    const anyContainerArrivalDate = containers.some((c) => c.arrival_date);
    
    const containerRailOutDate =
      containers?.length > 0 &&
      containers.every((container) => container.container_rail_out_date);

    const emptyContainerOffLoadDate =
      containers?.length > 0 &&
      containers.every((container) => container.emptyContainerOffLoadDate);

    const deliveryDate =
      containers?.length > 0 &&
      containers.every((container) => container.delivery_date);

    const isExBondOrLCL =
      type_of_b_e === "Ex-Bond" || consignment_type === "LCL";

    let newStatus = "";

    if (
      billOfEntryNo &&
      anyContainerArrivalDate &&
      outOfChargeDate &&
      (isExBondOrLCL ? deliveryDate : emptyContainerOffLoadDate)
    ) {
      newStatus = "Billing Pending";
    } else if (billOfEntryNo && anyContainerArrivalDate && outOfChargeDate) {
      newStatus = "Custom Clearance Completed";
    } else if (billOfEntryNo && anyContainerArrivalDate && pcvDate) {
      newStatus = "PCV Done, Duty Payment Pending";
    } else if (billOfEntryNo && anyContainerArrivalDate) {
      newStatus = "BE Noted, Clearance Pending";
    } else if (billOfEntryNo) {
      newStatus = "BE Noted, Arrival Pending";
    } else if (!billOfEntryNo && anyContainerArrivalDate) {
      newStatus = "Arrived, BE Note Pending";
    } else if (containerRailOutDate) {
      newStatus = "Rail Out";
    } else if (dischargeDate) {   
      newStatus = "Discharged";
    } else if (gatewayIGMDate) {
      newStatus = "Gateway IGM Filed";
    } else if (!eta || eta === "Invalid Date") {
      newStatus = "ETA Date Pending";
    } else if (eta) {
      newStatus = "Estimated Time of Arrival";
    }

    return newStatus;
  }

  // Run tests
  console.log("=== Status Logic Test Results ===");
  let passedTests = 0;
  let failedTests = 0;

  testCases.forEach((testCase, index) => {
    const result = determineStatus(testCase.data);
    const passed = result === testCase.expected;
    
    if (passed) {
      passedTests++;
      console.log(`✅ Test ${index + 1}: ${testCase.name} - PASSED`);
    } else {
      failedTests++;
      console.log(`❌ Test ${index + 1}: ${testCase.name} - FAILED`);
      console.log(`   Expected: ${testCase.expected}`);
      console.log(`   Got: ${result}`);
    }
  });

  console.log(`\n=== Summary ===`);
  console.log(`Total tests: ${testCases.length}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
  
  return failedTests === 0;
}

// Run the test
testStatusLogic();
