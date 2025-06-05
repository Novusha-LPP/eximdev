import express from "express";
import mongoose from "mongoose";
import PrData from "../../model/srcc/pr.mjs";
import PrModel from "../../model/srcc/prModel.mjs";
import ContainerType from "../../model/srcc/containerType.mjs";
import Organisation from "../../model/srcc/Directory_Management/Organisation.mjs";
import Location from "../../model/srcc/Directory_Management/location.mjs";
import ShippingLine from "../../model/srcc/Directory_Management/ShippingLine.mjs";
import VehicleType from "../../model/srcc/Directory_Management/VehicleType.mjs";

const router = express.Router();

// Helper function to validate and convert ObjectId references
const validateAndConvertObjectId = async (value, Model, nameField) => {
  // Handle empty strings, null, undefined, or empty objects
  if (
    !value ||
    value === "" ||
    (typeof value === "object" && Object.keys(value).length === 0)
  ) {
    return null;
  }

  // If value is an object with _id, extract the _id
  if (typeof value === "object" && value._id) {
    value = value._id;
  }

  // Check if it's a valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(value)) {
    // If it's not a valid ObjectId, try to find by name field
    const query = {};
    query[nameField] = value;
    const document = await Model.findOne(query);

    if (!document) {
      return { error: `${Model.modelName} not found: ${value}` };
    }

    return document._id;
  } else {
    // If it's a valid ObjectId, verify it exists
    const document = await Model.findById(value);
    if (!document) {
      return { error: `${Model.modelName} not found with ID: ${value}` };
    }
    return value;
  }
};

