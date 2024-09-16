import * as xlsx from "xlsx";
import axios from "axios";
import { useState } from "react";

function useFileUpload(inputRef, alt, setAlt) {
  const [snackbar, setSnackbar] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];

    const reader = new FileReader();
    reader.onload = handleFileRead;
    reader.readAsBinaryString(file);
  };

  const handleFileRead = (event) => {
    const content = event.target.result;
    const workbook = xlsx.read(content, { type: "binary" });

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Format awb_bl_no column
    const columnToFormat = "H";

    // Loop through all cells in column H and format them as '0' to prevent scientific notation
    Object.keys(worksheet).forEach(function (cell) {
      if (cell.startsWith(columnToFormat)) {
        if (worksheet[cell].w) {
          delete worksheet[cell].w;
          worksheet[cell].z = "0";
        }
      }
    });

    const jsonData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], {
      range: 2,
    });

    const modifiedData = jsonData?.map((item) => {
      const modifiedItem = {};
      for (const key in item) {
        if (Object.hasOwnProperty.call(item, key)) {
          let modifiedKey = key
            .toLowerCase() // Convert to lower case
            .replace(/\s+/g, "_") // Replace spaces with underscores
            .replace(/[^\w\s]/gi, "_") // Replace special characters with underscores
            .replace(/\//g, "_") // Replace forward slashes with underscores
            .replace(/_+$/, ""); // Remove any trailing underscores

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
            ].includes(modifiedKey)
          ) {
            let value = item[key];

            // Check if the value is a number (Excel serial date)
            if (!isNaN(value) && typeof value === "number") {
              // Convert Excel serial date to JavaScript date
              const excelEpoch = new Date(1899, 11, 30);
              const jsDate = new Date(excelEpoch.getTime() + value * 86400000);

              // Format the date to yyyy-mm-dd
              const year = jsDate.getFullYear();
              const month = String(jsDate.getMonth() + 1).padStart(2, "0");
              const day = String(jsDate.getDate()).padStart(2, "0");
              modifiedItem[modifiedKey] = `${year}-${month}-${day}`;
            } else if (typeof value === "string") {
              // Handle date formats like "15/3/2024 12:00:00 AM"
              const dateParts = value.split(" ")[0].split("/");
              if (dateParts.length === 3) {
                const day = String(dateParts[0]).padStart(2, "0");
                const month = String(dateParts[1]).padStart(2, "0");
                const year = String(dateParts[2]);
                modifiedItem[modifiedKey] = `${year}-${month}-${day}`;
              } else {
                // Fallback if the date cannot be parsed
                modifiedItem[modifiedKey] = value;
              }
            } else {
              // Fallback for other types
              modifiedItem[modifiedKey] = value;
            }
          } else if (modifiedKey === "job_no") {
            // Extract job number and year from job_no
            const match = item[key].split("/");
            modifiedItem.job_no = match[3]; // Save job number
            modifiedItem.year = match[4]; // Save year
          } else if (modifiedKey === "custom_house") {
            const customHouse = item[key].toLowerCase();
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
            // Convert importerURL to small case, replace spaces with underscores, replace "-" with "_", and replace consecutive underscores with a single underscore
            modifiedItem.importerURL = item[key]
              .toLowerCase()
              .replace(/\s+/g, "_") // Replace spaces with underscores
              .replace(/[^\w]+/g, "") // Remove all special characters except underscores
              .replace(/_+/g, "_") // Replace multiple underscores with a single underscore
              .replace(/^_|_$/g, ""); // Remove leading and trailing underscores
          } else if (modifiedKey === "container_no") {
            // Rename key from "container_no" to "container_nos"
            modifiedItem.container_nos = item[key];
          } else if (modifiedKey === "awb_bl_no_") {
            // Rename key from "awb_bl_no_" to "awb_bl_no"
            modifiedItem.awb_bl_no = item[key];
          } else if (modifiedKey === "assbl__value") {
            // Rename key from "assbl__value" to "assbl_value"
            modifiedItem.assbl_value = item[key];
          } else if (modifiedKey === "ex_rate") {
            // Rename key from "ex_rate" to "exrate"
            modifiedItem.exrate = item[key];
          } else if (modifiedKey === "bill_no") {
            // Remove duplicate bill no
            modifiedItem.bill_no = item[key].split(",")[0];
          } else if (modifiedKey === "bill_no") {
            // Remove duplicate bill no
            modifiedItem.bill_no = item[key].split(",")[0];
          } else if (modifiedKey === "consignment_type") {
            // Remove duplicate bill date
            modifiedItem.consignment_type = item[key].split(",")[0];
          } else if (
            modifiedKey !== "noofconts" &&
            modifiedKey !== "noofcontsbytype"
          ) {
            // Exclude "noofconts", "noofcontsbytype", and "container_nos_" keys from the output
            modifiedItem[modifiedKey] = item[key];
          }
        }
      }
      return modifiedItem;
    });

    modifiedData.forEach((item) => {
      if (item.container_nos && typeof item.container_nos === "string") {
        const containerNumbers = item.container_nos.split(",");

        // Parse the "No Of Container" field to get quantities and sizes
        const noOfContainer = item.no_of_container; // Assuming this field contains "4x40HC,4x40HC,2x20HC"
        let sizes = { 40: 0, 20: 0 };

        if (noOfContainer) {
          const sizeEntries = noOfContainer.split(","); // Split by comma

          sizeEntries.forEach((entry) => {
            const [count, size] = entry.split("x"); // Split each entry by "x"

            const sizeKey = size.includes("40")
              ? "40"
              : size.includes("20")
              ? "20"
              : null;

            if (sizeKey) {
              sizes[sizeKey] += parseInt(count, 10); // Sum up the count for each size
            }
          });

          // Determine the predominant size
          const predominantSize = sizes["40"] >= sizes["20"] ? "40" : "20";

          // Assign the size to each container
          const containers = containerNumbers.map((container) => ({
            container_number: container.trim(),
            size: predominantSize,
          }));

          // Replace container_nos with the array of objects
          item.container_nos = containers;
        } else {
          // Handle cases where no_of_container is missing or empty
          item.container_nos = containerNumbers.map((container) => ({
            container_number: container.trim(),
          }));
        }
      } else {
        // Handle cases where container_nos is missing or not a string
        item.container_nos = []; // Set as an empty array or handle it accordingly
      }
    });

    // Set file to null so that same file can be selected again
    if (inputRef.current) {
      inputRef.current.value = null;
    }

    async function uploadExcelData() {
      setLoading(true);
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/jobs/add-job`,
        modifiedData
      );
      console.log(`modifiedData: ${JSON.stringify(modifiedData)}`);
      if (res.status === 200) {
        setSnackbar(true);
      } else {
        alert("Something went wrong");
      }
      setLoading(false);
    }

    uploadExcelData().then(() => setAlt(!alt));
  };

  // Hide snackbar after 2 seconds
  setTimeout(() => {
    setSnackbar(false);
  }, 2000);

  return { handleFileUpload, snackbar, loading };
}

export default useFileUpload;
