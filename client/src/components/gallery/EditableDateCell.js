import { useState, useEffect, useCallback } from "react";
import { FaCalendarAlt } from "react-icons/fa";
import axios from "axios";

const EditableDateCell = ({ cell }) => {
  const {
    _id,
    vessel_berthing,
    gateway_igm_date,
    discharge_date,
    pcv_date,
    out_of_charge,
    type_of_b_e,
    consignment_type,
    container_nos = [],
    detailed_status,
    be_no,
  } = cell.row.original;

  const [dates, setDates] = useState({
    vessel_berthing,
    gateway_igm_date,
    discharge_date,
    pcv_date,
    out_of_charge,
  });

  const [localStatus, setLocalStatus] = useState(detailed_status);
  const [containers, setContainers] = useState([...container_nos]);
  const [editable, setEditable] = useState(null);

  // 📦 Reset data when row changes
  useEffect(() => {
    setDates({ vessel_berthing, gateway_igm_date, discharge_date, pcv_date, out_of_charge });
    setContainers([...container_nos]);
    setLocalStatus(detailed_status); // <-- Add this
    setEditable(null);
  }, [cell.row.original]);
  

  const updateDetailedStatus = useCallback(async () => {
    const eta = dates.vessel_berthing;
    const gatewayIGMDate = dates.gateway_igm_date;
    const dischargeDate = dates.discharge_date;
    const outOfChargeDate = dates.out_of_charge;
    const pcvDate = dates.pcv_date;
  
    const billOfEntryNo = be_no;
    const anyContainerArrivalDate = containers.some(c => c.arrival_date);
    const containerRailOutDate = containers.every(c => c.container_rail_out_date);
    const emptyContainerOffLoadDate = containers.every(c => c.emptyContainerOffLoadDate);
    const deliveryDate = containers.every(c => c.delivery_date);
    const isExBondOrLCL = type_of_b_e === "Ex-Bond" || consignment_type === "LCL";
  
    console.log("🧪 Debug Info:");
    console.log("✔️ be_no:", billOfEntryNo);
    console.log("✔️ arrival_date exists:", anyContainerArrivalDate);
    console.log("✔️ out_of_charge:", outOfChargeDate);
    console.log("✔️ emptyContainerOffLoadDate:", emptyContainerOffLoadDate);
    console.log("✔️ deliveryDate:", deliveryDate);
    console.log("✔️ isExBondOrLCL:", isExBondOrLCL);
    console.log("✔️ current detailed_status:", detailed_status);
  
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
  
    if (newStatus && newStatus !== localStatus){
      console.log("📦 Updating detailed_status to:", newStatus);
      cell.row.original.detailed_status = newStatus;
      try {
        await axios.patch(`${process.env.REACT_APP_API_STRING}/jobs/${_id}`, {
          detailed_status: newStatus,
        });
        setLocalStatus(newStatus); // <-- Add this        
      } catch (err) {
        console.error("❌ Failed to update detailed_status:", err);
      }
    } else {
      console.log("ℹ️ No change in status detected.");
    }
}, [dates, containers, be_no, consignment_type, type_of_b_e, localStatus, _id]);

useEffect(() => {
  updateDetailedStatus();
}, [
  dates.vessel_berthing,
  dates.gateway_igm_date,
  dates.discharge_date,
  dates.out_of_charge,
  dates.pcv_date,
  containers, // watches for any change in container-level dates
]);


  // 📅 Handle date change and immediately call status updater
  const handleDateChange = (field, value, index = null) => {
    if (index !== null) {
      // Update container-specific date field
      const updatedContainers = containers.map((container, i) =>
        i === index ? { ...container, [field]: value } : container
      );

      setContainers(updatedContainers);

      axios
      .patch(`${process.env.REACT_APP_API_STRING}/jobs/${_id}`, {
        container_nos: updatedContainers,
      })
      .then(() => {
        setEditable(null);
    
        // 🔄 Use updated values directly, not stale ones
        updateDetailedStatus();
      })
      .catch((err) => console.error("Error Updating:", err));
        } else {
      const updatedDates = { ...dates, [field]: value };
      setDates((prev) => {
        const newDates = { ...prev, [field]: value };
      
        axios
          .patch(`${process.env.REACT_APP_API_STRING}/jobs/${_id}`, {
            [field]: value,
          })
          .then(() => {
            setEditable(null);
      
            // ✅ Trigger status update with the freshest values
            updateDetailedStatus();
          })
          .catch((err) => console.error("Error Updating:", err));
      
        return newDates;
      });
      
    }
  };

  
  return (
    <div style={{ display: "flex", gap: "20px" }}>
      {/* Left Section */}
      <div>
        {type_of_b_e !== "Ex-Bond" && (
          <>
            <strong>ETA :</strong> {dates.vessel_berthing || "N/A"}{" "}
            <FaCalendarAlt
              style={styles.icon}
              onClick={() => setEditable("vessel_berthing")}
            />
            {editable === "vessel_berthing" && (
              <input
                type="date"
                value={dates.vessel_berthing || ""}
                onChange={(e) =>
                  handleDateChange("vessel_berthing", e.target.value)
                }
              />
            )}
            <br />
            <strong>GIGM :</strong> {dates.gateway_igm_date || "N/A"}{" "}
            <FaCalendarAlt
              style={styles.icon}
              onClick={() => setEditable("gateway_igm_date")}
            />
            {editable === "gateway_igm_date" && (
              <input
                type="date"
                value={dates.gateway_igm_date || ""}
                onChange={(e) =>
                  handleDateChange("gateway_igm_date", e.target.value)
                }
              />
            )}
            <br />
            <strong>Discharge :</strong> {dates.discharge_date || "N/A"}{" "}
            <FaCalendarAlt
              style={styles.icon}
              onClick={() => setEditable("discharge_date")}
            />
            {editable === "discharge_date" && (
              <input
                type="date"
                value={dates.discharge_date || ""}
                onChange={(e) =>
                  handleDateChange("discharge_date", e.target.value)
                }
              />
            )}
            <br />
          </>
        )}

        {type_of_b_e !== "Ex-Bond" && consignment_type !== "LCL" && (
          <>
            {/* Container Dates */}
            {containers.map((container, id) => (
              <div key={id}>
                <strong>Rail-out :</strong>{" "}
                {container.container_rail_out_date?.slice(0, 10) || "N/A"}{" "}
                <FaCalendarAlt
                  style={styles.icon}
                  onClick={() => setEditable(`rail_out_${id}`)}
                />
                {editable === `rail_out_${id}` && (
                  <input
                    type="date"
                    value={container.container_rail_out_date || ""}
                    onChange={(e) =>
                      handleDateChange(
                        "container_rail_out_date",
                        e.target.value,
                        id
                      )
                    }
                  />
                )}
              </div>
            ))}
          </>
        )}

        {consignment_type !== "LCL" && type_of_b_e !== "Ex-Bond" && (
          <>
            <strong>Detention.F. :</strong>
            {containers.map((container, id) => (
              <div key={id}>
                {container.detention_from?.slice(0, 10) || "N/A"}{" "}
                {editable === `detention_from_${id}` && (
                  <input
                    type="date"
                    value={container.detention_from || ""}
                    onChange={(e) =>
                      handleDateChange("detention_from", e.target.value, id)
                    }
                  />
                )}
              </div>
            ))}
          </>
        )}
        {type_of_b_e !== "Ex-Bond" && (
          <>
            {containers.map((container, id) => (
              <div key={id}>
                <strong>Arrival :</strong>{" "}
                {container.arrival_date?.slice(0, 10) || "N/A"}{" "}
                <FaCalendarAlt
                  style={styles.icon}
                  onClick={() => setEditable(`arrival_date_${id}`)}
                />
                {editable === `arrival_date_${id}` && (
                  <input
                    type="date"
                    value={container.arrival_date || ""}
                    onChange={(e) =>
                      handleDateChange("arrival_date", e.target.value, id)
                    }
                  />
                )}
              </div>
            ))}
          </>
        )}
      </div>

      {/* Right Section */}
      <div>
        <strong>PCV :</strong> {dates.pcv_date || "N/A"}{" "}
        <FaCalendarAlt
          style={styles.icon}
          onClick={() => setEditable("pcv_date")}
        />
        {editable === "pcv_date" && (
          <input
            type="date"
            value={dates.pcv_date || ""}
            onChange={(e) => handleDateChange("pcv_date", e.target.value)}
          />
        )}
        <br />
        <strong>OOC :</strong> {dates.out_of_charge || "N/A"}{" "}
        <FaCalendarAlt
          style={styles.icon}
          onClick={() => setEditable("out_of_charge")}
        />
        {editable === "out_of_charge" && (
          <input
            type="date"
            value={dates.out_of_charge || ""}
            onChange={(e) => handleDateChange("out_of_charge", e.target.value)}
          />
        )}
        <br />
        {containers.map((container, id) => (
          <div key={id}>
            <strong>Delivery :</strong>{" "}
            {container.delivery_date?.slice(0, 10) || "N/A"}{" "}
            <FaCalendarAlt
              style={styles.icon}
              onClick={() => setEditable(`delivery_${id}`)}
            />
            {editable === `delivery_${id}` && (
              <input
                type="date"
                value={container.delivery_date || ""}
                onChange={(e) =>
                  handleDateChange("delivery_date", e.target.value, id)
                }
              />
            )}
          </div>
        ))}
        {consignment_type !== "LCL" && (
          <>
            <strong>EmptyOff:</strong>
            {containers.map((container, id) => (
              <div key={id}>
                {container.emptyContainerOffLoadDate?.slice(0, 10) || "N/A"}{" "}
                <FaCalendarAlt
                  style={styles.icon}
                  onClick={() => setEditable(`empty_off_${id}`)}
                />
                {editable === `empty_off_${id}` && (
                  <input
                    type="date"
                    value={container.emptyContainerOffLoadDate || ""}
                    onChange={(e) =>
                      handleDateChange(
                        "emptyContainerOffLoadDate",
                        e.target.value,
                        id
                      )
                    }
                  />
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

const styles = {
  icon: {
    cursor: "pointer",
    marginLeft: "5px",
    fontSize: "18px",
    color: "#007bff",
  },
};

export default EditableDateCell;
