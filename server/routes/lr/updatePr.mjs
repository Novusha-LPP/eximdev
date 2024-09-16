import express from "express";
import PrData from "../../model/srcc/pr.mjs";
import PrModel from "../../model/srcc/prModel.mjs";

const router = express.Router();

router.post("/api/update-pr", async (req, res) => {
  const {
    pr_no,
    branch,
    type_of_vehicle,
    goods_pickup,
    goods_delivery,
    container_count,
    containers,
    ...updatedJobData
  } = req.body; // Extract relevant data from req.body

  try {
    let prDataToUpdate = await PrData.findOne({ pr_no }).sort({ _id: -1 });

    if (prDataToUpdate) {
      // Container count is less than existing container count
      if (container_count < prDataToUpdate.container_count) {
        // Calculate how many containers need to be deleted
        const containersToDelete =
          prDataToUpdate.container_count - container_count;

        // Check if any container does not have tr_no
        const containersWithoutTrNo = prDataToUpdate.containers.filter(
          (container) => !container.tr_no
        );

        if (containersWithoutTrNo.length < containersToDelete) {
          // Can't delete containers with tr_no
          return res.status(200).send({
            message:
              "Cannot update container count. Some containers have LR assigned.",
          });
        }

        // Filter out containers without tr_no to delete
        let containersToDeleteCount = 0;
        prDataToUpdate.containers = prDataToUpdate.containers.filter(
          (container) => {
            if (
              !container.tr_no &&
              containersToDeleteCount < containersToDelete
            ) {
              containersToDeleteCount++;
              return false; // Exclude this container
            }
            return true; // Keep this container
          }
        );

        // Update container_count in prDataToUpdate
        prDataToUpdate.container_count = container_count;
      }
      // Container count is greater than existing container count
      else if (container_count > prDataToUpdate.container_count) {
        // Add additional containers to prDataToUpdate.containers
        const additionalContainersCount =
          parseInt(container_count) - parseInt(prDataToUpdate.container_count);

        // Update type_of_vehicle, goods_pickup, and goods_delivery in each container without tr_no
        prDataToUpdate.containers.forEach((container) => {
          if (!container.tr_no) {
            container.type_of_vehicle = type_of_vehicle;
            container.goods_pickup = goods_pickup;
            container.goods_delivery = goods_delivery;
          }
        });

        // Add type_of_vehicle, goods_pickup, and goods_delivery to each additional containers
        for (let i = 0; i < additionalContainersCount; i++) {
          prDataToUpdate.containers.push({
            type_of_vehicle,
            goods_pickup,
            goods_delivery,
          });
          // Update container_count in prDataToUpdate
          prDataToUpdate.container_count = container_count;
        }
      }
      // No change in container_count, update other fields if needed
      else {
        prDataToUpdate.set({
          branch,
          type_of_vehicle,
          goods_pickup,
          goods_delivery,
          ...updatedJobData,
        });
        prDataToUpdate.containers.forEach((container) => {
          if (!container.tr_no) {
            container.type_of_vehicle = type_of_vehicle;
            container.goods_pickup = goods_pickup;
            container.goods_delivery = goods_delivery;
          }
        });
        // Update type_of_vehicle, goods_pickup, and goods_delivery in each container
        prDataToUpdate.containers.forEach((container) => {
          if (!container.tr_no) {
            container.type_of_vehicle = type_of_vehicle;
            container.goods_pickup = goods_pickup;
            container.goods_delivery = goods_delivery;
          }
        });
      }

      await prDataToUpdate.save();
    } else {
      //  Determine the branch_code based on the custom_house field
      let branch_code;
      switch (req.body.branch) {
        case "ICD SANAND":
          branch_code = "SND";
          break;
        case "ICD KHODIYAR":
          branch_code = "KHD";
          break;
        case "HAZIRA":
          branch_code = "HZR";
          break;
        case "MUNDRA PORT":
          branch_code = "MND";
          break;
        case "ICD SACHANA":
          branch_code = "SCH";
          break;
        case "BARODA":
          branch_code = "BRD";
          break;
        case "AIRPORT":
          branch_code = "AIR";
          break;
        default:
          break;
      }

      // Fetch the last document from PrModel and generate a 5-digit number
      const lastPr = await PrModel.findOne().sort({ _id: -1 });

      let lastPrNo;
      if (lastPr) {
        lastPrNo = parseInt(lastPr.pr_no) + 1;
      } else {
        lastPrNo = 1;
      }
      const paddedNo = lastPrNo.toString().padStart(5, "0");
      const fiveDigitNo = "0".repeat(5 - paddedNo.length) + paddedNo;

      // Construct the new pr_no
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const isBeforeApril =
        currentDate.getMonth() < 3 ||
        (currentDate.getMonth() === 3 && currentDate.getDate() < 1); // April is month index 3
      const financialYearStart = isBeforeApril ? currentYear - 1 : currentYear;
      const financialYearEnd = financialYearStart + 1;
      const financialYear = `${financialYearStart
        .toString()
        .slice(2)}-${financialYearEnd.toString().slice(2)}`;

      const newPrNo = `PR/${branch_code}/${fiveDigitNo}/${financialYear}`;

      let containerArray = [];
      for (let i = 0; i < container_count; i++) {
        containerArray.push({
          type_of_vehicle,
          goods_pickup,
          goods_delivery,
        });
      }

      // Create a new PrData document
      const newPrData = new PrData({
        pr_date: new Date().toLocaleDateString("en-GB"),
        pr_no: newPrNo,
        branch: req.body.branch,
        consignor: req.body.consignor,
        consignee: req.body.consignee,
        container_type: req.body.container_type,
        container_count: container_count,
        gross_weight: req.body.gross_weight,
        type_of_vehicle: req.body.type_of_vehicle,
        description: req.body.description,
        shipping_line: req.body.shipping_line_airline,
        container_loading: req.body.container_loading,
        container_offloading: req.body.container_offloading,
        do_validity: req.body.do_validity,
        document_no: req.body.document_no,
        document_date: req.body.be_date,
        goods_pickup: req.body.goods_pickup,
        goods_delivery: req.body.goods_delivery,
        containers: containerArray,
      });

      // Save the new PrData document to the database
      await newPrData.save();

      const newPr = new PrModel({
        pr_no: fiveDigitNo,
      });

      // Save the new PrModel document to the database
      await newPr.save();

      res.status(200).send({ message: "New PR added successfully" });
    }

    res.status(200).send({ message: "PR updated successfully" });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

export default router;
