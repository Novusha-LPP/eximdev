# EximTransport / ALVision EXIM — Complete 103-Collection MongoDB Schema Brain Reference

> **Document Type**: Loss-Less Brain Reference File (LLM Knowledge Store)
> **Source File**: `EximTransport_DB_Schema.md`
> **Total Collections**: 103 | **Modules**: 11

---

## Table of Modules

### Module: `(root) server/model/` (33 Collections)

| Model Name | Collection Name | Source File | Schema Var | Field Count | Key Fields / Summary |
| :--- | :--- | :--- | :--- | :---: | :--- |
| `Attendance` | `attendances` | `./Attendance.mjs` | `attendanceSchema` | 5 | driver_id, marked_by, date, status, remark |
| `AuditLog` | `auditLogs` | `./AuditLog.mjs` | `AuditLogSchema` | 18 | userId, userName, userRole, branch, action, entityType (+12 more) |
| `ClientCallHistory` | `clientCallHistories` | `./ClientCallHistoryModel.mjs` | `ClientCallHistorySchema` | 9 | containerId, prId, containerNumber, trNo, elockNo, currentClientCallStatus (+3 more) |
| `DSRDayClose` | `dSRDayCloses` | `./DSRDayClose.mjs` | `dsrDayCloseSchema` | 4 | date, closedBy, closedAt, pendingLRSnapshot |
| `ElockBill` | `elockBills` | `./ElockBill.mjs` | `ElockBillSchema` | 6 | billNumber, organisationInfo, items, billType, createdAt, updatedAt |
| `ElockSnapshot` | `elockSnapshots` | `./ElockSnapshotModel.mjs` | `elockSnapshotSchema` | 7 | date, availableCount, maintenanceCount, assignedCount, lostCount, totalCount (+1 more) |
| `ElockStatusHistory` | `elockStatusHistories` | `./ElockStatusHistoryModel.mjs` | `elockStatusHistorySchema` | 9 | containerId, prId, containerNumber, trNo, elockNo, currentStatus (+3 more) |
| `EmailLog` | `emailLogs` | `./EmailLog.mjs` | `EmailLogSchema` | 19 | scheduleConfig, emailTemplate, prData, subject, emailBody, recipients (+13 more) |
| `EmailScheduleConfig` | `emailScheduleConfigs` | `./EmailScheduleConfig.mjs` | `EmailScheduleConfigSchema` | 19 | scheduleName, emailTemplate, scheduleType, cronExpression, scheduledDateTime, organization (+13 more) |
| `EmailTemplate` | `emailTemplates` | `./EmailTemplate.mjs` | `EmailTemplateSchema` | 11 | templateName, subject, emailBody, systemVariables, templateType, isActive (+5 more) |
| `FileAsset` | `fileAssets` | `./FileAsset.mjs` | `fileAssetSchema` | 5 | s3Key, owner, module, mime, size |
| `FleetSnapshot` | `fleetSnapshots` | `./FleetSnapshotModel.mjs` | `fleetSnapshotSchema` | 12 | date, totalFleet, onRoadCount, breakdownCount, maintenanceCount, driverLeaveCount (+6 more) |
| `FleetStatus` | `fleetStatuses` | `./FleetStatusModel.mjs` | `fleetStatusSchema` | 5 | vehicleId, status, remark, location, updatedBy |
| `JobSearch` | `jobSearches` | `./Job.js` | `jobSearchSchema` | 0 |  |
| `LeaveQuota` | `leaveQuotas` | `./LeaveQuota.mjs` | `leaveQuotaSchema` | 5 | driver_id, leave_type, total_days, used_days, year |
| `LeaveRequest` | `leaveRequests` | `./LeaveRequest.mjs` | `leaveRequestSchema` | 15 | driver_id, from_date, to_date, reason, leave_type, duration (+9 more) |
| `Notification` | `notifications` | `./Notification.mjs` | `notificationSchema` | 5 | user_id, message, type, ref_id, is_read |
| `PRSearch` | `pRSearches` | `./PR.js` | `prSearchSchema` | 0 |  |
| `RefreshToken` | `refreshTokens` | `./RefreshToken.mjs` | `refreshTokenSchema` | 8 | token, userId, ipAddress, userAgent, sessionCreatedAt, expiresAt (+2 more) |
| `SystemConfig` | `systemConfigs` | `./SystemConfig.mjs` | `SystemConfigSchema` | 3 | key, value, updatedAt |
| `SystemVariableConfig` | `systemVariableConfigs` | `./SystemVariable.mjs` | `SystemVariableConfigSchema` | 10 | key, label, description, category, dataType, schemaPath (+4 more) |
| `SystemVariableConfig` | `systemVariableConfigs` | `./SystemVariableConfig.mjs` | `SystemVariableConfigSchema` | 16 | key, label, description, category, dataType, schemaPath (+10 more) |
| `TrackingStatusHistory` | `trackingStatusHistories` | `./TrackingStatusHistoryModel.mjs` | `trackingStatusHistorySchema` | 8 | containerId, prId, containerNumber, trNo, currentStatus, userId (+2 more) |
| `TriggerEvent` | `triggerEvents` | `./TriggerEvent.mjs` | `TriggerEventSchema` | 8 | eventName, eventCode, description, category, schemaPath, triggerCondition (+2 more) |
| `VehicleDSR` | `vehicleDSRs` | `./VehicleDSR.mjs` | `vehicleDSRSchema` | 9 | date, vehicleId, vehicleNumber, status, otherStatusText, isClosed (+3 more) |
| `Counter` | `counters` | `./counterModel.mjs` | `counterSchema` | 2 | _id, seq |
| `documentList` | `documentLists` | `./cthDocumentsModel.mjs` | `documentListSchema` | 3 | cth, document_code, document_name |
| `MyFeedBack` | `myFeedBacks` | `./feedbackModel.mjs` | `feedbackSchema` | 14 | type, module, title, title, description, priority (+8 more) |
| `Importer` | `importers` | `./importerSchemaModel.mjs` | `importerSchema` | 4 | name, contact, email, address |
| `Job` | `jobs` | `./jobModel.mjs` | `jobSchema` | 181 | createdAt, updatedAt, job_date, year, job_no, custom_house (+175 more) |
| `JobsLastUpdated` | `jobsLastUpdateds` | `./jobsLastUpdatedOnModel.mjs` | `jobsLastUpdatedOnSchema` | 1 | date |
| `ReportFields` | `reportFieldses` | `./reportFieldsModel.mjs` | `reportFieldsSchema` | 6 | importer, importerURL, email, senderEmail, time, field |
| `User` | `users` | `./userModel.mjs` | `userSchema` | 71 | username, password, role, tokenVersion, failedAttempts, lockoutUntil (+65 more) |


