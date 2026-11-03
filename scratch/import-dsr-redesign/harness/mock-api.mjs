// Local mock API for verifying the Import DSR list UI with fake data (no real server, no real data).
import http from "node:http";
const PORT = 9106;
const D = (s) => s; // dates as ISO-ish strings

const mk = (i, o) => ({
  _id: `job${i}`, year: "26-27", branch_code: "AMD", trade_type: "IMP", mode: "SEA",
  type_of_b_e: "Home", consignment_type: "FCL", payment_method: "Transaction", custom_house: "ICD KHODIYAR",
  hss: "No", RMS: "", fta_Benefit_date_time: "", gross_weight: "23260", job_net_weight: "23260",
  loading_port: "Laem Chabang (THLCH)", port_of_reporting: "Pipavav (INPAV)", free_time: 21,
  processed_be_attachment: [], ooc_copies: [], gate_pass_copies: [], do_copies: [], cth_documents: [],
  ...o,
});
const jobs = [
  mk(1, { job_no: "03421", job_number: "AMD/IMP/SEA/03421/26-27", detailed_status: "Billing Pending", importer: "B. R. METAL AND ALLOYS (GUJ) PRIVATE LIMITED",
    supplier_exporter: "PGI METALS INDUSTRY (THAILAND) CO., LTD", adCode: "6360424", RMS: "Yes", awb_bl_no: "HDMUBKKA74778400", shipping_line_airline: "HYUNDAI MERCHANT MARINE CO. LTD",
    obl_telex_bl: "OBL", document_received_date: "2026-10-05", gateway_igm_date: D("2026-09-13T00:00"), vessel_berthing: D("2026-09-21T00:00"), discharge_date: D("2026-09-21T00:00"),
    assessment_date: D("2026-09-29T00:00"), pcv_date: D("2026-10-01T00:00"), duty_paid_date: D("2026-09-29T00:00"), out_of_charge: D("2026-10-01T00:00"), do_planning_date: D("2026-10-05T00:00"),
    be_no: "4093991", be_date: "2026-09-29", processed_be_attachment: ["#"], ooc_copies: ["#"], gate_pass_copies: ["#"], do_completed: "2026-10-05", do_validity: "2026-10-20", do_copies: ["#", "#"],
    do_list: "CONTAINER CARE SERVICES / OCEAN EMPTY CONTAINER PARK", is_obl_recieved: false, assessable_ammount: "1049568", igst_ammount: "209703",
    container_nos: [{ container_number: "HMMU2000015", size: "20 Standard Dry", arrival_date: D("2026-10-01T00:00"), container_rail_out_date: D("2026-09-29T00:00"), delivery_date: D("2026-10-05T00:00"), emptyContainerOffLoadDate: D("2026-10-06T00:00"), detention_from: D("2026-10-22T00:00") }, { container_number: "HMMU2000016", size: "20 Standard Dry", arrival_date: D("2026-10-02T00:00"), container_rail_out_date: D("2026-09-30T00:00"), delivery_date: D("2026-10-06T00:00"), emptyContainerOffLoadDate: D("2026-10-07T00:00"), detention_from: D("2026-10-23T00:00") }],
    cth_documents: [["Commercial Invoice","2026091900119820"],["Packing List","2026091900119819"],["Bill of Lading","2026091900119821"],["Pre-Shipment Inspection Certificate","2026091900119823"],["Form 9 & Form 6","2026091900122039"],["COO PTA ASEAN","2026091900119818"],["Registration Document (SIMS/NFMIMS/PIMS)","202609260014555"]].map(([n,irn])=>({document_name:n,irn,document_check_date:"2026-09-19T11:30:00",url:["#"]})) }),
  mk(2, { job_no: "00405", job_number: "GIM/IMP/SEA/00405/26-27", branch_code: "GIM", custom_house: "MUNDRA PORT", cfs_name: "LANDMARK CFS PVT LTD", detailed_status: "Custom Clearance Completed", importer: "VELOX ENERGY PRIVATE LIMITED",
    supplier_exporter: "SHANDONG AOTAI ELECTRIC CO., LTD.", adCode: "20100AD", RMS: "Yes", awb_bl_no: "ONEYTA6PVC274600", hawb_hbl_no: "GDWV26090778", shipping_line_airline: "SEVENSEAS GLOBAL FREIGHT SYSTEMS PVT LTD", loading_port: "Qingdao (CNTAO)", port_of_reporting: "Mundra Sea (INMUN)", free_time: 14,
    gateway_igm_date: D("2026-09-24T00:00"), vessel_berthing: D("2026-10-07T00:00"), discharge_date: D("2026-10-07T00:00"), assessment_date: D("2026-10-05T00:00"), pcv_date: D("2026-10-09T00:00"), duty_paid_date: D("2026-10-08T00:00"), out_of_charge: D("2026-10-09T00:00"), do_planning_date: D("2026-10-07T00:00"),
    be_no: "4226104", be_date: "2026-10-05", processed_be_attachment: ["#"], ooc_copies: ["#"], gate_pass_copies: ["#"], is_obl_recieved: true, obl_recieved_date: "2026-10-07", is_do_doc_recieved: true, do_doc_recieved_date: "2026-10-08",
    do_completed: "2026-10-08", do_validity: "2026-10-20", do_copies: ["#", "#"], do_list: "LANDMARK CFS PVT LTD",
    container_nos: [{ container_number: "ONEU1196297", size: "40 High Cube", arrival_date: D("2026-10-07T00:00"), detention_from: D("2026-10-21T00:00") }, { container_number: "ONEU1196298", size: "40 High Cube", arrival_date: D("2026-10-08T00:00"), detention_from: D("2026-10-22T00:00") }],
    cth_documents: ["Commercial Invoice","Packing List","Certificate of Origin","Insurance","Freight certificate","Bill of Lading","022C01"].map((n,i)=>({document_name:n,irn:"20260918000818"+(37+i),document_check_date:"2026-09-18T10:00:00",url:["#"]})) }),
  mk(3, { job_no: "00366", job_number: "GIM/IMP/SEA/00366/26-27", branch_code: "GIM", custom_house: "MUNDRA PORT", detailed_status: "BE Noted, Clearance Pending", importer: "GUJARAT VICTORY FORGINGS LTD", supplier_exporter: "HEBEI SINO FORGING CO., LTD",
    origin_country: "Thailand", fta_Benefit_date_time: "2026-09-01", adCode: "20100AD", awb_bl_no: "EGLV476600003962", shipping_line_airline: "EVERGREEN LINE", gross_weight: "18420", job_net_weight: "18100", loading_port: "Shanghai (CNSHA)", port_of_reporting: "Mundra Sea (INMUN)", free_time: 14,
    gateway_igm_date: D("2026-09-24T00:00"), vessel_berthing: D("2026-10-03T00:00"), discharge_date: D("2026-10-03T00:00"), assessment_date: D("2026-10-02T00:00"),
    be_no: "4167226", be_date: "2026-10-02", is_obl_recieved: true, obl_recieved_date: "2026-10-06",
    container_nos: [{ container_number: "DRYU2985640", size: "20 Standard Dry", container_rail_out_date: D("2026-10-08T00:00"), arrival_date: D("2026-10-10T00:00"), detention_from: D("2026-11-04T00:00") }],
    cth_documents: [{document_name:"Commercial Invoice",irn:"2026082700031560",document_check_date:"2026-08-27T09:00:00",url:["#"]}] }),
  mk(4, { job_no: "03502", job_number: "AMD/IMP/SEA/03502/26-27", detailed_status: "Estimated Time of Arrival", type_of_b_e: "In-Bond", consignment_type: "LCL", importer: "MEHTA POLYMERS PRIVATE LIMITED", supplier_exporter: "ZHEJIANG HUAFENG PLASTICS CO., LTD", hss: "Yes", saller_name: "Tata Motors", adCode: "6360311",
    awb_bl_no: "COSU6389104420", shipping_line_airline: "COSCO SHIPPING LINES", gross_weight: "9880", job_net_weight: "9760", loading_port: "Ningbo (CNNGB)", vessel_berthing: D("2026-11-04T00:00"),
    container_nos: [{ container_number: "CSNU7610221", size: "20 Standard Dry" }], cth_documents: ["Commercial Invoice","Packing List"].map((n,i)=>({document_name:n,irn:"20261029000112"+(2+i),document_check_date:"2026-10-29T09:00:00",url:["#"]})) }),
  mk(5, { job_no: "03518", job_number: "AMD/IMP/SEA/03518/26-27", detailed_status: "Gateway IGM Filed", importer: "AANAV PACKAGING PRIVATE LIMITED", supplier_exporter: "GUANGZHOU PACKTECH CO., LTD", adCode: "6360198", awb_bl_no: "MEDUP4418830", shipping_line_airline: "MSC MEDITERRANEAN SHIPPING",
    gross_weight: "12300", job_net_weight: "12050", loading_port: "Nansha (CNNSA)", port_of_reporting: "Mundra Sea (INMUN)", gateway_igm_date: D("2026-11-01T00:00"), vessel_berthing: D("2026-11-14T00:00"), container_nos: [{ container_number: "MSMU3340918", size: "40 Standard Dry" }] }),
  mk(6, { job_no: "03520", job_number: "AMD/IMP/SEA/03520/26-27", detailed_status: "ETA Date Pending", importer: "SHREE SAI TEXTILES PVT LTD", supplier_exporter: "VIETNAM FABRIC CO", awb_bl_no: "OOLU2231094", shipping_line_airline: "OOCL", container_nos: [{ container_number: "OOLU9981234", size: "20 Standard Dry" }] }),
  mk(7, { job_no: "03488", job_number: "AMD/IMP/SEA/03488/26-27", detailed_status: "Do completed and Delivery pending", importer: "NAVKAR CHEMICALS LTD", supplier_exporter: "SINOPEC TRADING", awb_bl_no: "ZIMUNGB30211", shipping_line_airline: "ZIM", be_no: "4150022", be_date: "2026-10-12", do_completed: "2026-10-20", do_validity: "2026-11-06", do_copies: ["#"], out_of_charge: D("2026-10-15T00:00"),
    vessel_berthing: D("2026-10-03T00:00"), discharge_date: D("2026-10-04T00:00"), assessment_date: D("2026-10-12T00:00"), pcv_date: D("2026-10-13T00:00"), duty_paid_date: D("2026-10-14T00:00"),
    container_nos: [{ container_number: "ZIMU7712345", size: "40 High Cube", arrival_date: D("2026-10-07T00:00"), detention_from: D("2026-11-05T00:00") }] }),
  mk(8, { job_no: "03470", job_number: "AMD/IMP/SEA/03470/26-27", detailed_status: "Rail Out", importer: "KAMDHENU STEEL LTD", supplier_exporter: "POSCO INTERNATIONAL", awb_bl_no: "HLCUBO1260901", shipping_line_airline: "HAPAG-LLOYD", vessel_berthing: D("2026-10-24T00:00"), discharge_date: D("2026-10-25T00:00"),
    container_nos: [{ container_number: "HLXU3345001", size: "20 Standard Dry", container_rail_out_date: D("2026-10-30T00:00") }] }),
];
// EXTRA_CONTAINERS: a job with many containers (list "Show more" checks)
{ const j = jobs.find((x) => x.job_no === "03421"); for (let i = 3; i <= 9; i++) j.container_nos.push({ container_number: "HMMU20000" + (10 + i), size: "20 Standard Dry", arrival_date: D("2026-10-0" + Math.min(i, 9) + "T00:00"), detention_from: D("2026-10-2" + (i % 10) + "T00:00") }); }
const queries = { "00405": { hasQueries: true, hasUnseen: false, hasOpenQueries: true }, "00366": { hasQueries: true, hasUnseen: true, hasOpenQueries: true } };

