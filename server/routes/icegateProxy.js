import axios from 'axios';
import express from "express";
const router = express.Router();



router.post('/api/be-details', async (req, res) => {
  
  try {
    const { location, beNo, beDt } = req.body;

    // Validate required fields
    if (!location || !beNo || !beDt) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: location, beNo, beDt'
      });
    }

    // Format date to YYYYMMDD (remove dashes)
    const formattedDate = beDt.replace(/-/g, '');

    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json, text/plain, */*',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Origin': 'https://foservices.icegate.gov.in',
      'Referer': 'https://foservices.icegate.gov.in/#/public-enquiries/document-status/ds-bill-of-entry',
      'X-Requested-With': 'XMLHttpRequest'
    };

    // Create URL-encoded form data - try different parameter names
    const formData = new URLSearchParams();
    
    // Try different parameter combinations based on common ICEGATE patterns
    formData.append('location', location);
    formData.append('beNo', beNo);
    formData.append('beDt', formattedDate);
    
    // Also try alternative parameter names
    formData.append('beDate', formattedDate);
    formData.append('beno', beNo);
    formData.append('loc', location);


    const response = await axios.post(
      'https://foservices.icegate.gov.in/enquiry/publicEnquiries/BETrack_Ices_action_Public',
      formData,
      {
        headers,
        timeout: 30000,
        validateStatus: (status) => true // Don't throw on any status
      }
    );


    
    if (response.status === 200 && response.data) {
      res.json({
        success: true,
        status: response.status,
        data: response.data
      });
    } else {
      // Try alternative approach with JSON content type
      
      const jsonResponse = await axios.post(
        'https://foservices.icegate.gov.in/enquiry/publicEnquiries/BETrack_Ices_action_Public',
        {
          location,
          beNo,
          beDt: formattedDate
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Origin': 'https://foservices.icegate.gov.in',
            'Referer': 'https://foservices.icegate.gov.in/#/public-enquiries/document-status/ds-bill-of-entry'
          },
          timeout: 30000,
          validateStatus: (status) => true
        }
      );

      if (jsonResponse.status === 200 && jsonResponse.data) {
        res.json({
          success: true,
          status: jsonResponse.status,
          data: jsonResponse.data
        });
      } else {
        res.status(jsonResponse.status).json({
          success: false,
          error: `ICEGATE API returned status: ${jsonResponse.status}`,
          data: jsonResponse.data
        });
      }
    }

  } catch (error) {
    console.error('API Error details:', {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      status: error.response?.status
    });
    
    if (error.response) {
      res.status(error.response.status).json({
        success: false,
        error: `ICEGATE API error: ${error.response.status}`,
        details: error.response.data
      });
    } else if (error.code === 'ECONNABORTED') {
      res.status(408).json({
        success: false,
        error: 'Request timeout'
      });
    } else {
      res.status(500).json({
        success: false,
        error: `Network error: ${error.message}`
      });
    }
  }
});

router.post('/api/bl-tracking', async (req, res) => {
  try {
    const { mawbNumber } = req.body;

    // Validate required fields
    if (!mawbNumber) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: mawbNumber'
      });
    }

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/plain, */*',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Origin': 'https://foservices.icegate.gov.in',
      'Referer': 'https://foservices.icegate.gov.in/#/public-enquiries',
      'X-Requested-With': 'XMLHttpRequest'
    };

    // Step 1: Fetch BL Status
    const url1 = 'https://foservices.icegate.gov.in/enquiry/publicEnquiries/publicblstatus-action';
    const payload1 = { mawbNumber };

    const response1 = await axios.post(url1, payload1, {
      headers,
      timeout: 30000,
      validateStatus: (status) => status === 200
    });

    if (!response1.data || !Array.isArray(response1.data) || response1.data.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No data found for the provided MAWB number'
      });
    }

    const statusData = response1.data;
    const firstRecord = statusData[0];

    // Step 2: Fetch Container Details using data from first response
    const url2 = 'https://foservices.icegate.gov.in/enquiry/publicEnquiries/publicblContainer-no-detail';
    const payload2 = {
      subLineNo: firstRecord.subLineNo,
      igmRTN: firstRecord.igmRTN,
      igmDT: firstRecord.igmDT,
      customerSite: firstRecord.fileName || firstRecord.portREP,
      lineNo: firstRecord.lineNo
    };

    const response2 = await axios.post(url2, payload2, {
      headers,
      timeout: 30000,
      validateStatus: (status) => status === 200
    });

    // Combine both responses
    const combinedResult = {
      success: true,
      data: {
        status_data: statusData,
        container_details: response2.data
      }
    };

    res.json(combinedResult);

  } catch (error) {
    console.error('BL Status API Error:', {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      status: error.response?.status
    });

    if (error.response) {
      res.status(error.response.status).json({
        success: false,
        error: `ICEGATE API error: ${error.response.status}`,
        details: error.response.data
      });
    } else if (error.code === 'ECONNABORTED') {
      res.status(408).json({
        success: false,
        error: 'Request timeout'
      });
    } else {
      res.status(500).json({
        success: false,
        error: `Network error: ${error.message}`
      });
    }
  }
});