### Module: `server/model/FreightMemo/` (1 Collections)

| Model Name | Collection Name | Source File | Schema Var | Field Count | Key Fields / Summary |
| :--- | :--- | :--- | :--- | :---: | :--- |
| `FreightMemo` | `freightMemos` | `./FreightMemo/freightMemoModel.mjs` | `freightMemoSchema` | 18 | prId, containerId, lr_no, balance_amount, detentionAmount, miscAmount (+12 more) |


### Module: `server/model/cashRegister/` (6 Collections)

| Model Name | Collection Name | Source File | Schema Var | Field Count | Key Fields / Summary |
| :--- | :--- | :--- | :--- | :---: | :--- |
| `AtmLog` | `atmLogs` | `./cashRegister/atmLogsModel.mjs` | `atmLogSchema` | 2 | amount, userId |
| `CashRegister` | `cashRegisters` | `./cashRegister/cashRegisterModel.mjs` | `cashRegisterSchema` | 30 | prId, containerId, lr_no, vehicle_no, driver_name, destination (+24 more) |
| `GlobalBalance` | `globalBalances` | `./cashRegister/globalBalanceModel.mjs` | `globalBalanceSchema` | 6 | totalHpDiesel, totalHappay, totalVisatPump, totalUpi, lastUpdated, lastUpdatedBy |
| `NetBalance` | `netBalance` | `./cashRegister/netBalanceModel.mjs` | `netBalanceSchema` | 8 | branch, branchCode, branchName, totalCash, totalHpDiesel, totalHappay (+2 more) |
| `NonLR` | `nonLRs` | `./cashRegister/nonLrModel.mjs` | `nonLrSchema` | 8 | non_lr_no, vehicle, date, rejection_date, reject_reason, status (+2 more) |
| `Transaction` | `transactions` | `./cashRegister/transactionModel.mjs` | `transactionSchema` | 15 | branch, branchCode, branchName, operatorBranch, operatorBranchCode, transactionType (+9 more) |