const branches = [{ _id: "b1", branch_code: "AMD", category: "SEA", branch_name: "AHMEDABAD", configuration: { railout_enabled: true, gateway_igm_enabled: true, gateway_igm_date_enabled: true },
  ports: [{ port_name: "ICD KHODIYAR", category: "SEA" }, { port_name: "MUNDRA PORT", category: "SEA" }] },
  { _id: "b2", branch_code: "GIM", category: "SEA", branch_name: "GANDHIDHAM", configuration: { railout_enabled: true, gateway_igm_enabled: true, gateway_igm_date_enabled: true }, ports: [{ port_name: "MUNDRA PORT", category: "SEA" }] }];

const send = (res, code, body, origin) => {
  res.writeHead(code, { "content-type": "application/json", "access-control-allow-origin": origin || "*", "access-control-allow-credentials": "true",
    "access-control-allow-headers": "authorization,content-type,x-username,user-id,username,user-role", "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS" });
  res.end(JSON.stringify(body));
};
const seen = new Set();
http.createServer((req, res) => { try {
  const origin = req.headers.origin; const u = new URL(req.url, "http://x"); const p = u.pathname.replace(/^\/api/, "");
  if (req.method === "OPTIONS") return send(res, 204, {}, origin);
  const key = req.method + " " + p.replace(/\d{2}-\d{2}/, ":y").replace(/job\d+/, ":id"); if (!seen.has(key)) { seen.add(key); console.log("req", key); }
  let m;
  if (req.method === "GET" && p === "/me") return send(res, 200, { ok: true }, origin);
  if (req.method === "GET" && p === "/get-years") return send(res, 200, ["26-27", "25-26"], origin);
  if (req.method === "GET" && p === "/admin/my-branches") return send(res, 200, branches, origin);
  if (req.method === "GET" && p === "/get-last-jobs-date") return send(res, 200, { lastJobsDate: "2026-11-02" }, origin);
  if (req.method === "GET" && /\/job-tab-counts$/.test(p)) return send(res, 200, { Pending: 1242, Completed: 4487, Cancelled: 66, Billing_Confirmation: 11 }, origin);
  if (req.method === "GET" && /\/get-importer-list\//.test(p)) return send(res, 200, [...new Set(jobs.map((j) => j.importer))].map((importer) => ({ importer })), origin);
  if (req.method === "GET" && p === "/jobs/status-legend") return send(res, 200, { ranked: [] }, origin);
  if (req.method === "POST" && p === "/client-queries/jobs-status") return send(res, 200, { success: true, data: queries }, origin);
  if (req.method === "GET" && (m = p.match(/^\/([\d-]+)\/jobs\/([^/]+)\/([^/]+)\/([^/]+)\/([^/]+)$/))) {
    const detailed = decodeURIComponent(m[3]); const q = (u.searchParams.get("search") || "").toLowerCase();
    let list = jobs.filter((j) => detailed === "all" || detailed === "DO Planning" || j.detailed_status === detailed);
    if (q) list = list.filter((j) => (j.job_number + j.importer + j.awb_bl_no).toLowerCase().includes(q));
    return send(res, 200, { data: list, total: list.length ? 1242 : 0, totalPages: list.length ? 25 : 0, currentPage: 1, unresolvedCount: 0 }, origin);
  }
  if (req.method === "GET" && (m = p.match(/^\/get-job\/[^/]+\/[^/]+\/[^/]+\/[^/]+\/([^/]+)$/))) return send(res, 200, jobs.find((j) => j.job_no === m[1]) || {}, origin);
  if (req.method === "GET" && /^\/get-jobs-overview\//.test(p)) return send(res, 200, { totalJobs: 5795, pendingJobs: 1242, completedJobs: 4487, cancelledJobs: 66 }, origin);
  if (req.method === "GET" && /^\/get-importer-jobs\//.test(p)) return send(res, 200, [6, 0, 6, 0], origin);
  if (req.method === "GET" && p === "/get-importer-users") return send(res, 200, ["AJAY KUMAWAT","AMIT MISHRA","ANURAG PILLAI","ARPIT SINGHAL","BHARAT DEVASI","BHOOMI PARMAR","CHIRAG SHAH","DEV MASTER","DURGESH PANDEY","ELAIYARAJA ADIDRAVID","ELBIN KURIAN","HIMMAT PANWAR","JAY PATEL","KIRAN RAO","LALIT JOSHI","MEERA NAIR","NIKHIL SHAH","OM PRAKASH","PRIYA DESAI","RAHUL VERMA"], origin);
  if (req.method === "GET" && p === "/charges") {
    const u2 = (n) => ["https://example.com/files/" + n];
    const ch = (i, head, cat, pb, pr, files) => ({ _id: "c" + i, chargeHead: head, category: cat, purchase_book_no: pb, payment_request_no: pr,
      revenue: { url: files, qty: 1, rate: 1000 * i, amount: 1000 * i, amountINR: 1000 * i, exchangeRate: 1 }, cost: { qty: 1, rate: 900 * i, amount: 900 * i, amountINR: 900 * i, exchangeRate: 1, netPayable: 900 * i } });
    return send(res, 200, { success: true, data: [
      ch(1, "SIMS APPLICATION FEES", "Reimbursement", "", "", u2("GIM-455 SIMS COPY.pdf")),
      ch(2, "SIMS REGISTRATION CHARGES", "Margin", "", "", u2("GIM-455 PAYMENT RECEIPT.pdf")),
      ch(3, "S/L CHARGES", "Margin", "PB01/GIM/IMP/SEA/00455/26-27", "R01/GIM/IMP/SEA/00455/26-27", [...u2("TEA574180MUN1-17.pdf"), ...u2("TEA574180MUN-179.pdf")]),
      ch(4, "STAMP DUTY", "Reimbursement", "PB02/GIM/IMP/SEA/00455/26-27", "R02/GIM/IMP/SEA/00455/26-27", u2("STAMP DUTY-17934.pdf")),
      ch(5, "MISCELLANEOUS", "Margin", "", "", []),
      ch(6, "EDI CHARGES", "Reimbursement", "", "", []),
      ch(7, "CFS CHARGES", "Margin", "PB03/GIM/IMP/SEA/00455/26-27", "", [...u2("IMP-455-179344452.pdf"), ...u2("IMP-455.-179344452.pdf")]),
    ] }, origin);
  }
  if (req.method === "GET") return send(res, 200, [], origin);
  return send(res, 200, { success: true }, origin);
} catch (e) { console.log("ERR", e.message); try { send(res, 500, { error: e.message }); } catch (_) {} } }).listen(PORT, () => console.log("mock api on", PORT));
