# Tally Integration: Detailed JSON API Documentation

Version: 1.2.0  
Base URL: `https://eximbot.alvision.in/import/api/tally`

---

## 1. Authentication: How to Pass API Key

All requests to the Tally API MUST be authenticated. You can provide the API key using one of the following three methods.

### 1.1 Method 1: HTTP Header (Recommended)
This is the most secure method for production deployment. Use the `x-api-key` header.

**Example Header:**
- `x-api-key: ee30006ba8a59c0becb30a598764e8410965f1c90e1fe066c7eb47202d1fa79d`

### 1.2 Method 2: Query Parameter (Convenience)
You can append the key to the URL as a query parameter. This is useful for quick testing but less secure.

**Example URL:**
- `https://eximbot.alvision.in/import/api/tally/job-data?job_number=123&api_key=ee30006ba8a59c0becb30a598764e8410965f1c90e1fe066c7eb47202d1fa79d`
- `https://eximbot.alvision.in/import/api/tally/job-data?job_number=123&x-api-key=ee30006ba8a59c0becb30a598764e8410965f1c90e1fe066c7eb47202d1fa79d`

### 1.3 Example using cURL
```bash
curl -X POST https://eximbot.alvision.in/import/api/tally/purchase-entry/status \
     -H "Content-Type: application/json" \
     -H "x-api-key: ee30006ba8a59c0becb30a598764e8410965f1c90e1fe066c7eb47202d1fa79d" \
     -d '{"entryNo": "PB/2023/001"}'
```

> [!WARNING]
> For production environments, **always use Method 1 (HTTP Headers)** to avoid exposing the API key in server logs or browser history.


---

## 2. Job Data API
Retrieve structured job details for synchronization.

### 2.1 GET `/job-data`
**Query Parameters:** `job_number=AMD/IMP/23-24/0001`

**Success Response (200 OK):**
```json
{
  "Job Number": "AMD/IMP/23-24/0001",
  "Job Year": "2023-2024",
  "Job Type": "Import",
  "Job Date": "2023-10-27T00:00:00.000Z",
  "Importer/Exporter Name": "Acme Corp",
  "Consignee": "Acme India Pvt Ltd",
  "Shipper": "Global Logistics LLC",
  "Origin Port": "SHANGHAI",
  "Destination Port": "MUMBAI",
  "Gross Weight": 1500.5,
  "Net Weight": 1450.0,
  "Package Count": 10,
  "Package Unit": "PAL",
  "Container Count": 1,
  "BE No": "1234567",
  "BE Date": "2023-10-28",
  "SB No": "",
  "SB Date": "",
  "Status": ""
}
```

---

## 3. Purchase Book Entry API
Submit, retrieve, or check status of Purchase Book entries.

### 3.1 POST `/purchase-entry`
**Request JSON Sample:**
```json
{
  "entryNo": "PB/2023/001",
  "entryDate": "2023-10-27",
  "supplierInvNo": "INV/001",
  "supplierInvDate": "2023-10-25",
  "jobNo": "AMD/IMP/23-24/0001",
  "supplierName": "Oceanic Carriers",
  "address1": "123 Business Park",
  "address2": "Andheri West",
  "address3": "Mumbai",
  "state": "Maharashtra",
  "country": "India",
  "pinCode": "400053",
  "registrationType": "Regular",
  "gstinNo": "27AAAAA0000A1Z5",
  "pan": "AAAAA0000A",
  "cin": "L12345MH2023PLC123456",
  "taxableValue": 50000,
  "gstPercent": 18,
  "cgstAmt": 4500,
  "sgstAmt": 4500,
  "igstAmt": 0,
  "total": 59000,
  "status": "Active"
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Purchase Book Entry saved and submitted successfully",
  "id": "653b6...",
  "entryNo": "PB/2023/001"
}
```

### 3.2 GET `/purchase-entry/:entryNo`
**Request:** `GET /purchase-entry/PB/2023/001`

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "entryNo": "PB/2023/001",
    "entryDate": "2023-10-27",
    "jobNo": "AMD/IMP/23-24/0001",
    "total": 59000,
    "status": "Active",
    "createdAt": "2023-10-27T10:30:00Z"
    // ... all stored fields
  }
}
```

### 3.3 POST `/purchase-entry/status`
**Request JSON Sample:**
```json
{
  "entryNo": "PB/2023/001"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "status": "Active"
}
```

---

## 4. Payment Request API
Submit, retrieve, or check status of Payment Requests.

### 4.1 POST `/payment-request`
**Request JSON Sample:**
```json
{
  "requestNo": "R1/JOB/2023/001",
  "requestDate": "2023-10-27",
  "bankFrom": "HDFC MAIN",
  "paymentTo": "Oceanic Carriers",
  "againstBill": "INV/001",
  "amount": 59000,
  "transactionType": "NEFT",
  "accountNo": "50100...",
  "ifscCode": "HDFC0001234",
  "bankName": "HDFC BANK",
  "transferMode": "Online",
  "status": "Active"
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Payment Request saved and submitted successfully",
  "id": "653c7...",
  "requestNo": "R1/JOB/2023/001"
}
```

### 4.2 GET `/payment-request/:requestNo`
**Request:** `GET /payment-request/R1/JOB/2023/001`

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "requestNo": "R1/JOB/2023/001",
    "paymentTo": "Oceanic Carriers",
    "amount": 59000,
    "status": "Active",
    "createdAt": "2023-10-27T11:45:00Z"
    // ... all stored fields
  }
}
```

### 4.3 POST `/payment-request/status`
**Request JSON Sample:**
```json
{
  "requestNo": "R1/JOB/2023/001"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "status": "Active"
}
```

---

## 5. Error JSON Responses

### 401 Unauthorized (Missing/Invalid API Key)
```json
{
  "error": "API Key is required in 'x-api-key' header or as 'api_key' parameter."
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Purchase Book Entry not found."
}
```

### 400 Bad Request (Duplicate ID)
```json
{
  "success": false,
  "error": "Entry with this number already exists."
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal Server Error"
}
```