router.post("/api/update-pr", async (req, res) => {
  console.log("📥 Request body:", req.body);
  
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

  // Helper function to handle empty strings for ObjectId fields
  const getObjectIdOrUndefined = (value) => {
    if (!value || value === "" || value === null) {
      return undefined;
    }
    return value;
  };

  try {
    // Validate required fields
    if (!branch) {
      return res.status(400).send({ error: "Branch is required" });
    }

    if (!container_count || isNaN(parseInt(container_count))) {
      return res.status(400).send({ error: "Valid container count is required" });
    }

    const containerCountNum = parseInt(container_count);

    // Validate and convert all ObjectId fields
    const validationResults = await Promise.all([
      // Container type validation
      updatedJobData.container_type
        ? validateAndConvertObjectId(
            updatedJobData.container_type,
            ContainerType,
            "container_type"
          )
        : Promise.resolve(null),

      // Consignor validation
      updatedJobData.consignor
        ? validateAndConvertObjectId(
            updatedJobData.consignor,
            Organisation,
            "organisation_name"
          )
        : Promise.resolve(null),

      // Consignee validation
      updatedJobData.consignee
        ? validateAndConvertObjectId(
            updatedJobData.consignee,
            Organisation,
            "organisation_name"
          )
        : Promise.resolve(null),

      // Shipping line validation
      updatedJobData.shipping_line
        ? validateAndConvertObjectId(
            updatedJobData.shipping_line,
            ShippingLine,
            "name"
          )
        : Promise.resolve(null),

      // Type of vehicle validation
      type_of_vehicle
        ? validateAndConvertObjectId(
            type_of_vehicle,
            VehicleType,
            "vehicleType"
          )
        : Promise.resolve(null),

      // Goods pickup validation
      goods_pickup
        ? validateAndConvertObjectId(goods_pickup, Location, "location_name")
        : Promise.resolve(null),

      // Goods delivery validation
      goods_delivery
        ? validateAndConvertObjectId(goods_delivery, Location, "location_name")
        : Promise.resolve(null),

      // Container loading validation
      updatedJobData.container_loading
        ? validateAndConvertObjectId(
            updatedJobData.container_loading,
            Location,
            "location_name"
          )
        : Promise.resolve(null),

      // Container offloading validation
      updatedJobData.container_offloading
        ? validateAndConvertObjectId(
            updatedJobData.container_offloading,
            Location,
            "location_name"
          )
        : Promise.resolve(null),
    ]);

    // Check for validation errors
    const errors = validationResults.filter((result) => result && result.error);
    if (errors.length > 0) {
      console.log("❌ Validation errors:", errors);
      return res.status(400).send({
        error: errors.map((e) => e.error).join(", "),
      });
    }

    // Update the values with converted ObjectIds
    const [
      containerTypeId,
      consignorId,
      consigneeId,
      shippingLineId,
      typeOfVehicleId,
      goodsPickupId,
      goodsDeliveryId,
      containerLoadingId,
      containerOffloadingId,
    ] = validationResults;

    if (containerTypeId) updatedJobData.container_type = containerTypeId;
    if (consignorId) updatedJobData.consignor = consignorId;
    if (consigneeId) updatedJobData.consignee = consigneeId;
    if (shippingLineId) updatedJobData.shipping_line = shippingLineId;
    if (containerLoadingId)
      updatedJobData.container_loading = containerLoadingId;
    if (containerOffloadingId)
      updatedJobData.container_offloading = containerOffloadingId;

    // Check if we're updating existing PR or creating new one
    let prDataToUpdate = null;
    
    // Only try to find existing PR if pr_no is provided and not empty
    if (pr_no && pr_no.trim() !== "") {
      prDataToUpdate = await PrData.findOne({ pr_no }).sort({ _id: -1 });
      console.log("🔍 Found existing PR:", prDataToUpdate ? prDataToUpdate.pr_no : "None");
    }

    if (prDataToUpdate) {
      // Update existing PR
      console.log("🔄 Updating existing PR:", pr_no);
      
      if (containerCountNum < prDataToUpdate.container_count) {
        const containersToDelete = prDataToUpdate.container_count - containerCountNum;

        const containersWithoutTrNo = prDataToUpdate.containers.filter(
          (container) => !container.tr_no
        );

        if (containersWithoutTrNo.length < containersToDelete) {
          return res.status(400).send({
            error: "Cannot update container count. Some containers have LR assigned.",
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

        prDataToUpdate.container_count = containerCountNum;
      } else if (containerCountNum > prDataToUpdate.container_count) {
        const additionalContainersCount = containerCountNum - prDataToUpdate.container_count;

        // Update existing containers without tr_no
        prDataToUpdate.containers.forEach((container) => {
          if (!container.tr_no) {
            container.type_of_vehicle = getObjectIdOrUndefined(typeOfVehicleId || type_of_vehicle);
            container.goods_pickup = getObjectIdOrUndefined(goodsPickupId || goods_pickup);
            container.goods_delivery = getObjectIdOrUndefined(goodsDeliveryId || goods_delivery);
          }
        });

        // Add new containers
        for (let i = 0; i < additionalContainersCount; i++) {
          prDataToUpdate.containers.push({
            type_of_vehicle: getObjectIdOrUndefined(typeOfVehicleId || type_of_vehicle),
            goods_pickup: getObjectIdOrUndefined(goodsPickupId || goods_pickup),
            goods_delivery: getObjectIdOrUndefined(goodsDeliveryId || goods_delivery),
          });
        }

        prDataToUpdate.container_count = containerCountNum;
      }

      // Helper function to handle empty strings for ObjectId fields
      const getObjectIdOrUndefined = (value) => {
        if (!value || value === "" || value === null) {
          return undefined;
        }
        return value;
      };

      // Update PR data
      prDataToUpdate.set({
        import_export,
        branch,
        type_of_vehicle: getObjectIdOrUndefined(typeOfVehicleId || type_of_vehicle),
        goods_pickup: getObjectIdOrUndefined(goodsPickupId || goods_pickup),
        goods_delivery: getObjectIdOrUndefined(goodsDeliveryId || goods_delivery),
        suffix: isBranch ? suffix : prDataToUpdate.suffix,
        prefix: isBranch ? prefix : prDataToUpdate.prefix,
        // Handle ObjectId fields properly
        consignor: getObjectIdOrUndefined(consignorId || updatedJobData.consignor),
        consignee: getObjectIdOrUndefined(consigneeId || updatedJobData.consignee),
        container_type: getObjectIdOrUndefined(containerTypeId || updatedJobData.container_type),
        shipping_line: getObjectIdOrUndefined(shippingLineId || updatedJobData.shipping_line),
        container_loading: getObjectIdOrUndefined(containerLoadingId || updatedJobData.container_loading),
        container_offloading: getObjectIdOrUndefined(containerOffloadingId || updatedJobData.container_offloading),
        // Non-ObjectId fields
        gross_weight: updatedJobData.gross_weight,
        description: updatedJobData.description,
        do_validity: updatedJobData.do_validity,
        instructions: updatedJobData.instructions,
        document_no: updatedJobData.document_no,
        document_date: updatedJobData.document_date,
      });

      await prDataToUpdate.save();
      console.log("✅ PR updated successfully:", pr_no);
      return res.status(200).send({ message: "PR updated successfully" });
    } else {
      // Create New PR
      console.log("🆕 Creating new PR for branch:", branch);
      
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
        case "KAN4": // Add the missing branch
          branch_code = "KAN";
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

      console.log("🔢 Using prefix:", prPrefix, "and suffix:", yearSuffix);

      try {
        // Get the last PR number for this SPECIFIC branch prefix and year
        const lastPrForBranchAndYear = await PrModel.findOne({
          branch_code: prPrefix,
          year: yearSuffix,
        })
          .sort({ pr_no: -1 }) // Sort by pr_no descending to get the highest number
          .exec();

        console.log(
          `📋 Last PR for branch ${prPrefix} and year ${yearSuffix}:`,
          lastPrForBranchAndYear
        );

        // Calculate the next PR number for this branch and year
        let nextPrNo = 1;
        if (lastPrForBranchAndYear) {
          nextPrNo = parseInt(lastPrForBranchAndYear.pr_no) + 1;
        }

        console.log("🔢 Next PR number:", nextPrNo);

        // Format PR number with leading zeros
        const paddedPrNo = nextPrNo.toString().padStart(5, "0");
        const prNoComplete = `${prPrefix}/${paddedPrNo}/${yearSuffix}`;
        const newPrNo = `PR/${prPrefix}/${paddedPrNo}/${yearSuffix}`;

        console.log("🆕 Generated new PR:", newPrNo);

        // Create container array with proper ObjectId handling
        let containerArray = [];
        for (let i = 0; i < containerCountNum; i++) {
          containerArray.push({
            type_of_vehicle: getObjectIdOrUndefined(typeOfVehicleId || type_of_vehicle),
            goods_pickup: getObjectIdOrUndefined(goodsPickupId || goods_pickup),
            goods_delivery: getObjectIdOrUndefined(goodsDeliveryId || goods_delivery),
          });
        }

        // Create the new PR Data
        const newPrData = new PrData({
          pr_date: new Date().toLocaleDateString("en-GB"),
          pr_no: newPrNo,
          import_export,
          branch,
          consignor: getObjectIdOrUndefined(consignorId || updatedJobData.consignor),
          consignee: getObjectIdOrUndefined(consigneeId || updatedJobData.consignee),
          container_type: getObjectIdOrUndefined(containerTypeId || updatedJobData.container_type),
          container_count: containerCountNum,
          gross_weight: updatedJobData.gross_weight,
          type_of_vehicle: getObjectIdOrUndefined(typeOfVehicleId || type_of_vehicle),
          description: updatedJobData.description,
          shipping_line: getObjectIdOrUndefined(shippingLineId || updatedJobData.shipping_line),
          container_loading: getObjectIdOrUndefined(containerLoadingId || updatedJobData.container_loading),
          container_offloading: getObjectIdOrUndefined(containerOffloadingId || updatedJobData.container_offloading),
          do_validity: updatedJobData.do_validity,
          instructions: updatedJobData.instructions,
          document_no: updatedJobData.document_no,
          document_date: updatedJobData.document_date,
          goods_pickup: getObjectIdOrUndefined(goodsPickupId || goods_pickup),
          goods_delivery: getObjectIdOrUndefined(goodsDeliveryId || goods_delivery),
          containers: containerArray,
          suffix: yearSuffix,
          prefix: prPrefix,
        });

        await newPrData.save();
        console.log("✅ New PR data saved:", newPrNo);

        // Create entry in PR Model for tracking
        const newPrModel = new PrModel({
          branch_code: prPrefix,
          pr_no: paddedPrNo,
          year: yearSuffix,
          pr_no_complete: prNoComplete,
        });

        await newPrModel.save();
        console.log("✅ New PR model entry created:", prNoComplete);

        return res.status(200).send({ 
          message: "New PR added successfully",
          pr_no: newPrNo 
        });
      } catch (dbError) {
        console.error("❌ Database error while creating PR:", dbError);
        return res.status(500).send({ 
          error: "Database error while creating PR: " + dbError.message 
        });
      }
    }
  } catch (error) {
    console.error("❌ Error in update-pr route:", error);
    console.error("❌ Error stack:", error.stack);
    return res.status(500).send({ 
      error: "Internal server error: " + error.message 
    });
  }
});

export default router;