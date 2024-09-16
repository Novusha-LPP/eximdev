import express from "express";
import PrData from "../../model/srcc/pr.mjs";

const router = express.Router();

router.get("/api/view-srcc-dsr", async (req, res) => {
  const data = await PrData.find({});

  const extractRelevantData = (data) => {
    return data.flatMap((document) =>
      document.containers.map((container) => ({
        tr_no: container.tr_no,
        container_number: container.container_number,
        consignor: document.consignor,
        consignee: document.consignee,
        goods_delivery: container.goods_delivery,
        branch: document.branch,
        vehicle_no: container.vehicle_no,
        driver_name: container.driver_name,
        driver_phone: container.driver_phone,
        sr_cel_no: container.sr_cel_no,
        sr_cel_FGUID: container.sr_cel_FGUID,
        sr_cel_id: container.sr_cel_id,
        shipping_line: document.shipping_line,
        container_offloading: document.container_offloading,
        do_validity: document.do_validity,
        status: container.status,
      }))
    );
  };

  const allContainers = extractRelevantData(data);
  // Send only those jobs which have tr_no available
  const trs = allContainers.filter((container) => container.tr_no);
  res.status(200).json(trs);
});

export default router;
