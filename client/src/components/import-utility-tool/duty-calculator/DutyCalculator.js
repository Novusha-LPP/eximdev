import { useState, useEffect } from "react";
import HSCodeLookup from "./HSCodeLookup.js";
import ShipmentDetails from "./ShipmentDetails.js";
import DutyCalculation from "./DutyCalculation.js";

const ImportDutyCalculator = () => {
  // State for form inputs
  const [shipmentDetails, setShipmentDetails] = useState({
    blDate: "",
    hsCode: "",
    unitPrice: "",
    netWeight: "",
    freightUSD: "",
    insuranceUSD: "",
    baseCIFUSD: "",
    exchangeRate: "",
  });

  const [dutyRates, setDutyRates] = useState({
    bcdRate: "",
    swsRate: "10", // Default is typically 10%
    igstRate: "",
    bofEnabled: false, // Default BOF is disabled
    bofPercentage: "0", // Default BOF percentage
  });

  // State for calculated values
  const [cifINR, setCifINR] = useState(0);
  const [assessableValue, setAssessableValue] = useState(0);
  const [additionalCharges, setAdditionalCharges] = useState(0);
  const [dutyValues, setDutyValues] = useState({
    bcd: 0,
    bofReduction: 0, // New field for BOF reduction amount
    sws: 0,
    igst: 0,
    total: 0,
  });

  // State for tracking if user has modified assessable value
  const [userModified, setUserModified] = useState(false);

  // State for API lookup
  const [jobNo, setJobNo] = useState("");
  const [year, setYear] = useState("25-26"); // Default value
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // State for managing additional charges list
  const [additionalChargesList, setAdditionalChargesList] = useState([]);
  const [showAddChargeInput, setShowAddChargeInput] = useState(false);
  const [newCharge, setNewCharge] = useState("");
  const [clearanceValue, setClearanceValue] = useState("-");

  // Calculate CIF and duties whenever relevant inputs change
  useEffect(() => {
    calculateCIF();
  }, [
    shipmentDetails.baseCIFUSD,
    shipmentDetails.freightUSD,
    shipmentDetails.insuranceUSD,
    shipmentDetails.exchangeRate,
  ]);

  // Update assessable value only if user hasn't manually modified it
  useEffect(() => {
    if (!userModified) {
      setAssessableValue(cifINR + additionalCharges);
    }
  }, [cifINR, additionalCharges, userModified]);

  // Recalculate duties whenever relevant values change
  useEffect(() => {
    calculateDuties();
  }, [
    assessableValue,
    dutyRates.bcdRate,
    dutyRates.swsRate,
    dutyRates.igstRate,
    dutyRates.bofEnabled,
    dutyRates.bofPercentage,
  ]);

  // Function to handle input changes for shipment details
  const handleShipmentInputChange = (e) => {
    const { id, value } = e.target;
    setShipmentDetails((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  // Function to calculate CIF value
  const calculateCIF = () => {
    const baseCIF = parseFloat(shipmentDetails.baseCIFUSD) || 0;
    const freight = parseFloat(shipmentDetails.freightUSD) || 0;
    const insurance = parseFloat(shipmentDetails.insuranceUSD) || 0;
    const exchangeRate = parseFloat(shipmentDetails.exchangeRate) || 0;

    const totalCIFUSD = baseCIF + freight + insurance;
    const newCifINR = totalCIFUSD * exchangeRate;
    setCifINR(newCifINR);
  };

  // Function to calculate duties
  const calculateDuties = () => {
    const bcdRate = parseFloat(dutyRates.bcdRate) / 100 || 0;
    const swsRate = parseFloat(dutyRates.swsRate) / 100 || 0;
    const igstRate = parseFloat(dutyRates.igstRate) / 100 || 0;

    // Calculate BOF reduction if enabled
    const bofPercentage = dutyRates.bofEnabled
      ? parseFloat(dutyRates.bofPercentage) / 100 || 0
      : 0;

    // Calculate BCD after BOF reduction
    const bcdBeforeReduction = assessableValue * bcdRate;
    const bofReduction = bcdBeforeReduction * bofPercentage;
    const bcd = bcdBeforeReduction - bofReduction;

    const sws = bcd * swsRate;
    const igst = (assessableValue + bcd + sws) * igstRate;
    const total = bcd + sws + igst;

    setDutyValues({
      bcd,
      bofReduction,
      sws,
      igst,
      total,
    });
  };

  // Function to add additional charges
  const addCharge = () => {
    setShowAddChargeInput(true);
  };

  const handleAddCharge = () => {
    const numValue = parseFloat(newCharge);
    if (!isNaN(numValue) && numValue > 0) {
      setAdditionalChargesList([...additionalChargesList, numValue]);
      setAdditionalCharges((prev) => prev + numValue);
      setNewCharge("");
      setShowAddChargeInput(false);
    }
  };

  const deleteCharge = (index) => {
    const chargeToDelete = additionalChargesList[index];
    setAdditionalChargesList(
      additionalChargesList.filter((_, i) => i !== index)
    );
    setAdditionalCharges((prev) => prev - chargeToDelete);
  };

  // Function to handle assessable value input change
  const handleAssessableValueChange = (e) => {
    const value = parseFloat(e.target.value) || 0;
    setAssessableValue(value);
    setUserModified(true);
  };

  // Function to reset to automatic calculation
  const resetToAutoCalculation = () => {
    setUserModified(false);
    setAssessableValue(cifINR + additionalCharges);
  };

  // Function to handle duty rates change
  const handleDutyRateChange = (e) => {
    const { id, value } = e.target;
    setDutyRates((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  // Function to handle BOF radio button changes
  const handleBOFChange = (e) => {
    const isEnabled = e.target.value === "yes";
    setDutyRates((prev) => ({
      ...prev,
      bofEnabled: isEnabled,
      bofPercentage: isEnabled ? prev.bofPercentage : "0",
    }));
  };

  // Function to perform API lookup
  const lookupHSCode = async () => {
    if (!shipmentDetails.hsCode || !jobNo || !year) {
      setError("Please provide HS Code, Job Number, and Year");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_STRING}/lookup/${shipmentDetails.hsCode}/${jobNo}/${year}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch data");
      }

      const data = await response.json();

      if (data.success && data.data) {
        // Auto-fill the form with the fetched data
        setDutyRates({
          bcdRate:
            !data.data.basic_duty_ntfn || data.data.basic_duty_ntfn === "nan"
              ? data.data.basic_duty_sch
              : data.data.basic_duty_ntfn || "",
          swsRate: data.data.sws_10_percent || "10",
          igstRate: data.data.igst || "18",
          bofEnabled: false,
          bofPercentage: "0",
        });

        if (data.data.job_data) {
          // Extract and set assessable value
          setClearanceValue(data.data.job_data.clearanceValue || "-");

          // Set the assessable value and mark as user modified so it doesn't get overwritten
          const newAssessableValue =
            parseFloat(data.data.job_data.assbl_value) || 0;
          setAssessableValue(newAssessableValue);
          setUserModified(true);

          setShipmentDetails((prev) => ({
            ...prev,
            unitPrice: data.data.job_data.unit_price || "",
            netWeight: data.data.job_data.job_net_weight || "",
          }));

          if (data.data.job_data.awb_bl_date) {
            const formattedDate = new Date(data.data.job_data.awb_bl_date)
              .toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })
              .replace(/\//g, "/");

            setShipmentDetails((prev) => ({
              ...prev,
              blDate: formattedDate,
            }));
          }

          // Extract and set total invoice value (CIF USD)
          if (data.data.job_data.total_inv_value) {
            const invValueMatch =
              data.data.job_data.total_inv_value.match(/(\d+\.?\d*)/);
            if (invValueMatch) {
              const invValue = parseFloat(invValueMatch[0]);
              setShipmentDetails((prev) => ({
                ...prev,
                baseCIFUSD: invValue.toString(),
              }));
            }
          }

          // Extract and set exchange rate
          if (data.data.job_data.exrate) {
            setShipmentDetails((prev) => ({
              ...prev,
              exchangeRate: data.data.job_data.exrate,
            }));
          }
        }
      } else {
        setError("No data found");
      }
    } catch (err) {
      setError(err.message || "An error occurred during lookup");
    } finally {
      setIsLoading(false);
    }
  };

  // Function to export data as CSV
  const exportCSV = () => {
    const rows = [
      ["Field", "Value"],
      ["CIF Value (INR)", cifINR.toFixed(2)],
      ["Assemble Value", assessableValue.toFixed(2)],
      ["Additional Charges", additionalCharges.toFixed(2)],
      ["BCD", dutyValues.bcd.toFixed(2)],
      [
        "BOF Reduction",
        dutyRates.bofEnabled ? dutyValues.bofReduction.toFixed(2) : "N/A",
      ],
      ["SWS", dutyValues.sws.toFixed(2)],
      ["IGST", dutyValues.igst.toFixed(2)],
      ["Total Duty", dutyValues.total.toFixed(2)],
    ];

    const csv = rows.map((e) => e.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "import_duty_summary.csv";
    link.click();
  };

  return (
    <div
      style={{
        fontFamily: "'Segoe UI', sans-serif",
        background: "#f3f6fb",
        margin: 0,
        padding: "20px",
        color: "#333",
      }}
    >
      <h2
        style={{
          textAlign: "center",
          marginBottom: "16px",
          color: "#2c3e50",
        }}
      >
        Import Duty Calculator
      </h2>

      {/* API Lookup Section */}
      <HSCodeLookup
        hsCode={shipmentDetails.hsCode}
        handleInputChange={handleShipmentInputChange}
        jobNo={jobNo}
        setJobNo={setJobNo}
        year={year}
        setYear={setYear}
        lookupHSCode={lookupHSCode}
        isLoading={isLoading}
        error={error}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "20px",
          maxWidth: "100%",
          overflowX: "auto",
          flexWrap: "nowrap",
        }}
      >
        {/* Shipment Details Card */}
        <ShipmentDetails
          shipmentDetails={shipmentDetails}
          handleInputChange={handleShipmentInputChange}
          cifINR={cifINR}
        />

        {/* Duty Calculation Card */}
        <DutyCalculation
          dutyRates={dutyRates}
          handleDutyRateChange={handleDutyRateChange}
          handleBOFChange={handleBOFChange}
          clearanceValue={clearanceValue}
          assessableValue={assessableValue}
          handleAssessableValueChange={handleAssessableValueChange}
          additionalCharges={additionalCharges}
          additionalChargesList={additionalChargesList}
          showAddChargeInput={showAddChargeInput}
          newCharge={newCharge}
          setNewCharge={setNewCharge}
          addCharge={addCharge}
          handleAddCharge={handleAddCharge}
          setShowAddChargeInput={setShowAddChargeInput}
          deleteCharge={deleteCharge}
          dutyValues={dutyValues}
          calculateCIF={calculateCIF}
          calculateDuties={calculateDuties}
          exportCSV={exportCSV}
          cifINR={cifINR}
          userModified={userModified}
          resetToAutoCalculation={resetToAutoCalculation}
        />
      </div>
    </div>
  );
};

export default ImportDutyCalculator;
