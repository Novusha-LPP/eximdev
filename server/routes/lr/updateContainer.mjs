import express from "express";
import PrData from "../../model/srcc/pr.mjs";
import Tr from "../../model/srcc/trModel.mjs";

const router = express.Router();

router.post("/api/update-container", async (req, res) => {
  try {
    const {
      tr_no,
      container_number,
      tare_weight,
      net_weight,
      goods_pickup,
      goods_delivery,
      own_hired,
      eWay_bill,
      isOccupied,
      type_of_vehicle,
      driver_name,
      driver_phone,
      sr_cel_no,
      sr_cel_FGUID,
      sr_cel_id,
      seal_no,
      gross_weight,
      vehicle_no,
      pr_no,
      status,
      elock,
      tracking_status,
    } = req.body;

    // Find the PR document
    const prDocument = await PrData.findOne({ pr_no }).sort({ _id: -1 }).exec();
    if (!prDocument) {
      console.warn("❌ PR document not found for PR No:", pr_no);
      return res.status(200).json({ message: "PR document not found" });
    }


    // Extract branch code and year from PR number
    const prParts = pr_no?.split("/");
    const branchCode = prParts[1]; // Get the branch code from PR number
    const prYear = prParts[3]; // e.g., "25-26"

    if (!prYear || !branchCode) {
      console.error("❌ Branch code or year not found in PR number:", pr_no);
      return res.status(400).json({ message: "Invalid PR number format" });
    }

    // Generate new TR number
    let newTrNumber;
    let newTrComplete;
    let newTrFull;

    // Check if updating existing container with TR number
    const containerIndex = prDocument.containers.findIndex(
      (container) => container.container_number === container_number
    );

    if (containerIndex !== -1 && prDocument.containers[containerIndex].tr_no) {
      // Container exists and has a TR number, use existing TR
      newTrFull = prDocument.containers[containerIndex].tr_no;
    } else {
      // Need to generate a new TR number
      // Get the last TR for the specific branch code and year combination
      const lastTrForBranchAndYear = await Tr.findOne({
        branch_code: branchCode,
        year: prYear,
      })
        .sort({ tr_no: -1 })
        .exec();

      // Calculate the next TR number for this branch and year
      // If no previous TR exists for this specific branch and year, start from 1
      let nextTrNo = 1;

      if (lastTrForBranchAndYear) {
        nextTrNo = parseInt(lastTrForBranchAndYear.tr_no) + 1;
      }

      // Format TR number with leading zeros
      newTrNumber = nextTrNo.toString().padStart(5, "0");
      newTrComplete = `${branchCode}/${newTrNumber}/${prYear}`;
      newTrFull = `LR/${branchCode}/${newTrNumber}/${prYear}`;


      // Create a new TR record in the database with branch code
      await Tr.create({
        branch_code: branchCode,
        tr_no: newTrNumber,
        year: prYear,
        tr_no_complete: newTrComplete,
      });
    }

    // Update container information
    if (containerIndex === -1) {
      // Container not found, check for blank slot
    
      const containerWithoutNumberIndex = prDocument.containers.findIndex(
        (container) => !container.container_number
      );

      if (containerWithoutNumberIndex !== -1) {
        // Update existing blank container
        const container = prDocument.containers[containerWithoutNumberIndex];

        Object.assign(container, {
          container_number,
          tare_weight,
          net_weight,
          sr_cel_no,
          sr_cel_FGUID,
          sr_cel_id,
          goods_pickup,
          goods_delivery,
          own_hired,
          eWay_bill,
          isOccupied,
          type_of_vehicle,
          driver_name,
          driver_phone,
          seal_no,
          gross_weight,
          vehicle_no,
          status,
          tr_no: newTrFull,
          elock,
          tracking_status,
        });
      } else {
        // Add new container
        prDocument.containers.push({
          container_number,
          tare_weight,
          net_weight,
          sr_cel_no,
          sr_cel_FGUID,
          sr_cel_id,
          goods_pickup,
          goods_delivery,
          own_hired,
          eWay_bill,
          isOccupied,
          type_of_vehicle,
          driver_name,
          driver_phone,
          seal_no,
          gross_weight,
          vehicle_no,
          status,
          tr_no: newTrFull,
          elock,
          tracking_status,
        });
      }
    } else {
      // Container exists, update it
      const matchingContainer = prDocument.containers[containerIndex];
      // Update container properties
      Object.assign(matchingContainer, {
        tare_weight,
        net_weight,
        sr_cel_no,
        sr_cel_FGUID,
        sr_cel_id,
        goods_pickup,
        goods_delivery,
        own_hired,
        eWay_bill,
        isOccupied,
        type_of_vehicle,
        driver_name,
        driver_phone,
        seal_no,
        gross_weight,
        vehicle_no,
        status,
        elock,
        tracking_status,
      });

      // Assign TR if not already present
      if (!matchingContainer.tr_no) {
        matchingContainer.tr_no = newTrFull;
      }
    }

    await prDocument.save();
    res.status(200).json({
      message: "Container data updated successfully",
      tr_no: newTrFull,
    });
  } catch (error) {
    console.error("❌ Error updating container data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
