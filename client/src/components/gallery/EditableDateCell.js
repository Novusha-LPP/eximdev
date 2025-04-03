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
    delivery_date,
    consignment_type,
    container_nos = [],
  } = cell.row.original;

  const [dates, setDates] = useState({
    vessel_berthing,
    gateway_igm_date,
    discharge_date,
    pcv_date,
    out_of_charge,
    delivery_date,
  });

  const [editable, setEditable] = useState(null);

  const handleDateChange = (field, value) => {
    setDates((prev) => ({ ...prev, [field]: value }));

    axios
      .patch(`${process.env.REACT_APP_API_STRING}/jobs/${_id}`, {
        [field]: value,
      })
      .then((res) => {
        setEditable(null);
        window.location.reload();
      })
      .catch((err) => {
        console.error("Error Updating:", err);
      });
  };

  return (
    <div style={{ display: "flex", gap: "20px" }}>
      <div>
        {/* Hide ETA, GIGM, and Discharge if type_of_b_e is Ex-Bond */}
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

        {/* Hide Rail-out if consignment_type is LCL */}
        {consignment_type !== "LCL" && (
          <>
            <strong>Rail-out :</strong>
            {container_nos.map((container, id) => (
              <div key={id}>
                {container.container_rail_out_date
                  ? container.container_rail_out_date.slice(0, 10)
                  : "N/A"}{" "}
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
                        `container_nos.${id}.container_rail_out_date`,
                        e.target.value
                      )
                    }
                  />
                )}
              </div>
            ))}
            <br />
          </>
        )}
      </div>

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
        {container_nos.map((container, id) => (
          <div key={id}>
            {container.delivery_date
              ? container.delivery_date.slice(0, 10)
              : "N/A"}{" "}
            <FaCalendarAlt
              style={styles.icon}
              onClick={() => setEditable(`delivery_${id}`)}
            />
            {editable === `delivery_${id}` && (
              <input
                type="date"
                value={container.delivery_date || ""}
                onChange={(e) =>
                  handleDateChange(
                    `container_nos.${id}.delivery_date`,
                    e.target.value
                  )
                }
              />
            )}
          </div>
        ))}
        {/* Hide EmptyOff if consignment_type is LCL */}
        {consignment_type !== "LCL" && (
          <>
            <strong>EmptyOff:</strong>
            {container_nos.map((container, id) => (
              <div key={id}>
                {container.emptyContainerOffLoadDate
                  ? container.emptyContainerOffLoadDate.slice(0, 10)
                  : "N/A"}{" "}
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
                        `container_nos.${id}.emptyContainerOffLoadDate`,
                        e.target.value
                      )
                    }
                  />
                )}
              </div>
            ))}
            <br />
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
