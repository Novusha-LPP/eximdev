import { useState } from "react";
import { FaCalendarAlt } from "react-icons/fa";
import axios from "axios";

const EditableDateCell = ({ cell }) => {
  const {
    _id,
    type_of_b_e,
    vessel_berthing,
    gateway_igm_date,
    discharge_date,
    pcv_date,
    out_of_charge,
    consignment_type,
    container_nos = [],
  } = cell.row.original;

  const [dates, setDates] = useState({
    vessel_berthing,
    gateway_igm_date,
    discharge_date,
    pcv_date,
    out_of_charge,
  });

  const [containers, setContainers] = useState([...container_nos]); // State for containers
  const [editable, setEditable] = useState(null);
  const [refresh, setRefresh] = useState(false); // Force re-render

  const formatDateForInput = (date) => {
    if (!date) return "";
    if (date.length === 10) return `${date}T00:00`; // If only date, add default time
    return date.replace(" ", "T"); // Convert space to "T" if needed
  };

  const handleDateChange = (field, value, index = null) => {
    if (index !== null) {
      // Update container_nos state immutably
      const updatedContainers = containers.map((container, i) =>
        i === index ? { ...container, [field]: value } : container
      );

      setContainers(updatedContainers); // Update state immediately for frontend
      setRefresh((prev) => !prev); // Force re-render

      // Send PATCH request to update the backend
      axios
        .patch(`${process.env.REACT_APP_API_STRING}/jobs/${_id}`, {
          container_nos: updatedContainers,
        })
        .then(() => {
          setEditable(null);
        })
        .catch((err) => console.error("Error Updating:", err));
    } else {
      // Update normal dates
      setDates((prev) => ({ ...prev, [field]: value }));

      axios
        .patch(`${process.env.REACT_APP_API_STRING}/jobs/${_id}`, {
          [field]: value,
        })
        .then(() => {
          setEditable(null);
          setRefresh((prev) => !prev); // Force re-render
        })
        .catch((err) => console.error("Error Updating:", err));
    }
  };

  return (
    <div style={{ display: "flex", gap: "20px" }} key={refresh}>
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
            <strong>Rail-out :</strong>
            {containers.map((container, id) => (
              <div key={id}>
                {container.container_rail_out_date?.slice(0, 10) || "N/A"}{" "}
                <FaCalendarAlt
                  style={styles.icon}
                  onClick={() => setEditable(`rail_out_${id}`)}
                />
                {editable === `rail_out_${id}` && (
                  <input
                    type="date"
                    value={formatDateForInput(
                      container.container_rail_out_date || ""
                    )}
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
                {container.detention_from
                  ? container.detention_from.slice(0, 10)
                  : "N/A"}{" "}
                <FaCalendarAlt
                  style={styles.icon}
                  onClick={() => setEditable(`detention_from_${id}`)}
                />
                {editable === `detention_from_${id}` && (
                  <input
                    type="date"
                    value={container.detention_from || ""}
                    onChange={(e) =>
                      handleDateChange(
                        `detention_from`,
                        e.target.value,
                        id
                      )
                    }
                  />
                )}
              </div>
            ))}
            <br />
          </>
        )}

        {type_of_b_e !== "Ex-Bond" && (
          <>
            <strong>Arrival :</strong>
            {containers.map((container, id) => (
              <div key={container.container_number || id}>
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
        <strong>Delivery :</strong>
        {containers.map((container, id) => (
          <div key={id}>
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