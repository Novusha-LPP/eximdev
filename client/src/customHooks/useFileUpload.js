import * as xlsx from "xlsx";
import axios from "axios";
import { useState } from "react";

function useFileUpload(inputRef, alt, setAlt) {
  const [snackbar, setSnackbar] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = handleFileRead;
    reader.onerror = (error) => {};
    reader.readAsArrayBuffer(file);
  };

  const handleFileRead = async (event) => {
    try {
      const content = event.target.result;

      if (!content) {
        return;
      }

      let workbook;
      try {
        workbook = xlsx.read(content, { type: "buffer" });
      } catch (e) {
        return;
      }

      if (!workbook.SheetNames.length) {
        return;
      }

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Format awb_bl_no column (H)
      const columnToFormat = "H";
      Object.keys(worksheet).forEach((cell) => {
        if (cell.startsWith(columnToFormat)) {
          if (worksheet[cell] && worksheet[cell].w) {
            delete worksheet[cell].w;
            worksheet[cell].z = "0";
          }
        }
      });

      let jsonData;
      try {
        jsonData = xlsx.utils.sheet_to_json(worksheet, {
          range: 2,
          defval: "",
        });
        if (jsonData.length === 0) {
          return;
        }
      } catch (e) {
        return;
      }

      const modifiedData = jsonData?.map((item, index) => {
        const modifiedItem = {};
        for (const key in item) {
          if (Object.hasOwnProperty.call(item, key)) {
            let modifiedKey = key
              .toLowerCase()
              .replace(/\s+/g, "_")
              .replace(/[^\w\s]/gi, "_")
              .replace(/\//g, "_")
              .replace(/_+$/, "");

            // Check if value is NaN and convert to null
            let value = item[key];
            if (value !== "" && typeof value === "number" && isNaN(value)) {
              modifiedItem[modifiedKey] = null;
              continue;
            }

            // Specific transformation for date keys
            if (
              [
                "job_date",
                "invoice_date",
                "be_date",
                "igm_date",
                "gateway_igm_date",
                "out_of_charge",
                "awb_bl_date",
                "vessel_berthing",
              ].includes(modifiedKey)
            ) {
              if (value === "" || (typeof value === "number" && isNaN(value))) {
                modifiedItem[modifiedKey] = null;
              } else if (!isNaN(value) && typeof value === "number") {
                const excelEpoch = new Date(1899, 11, 30);
                const jsDate = new Date(
                  excelEpoch.getTime() + value * 86400000
                );
                const year = jsDate.getFullYear();
                const month = String(jsDate.getMonth() + 1).padStart(2, "0");
                const day = String(jsDate.getDate()).padStart(2, "0");
                modifiedItem[modifiedKey] = `${year}-${month}-${day}`;
              } else if (typeof value === "string") {
                if (value === "") {
                  modifiedItem[modifiedKey] = null;
                } else {
                  const dateParts = value.split(" ")[0].split("/");
                  if (dateParts.length === 3) {
                    const day = String(dateParts[0]).padStart(2, "0");
                    const month = String(dateParts[1]).padStart(2, "0");
                    const year = String(dateParts[2]);
                    modifiedItem[modifiedKey] = `${year}-${month}-${day}`;
                  } else if (/^\d{1,2}-[A-Za-z]{3}-\d{4}$/.test(value)) {
                    const [day, month, year] = value.split("-");
                    const monthMapping = {
                      Jan: "01",
                      Feb: "02",
                      Mar: "03",
                      Apr: "04",
                      May: "05",
                      Jun: "06",
                      Jul: "07",
                      Aug: "08",
                      Sep: "09",
                      Oct: "10",
                      Nov: "11",
                      Dec: "12",
                    };
                    const formattedMonth = monthMapping[month];
                    modifiedItem[
                      modifiedKey
                    ] = `${year}-${formattedMonth}-${day.padStart(2, "0")}`;
                  } else {
                    modifiedItem[modifiedKey] = value;
                  }
                }
              } else {
                modifiedItem[modifiedKey] = value;
              }
            } else if (modifiedKey === "job_no") {
              if (typeof item[key] === "string" && item[key].includes("/")) {
                const match = item[key].split("/");
                modifiedItem.job_no = match[3];
                modifiedItem.year = match[4];
              } else {
                modifiedItem.job_no = item[key];
                modifiedItem.year = new Date().getFullYear().toString();
              }
            } else if (modifiedKey === "custom_house") {
              const customHouse = item[key]?.toLowerCase() || "";

              if (customHouse.includes("sabarmati")) {
                modifiedItem[modifiedKey] = "ICD KHODIYAR";
              } else if (customHouse.includes("thar")) {
                modifiedItem[modifiedKey] = "ICD SANAND";
              } else if (customHouse.includes("mundra")) {
                modifiedItem[modifiedKey] = "MUNDRA PORT";
              } else {
                modifiedItem[modifiedKey] = item[key];
              }
            } else if (modifiedKey === "importer") {
              modifiedItem.importer = item[key];
              modifiedItem.importerURL = (item[key] || "")
                .toLowerCase()
                .replace(/\s+/g, "_")
                .replace(/[^\w]+/g, "")
                .replace(/_+/g, "_")
                .replace(/^_|_$/g, "");
            } else if (modifiedKey === "container_no") {
              modifiedItem.container_nos = item[key];
            } else if (modifiedKey === "awb_bl_no_") {
              modifiedItem.awb_bl_no = item[key];
            } else if (modifiedKey === "assbl__value") {
              modifiedItem.assbl_value = item[key];
            } else if (modifiedKey === "ex_rate") {
              modifiedItem.exrate = item[key];
            } else if (modifiedKey === "bill_no") {
              if (typeof item[key] === "string") {
                modifiedItem.bill_no = item[key].split(",")[0];
              } else {
                modifiedItem.bill_no = item[key];
              }
            } else if (modifiedKey === "consignment_type") {
              if (typeof item[key] === "string") {
                modifiedItem.consignment_type = item[key].split(",")[0];
              } else {
                modifiedItem.consignment_type = item[key];
              }
            } else if (modifiedKey === "hss_name") {
              modifiedItem.hss_name = item[key];
            } else if (modifiedKey === "total_inv_value") {
              modifiedItem.total_inv_value = item[key];
            } else if (
              modifiedKey !== "noofconts" &&
              modifiedKey !== "noofcontsbytype"
            ) {
              // For all other fields, check if value is NaN
              if (typeof value === "number" && isNaN(value)) {
                modifiedItem[modifiedKey] = null;
              } else {
                modifiedItem[modifiedKey] = value;
              }
            }
          }
        }
        return modifiedItem;
      });

      modifiedData.forEach((item) => {
        if (item.container_nos && typeof item.container_nos === "string") {
          const containerNumbers = item.container_nos.split(",");

          const noOfContainer = item.no_of_container;

          let sizes = { 40: 0, 20: 0 };

          if (noOfContainer) {
            const sizeEntries = noOfContainer.split(",");

            sizeEntries.forEach((entry) => {
              try {
                const [count, size] = entry.split("x");

                const sizeKey = size?.includes("40")
                  ? "40"
                  : size?.includes("20")
                  ? "20"
                  : null;

                if (sizeKey) {
                  sizes[sizeKey] += parseInt(count, 10) || 0;
                }
              } catch (e) {
                // Error parsing container entry
              }
            });

            const predominantSize = sizes["40"] >= sizes["20"] ? "40" : "20";

            const containers = containerNumbers.map((container) => ({
              container_number: container.trim(),
              size: predominantSize,
            }));

            item.container_nos = containers;
          } else {
            item.container_nos = containerNumbers.map((container) => ({
              container_number: container.trim(),
            }));
          }
        } else {
          item.container_nos = [];
        }
      });

      // Final pass to check for any remaining NaN values
      modifiedData.forEach((item) => {
        for (const key in item) {
          if (typeof item[key] === "number" && isNaN(item[key])) {
            item[key] = null;
          }
        }
      });

      // Reset the file input
      if (inputRef.current) {
        inputRef.current.value = null;
      }

      // Create debug download file
      const blob = new Blob([JSON.stringify(modifiedData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "debug-job-upload.json";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      await uploadAndCheckStatus(modifiedData);
    } catch (error) {
      alert("An error occurred while processing the file: " + error.message);
    }
  };

  async function uploadAndCheckStatus(modifiedData) {
    const invalidJobs = modifiedData.filter(
      (job, i) => !job || typeof job !== "object" || !job.job_no || !job.year
    );

    if (!process.env.REACT_APP_API_STRING) {
      alert(
        "API URL is not configured. Please check your environment variables."
      );
      return;
    }

    const apiUrl = `${process.env.REACT_APP_API_STRING}/jobs/add-job`;

    setLoading(true);

    try {
      let uploadResponse;
      try {
        uploadResponse = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(modifiedData),
        });
      } catch (fetchError) {
        throw new Error(`Network error: ${fetchError.message}`);
      }

      // Try to parse the response
      let responseData;
      try {
        const contentType = uploadResponse.headers.get("content-type");

        if (contentType && contentType.includes("application/json")) {
          responseData = await uploadResponse.json();
        } else {
          const rawText = await uploadResponse.text();
          responseData = { message: rawText || "No response text received" };
        }
      } catch (parseError) {
        const rawText = await uploadResponse.text();
        throw new Error(`Failed to parse response: ${parseError.message}`);
      }

      if (uploadResponse.ok) {
        setSnackbar(true);

        const firstJobNo = modifiedData[0]?.job_no;

        const statusUrl = `${process.env.REACT_APP_API_STRING}/jobs/update-pending-status`;

        try {
          const checkStatusResponse = await axios.get(statusUrl);
        } catch (statusError) {
          // Don't throw here, as the main upload was successful
        }
      } else {
        alert(
          `Upload failed: ${
            responseData.message ||
            responseData.error ||
            uploadResponse.statusText
          }`
        );
      }
    } catch (error) {
      alert("Error during upload: " + error.message);
    } finally {
      setLoading(false);
      setAlt(!alt);
    }
  }

  // Set up snackbar timeout
  if (snackbar) {
    setTimeout(() => {
      setSnackbar(false);
    }, 2000);
  }

  return { handleFileUpload, snackbar, loading };
}

export default useFileUpload;