### Module: `server/model/cashRegister/cashVoucher/` (2 Collections)

| Model Name | Collection Name | Source File | Schema Var | Field Count | Key Fields / Summary |
| :--- | :--- | :--- | :--- | :---: | :--- |
| `Counter` | `counters` | `./cashRegister/cashVoucher/cashVoucherModel.mjs` | `counterSchema` | 2 | _id, seq |
| `CashVoucher` | `cashVouchers` | `./cashRegister/cashVoucher/cashVoucherModel.mjs` | `cashVoucherSchema` | 27 | voucher_no, type, category, vehicle_no, destination, date (+21 more) |


### Module: `server/model/dayClose/` (1 Collections)

| Model Name | Collection Name | Source File | Schema Var | Field Count | Key Fields / Summary |
| :--- | :--- | :--- | :--- | :---: | :--- |
| `DayClose` | `day_close` | `./dayClose/dayCloseModel.mjs` | `dayCloseSchema` | 6 | closedAt, closingBalance, openingBalance, reportData, createdBy, remarks |


### Module: `server/model/maintenance/` (8 Collections)

| Model Name | Collection Name | Source File | Schema Var | Field Count | Key Fields / Summary |
| :--- | :--- | :--- | :--- | :---: | :--- |
| `AccidentJobCard` | `accidentJobCards` | `./maintenance/AccidentJobCard.mjs` | `accidentJobCardSchema` | 22 | job_number, job_date, vehicle_number, kilometers, driver_name, accident_date (+16 more) |
| `ElockForecastUpload` | `elockForecastUploads` | `./maintenance/ElockForecast.mjs` | `ElockForecastUploadSchema` | 11 | fileName, title, clientType, clientName, planDate, sourceProject (+5 more) |
| `ElockForecast` | `elockForecasts` | `./maintenance/ElockForecast.mjs` | `ElockForecastSchema` | 13 | uploadId, srNo, containerNo, placeOfDelivery, transporter, arrivalDateOfFactory (+7 more) |
| `OCRRecord` | `oCRRecords` | `./maintenance/OCRRecord.mjs` | `ocrRecordSchema` | 10 | imageUrl, ocrResponse, uploadedBy, role, dateTime, isDeleted (+4 more) |
| `OutsourcedJobCard` | `outsourcedJobCards` | `./maintenance/OutsourcedJobCard.mjs` | `outsourcedJobCardSchema` | 18 | job_number, dateTime, kilometers, vehicle_number, vehicle_model, driver_name (+12 more) |
| `TyreMaintenance` | `tyreMaintenances` | `./maintenance/TyreMaintenance.mjs` | `tyreMaintenanceSchema` | 19 | job_number, dateTime, outDateTime, vehicle_number, kms, tyre_number (+13 more) |
| `VehicleMaintenance` | `vehicleMaintenances` | `./maintenance/VehicleMaintenance.mjs` | `vehicleMaintenanceSchema` | 28 | work_order_number, dateTime, vehicle_number, lr_number, container_number, vehicle_make (+22 more) |
| `WashingBay` | `washingBays` | `./maintenance/WashingBay.mjs` | `washingBaySchema` | 18 | job_number, dateTime, vehicle_number, lr_number, container_number, driver_name (+12 more) |


