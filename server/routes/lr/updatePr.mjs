import express from "express";
import PrData from "../../model/srcc/pr.mjs";
import PrModel from "../../model/srcc/prModel.mjs";

const router = express.Router();

router.post("/api/update-pr", async (req, res) => {
  console.log(req.body);
  const {
    pr_no,
    import_export,
    branch,
    type_of_vehicle,
    goods_pickup,
    goods_delivery,
    container_count,
    containers,
    isBranch,
    suffix,
    prefix,
    ...updatedJobData
  } = req.body;

  try {
    let prDataToUpdate = await PrData.findOne({ pr_no }).sort({ _id: -1 });

    if (prDataToUpdate) {
      if (container_count < prDataToUpdate.container_count) {
        const containersToDelete =
          prDataToUpdate.container_count - container_count;

        const containersWithoutTrNo = prDataToUpdate.containers.filter(
          (container) => !container.tr_no
        );

        if (containersWithoutTrNo.length < containersToDelete) {
          return res.status(200).send({
            message:
              "Cannot update container count. Some containers have LR assigned.",
          });
        }

        let containersToDeleteCount = 0;
        prDataToUpdate.containers = prDataToUpdate.containers.filter(
          (container) => {
            if (
              !container.tr_no &&
              containersToDeleteCount < containersToDelete
            ) {
              containersToDeleteCount++;
              return false;
            }
            return true;
          }
        );

        prDataToUpdate.container_count = container_count;
      } else if (container_count > prDataToUpdate.container_count) {
        const additionalContainersCount =
          container_count - prDataToUpdate.container_count;

        prDataToUpdate.containers.forEach((container) => {
          if (!container.tr_no) {
            container.type_of_vehicle = type_of_vehicle;
            container.goods_pickup = goods_pickup;
            container.goods_delivery = goods_delivery;
          }
        });

        for (let i = 0; i < additionalContainersCount; i++) {
          prDataToUpdate.containers.push({
            type_of_vehicle,
            goods_pickup,
            goods_delivery,
          });
        }

        prDataToUpdate.container_count = container_count;
      }

      prDataToUpdate.set({
        import_export,
        branch,
        type_of_vehicle,
        goods_pickup,
        goods_delivery,
        suffix: isBranch ? suffix : prDataToUpdate.suffix,
        prefix: isBranch ? prefix : prDataToUpdate.prefix,
        ...updatedJobData,
      });

      await prDataToUpdate.save();
      return res.status(200).send({ message: "PR updated successfully" });
    } else {
      // Create New PR
      let branch_code;
      switch (branch) {
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
          branch_code = "GEN";
          break;
      }

      // Determine financial year for suffix if not provided
      let yearSuffix;
      if (isBranch && suffix) {
        yearSuffix = suffix;
      } else {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const isBeforeApril =
          currentDate.getMonth() < 3 ||
          (currentDate.getMonth() === 3 && currentDate.getDate() < 1);
        const financialYearStart = isBeforeApril
          ? currentYear - 1
          : currentYear;
        const financialYearEnd = financialYearStart + 1;
        yearSuffix = `${financialYearStart
          .toString()
          .slice(2)}-${financialYearEnd.toString().slice(2)}`;
      }

      // Determine prefix for PR
      const prPrefix = isBranch ? prefix : branch_code;

      // Get the last PR number for this year
      const lastPrForYear = await PrModel.findOne({
        year: yearSuffix,
      })
        .sort({ pr_no: -1 }) // Sort by pr_no descending to get the highest number
        .exec();

      console.log(`📋 Last PR for year ${yearSuffix}:`, lastPrForYear);

      // Calculate the next PR number for this year
      let nextPrNo = 1; // Default to 1 if no previous PR exists

      if (lastPrForYear) {
        // Parse the PR number as an integer and increment
        nextPrNo = parseInt(lastPrForYear.pr_no) + 1;
      }

      console.log("🔢 Next PR number:", nextPrNo);

      // Format PR number with leading zeros
      const paddedPrNo = nextPrNo.toString().padStart(5, "0");
      const prNoComplete = `${paddedPrNo}/${yearSuffix}`;
      const newPrNo = `PR/${prPrefix}/${paddedPrNo}/${yearSuffix}`;

      console.log("🆕 Generated new PR:", newPrNo);

      // Create container array
      let containerArray = [];
      for (let i = 0; i < container_count; i++) {
        containerArray.push({
          type_of_vehicle,
          goods_pickup,
          goods_delivery,
        });
      }

      // Create the new PR Data
      const newPrData = new PrData({
        pr_date: new Date().toLocaleDateString("en-GB"),
        pr_no: newPrNo,
        import_export,
        branch,
        consignor: req.body.consignor,
        consignee: req.body.consignee,
        container_type: req.body.container_type,
        container_count,
        gross_weight: req.body.gross_weight,
        type_of_vehicle,
        description: req.body.description,
        shipping_line: req.body.shipping_line,
        container_loading: req.body.container_loading,
        container_offloading: req.body.container_offloading,
        do_validity: req.body.do_validity,
        instructions: req.body.instructions,
        document_no: req.body.document_no,
        document_date: req.body.document_date,
        goods_pickup,
        goods_delivery,
        containers: containerArray,
        suffix: yearSuffix,
        prefix: prPrefix,
      });

      await newPrData.save();
      console.log("✅ New PR data saved:", newPrNo);

      // Create entry in PR Model for tracking
      const newPrModel = new PrModel({
        pr_no: paddedPrNo,
        year: yearSuffix,
        pr_no_complete: prNoComplete,
      });

      await newPrModel.save();
      console.log("✅ New PR model entry created:", prNoComplete);

      return res.status(200).send({ message: "New PR added successfully" });
    }
  } catch (error) {
    console.error("❌ Error in update-pr route:", error);
    return res.status(500).send({ error: error.message });
  }
});

export default router;
