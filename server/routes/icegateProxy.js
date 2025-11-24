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

    // Create URL-encoded form data
    const formData = new URLSearchParams();
    formData.append('location', location);
    formData.append('beNo', beNo);
    formData.append('beDt', formattedDate);
    formData.append('beDate', formattedDate);
    formData.append('beno', beNo);
    formData.append('loc', location);

    // First attempt with form data
    const response = await axios.post(
      'https://foservices.icegate.gov.in/enquiry/publicEnquiries/BETrack_Ices_action_Public',
      formData,
      {
        headers,
        timeout: 30000,
        validateStatus: (status) => status < 500 // Allow 400 status codes
      }
    );

    // Handle "No Record Found" response (400 status)
    if (response.status === 400) {
      const errorMessage = response.data?.message || 'No record found for the provided BE details';
      return res.status(404).json({
        success: false,
        error: errorMessage,
        details: response.data
      });
    }

    // Handle successful response
    if (response.status === 200 && response.data) {
      return res.json({
        success: true,
        status: response.status,
        data: response.data
      });
    }

    // If form data approach didn't work, try JSON approach
    console.log('Form data approach failed, trying JSON approach...');
    
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
        validateStatus: (status) => status < 500 // Allow 400 status codes
      }
    );

    // Handle "No Record Found" in JSON approach
    if (jsonResponse.status === 400) {
      const errorMessage = jsonResponse.data?.message || 'No record found for the provided BE details';
      return res.status(404).json({
        success: false,
        error: errorMessage,
        details: jsonResponse.data
      });
    }

    // Handle successful JSON response
    if (jsonResponse.status === 200 && jsonResponse.data) {
      return res.json({
        success: true,
        status: jsonResponse.status,
        data: jsonResponse.data
      });
    }

    // If both approaches return unexpected status codes
    res.status(jsonResponse.status).json({
      success: false,
      error: `ICEGATE API returned status: ${jsonResponse.status}`,
      data: jsonResponse.data
    });

  } catch (error) {
    console.error('API Error details:', {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      status: error.response?.status
    });
    
    if (error.response) {
      // Handle "No Record Found" in catch block too
      if (error.response.status === 400 && error.response.data) {
        return res.status(404).json({
          success: false,
          error: error.response.data.message || 'No record found',
          details: error.response.data
        });
      }
      
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

    // Step 1: Fetch BL Status - ALLOW 400 status
    const url1 = 'https://foservices.icegate.gov.in/enquiry/publicEnquiries/publicblstatus-action';
    const payload1 = { mawbNumber };

    const response1 = await axios.post(url1, payload1, {
      headers,
      timeout: 30000,
      validateStatus: (status) => status < 500 // Allow 400 status codes
    });

    // Check if the response indicates "No Record Found"
    if (response1.status === 400) {
      const errorMessage = response1.data?.message || 'No record found';
      return res.status(404).json({
        success: false,
        error: errorMessage,
        details: response1.data
      });
    }

    // Handle other non-200 status codes
    if (response1.status !== 200) {
      return res.status(response1.status).json({
        success: false,
        error: `ICEGATE API returned status: ${response1.status}`,
        details: response1.data
      });
    }

    // Handle empty or invalid data
    if (!response1.data || !Array.isArray(response1.data) || response1.data.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No data found for the provided MAWB number',
        data: response1.data
      });
    }

    const statusData = response1.data;
    const firstRecord = statusData[0];

    // Step 2: Fetch Container Details - ALLOW 400 status
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
      validateStatus: (status) => status < 500 // Allow 400 status codes
    });

    // Handle container details API errors
    let containerDetails = null;
    if (response2.status === 400) {
      console.log('Container details not found, but continuing with status data');
      containerDetails = { error: 'Container details not available' };
    } else if (response2.status === 200) {
      containerDetails = response2.data;
    } else {
      containerDetails = { error: `Container API error: ${response2.status}` };
    }

    // Combine both responses
    const combinedResult = {
      success: true,
      data: {
        status_data: statusData,
        container_details: containerDetails
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
      // Handle cases where error response has meaningful data
      if (error.response.status === 400 && error.response.data) {
        return res.status(404).json({
          success: false,
          error: error.response.data.message || 'No record found',
          details: error.response.data
        });
      }
      
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

    if (!location || !masterBlNo) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: location, masterBlNo'
      });
    }

    // Try different content types
    const contentTypes = [
      'application/x-www-form-urlencoded',
      'application/x-www-form-urlencoded; charset=UTF-8',
      'application/json'
    ];

    let response1;
    let lastError;

    for (const contentType of contentTypes) {
      try {
        const headers = {
          'Content-Type': contentType,
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Origin': 'https://foservices.icegate.gov.in',
          'Referer': 'https://foservices.icegate.gov.in/#/public-enquiries'
        };

        let requestData;
        if (contentType.includes('x-www-form-urlencoded')) {
          requestData = new URLSearchParams({ location, masterBlNo }).toString();
        } else {
          requestData = JSON.stringify({ location, masterBlNo });
        }

        console.log(`Trying with Content-Type: ${contentType}`);
        
        response1 = await axios.post(
          'https://foservices.icegate.gov.in/enquiry/enquiryatices/SeaIgmEnq',
          requestData,
          {
            headers,
            timeout: 30000,
            validateStatus: (status) => true
          }
        );

        console.log(`Response with ${contentType}:`, response1.status);

        // If we get a successful response, break the loop
        if (response1.status === 200) {
          break;
        }
      } catch (error) {
        lastError = error;
        console.log(`Failed with ${contentType}:`, error.message);
        continue;
      }
    }

    // If all content types failed
    if (!response1 || response1.status !== 200) {
      return res.status(415).json({
        success: false,
        error: 'All content type attempts failed',
        lastError: lastError?.message
      });
    }

    // Handle empty response
    if (!response1.data || (Array.isArray(response1.data) && response1.data.length === 0)) {
      return res.json({
        success: true,
        message: "No details found",
        data: null
      });
    }

    const summaryData = response1.data;
    const firstRecord = summaryData[0];

    // Return just the summary for now to test
    res.json({
      success: true,
      data: {
        summary: summaryData,
        message: 'Successfully retrieved data'
      }
    });

  } catch (error) {
    console.error('Sea Cargo API Error:', error.message);
    res.status(500).json({
      success: false,
      error: `Unexpected error: ${error.message}`
    });
  }
});

export default router;