// ========================================
// SEA CARGO - Master BL Tracking Route
// ========================================
router.post('/api/sea-cargo-tracking', async (req, res) => {
  try {
    const { location, masterBlNo } = req.body;

    // Validate required fields
    if (!location || !masterBlNo) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: location, masterBlNo'
      });
    }

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/plain, */*',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Origin': 'https://foservices.icegate.gov.in',
      'Referer': 'https://foservices.icegate.gov.in/#/public-enquiries',
      'X-Requested-With': 'XMLHttpRequest'
    };

    // Step 1: Fetch Sea IGM Summary
    const url1 = 'https://foservices.icegate.gov.in/enquiry/enquiryatices/SeaIgmEnq';
    const payload1 = {
      location,
      masterBlNo
    };

    const response1 = await axios.post(url1, payload1, {
      headers,
      timeout: 30000,
      validateStatus: (status) => status === 200
    });

    if (!response1.data || !Array.isArray(response1.data) || response1.data.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No data found for the provided location and Master BL number'
      });
    }

    const summaryData = response1.data;
    const firstRecord = summaryData[0];

    // Step 2: Fetch Vessel Details
    const url2 = 'https://foservices.icegate.gov.in/enquiry/publicEnquiries/SeaIgmMorePublicDetails';
    const payload2 = {
      masterBlNo,
      location,
      igmNo: firstRecord.igmNo,
      igmDate: firstRecord.igmDate
    };

    const response2 = await axios.post(url2, payload2, {
      headers,
      timeout: 30000,
      validateStatus: (status) => status === 200
    });

    // Step 3: Fetch Container Details
    const url3 = 'https://foservices.icegate.gov.in/enquiry/publicEnquiries/SeaIgmContPublicDetails';
    const payload3 = {
      lineNo: firstRecord.lineNo,
      subLineNo: firstRecord.subLineNo,
      igmNo: firstRecord.igmNo,
      location
    };

    const response3 = await axios.post(url3, payload3, {
      headers,
      timeout: 30000,
      validateStatus: (status) => status === 200
    });

    // Combine all three responses
    const combinedResult = {
      success: true,
      data: {
        summary: summaryData,
        vessel_details: response2.data,
        container_details: response3.data
      }
    };

    res.json(combinedResult);

  } catch (error) {
    console.error('Sea Cargo API Error:', {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      status: error.response?.status
    });

    if (error.response) {
      res.status(error.response.status).json({
        success: false,
        error: `ICEGATE API error: ${error.response.status}`,
        details: error.response.data
      });
    } else if (error.code === 'ECONNABORTED') {
      res.status(408).json({
        success: false,
        error: 'Request timeout'
      });
    } else {
      res.status(500).json({
        success: false,
        error: `Network error: ${error.message}`
      });
    }
  }
});

export default router;