### Module: `server/model/openPoints/` (2 Collections)

| Model Name | Collection Name | Source File | Schema Var | Field Count | Key Fields / Summary |
| :--- | :--- | :--- | :--- | :---: | :--- |
| `OpenPoint` | `openPoints` | `./openPoints/openPointModel.mjs` | `pointSchema` | 16 | project_id, title, description, responsibility, level, gap_action (+10 more) |
| `OpenPointProject` | `openPointProjects` | `./openPoints/openPointProjectModel.mjs` | `projectSchema` | 6 | name, description, owner, status, team_members, created_at |


### Module: `server/model/srcc/` (26 Collections)

| Model Name | Collection Name | Source File | Schema Var | Field Count | Key Fields / Summary |
| :--- | :--- | :--- | :--- | :---: | :--- |
| `BulkRequest` | `bulkRequests` | `./srcc/BulkRequest.mjs` | `BulkRequestSchema` | 8 | requestId, userGstin, action, payload, status, createdAt (+2 more) |
| `DeleteElockOthers` | `deleteElockOtherses` | `./srcc/DeleteElockOthers.mjs` | `DeleteElockOthersSchema` | 21 | consignor, consignee, tr_no, container_number, vehicle_no, driver_name (+15 more) |
| `DeletedLR` | `deletedLRs` | `./srcc/DeletedLR.mjs` | `DeletedLRSchema` | 35 | pr_no, pr_date, import_export, branch, consignor, consignee (+29 more) |
| `ElockAssignOthers` | `elockAssignOtherses` | `./srcc/ElockAssginOthersModel.mjs` | `ElockAssignOthersSchema` | 19 | consignor, consignee, tr_no, container_number, vehicle_no, driver_name (+13 more) |
| `EwayBill` | `ewayBills` | `./srcc/EwayBill.mjs` | `EwayBillSchema` | 77 | lr, containerId, containerIds, ewbNo, ewbDate, validUpto (+71 more) |
| `EwayBillErrorLog` | `ewayBillErrorLogs` | `./srcc/Ewaybillerrorlog.mjs` | `EwayBillErrorLogSchema` | 14 | errorMessage, errorCode, errorDetails, requestPayload, requestEndpoint, validationErrors (+8 more) |
| `ContainerType` | `containerTypes` | `./srcc/containerType.mjs` | `containerTypeSchema` | 11 | container_type, iso_code, teu, outer_dimension, cubic_capacity, tare_weight (+5 more) |
| `DispatchException` | `dispatchExceptions` | `./srcc/dispatchException.mjs` | `DispatchExceptionSchema` | 7 | date, tr_no, container_no, vehicle_no, exception_remark, reason (+1 more) |
| `DriverDetails` | `driverDetailses` | `./srcc/driverDetails.mjs` | `driverDetailsSchema` | 10 | driver_name, driver_address, driver_phone, driver_license, license_validity, joining_date (+4 more) |
| `engineOilDistribution` | `engineOilDistributions` | `./srcc/engineOilDistribution.mjs` | `engineOilDistributionSchema` | 6 | quantity, driver, date, truck_no, odometer, location |
| `engineOilStock` | `engineOilStocks` | `./srcc/engineOilStock.mjs` | `engineOilStockSchema` | 1 | quantity |
| `LocationMaster` | `locationMasters` | `./srcc/locationMaster.mjs` | `locationMasterSchema` | 4 | location, district, area, createdBy |
| `PlyRatings` | `plyRatingses` | `./srcc/plyRatings.mjs` | `plyRatingSchema` | 2 | ply_rating, createdBy |
| `PrData` | `prDatas` | `./srcc/pr.mjs` | `PrDataSchema` | 28 | pr_no, pr_date, import_export, branch, consignor, consignee (+22 more) |
| `Pr` | `prs` | `./srcc/prModel.mjs` | `prSchema` | 4 | pr_no, year, branch_code, pr_no_complete |
| `RepairTypes` | `repairTypeses` | `./srcc/repairTypes.mjs` | `repairTypeSchema` | 2 | repair_type, createdBy |
| `Rto` | `rtos` | `./srcc/rtoModel.mjs` | `rtoSchema` | 24 | truck_no, fitness_document, fitness_document_expiry_date, inspection_due_date, mv_tax, mv_tax_date (+18 more) |
| `Tr` | `trs` | `./srcc/trModel.mjs` | `trSchema` | 4 | tr_no, year, branch_code, tr_no_complete |
| `TypeOfVehicle` | `typeOfVehicles` | `./srcc/typeOfVehicle.mjs` | `typeOfVehicleSchema` | 2 | type_of_vehicle, createdBy |
| `TyreBrands` | `tyreBrandses` | `./srcc/tyreBrand.mjs` | `tyreBrandSchema` | 4 | tyre_brand, make, description, createdBy |
| `Tyre` | `tyres` | `./srcc/tyreModel.mjs` | `tyreSchema` | 20 | tyre_no, vendor_name, vendor_address, vendor_phone, bill_no, bill_date (+14 more) |
| `TyreModels` | `tyreModelses` | `./srcc/tyreModels.mjs` | `tyreModelSchema` | 4 | tyre_brand, tyre_model, description, createdBy |
| `TyreSizes` | `tyreSizeses` | `./srcc/tyreSizes.mjs` | `tyreSizeSchema` | 2 | tyre_size, createdBy |
| `TyreTypes` | `tyreTypeses` | `./srcc/tyreTypes.mjs` | `tyreTypeSchema` | 2 | tyre_type, createdBy |
| `Vehicles` | `vehicleses` | `./srcc/vehicleModel.mjs` | `vehicleSchema` | 10 | truck_no, type_of_vehicle, max_tyres, units, drivers, tyres (+4 more) |
| `Vendors` | `vendorses` | `./srcc/vendors.mjs` | `vendorSchema` | 4 | vendor_name, vendor_address, vendor_phone, createdBy |


