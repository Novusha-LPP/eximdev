import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { useFormik } from "formik";
import { convertDateFormatForUI } from "../utils/convertDateFormatForUI";
import { useNavigate } from "react-router-dom";
import AWS from "aws-sdk";

const handleSingleFileUpload = async (file, folderName, setFileSnackbar) => {
  try {
    const key = `${folderName}/${file.name}`;

    const s3 = new AWS.S3({
      accessKeyId: process.env.REACT_APP_ACCESS_KEY,
      secretAccessKey: process.env.REACT_APP_SECRET_ACCESS_KEY,
      region: "ap-south-1",
    });

    const params = {
      Bucket: process.env.REACT_APP_S3_BUCKET,
      Key: key,
      Body: file,
    };

    const data = await s3.upload(params).promise();
    const photoUrl = data.Location;

    setFileSnackbar(true);
    setTimeout(() => {
      setFileSnackbar(false);
    }, 3000);

    return photoUrl;
  } catch (err) {
    console.error("Error uploading file:", err);
  }
};

function useExportJobDetails(params, setFileSnackbar) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch export job data
  useEffect(() => {
    async function getExportJobDetails() {
      try {
        setLoading(true);
        console.log("Fetching export job details for:", params);

        const response = await axios.get(
          `${process.env.REACT_APP_API_STRING}/export-jobs/${params.year}/${params.job_no}`
        );

        console.log("Full API Response:", response);
        console.log("Response data:", response.data);

        let jobData = null;

        if (response.data) {
          if (response.data.success && response.data.data) {
            jobData = response.data.data;
          } else if (response.data.success === undefined && response.data._id) {
            jobData = response.data;
          } else if (response.data.job_no || response.data._id) {
            jobData = response.data;
          }
        }

        console.log("Processed jobData:", jobData);

        if (jobData) {
          setData(jobData);
        } else {
          console.error("No valid job data found in response");
          setData(null);
        }
      } catch (error) {
        console.error("Error fetching export job details:", error);
        setData(null);
      } finally {
        setLoading(false);
      }
    }

    if (params.job_no && params.year) {
      getExportJobDetails();
    } else {
      console.warn("Missing required parameters:", params);
      setLoading(false);
    }
  }, [params.job_no, params.year]);

  const safeValue = (value, defaultVal = "") =>
    value === undefined || value === null ? defaultVal : value;

  const formik = useFormik({
    initialValues: {
      // Basic job info - EMPTY DEFAULTS
      job_no: "",
      year: "",
      filing_mode: "",
      shipper: "",
      loading_port: "",
      job_date: "",
      jobReceivedOn: "",
      transport_mode: "",
      sb_type: "",
      custom_house: "",
      consignment_type: "",
      job_owner: "",
      sb_no: "",
      
      // Exporter details - EMPTY DEFAULTS
      exporter_name: "",
      exporter: "", // Schema field
      exporter_address: "",
      exporter_city: "",
      exporter_state: "",
      exporter_country: "",
      branch_code: "",
      branch_sno: "",
      branchSrNo: "", // Schema field
      state: "",
      ie_code_no: "",
      ie_code: "", // Schema field
      regn_no: "",
      exporter_gstin: "", // Schema field
      gstin: "",
      exporter_pan: "",
      
      // Consignee details - EMPTY DEFAULTS
      consignee_name: "",
      consignee_address: "",
      consignee_city: "",
      consignee_state: "",
      consignee_country: "",
      buyer_other_than_consignee: false,
      
      // Invoice details - EMPTY DEFAULTS
      invoice_number: "",
      commercial_invoice_number: "", // Schema field
      invoice_date: "",
      commercial_invoice_date: "", // Schema field
      product_value_usd: "",
      commercial_invoice_value: "", // Schema field
      terms_of_invoice: "",
      // incoterms: "", // Schema field
      currency: "",
      invoice_currency: "", // Schema field
      exchange_rate: "",
      
      // Shipping details - EMPTY DEFAULTS
      discharge_port: "",
      port_of_discharge: "", // Schema field
      discharge_country: "",
      destination_port: "",
      destination_country: "",
      shipping_line: "",
      shipping_line_airline: "", // Schema field
      vessel_sailing_date: "",
      vessel_departure_date: "", // Schema field
      voyage_no: "",
      nature_of_cargo: "",
      total_no_of_pkgs: "",
      total_packages: "", // Schema field
      loose_pkgs: "",
      no_of_containers: "",
      gross_weight: "",
      gross_weight_kg: "", // Schema field
      net_weight: "",
      net_weight_kg: "", // Schema field
      volume: "",
      volume_cbm: "", // Schema field
      chargeable_weight: "",
      marks_nos: "",
      marks_and_numbers: "", // Schema field

      // Additional General Tab fields - EMPTY DEFAULTS
      dbk_bank: "",
      dbk_ac: "",
      dbk_edi_ac: "",
      ref_type: "",
      exporter_ref_no: "",
      exporter_type: "",
      sb_number_date: "",
      shipping_bill_number: "", // Schema field
      shipping_bill_date: "", // Schema field
      rbi_app_no: "",
      gr_waived: false,
      gr_no: "",
      rbi_waiver_no: "",
      bank_dealer: "",
      bank_name: "", // Schema field
      ac_number: "",
      bank_account_number: "", // Schema field
      ad_code: "",
      adCode: "", // Schema field
      epz_code: "",
      notify: "",
      notify_party_name: "", // Schema field
      sales_person: "",
      business_dimensions: "",
      quotation: "",
      
      // Banking fields
      bank_branch: "",
      bank_ifsc_code: "",
      bank_swift_code: "",
      
      // Additional schema fields
      job_type: "sea_export",
      movement_type: "",
      submission_status: "draft",
      priority_level: "Normal",
      status: "",
      detailed_status: "",
      
      // Port fields
      port_of_loading: "",
      loading_port: "", // Keep both for compatibility
      port_of_origin: "",
      final_destination: "",
      place_of_receipt: "",
      place_of_delivery: "",
      country_of_origin: "India",
      country_of_final_destination: "",
      
      // Vessel/Flight information
      vessel_flight_name: "",
      voyage_flight_number: "",
      etd_port_of_loading: "",
      eta_port_of_discharge: "",
      actual_departure_date: "",
      actual_arrival_date: "",
      
      // Carrier Information
      master_bl_awb_number: "",
      master_bl_awb_date: "",
      house_bl_awb_number: "",
      house_bl_awb_date: "",
      booking_number: "",
      booking_date: "",
      
      // Cargo Information
      commodity_description: "",
      description: "", // Schema field for compatibility
      hs_code: "",
      cth_no: "", // Schema field for compatibility
      package_type: "",
      unit: "", // Schema field for compatibility
      dimensions_length: "",
      dimensions_width: "",
      dimensions_height: "",
      special_instructions: "",
      
      // Dangerous Goods
      is_dangerous_goods: false,
      un_number: "",
      proper_shipping_name: "",
      hazard_class: "",
      packing_group: "",
      
      // Commercial Information
      proforma_invoice_number: "",
      proforma_invoice_date: "",
      proforma_invoice_value: "",
      fob_value: "",
      freight_charges: "",
      insurance_charges: "",
      cif_value: "",
      cif_amount: "", // Schema field for compatibility
      
      // Payment Terms
      payment_terms: "",
      payment_method: "",
      
      // Letter of Credit
      lc_number: "",
      lc_date: "",
      lc_amount: "",
      lc_expiry_date: "",
      lc_issuing_bank: "",
      lc_advising_bank: "",
      
      // Regulatory fields
      export_license_required: false,
      export_license_number: "",
      export_license_date: "",
      export_license_validity: "",
      
      // Container details - EMPTY ARRAYS
      containers: [],
      
      // Product details - EMPTY ARRAYS
      products: [],
      
      // Charges information - EMPTY ARRAYS
      charges: [],
      
      // Documents - EMPTY OBJECT
      documents: {},
      
      // Other fields
      remarks: "",
      internal_notes: "",
      customer_instructions: "",
      special_requirements: "",
    },
    enableReinitialize: true,
    onSubmit: async (values) => {
      try {
        const user = JSON.parse(localStorage.getItem("exim_user") || "{}");
        const headers = {
          "Content-Type": "application/json",
          "user-id": user.username || "unknown",
          username: user.username || "unknown",
          "user-role": user.role || "unknown",
        };

        const updatePayload = {
          ...values,
          updatedAt: new Date(),
        };

        console.log("Submitting update payload:", updatePayload);

        const response = await axios.put(
          `${process.env.REACT_APP_API_STRING}/export-jobs/${params.year}/${params.job_no}`,
          updatePayload,
          { headers }
        );

        console.log("Update response:", response.data);

        if (setFileSnackbar) {
          setFileSnackbar(true);
          setTimeout(() => setFileSnackbar(false), 3000);
        }

        setTimeout(() => {
          window.close();
        }, 500);
      } catch (error) {
        console.error("Error updating export job:", error);
        throw error;
      }
    },
  });

  // Update formik initial values when data is fetched - COMPREHENSIVE MAPPING
  useEffect(() => {
    if (data) {
      console.log("Setting formik values with data:", data);

      formik.setValues({
        // Basic job info - Map from API response
        job_no: safeValue(data.job_no),
        year: safeValue(data.year),
        filing_mode: safeValue(data.filing_mode),
        shipper: safeValue(data.shipper || data.exporter_name || data.exporter),
        loading_port: safeValue(data.loading_port || data.port_of_loading),
        job_date: safeValue(data.job_date),
        jobReceivedOn: safeValue(data.jobReceivedOn),
        sb_no: safeValue(data.sb_no || data.shipping_bill_number),
        sb_type: safeValue(data.sb_type),
        transport_mode: safeValue(data.transport_mode),
        custom_house: safeValue(data.custom_house || data.customs_house),
        consignment_type: safeValue(data.consignment_type),
        job_owner: safeValue(data.job_owner),
        
        // Exporter details - Comprehensive mapping
        exporter_name: safeValue(data.exporter_name || data.exporter),
        exporter: safeValue(data.exporter || data.exporter_name),
        exporter_address: safeValue(data.exporter_address),
        exporter_city: safeValue(data.exporter_city),
        exporter_state: safeValue(data.exporter_state || data.state),
        exporter_country: safeValue(data.exporter_country || 'India'),
        branch_code: safeValue(data.branch_code),
        branch_sno: safeValue(data.branch_sno),
        branchSrNo: safeValue(data.branchSrNo || data.branch_sno),
        state: safeValue(data.state || data.exporter_state),
        ie_code_no: safeValue(data.ie_code_no || data.ie_code),
        ie_code: safeValue(data.ie_code || data.ie_code_no),
        regn_no: safeValue(data.regn_no || data.exporter_gstin),
        exporter_gstin: safeValue(data.exporter_gstin || data.regn_no),
        gstin: safeValue(data.gstin),
        exporter_pan: safeValue(data.exporter_pan),
        
        // Banking details - Map multiple possible fields
        bank_dealer: safeValue(data.bank_dealer || data.bank_name),
        bank_name: safeValue(data.bank_name || data.bank_dealer),
        ac_number: safeValue(data.ac_number || data.bank_account_number),
        bank_account_number: safeValue(data.bank_account_number || data.ac_number),
        ad_code: safeValue(data.ad_code || data.adCode),
        adCode: safeValue(data.adCode || data.ad_code),
        bank_branch: safeValue(data.bank_branch),
        bank_ifsc_code: safeValue(data.bank_ifsc_code),
        bank_swift_code: safeValue(data.bank_swift_code),
        
        // General tab specific fields
        dbk_bank: safeValue(data.dbk_bank),
        dbk_ac: safeValue(data.dbk_ac),
        dbk_edi_ac: safeValue(data.dbk_edi_ac),
        ref_type: safeValue(data.ref_type),
        exporter_ref_no: safeValue(data.exporter_ref_no),
        exporter_type: safeValue(data.exporter_type),
        sb_number_date: safeValue(data.sb_number_date || `${data.shipping_bill_number} | ${data.shipping_bill_date}`),
        shipping_bill_number: safeValue(data.shipping_bill_number || data.sb_no),
        shipping_bill_date: safeValue(data.shipping_bill_date),
        rbi_app_no: safeValue(data.rbi_app_no),
        gr_waived: safeValue(data.gr_waived, false),
        gr_no: safeValue(data.gr_no),
        rbi_waiver_no: safeValue(data.rbi_waiver_no),
        epz_code: safeValue(data.epz_code),
        notify: safeValue(data.notify),
        notify_party_name: safeValue(data.notify_party_name || data.notify),
        sales_person: safeValue(data.sales_person),
        business_dimensions: safeValue(data.business_dimensions),
        quotation: safeValue(data.quotation),
        
        // Consignee details - Map all variants
        consignee_name: safeValue(data.consignee_name),
        consignee_address: safeValue(data.consignee_address),
        consignee_city: safeValue(data.consignee_city),
        consignee_state: safeValue(data.consignee_state),
        consignee_country: safeValue(data.consignee_country),
        buyer_other_than_consignee: safeValue(data.buyer_other_than_consignee, false),
        
        // Invoice details - Multiple mappings
        invoice_number: safeValue(data.invoice_number || data.commercial_invoice_number),
        commercial_invoice_number: safeValue(data.commercial_invoice_number || data.invoice_number),
        invoice_date: safeValue(data.invoice_date || data.commercial_invoice_date),
        commercial_invoice_date: safeValue(data.commercial_invoice_date || data.invoice_date),
        product_value_usd: safeValue(data.product_value_usd || data.commercial_invoice_value),
        commercial_invoice_value: safeValue(data.commercial_invoice_value || data.product_value_usd),
        terms_of_invoice: safeValue(data.terms_of_invoice || data.incoterms),
        // incoterms: safeValue(data.incoterms || data.terms_of_invoice),
        currency: safeValue(data.currency || data.invoice_currency),
        invoice_currency: safeValue(data.invoice_currency || data.currency),
        exchange_rate: safeValue(data.exchange_rate),
        
        // Shipping details - Comprehensive mapping
        discharge_port: safeValue(data.discharge_port || data.port_of_discharge),
        port_of_discharge: safeValue(data.port_of_discharge || data.discharge_port),
        discharge_country: safeValue(data.discharge_country || data.consignee_country),
        destination_port: safeValue(data.destination_port),
        destination_country: safeValue(data.destination_country),
        shipping_line: safeValue(data.shipping_line || data.shipping_line_airline),
        shipping_line_airline: safeValue(data.shipping_line_airline || data.shipping_line),
        vessel_sailing_date: safeValue(data.vessel_sailing_date || data.vessel_departure_date),
        vessel_departure_date: safeValue(data.vessel_departure_date || data.vessel_sailing_date),
        voyage_no: safeValue(data.voyage_no),
        nature_of_cargo: safeValue(data.nature_of_cargo),
        total_no_of_pkgs: safeValue(data.total_no_of_pkgs || data.total_packages),
        total_packages: safeValue(data.total_packages || data.total_no_of_pkgs),
        loose_pkgs: safeValue(data.loose_pkgs),
        no_of_containers: safeValue(data.no_of_containers),
        gross_weight: safeValue(data.gross_weight || data.gross_weight_kg),
        gross_weight_kg: safeValue(data.gross_weight_kg || data.gross_weight),
        net_weight: safeValue(data.net_weight || data.net_weight_kg),
        net_weight_kg: safeValue(data.net_weight_kg || data.net_weight),
        volume: safeValue(data.volume || data.volume_cbm),
        volume_cbm: safeValue(data.volume_cbm || data.volume),
        chargeable_weight: safeValue(data.chargeable_weight),
        marks_nos: safeValue(data.marks_nos || data.marks_and_numbers),
        marks_and_numbers: safeValue(data.marks_and_numbers || data.marks_nos),
        
        // Additional schema fields
        job_type: safeValue(data.job_type, "sea_export"),
        movement_type: safeValue(data.movement_type),
        submission_status: safeValue(data.submission_status, "draft"),
        priority_level: safeValue(data.priority_level || data.priorityJob, "Normal"),
        status: safeValue(data.status),
        detailed_status: safeValue(data.detailed_status),
        
        // Port fields
        port_of_loading: safeValue(data.port_of_loading || data.loading_port),
        port_of_origin: safeValue(data.port_of_origin),
        final_destination: safeValue(data.final_destination),
        place_of_receipt: safeValue(data.place_of_receipt),
        place_of_delivery: safeValue(data.place_of_delivery),
        country_of_origin: safeValue(data.country_of_origin || data.origin_country, "India"),
        country_of_final_destination: safeValue(data.country_of_final_destination),
        
        // Vessel/Flight information
        vessel_flight_name: safeValue(data.vessel_flight_name),
        voyage_flight_number: safeValue(data.voyage_flight_number),
        etd_port_of_loading: safeValue(data.etd_port_of_loading),
        eta_port_of_discharge: safeValue(data.eta_port_of_discharge),
        actual_departure_date: safeValue(data.actual_departure_date),
        actual_arrival_date: safeValue(data.actual_arrival_date),
        
        // Carrier Information
        master_bl_awb_number: safeValue(data.master_bl_awb_number || data.awb_bl_no),
        master_bl_awb_date: safeValue(data.master_bl_awb_date || data.awb_bl_date),
        house_bl_awb_number: safeValue(data.house_bl_awb_number || data.hawb_hbl_no),
        house_bl_awb_date: safeValue(data.house_bl_awb_date || data.hawb_hbl_date),
        booking_number: safeValue(data.booking_number),
        booking_date: safeValue(data.booking_date),
        
        // Cargo Information
        commodity_description: safeValue(data.commodity_description || data.description),
        description: safeValue(data.description || data.commodity_description),
        hs_code: safeValue(data.hs_code || data.cth_no),
        cth_no: safeValue(data.cth_no || data.hs_code),
        package_type: safeValue(data.package_type || data.unit),
        unit: safeValue(data.unit || data.package_type),
        dimensions_length: safeValue(data.dimensions_length),
        dimensions_width: safeValue(data.dimensions_width),
        dimensions_height: safeValue(data.dimensions_height),
        special_instructions: safeValue(data.special_instructions),
        
        // Commercial Information
        proforma_invoice_number: safeValue(data.proforma_invoice_number),
        proforma_invoice_date: safeValue(data.proforma_invoice_date),
        proforma_invoice_value: safeValue(data.proforma_invoice_value),
        fob_value: safeValue(data.fob_value),
        freight_charges: safeValue(data.freight_charges),
        insurance_charges: safeValue(data.insurance_charges),
        cif_value: safeValue(data.cif_value || data.cif_amount),
        cif_amount: safeValue(data.cif_amount || data.cif_value),
        
        // Arrays and objects
        containers: safeValue(data.containers, []),
        products: safeValue(data.products, []),
        charges: safeValue(data.charges, []),
        documents: safeValue(data.documents, {}),
        
        // Other fields
        remarks: safeValue(data.remarks),
        internal_notes: safeValue(data.internal_notes),
        customer_instructions: safeValue(data.customer_instructions),
        special_requirements: safeValue(data.special_requirements),
      });
    }
  }, [data]);

  // Update function for individual field updates
  const updateSingleField = async (fieldName, value) => {
    try {
      const user = JSON.parse(localStorage.getItem("exim_user") || "{}");
      const headers = {
        "Content-Type": "application/json",
        "user-id": user.username || "unknown",
        username: user.username || "unknown",
        "user-role": user.role || "unknown",
      };

      const updatePayload = {
        [fieldName]: value,
        updatedAt: new Date(),
      };

      console.log(`Updating field ${fieldName}:`, updatePayload);

      const response = await axios.patch(
        `${process.env.REACT_APP_API_STRING}/export-jobs/${params.year}/${params.job_no}`,
        updatePayload,
        { headers }
      );

      console.log("Field update response:", response.data);
      
      // Update local data state
      if (data) {
        setData({
          ...data,
          [fieldName]: value,
          updatedAt: new Date()
        });
      }

      return response.data;
    } catch (error) {
      console.error(`Error updating field ${fieldName}:`, error);
      throw error;
    }
  };

  return {
    data,
    loading,
    formik,
    setData,
    updateSingleField, // Export the individual field update function
  };
}

export default useExportJobDetails;