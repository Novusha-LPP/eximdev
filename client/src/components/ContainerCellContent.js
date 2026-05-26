import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAnchor, faCopy } from "@fortawesome/free-solid-svg-icons";
import ContainerTrackDialog from "./ContainerTrackDialog";
import DeliveryChallanPdf from "./import-dsr/DeliveryChallanPDF.js";
import IgstCalculationPDF from "./import-dsr/IgstCalculationPDF.js";
import { isAirMode, getContainerOrPackageLabel } from "../utils/modeLogic";

const getShortageColor = (shortage) => {
  if (shortage < 0) {
    return "#e02251";
  } else {
    return "#2e7d32";
  }
};

const getShortageText = (shortage) => {
  if (shortage < 0) {
    return `Shortage: ${Math.abs(shortage).toFixed(2)} kg`;
  } else if (shortage > 0) {
    return `Excess: +${shortage.toFixed(2)} kg`;
  } else {
    return "No shortage/excess";
  }
};

const ContainerCellContent = ({ cell, handleCopy }) => {
  const [containerTrackOpen, setContainerTrackOpen] = useState(false);
  const [containerTrackContainers, setContainerTrackContainers] = useState([]);

  const containerNos = cell.row.original.container_nos;
  const jobData = cell.row.original;

  return (
    <React.Fragment>
      <ContainerTrackDialog
        open={containerTrackOpen}
        onClose={() => setContainerTrackOpen(false)}
        containers={containerTrackContainers}
      />
      {containerNos?.map((container, id) => {
        const weightShortage = parseFloat(container.weight_shortage) || 0;
        const containerColor = getShortageColor(weightShortage);
        const tooltipText = getShortageText(weightShortage);

        return (
          <div key={id} style={{ marginBottom: "4px" }}>
            <a
              href={`https://www.ldb.co.in/ldb/containersearch/39/${container.container_number}/1726651147706`}
              target="_blank"
              rel="noopener noreferrer"
              title={tooltipText}
              style={{
                color: containerColor,
                fontWeight: "bold",
                textDecoration: "none",
                cursor: "pointer",
              }}
              onMouseOver={(e) => (e.target.style.textDecoration = "underline")}
              onMouseOut={(e) => (e.target.style.textDecoration = "none")}
            >
              {container.container_number}
            </a>

            {!isAirMode(jobData?.mode) && container.size && <>| "{container.size}"</>}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              {jobData?.custom_house?.toUpperCase().includes("ICD KHODIYAR") && (
                <button
                  className="icon-btn"
                  title="Track on CONCOR India"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setContainerTrackContainers([container.container_number]);
                    setContainerTrackOpen(true);
                  }}
                  style={{ padding: 0, marginLeft: 4, marginRight: 4 }}
                >
                  <FontAwesomeIcon
                    icon={faAnchor}
                    style={{ fontSize: 12, color: "#7c3aed" }}
                  />
                </button>
              )}
              <button
                className="icon-btn"
                title={`Copy ${getContainerOrPackageLabel(jobData?.mode)} Number`}
                onClick={(event) => handleCopy(event, container.container_number)}
              >
                <FontAwesomeIcon icon={faCopy} size="sm" />
              </button>
              <DeliveryChallanPdf
                year={jobData.year}
                jobNo={jobData.job_no}
                branch_code={jobData.branch_code}
                trade_type={jobData.trade_type}
                mode={jobData.mode}
                containerIndex={id}
                renderAsIcon={true}
              />
              <IgstCalculationPDF
                year={jobData.year}
                jobNo={jobData.job_no}
                branch_code={jobData.branch_code}
                trade_type={jobData.trade_type}
                mode={jobData.mode}
                containerIndex={id}
                renderAsIcon={true}
              />
            </div>
          </div>
        );
      })}
    </React.Fragment>
  );
};

export default ContainerCellContent;