### Module: `server/model/srcc/Directory_Management/` (21 Collections)

| Model Name | Collection Name | Source File | Schema Var | Field Count | Key Fields / Summary |
| :--- | :--- | :--- | :--- | :---: | :--- |
| `AdvanceToDriver` | `advanceToDrivers` | `./srcc/Directory_Management/AdvanceToDriver.mjs` | `AdvanceToDriverSchema` | 14 | startingLocation, destinationLocation, returnLocation, vehicleType, loadVehicleKms, emptyVehicleKms (+8 more) |
| `CVCategoryDirectory` | `cVCategoryDirectories` | `./srcc/Directory_Management/CVCategoryDirectory.mjs` | `cvCategorySchema` | 4 | categoryName, description, createdBy, updatedBy |
| `CommodityCode` | `commodityCodes` | `./srcc/Directory_Management/Commodity.mjs` | `CommoditySchema` | 3 | name, hsn_code, description |
| `Distributor` | `distributors` | `./srcc/Directory_Management/Distributor.mjs` | `DistributorSchema` | 8 | distributor_name, company_name, elocks_assigned, software_provided, start_date, end_date (+2 more) |
| `DriverType` | `driverTypes` | `./srcc/Directory_Management/Driver.mjs` | `DriverSchema` | 33 | name, alias, photoUpload, licenseUpload, licenseNumber, licenseIssueAuthority (+27 more) |
| `Elock` | `elocks` | `./srcc/Directory_Management/Elock.mjs` | `ElockSchema` | 2 | FAssetID, status |
| `ElockAssignLimit` | `elockAssignLimits` | `./srcc/Directory_Management/ElockAssignLimitModel.mjs` | `ElockAssignLimitSchema` | 4 | organisation, elockassignlimit, dummyassigned, prepaid |
| `ElockBillDirectory` | `elockBillDirectories` | `./srcc/Directory_Management/ElockBillDirectory.mjs` | `elockBillSchema` | 5 | organisationName, branch, gstin, panNo, elockBillingAmounts |
| `LrRegisterColumnSet` | `lrRegisterColumnSets` | `./srcc/Directory_Management/LrRegisterColumnSet.mjs` | `LrRegisterColumnSetSchema` | 4 | name, description, columns, createdBy |
| `LrTrackingStages` | `lrTrackingStageses` | `./srcc/Directory_Management/LrTrackingStages.mjs` | `LrTrackingStagesSchema` | 3 | name, description, requiredTrackingClose |
| `Organisation` | `organisations` | `./srcc/Directory_Management/Organisation.mjs` | `OrganisationSchema` | 17 | name, alias, type, binNo, cinNo, cstNo (+11 more) |
| `PortICDcode` | `portICDcodes` | `./srcc/Directory_Management/PortsCfsYard.mjs` | `PortsCfsYardSchema` | 13 | organisation, name, icd_code, state, country, active (+7 more) |
| `ShippingLine` | `shippingLines` | `./srcc/Directory_Management/ShippingLine.mjs` | `ShippingLineSchema` | 3 | name, organisation, code |
| `StateDistrict` | `stateDistricts` | `./srcc/Directory_Management/StateDistrict.mjs` | `stateDistrictSchema` | 1 | states |
| `TollData` | `tollDatas` | `./srcc/Directory_Management/TollData.mjs` | `TollDataSchema` | 6 | tollBoothName, vehicleType, fastagClassId, singleAmount, returnAmount, secondPassTollBooth |
| `UnitMeasurement` | `unitMeasurements` | `./srcc/Directory_Management/UnitMeasurementModal.mjs` | `unitMeasurementSchema` | 2 | name, measurements |
| `VehicleRegistration` | `vehicleRegistrations` | `./srcc/Directory_Management/VehicleRegistration.mjs` | `VehicleRegistrationSchema` | 25 | vehicleNumber, registrationName, type, engineNumber, chassisNumber, pucDate (+19 more) |
| `VehicleType` | `vehicleTypes` | `./srcc/Directory_Management/VehicleType.mjs` | `VehicleTypeSchema` | 7 | vehicleType, shortName, loadCapacity, engineCapacity, cargoTypeAllowed, CommodityCarry (+1 more) |
| `Country` | `countries` | `./srcc/Directory_Management/contryCode.mjs` | `CountrySchema` | 8 | cntry_cd, cntry_nm, dgcis_cd, cntry_cd_old, aepc_cntry_cd, cntry_grp (+2 more) |
| `Location` | `locations` | `./srcc/Directory_Management/location.mjs` | `locationSchema` | 6 | name, postal_code, city, district, state, country |
| `UnitConversion` | `unitConversions` | `./srcc/Directory_Management/unitConversion.mjs` | `UnitConversionSchema` | 3 | uqc, uqc_desc, type |


### Module: `server/model/srcc/sr_cel/` (1 Collections)

| Model Name | Collection Name | Source File | Schema Var | Field Count | Key Fields / Summary |
| :--- | :--- | :--- | :--- | :---: | :--- |
| `Srcel` | `srcels` | `./srcc/sr_cel/srCel.mjs` | `SrcelSchema` | 15 | FGUID, FAssetID, FAssetTypeID, FDescription, FSIMNumber, FAgentGUID (+9 more) |


### Module: `server/model/vendormgt/` (2 Collections)

| Model Name | Collection Name | Source File | Schema Var | Field Count | Key Fields / Summary |
| :--- | :--- | :--- | :--- | :---: | :--- |
| `VendorInvoice` | `vendorInvoices` | `./vendormgt/vendorInvoice.mjs` | `VendorInvoiceSchema` | 5 | serialNumber, invoiceNumber, invoiceDate, vendorName, invoiceimageUrls |
| `VendorInvoiceCounter` | `vendorInvoiceCounters` | `./vendormgt/vendorInvoiceCounter.mjs` | `VendorInvoiceCounterSchema` | 2 | _id, seq |

