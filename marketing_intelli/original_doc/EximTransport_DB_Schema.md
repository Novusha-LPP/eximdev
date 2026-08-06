# EximTransport / ALVision EXIM — MongoDB Database Schema Reference

Auto-extracted from the Mongoose model files under `server/model/` in the uploaded codebase (`eximtransport-ewaybillchild.zip`). Every collection, model registration, and schema field below is parsed directly from the source code — nothing here is invented.

**How to read the per-field descriptions:** where the source code has no comment explaining a field, the description is a plain-language reading of the field's name, type, and modifiers (`ref`, `enum`, `default`, `required`, etc.) — it is a naming-convention inference, not a business-rule guarantee. Where the code *does* carry a comment, that is noted explicitly.

**Collection name column:** MongoDB collection names come from Mongoose's default pluralization of the model name registered via `mongoose.model('ModelName', schema)`, unless the schema options explicitly set a `collection` override (noted where present). This is the standard Mongoose convention, not a guess specific to this codebase.

---
## Table of Contents

- Module: `(root) server/model/`
  - [Attendance](#attendance) — `attendances` (./Attendance.mjs)
  - [AuditLog](#auditlog) — `auditLogs` (./AuditLog.mjs)
  - [ClientCallHistory](#clientcallhistory) — `clientCallHistories` (./ClientCallHistoryModel.mjs)
  - [DSRDayClose](#dsrdayclose) — `dSRDayCloses` (./DSRDayClose.mjs)
  - [ElockBill](#elockbill) — `elockBills` (./ElockBill.mjs)
  - [ElockSnapshot](#elocksnapshot) — `elockSnapshots` (./ElockSnapshotModel.mjs)
  - [ElockStatusHistory](#elockstatushistory) — `elockStatusHistories` (./ElockStatusHistoryModel.mjs)
  - [EmailLog](#emaillog) — `emailLogs` (./EmailLog.mjs)
  - [EmailScheduleConfig](#emailscheduleconfig) — `emailScheduleConfigs` (./EmailScheduleConfig.mjs)
  - [EmailTemplate](#emailtemplate) — `emailTemplates` (./EmailTemplate.mjs)
  - [FileAsset](#fileasset) — `fileAssets` (./FileAsset.mjs)
  - [FleetSnapshot](#fleetsnapshot) — `fleetSnapshots` (./FleetSnapshotModel.mjs)
  - [FleetStatus](#fleetstatus) — `fleetStatuses` (./FleetStatusModel.mjs)
  - [JobSearch](#jobsearch) — `jobSearches` (./Job.js)
  - [LeaveQuota](#leavequota) — `leaveQuotas` (./LeaveQuota.mjs)
  - [LeaveRequest](#leaverequest) — `leaveRequests` (./LeaveRequest.mjs)
  - [Notification](#notification) — `notifications` (./Notification.mjs)
  - [PRSearch](#prsearch) — `pRSearches` (./PR.js)
  - [RefreshToken](#refreshtoken) — `refreshTokens` (./RefreshToken.mjs)
  - [SystemConfig](#systemconfig) — `systemConfigs` (./SystemConfig.mjs)
  - [SystemVariableConfig](#systemvariableconfig) — `systemVariableConfigs` (./SystemVariable.mjs)
  - [SystemVariableConfig](#systemvariableconfig) — `systemVariableConfigs` (./SystemVariableConfig.mjs)
  - [TrackingStatusHistory](#trackingstatushistory) — `trackingStatusHistories` (./TrackingStatusHistoryModel.mjs)
  - [TriggerEvent](#triggerevent) — `triggerEvents` (./TriggerEvent.mjs)
  - [VehicleDSR](#vehicledsr) — `vehicleDSRs` (./VehicleDSR.mjs)
  - [Counter](#counter) — `counters` (./counterModel.mjs)
  - [documentList](#documentlist) — `documentLists` (./cthDocumentsModel.mjs)
  - [MyFeedBack](#myfeedback) — `myFeedBacks` (./feedbackModel.mjs)
  - [Importer](#importer) — `importers` (./importerSchemaModel.mjs)
  - [Job](#job) — `jobs` (./jobModel.mjs)
  - [JobsLastUpdated](#jobslastupdated) — `jobsLastUpdateds` (./jobsLastUpdatedOnModel.mjs)
  - [ReportFields](#reportfields) — `reportFieldses` (./reportFieldsModel.mjs)
  - [User](#user) — `users` (./userModel.mjs)
- Module: `server/model/FreightMemo/`
  - [FreightMemo](#freightmemo) — `freightMemos` (./FreightMemo/freightMemoModel.mjs)
- Module: `server/model/cashRegister/`
  - [AtmLog](#atmlog) — `atmLogs` (./cashRegister/atmLogsModel.mjs)
  - [CashRegister](#cashregister) — `cashRegisters` (./cashRegister/cashRegisterModel.mjs)
  - [GlobalBalance](#globalbalance) — `globalBalances` (./cashRegister/globalBalanceModel.mjs)
  - [NetBalance](#netbalance) — `netBalance` (./cashRegister/netBalanceModel.mjs)
  - [NonLR](#nonlr) — `nonLRs` (./cashRegister/nonLrModel.mjs)
  - [Transaction](#transaction) — `transactions` (./cashRegister/transactionModel.mjs)
- Module: `server/model/cashRegister/cashVoucher/`
  - [Counter](#counter) — `counters` (./cashRegister/cashVoucher/cashVoucherModel.mjs)
  - [CashVoucher](#cashvoucher) — `cashVouchers` (./cashRegister/cashVoucher/cashVoucherModel.mjs)
- Module: `server/model/dayClose/`
  - [DayClose](#dayclose) — `day_close` (./dayClose/dayCloseModel.mjs)
- Module: `server/model/maintenance/`
  - [AccidentJobCard](#accidentjobcard) — `accidentJobCards` (./maintenance/AccidentJobCard.mjs)
  - [ElockForecastUpload](#elockforecastupload) — `elockForecastUploads` (./maintenance/ElockForecast.mjs)
  - [ElockForecast](#elockforecast) — `elockForecasts` (./maintenance/ElockForecast.mjs)
  - [OCRRecord](#ocrrecord) — `oCRRecords` (./maintenance/OCRRecord.mjs)
  - [OutsourcedJobCard](#outsourcedjobcard) — `outsourcedJobCards` (./maintenance/OutsourcedJobCard.mjs)
  - [TyreMaintenance](#tyremaintenance) — `tyreMaintenances` (./maintenance/TyreMaintenance.mjs)
  - [VehicleMaintenance](#vehiclemaintenance) — `vehicleMaintenances` (./maintenance/VehicleMaintenance.mjs)
  - [WashingBay](#washingbay) — `washingBays` (./maintenance/WashingBay.mjs)
- Module: `server/model/openPoints/`
  - [OpenPoint](#openpoint) — `openPoints` (./openPoints/openPointModel.mjs)
  - [OpenPointProject](#openpointproject) — `openPointProjects` (./openPoints/openPointProjectModel.mjs)
- Module: `server/model/srcc/`
  - [BulkRequest](#bulkrequest) — `bulkRequests` (./srcc/BulkRequest.mjs)
  - [DeleteElockOthers](#deleteelockothers) — `deleteElockOtherses` (./srcc/DeleteElockOthers.mjs)
  - [DeletedLR](#deletedlr) — `deletedLRs` (./srcc/DeletedLR.mjs)
  - [ElockAssignOthers](#elockassignothers) — `elockAssignOtherses` (./srcc/ElockAssginOthersModel.mjs)
  - [EwayBill](#ewaybill) — `ewayBills` (./srcc/EwayBill.mjs)
  - [EwayBillErrorLog](#ewaybillerrorlog) — `ewayBillErrorLogs` (./srcc/Ewaybillerrorlog.mjs)
  - [ContainerType](#containertype) — `containerTypes` (./srcc/containerType.mjs)
  - [DispatchException](#dispatchexception) — `dispatchExceptions` (./srcc/dispatchException.mjs)
  - [DriverDetails](#driverdetails) — `driverDetailses` (./srcc/driverDetails.mjs)
  - [engineOilDistribution](#engineoildistribution) — `engineOilDistributions` (./srcc/engineOilDistribution.mjs)
  - [engineOilStock](#engineoilstock) — `engineOilStocks` (./srcc/engineOilStock.mjs)
  - [LocationMaster](#locationmaster) — `locationMasters` (./srcc/locationMaster.mjs)
  - [PlyRatings](#plyratings) — `plyRatingses` (./srcc/plyRatings.mjs)
  - [PrData](#prdata) — `prDatas` (./srcc/pr.mjs)
  - [Pr](#pr) — `prs` (./srcc/prModel.mjs)
  - [RepairTypes](#repairtypes) — `repairTypeses` (./srcc/repairTypes.mjs)
  - [Rto](#rto) — `rtos` (./srcc/rtoModel.mjs)
  - [Tr](#tr) — `trs` (./srcc/trModel.mjs)
  - [TypeOfVehicle](#typeofvehicle) — `typeOfVehicles` (./srcc/typeOfVehicle.mjs)
  - [TyreBrands](#tyrebrands) — `tyreBrandses` (./srcc/tyreBrand.mjs)
  - [Tyre](#tyre) — `tyres` (./srcc/tyreModel.mjs)
  - [TyreModels](#tyremodels) — `tyreModelses` (./srcc/tyreModels.mjs)
  - [TyreSizes](#tyresizes) — `tyreSizeses` (./srcc/tyreSizes.mjs)
  - [TyreTypes](#tyretypes) — `tyreTypeses` (./srcc/tyreTypes.mjs)
  - [Vehicles](#vehicles) — `vehicleses` (./srcc/vehicleModel.mjs)
  - [Vendors](#vendors) — `vendorses` (./srcc/vendors.mjs)
- Module: `server/model/srcc/Directory_Management/`
  - [AdvanceToDriver](#advancetodriver) — `advanceToDrivers` (./srcc/Directory_Management/AdvanceToDriver.mjs)
  - [CVCategoryDirectory](#cvcategorydirectory) — `cVCategoryDirectories` (./srcc/Directory_Management/CVCategoryDirectory.mjs)
  - [CommodityCode](#commoditycode) — `commodityCodes` (./srcc/Directory_Management/Commodity.mjs)
  - [Distributor](#distributor) — `distributors` (./srcc/Directory_Management/Distributor.mjs)
  - [DriverType](#drivertype) — `driverTypes` (./srcc/Directory_Management/Driver.mjs)
  - [Elock](#elock) — `elocks` (./srcc/Directory_Management/Elock.mjs)
  - [ElockAssignLimit](#elockassignlimit) — `elockAssignLimits` (./srcc/Directory_Management/ElockAssignLimitModel.mjs)
  - [ElockBillDirectory](#elockbilldirectory) — `elockBillDirectories` (./srcc/Directory_Management/ElockBillDirectory.mjs)
  - [LrRegisterColumnSet](#lrregistercolumnset) — `lrRegisterColumnSets` (./srcc/Directory_Management/LrRegisterColumnSet.mjs)
  - [LrTrackingStages](#lrtrackingstages) — `lrTrackingStageses` (./srcc/Directory_Management/LrTrackingStages.mjs)
  - [Organisation](#organisation) — `organisations` (./srcc/Directory_Management/Organisation.mjs)
  - [PortICDcode](#porticdcode) — `portICDcodes` (./srcc/Directory_Management/PortsCfsYard.mjs)
  - [ShippingLine](#shippingline) — `shippingLines` (./srcc/Directory_Management/ShippingLine.mjs)
  - [StateDistrict](#statedistrict) — `stateDistricts` (./srcc/Directory_Management/StateDistrict.mjs)
  - [TollData](#tolldata) — `tollDatas` (./srcc/Directory_Management/TollData.mjs)
  - [UnitMeasurement](#unitmeasurement) — `unitMeasurements` (./srcc/Directory_Management/UnitMeasurementModal.mjs)
  - [VehicleRegistration](#vehicleregistration) — `vehicleRegistrations` (./srcc/Directory_Management/VehicleRegistration.mjs)
  - [VehicleType](#vehicletype) — `vehicleTypes` (./srcc/Directory_Management/VehicleType.mjs)
  - [Country](#country) — `countries` (./srcc/Directory_Management/contryCode.mjs)
  - [Location](#location) — `locations` (./srcc/Directory_Management/location.mjs)
  - [UnitConversion](#unitconversion) — `unitConversions` (./srcc/Directory_Management/unitConversion.mjs)
- Module: `server/model/srcc/sr_cel/`
  - [Srcel](#srcel) — `srcels` (./srcc/sr_cel/srCel.mjs)
- Module: `server/model/vendormgt/`
  - [VendorInvoice](#vendorinvoice) — `vendorInvoices` (./vendormgt/vendorInvoice.mjs)
  - [VendorInvoiceCounter](#vendorinvoicecounter) — `vendorInvoiceCounters` (./vendormgt/vendorInvoiceCounter.mjs)
---

## Module: `(root) server/model/`


### `Attendance` — collection: **`attendances`**

- **Source file:** `./Attendance.mjs`
- **Schema variable:** `attendanceSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 5

**Fields:**

- **`driver_id`** — `ObjectId` _(required, ref: User)_ — Reference to `User` document (driver ID).
- **`marked_by`** — `ObjectId` _(required, ref: User)_ — Reference to `User` document (marked by).
- **`date`** — `Date` _(required)_ — date — date field.
- **`status`** — `String` _(required, enum: ["present", "absent", "leave", "halfday-1st", "halfday-2nd", "holiday", "weekoff"])_ — status. Allowed values: ["present", "absent", "leave", "halfday-1st", "halfday-2nd", "holiday", "weekoff"].
- **`remark`** — `String` — remark.


### `AuditLog` — collection: **`auditLogs`**

- **Source file:** `./AuditLog.mjs`
- **Schema variable:** `AuditLogSchema`
- **Timestamps:** not set by schema options (may still have manual createdAt/updatedAt fields below)
- **Top-level field count:** 18

**Fields:**

- **`userId`** — `ObjectId` _(ref: User)_ — Reference to `User` document (user ID).
- **`userName`** — `String` — user Name.
- **`userRole`** — `String` — user Role.
- **`branch`** — `String` — branch.
- **`action`** — `String` _(required, enum: ["CREATE", "UPDATE", "DELETE"])_ — action.
- **`entityType`** — `String` _(required, enum: [
        "PR",
        "Container",
        "FreightMemo",
        "LR Outward",
        "Elock Assignment",
        "Elock Others",
        "Vehicle Movement",
        "Dispatch Closure",
        "Dispatch Exception",
        "Dispatch Day Close",
        "Driver",
        "Attendance",
        "Leave Request",
        "Cash Register",
        "Cash Voucher",
        "Non-LR Cash",
        "ATM Log",
        "Net Balance Adjustment",
        "Day Close"
      ])_ — entity Type.
- **`entityId`** — `Mixed` _(required)_ — entity ID.
- **`activePage`** — `String` _(enum: [
        "FTL",
        "Tracking",
        "Accounts",
        "Outward",
        "Public Scanner",
        "DSR",
        "Elock Others",
        "Dispatch",
        "Driver Directory",
        "Attendance",
        "Leave Management",
        "Cash Register",
        "Cash Voucher",
        "Non-LR Cash",
        "ATM Withdraw",
        "Net Balance",
        "Day Close"
      ])_ — active Page.
- **`pr_no`** — `String` — Purchase Request no — identifier/number.
- **`lr_no`** — `String` — LR no — identifier/number.
- **`container_number`** — `String` — container number — identifier/number.
- **`elock_no`** — `String` — e-Lock no — identifier/number.
- **`vehicle_no`** — `String` — vehicle no — identifier/number.
- **`driver_name`** — `String` — driver name.
- **`date`** — `Date` — date — date field.
- **`changes`** — Embedded Object — Embedded sub-document (single object).
  - **`before`** — `Mixed` _(default: {})_ — before.
  - **`after`** — `Mixed` _(default: {})_ — after.
  - **`fields`** — `[String]` _(default: [])_ — fields.
- **`timestamp`** — `Date` _(default: Date.now)_ — timestamp.
- **`ipAddress`** — `String` — IP Address — address text.


### `ClientCallHistory` — collection: **`clientCallHistories`**

- **Source file:** `./ClientCallHistoryModel.mjs`
- **Schema variable:** `ClientCallHistorySchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 9

**Fields:**

- **`containerId`** — `ObjectId` _(required)_ — container ID.
- **`prId`** — `ObjectId` _(required, ref: PrData)_ — Reference to `PrData` document (Purchase Request ID).
- **`containerNumber`** — `String` _(required)_ — container Number — identifier/number.
- **`trNo`** — `String` _(required)_ — tr No — identifier/number.
- **`elockNo`** — `String` — e-Lock No — identifier/number.
- **`currentClientCallStatus`** — `String` _(default: "no", enum: ["yes", "no"])_ — current Client Call Status. Allowed values: ["yes", "no"].
- **`history`** — `[HistoryEntrySchema]` _(default: [])_ — history.
- **`createdAt`** — `Date` _(default: Date.now)_ — Timestamp when the document was created.
- **`updatedAt`** — `Date` _(default: Date.now)_ — Timestamp when the document was last updated.


### `DSRDayClose` — collection: **`dSRDayCloses`**

- **Source file:** `./DSRDayClose.mjs`
- **Schema variable:** `dsrDayCloseSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 4

**Fields:**

- **`date`** — `Date` _(required, unique)_ — date — date field.
- **`closedBy`** — Embedded Object — Embedded sub-document (single object).
  - **`username`** — `String` _(required)_ — username.
  - **`role`** — `String` _(default: "")_ — role.
- **`closedAt`** — `Date` _(default: Date.now)_ — closed At — timestamp.
- **`pendingLRSnapshot`** — `[pendingLRSnapshotSchema]` — pending LRSnapshot.


### `ElockBill` — collection: **`elockBills`**

- **Source file:** `./ElockBill.mjs`
- **Schema variable:** `ElockBillSchema`
- **Timestamps:** not set by schema options (may still have manual createdAt/updatedAt fields below)
- **Top-level field count:** 6

**Fields:**

- **`billNumber`** — `String` _(required, unique)_ — bill Number — identifier/number.
- **`organisationInfo`** — `ObjectId` _(required, ref: ElockBillDirectory)_ — Reference to `ElockBillDirectory` document (organisation Info).
- **`items`** — `[ObjectId]` _(required)_ — items.
- **`billType`** — `String` _(default: "new", enum: ["new", "proforma", "with_advance"])_ — bill Type.
- **`createdAt`** — `Date` _(default: Date.now)_ — Timestamp when the document was created.
- **`updatedAt`** — `Date` _(default: Date.now)_ — Timestamp when the document was last updated.


### `ElockSnapshot` — collection: **`elockSnapshots`**

- **Source file:** `./ElockSnapshotModel.mjs`
- **Schema variable:** `elockSnapshotSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 7

**Fields:**

- **`date`** — `String` _(required, unique)_ — date — date field.
- **`availableCount`** — `Number` _(default: 0)_ — available Count — count/quantity.
- **`maintenanceCount`** — `Number` _(default: 0)_ — maintenance Count — count/quantity.
- **`assignedCount`** — `Number` _(default: 0)_ — assigned Count — count/quantity.
- **`lostCount`** — `Number` _(default: 0)_ — lost Count — count/quantity.
- **`totalCount`** — `Number` _(default: 0)_ — total Count — count/quantity.
- **`timestamp`** — `Date` _(default: Date.now)_ — timestamp.


### `ElockStatusHistory` — collection: **`elockStatusHistories`**

- **Source file:** `./ElockStatusHistoryModel.mjs`
- **Schema variable:** `elockStatusHistorySchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 9

**Fields:**

- **`containerId`** — `ObjectId` _(required, ref: pr)_ — Reference to `pr` document (container ID).
- **`prId`** — `ObjectId` _(required, ref: pr)_ — Reference to `pr` document (Purchase Request ID).
- **`containerNumber`** — `String` _(required)_ — container Number — identifier/number.
- **`trNo`** — `String` _(required)_ — tr No — identifier/number.
- **`elockNo`** — `String` _(default: "")_ — e-Lock No — identifier/number.
- **`currentStatus`** — `String` _(required, enum: ["ASSIGNED", "UNASSIGNED", "RETURNED"])_ — current Status. Allowed values: ["ASSIGNED", "UNASSIGNED", "RETURNED"].
- **`userId`** — `String` _(required)_ — user ID — identifier/number.
- **`username`** — `String` _(required)_ — username.
- **`history`** — [Embedded Object] — Embedded sub-document (array of objects).
  - **`date`** — `String` _(required)_ — date — date field.
  - **`time`** — `String` _(required)_ — time.
  - **`change`** — `String` _(required)_ — change.
  - **`username`** — `String` _(required)_ — username.
  - **`userId`** — `String` _(required)_ — user ID — identifier/number.
  - **`elockNo`** — `String` _(default: "")_ — e-Lock No — identifier/number.
  - **`remarks`** — `String` _(default: "")_ — remarks.
  - **`timestamp`** — `Date` _(default: Date.now)_ — timestamp.


### `EmailLog` — collection: **`emailLogs`**

- **Source file:** `./EmailLog.mjs`
- **Schema variable:** `EmailLogSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 19

**Fields:**

- **`scheduleConfig`** — `ObjectId` _(ref: EmailScheduleConfig)_ — Reference to `EmailScheduleConfig` document (schedule Config).
- **`emailTemplate`** — `ObjectId` _(required, ref: EmailTemplate)_ — Reference to `EmailTemplate` document (email Template).
- **`prData`** — `ObjectId` _(ref: PrData)_ — Reference to `PrData` document (Purchase Request Data).
- **`subject`** — `String` _(required)_ — subject.
- **`emailBody`** — `String` _(required)_ — email Body — email address.
- **`recipients`** — Embedded Object — Embedded sub-document (single object).
  - **`to`** — `[String]` — to.
  - **`cc`** — `[String]` — cc.
  - **`bcc`** — `[String]` — bcc.
- **`triggerEvent`** — `String` — trigger Event.
- **`triggerData`** — `Mixed` — trigger Data.
- **`sendStatus`** — `String` _(default: "pending", enum: ["pending", "sent", "failed", "bounced", "complained", "delivered"])_ — send Status. Allowed values: ["pending", "sent", "failed", "bounced", "complained", "delivered"].
- **`sesMessageId`** — `String` — ses Message ID — identifier/number.
- **`sesResponse`** — `Mixed` — ses Response.
- **`scheduledAt`** — `Date` _(default: Date.now)_ — scheduled At — timestamp.
- **`sentAt`** — `Date` — sent At — timestamp.
- **`deliveredAt`** — `Date` — delivered At — timestamp.
- **`error`** — Embedded Object — Embedded sub-document (single object).
  - **`message`** — `String` — message.
  - **`code`** — `String` — code — code value.
  - **`stack`** — `String` — stack.
  - **`timestamp`** — `Date` — timestamp.
- **`retryCount`** — `Number` _(default: 0)_ — retry Count — count/quantity.
- **`maxRetries`** — `Number` _(default: 3)_ — max Retries.
- **`emailSize`** — `Number` — email Size — email address.
- **`attachments`** — [Embedded Object] — Embedded sub-document (array of objects).
  - **`filename`** — `String` — filename.
  - **`path`** — `String` — path.
  - **`contentType`** — `String` — content Type.


### `EmailScheduleConfig` — collection: **`emailScheduleConfigs`**

- **Source file:** `./EmailScheduleConfig.mjs`
- **Schema variable:** `EmailScheduleConfigSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 19

**Fields:**

- **`scheduleName`** — `String` _(required)_ — schedule Name.
- **`emailTemplate`** — `ObjectId` _(required, ref: EmailTemplate)_ — Reference to `EmailTemplate` document (email Template).
- **`scheduleType`** — `String` _(required, default: 'event_trigger', enum: ['cron', 'event_trigger', 'immediate', 'one_time'])_ — schedule Type.
- **`cronExpression`** — `String` — cron Expression.
- **`scheduledDateTime`** — `Date` — scheduled Date Time — date field.
- **`organization`** — `ObjectId` _(ref: Organisation)_ — Reference to `Organisation` document (organization).
- **`orgType`** — `String` _(default: 'all', enum: ['consignor', 'consignee', 'all'])_ — org Type.
- **`orgBranch`** — `[ObjectId]` — org Branch.
- **`triggerEvent`** — `String` _(required, enum: [
        'pr_created',
        'pr_updated',
        'container_status_change',
        'delivery_completed',
        'detention_alert',
        'document_uploaded',
        'bill_generated',
        'job_completed',
        'elock_assigned',
        'tracking_update',
        'lr_generation',
        'custom',
      ])_ — trigger Event.
- **`eventConditions`** — Embedded Object — Embedded sub-document (single object).
  - **`trackingStatus`** — `ObjectId` _(ref: LrTrackingStages)_ — Reference to `LrTrackingStages` document (tracking Status).
  - **`containerType`** — `ObjectId` _(ref: ContainerType)_ — Reference to `ContainerType` document (container Type).
  - **`importExport`** — `String` _(enum: ['Import', 'Export'])_ — import Export.
  - **`customConditions`** — `Mixed` — custom Conditions.
- **`emailConfig`** — Embedded Object — Embedded sub-document (single object).
  - **`customTo`** — `[String]` — custom To.
  - **`ccRecipients`** — `[String]` — cc Recipients.
  - **`bccRecipients`** — `[String]` — bcc Recipients.
  - **`variableOverrides`** — `Mixed` — variable Overrides.
  - **`bodyOverride`** — `String` — body Override.
- **`isActive`** — `Boolean` _(default: true)_ — is Active — boolean flag.
- **`lastExecuted`** — `Date` _(default: null)_ — last Executed.
- **`nextExecution`** — `Date` _(default: null)_ — next Execution.
- **`executionCount`** — `Number` _(default: 0)_ — execution Count — count/quantity.
- **`failureCount`** — `Number` _(default: 0)_ — failure Count — count/quantity.
- **`createdBy`** — `ObjectId` _(default: null, ref: User)_ — Reference to `User` document (created By).
- **`lastModifiedBy`** — `ObjectId` _(default: null, ref: User)_ — Reference to `User` document (last Modified By).
- **`notes`** — `String` — notes.


### `EmailTemplate` — collection: **`emailTemplates`**

- **Source file:** `./EmailTemplate.mjs`
- **Schema variable:** `EmailTemplateSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 11

**Fields:**

- **`templateName`** — `String` _(required)_ — template Name.
- **`subject`** — `String` _(required)_ — subject.
- **`emailBody`** — `String` _(required)_ — email Body — email address.
- **`systemVariables`** — `[SystemVariableSchema]` — system Variables.
- **`templateType`** — `String` _(default: 'custom', enum: ['notification', 'alert', 'report', 'reminder', 'custom'])_ — template Type.
- **`isActive`** — `Boolean` _(default: true)_ — is Active — boolean flag.
- **`version`** — `Number` _(default: 1)_ — version.
- **`createdBy`** — `ObjectId` _(default: null, ref: User)_ — Reference to `User` document (created By).
- **`lastModifiedBy`** — `ObjectId` _(ref: User)_ — Reference to `User` document (last Modified By).
- **`tags`** — `[String]` — tags.
- **`usage_count`** — `Number` _(default: 0)_ — usage count — count/quantity.


### `FileAsset` — collection: **`fileAssets`**

- **Source file:** `./FileAsset.mjs`
- **Schema variable:** `fileAssetSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 5

**Fields:**

- **`s3Key`** — `String` _(required, unique)_ — s3 Key.
- **`owner`** — `ObjectId` _(required, ref: User)_ — Reference to `User` document (owner).
- **`module`** — `String` _(required)_ — module.
- **`mime`** — `String` — mime.
- **`size`** — `Number` — size.


### `FleetSnapshot` — collection: **`fleetSnapshots`**

- **Source file:** `./FleetSnapshotModel.mjs`
- **Schema variable:** `fleetSnapshotSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 12

**Fields:**

- **`date`** — `String` _(required, unique)_ — date — date field.
- **`totalFleet`** — `Number` _(default: 0)_ — total Fleet.
- **`onRoadCount`** — `Number` _(default: 0)_ — on Road Count — count/quantity.
- **`breakdownCount`** — `Number` _(default: 0)_ — breakdown Count — count/quantity.
- **`maintenanceCount`** — `Number` _(default: 0)_ — maintenance Count — count/quantity.
- **`driverLeaveCount`** — `Number` _(default: 0)_ — driver Leave Count — count/quantity.
- **`accidentCount`** — `Number` _(default: 0)_ — accident Count — count/quantity.
- **`noDriverCount`** — `Number` _(default: 0)_ — no Driver Count — count/quantity.
- **`otherCount`** — `Number` _(default: 0)_ — other Count — count/quantity.
- **`idleCount`** — `Number` _(default: 0)_ — idle Count — count/quantity.
- **`utilizationPercent`** — `Number` _(default: 0)_ — utilization Percent.
- **`timestamp`** — `Date` _(default: Date.now)_ — timestamp.


### `FleetStatus` — collection: **`fleetStatuses`**

- **Source file:** `./FleetStatusModel.mjs`
- **Schema variable:** `fleetStatusSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 5

**Fields:**

- **`vehicleId`** — `ObjectId` _(required, unique, ref: VehicleRegistration)_ — Reference to `VehicleRegistration` document (vehicle ID).
- **`status`** — `String` _(default: "AVAILABLE", enum: ["AVAILABLE", "BREAKDOWN", "MAINTENANCE", "DRIVER_LEAVE", "ACCIDENT", "NO_DRIVER", "OTHER"])_ — status. Allowed values: ["AVAILABLE", "BREAKDOWN", "MAINTENANCE", "DRIVER_LEAVE", "ACCIDENT", "NO_DRIVER", "OTHER"].
- **`remark`** — `String` — remark.
- **`location`** — `String` — location.
- **`updatedBy`** — `ObjectId` _(ref: User)_ — Reference to `User` document (updated By).


### `JobSearch` — collection: **`jobSearches`**

- **Source file:** `./Job.js`
- **Schema variable:** `jobSearchSchema`
- **Timestamps:** not set by schema options (may still have manual createdAt/updatedAt fields below)
- **Explicit collection override in code:** `jobs`
- **Top-level field count:** 0

**Fields:**



### `LeaveQuota` — collection: **`leaveQuotas`**

- **Source file:** `./LeaveQuota.mjs`
- **Schema variable:** `leaveQuotaSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 5

**Fields:**

- **`driver_id`** — `ObjectId` _(required, ref: User)_ — Reference to `User` document (driver ID).
- **`leave_type`** — `String` _(required, enum: ["Sick", "Casual", "Emergency", "Paid"])_ — leave type.
- **`total_days`** — `Number` _(required)_ — total days.
- **`used_days`** — `Number` _(default: 0)_ — used days.
- **`year`** — `Number` _(required, default: () => new Date().getFullYear())_ — year.


### `LeaveRequest` — collection: **`leaveRequests`**

- **Source file:** `./LeaveRequest.mjs`
- **Schema variable:** `leaveRequestSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 15

**Fields:**

- **`driver_id`** — `ObjectId` _(required, ref: User)_ — Reference to `User` document (driver ID).
- **`from_date`** — `Date` _(required)_ — from date — date field.
- **`to_date`** — `Date` _(required)_ — to date — date field.
- **`reason`** — `String` _(required)_ — reason.
- **`leave_type`** — `String` _(required, default: "Casual", enum: ["Sick", "Casual", "Emergency", "Paid"])_ — leave type.
- **`duration`** — `String` _(required, default: "full", enum: ["full", "halfday-1st", "halfday-2nd"])_ — duration.
- **`status`** — `String` _(default: "pending", enum: ["pending", "approved", "rejected", "cancelled"])_ — status. Allowed values: ["pending", "approved", "rejected", "cancelled"].
- **`document_path`** — `String` _(default: null)_ — document path.
- **`document_paths`** — `[String]` _(default: [])_ — document paths.
- **`cancelled_at`** — `Date` _(default: null)_ — cancelled at — timestamp.
- **`cancelled_by`** — `ObjectId` _(default: null, ref: User)_ — Reference to `User` document (cancelled by).
- **`reviewed_by`** — `ObjectId` _(ref: User)_ — Reference to `User` document (reviewed by).
- **`hr_notes`** — `String` _(default: "")_ — hr notes.
- **`hr_notes_added_at`** — `Date` — hr notes added at — timestamp.
- **`hr_notes_by`** — `ObjectId` _(ref: User)_ — Reference to `User` document (hr notes by).


### `Notification` — collection: **`notifications`**

- **Source file:** `./Notification.mjs`
- **Schema variable:** `notificationSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 5

**Fields:**

- **`user_id`** — `ObjectId` _(required, ref: User)_ — Reference to `User` document (user ID).
- **`message`** — `String` _(required)_ — message.
- **`type`** — `String` _(required, enum: ["leave_request", "leave_decision", "elock_sos", "elock_alarm"])_ — type.
- **`ref_id`** — `ObjectId` _(required)_ — ref ID.
- **`is_read`** — `Boolean` _(default: false)_ — is read — boolean flag.


### `PRSearch` — collection: **`pRSearches`**

- **Source file:** `./PR.js`
- **Schema variable:** `prSearchSchema`
- **Timestamps:** not set by schema options (may still have manual createdAt/updatedAt fields below)
- **Explicit collection override in code:** `prdatas`
- **Top-level field count:** 0

**Fields:**



### `RefreshToken` — collection: **`refreshTokens`**

- **Source file:** `./RefreshToken.mjs`
- **Schema variable:** `refreshTokenSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 8

**Fields:**

- **`token`** — `String` _(required)_ — token.
- **`userId`** — `ObjectId` _(required, ref: User)_ — Reference to `User` document (user ID).
- **`ipAddress`** — `String` — IP Address — address text.
- **`userAgent`** — `String` — user Agent.
- **`sessionCreatedAt`** — `Date` _(required)_ — session Created At — timestamp.
- **`expiresAt`** — `Date` _(required)_ — expires At — timestamp.
- **`isUsed`** — `Boolean` _(default: false)_ — is Used — boolean flag.
- **`replacedByToken`** — `String` — replaced By Token.


### `SystemConfig` — collection: **`systemConfigs`**

- **Source file:** `./SystemConfig.mjs`
- **Schema variable:** `SystemConfigSchema`
- **Timestamps:** not set by schema options (may still have manual createdAt/updatedAt fields below)
- **Top-level field count:** 3

**Fields:**

- **`key`** — `String` _(required, unique)_ — key.
- **`value`** — `Mixed` — value — numeric amount/value.
- **`updatedAt`** — `Date` _(default: Date.now)_ — Timestamp when the document was last updated.


### `SystemVariableConfig` — collection: **`systemVariableConfigs`**

- **Source file:** `./SystemVariable.mjs`
- **Schema variable:** `SystemVariableConfigSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 10

**Fields:**

- **`key`** — `String` _(required, unique)_ — key.
- **`label`** — `String` _(required)_ — label.
- **`description`** — `String` — description.
- **`category`** — `String` _(required, enum: ['core', 'organization', 'location', 'container', 'system'])_ — category.
- **`dataType`** — `String` _(default: 'string', enum: ['string', 'number', 'date', 'boolean', 'array'])_ — data Type.
- **`schemaPath`** — `String` — schema Path.
- **`isArray`** — `Boolean` — is Array — boolean flag.
- **`defaultValue`** — `String` — default Value — numeric amount/value.
- **`example`** — `String` — example.
- **`isActive`** — `Boolean` _(default: true)_ — is Active — boolean flag.


### `SystemVariableConfig` — collection: **`systemVariableConfigs`**

- **Source file:** `./SystemVariableConfig.mjs`
- **Schema variable:** `SystemVariableConfigSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 16

**Fields:**

- **`key`** — `String` _(required, unique)_ — key.
- **`label`** — `String` _(required)_ — label.
- **`description`** — `String` _(default: '')_ — description.
- **`category`** — `String` _(required, enum: [
        'core',
        'organization',
        'location',
        'container',
        'system',
        'shipping',
        'consignor',
        'consignee',
        'transport',
        'customs',
        'branch',
        'vehicle',
        'tracking',
        'document',
        'goods',
        'payment',
        'container_type',
      ])_ — category.
- **`dataType`** — `String` _(default: 'string', enum: ['string', 'number', 'date', 'boolean', 'array', 'object'])_ — data Type.
- **`schemaPath`** — `String` — schema Path.
- **`isArray`** — `Boolean` _(default: false)_ — is Array — boolean flag.
- **`defaultValue`** — `String` _(default: '')_ — default Value — numeric amount/value.
- **`example`** — `String` _(default: '')_ — example.
- **`isActive`** — `Boolean` _(default: true)_ — is Active — boolean flag.
- **`isRequired`** — `Boolean` _(default: false)_ — is Required — boolean flag.
- **`validationRules`** — Embedded Object — Embedded sub-document (single object).
  - **`minLength`** — `Number` — min Length.
  - **`maxLength`** — `Number` — max Length.
  - **`pattern`** — `String` — pattern.
  - **`allowedValues`** — `[String]` — allowed Values — numeric amount/value.
- **`usage_count`** — `Number` _(default: 0)_ — usage count — count/quantity.
- **`last_used`** — `Date` _(default: null)_ — last used.
- **`createdBy`** — `ObjectId` _(default: null, ref: User)_ — Reference to `User` document (created By).
- **`lastModifiedBy`** — `ObjectId` _(default: null, ref: User)_ — Reference to `User` document (last Modified By).


### `TrackingStatusHistory` — collection: **`trackingStatusHistories`**

- **Source file:** `./TrackingStatusHistoryModel.mjs`
- **Schema variable:** `trackingStatusHistorySchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 8

**Fields:**

- **`containerId`** — `ObjectId` _(required, ref: pr)_ — Reference to `pr` document (container ID).
- **`prId`** — `ObjectId` _(required, ref: pr)_ — Reference to `pr` document (Purchase Request ID).
- **`containerNumber`** — `String` _(required)_ — container Number — identifier/number.
- **`trNo`** — `String` _(required)_ — tr No — identifier/number.
- **`currentStatus`** — `ObjectId` _(default: null, ref: LrTrackingStages)_ — Reference to `LrTrackingStages` document (current Status).
- **`userId`** — `String` _(required)_ — user ID — identifier/number.
- **`username`** — `String` _(required)_ — username.
- **`history`** — [Embedded Object] — Embedded sub-document (array of objects).
  - **`date`** — `String` _(required)_ — date — date field.
  - **`time`** — `String` _(required)_ — time.
  - **`change`** — `String` _(required)_ — change.
  - **`username`** — `String` _(required)_ — username.
  - **`userId`** — `String` _(required)_ — user ID — identifier/number.
  - **`trackingStatusId`** — `ObjectId` _(default: null, ref: LrTrackingStages)_ — Reference to `LrTrackingStages` document (tracking Status ID).
  - **`trackingStatusName`** — `String` _(default: "")_ — tracking Status Name.
  - **`remarks`** — `String` _(default: "")_ — remarks.
  - **`timestamp`** — `Date` _(default: Date.now)_ — timestamp.


### `TriggerEvent` — collection: **`triggerEvents`**

- **Source file:** `./TriggerEvent.mjs`
- **Schema variable:** `TriggerEventSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 8

**Fields:**

- **`eventName`** — `String` _(required, unique)_ — event Name.
- **`eventCode`** — `String` _(required, unique)_ — event Code — code value.
- **`description`** — `String` — description.
- **`category`** — `String` _(required, enum: ['pr_events', 'container_events', 'document_events', 'system_events'])_ — category.
- **`schemaPath`** — `String` — schema Path.
- **`triggerCondition`** — Embedded Object — Embedded sub-document (single object).
  - **`field`** — `String` — field.
  - **`operator`** — `String` — operator.
  - **`value`** — `Mixed` — value — numeric amount/value.
- **`isActive`** — `Boolean` _(default: true)_ — is Active — boolean flag.
- **`priority`** — `Number` _(default: 0)_ — priority.


### `VehicleDSR` — collection: **`vehicleDSRs`**

- **Source file:** `./VehicleDSR.mjs`
- **Schema variable:** `vehicleDSRSchema`
- **Timestamps:** not set by schema options (may still have manual createdAt/updatedAt fields below)
- **Top-level field count:** 9

**Fields:**

- **`date`** — `Date` _(required)_ — date — date field.
- **`vehicleId`** — `ObjectId` _(required, ref: VehicleRegistration)_ — Reference to `VehicleRegistration` document (vehicle ID).
- **`vehicleNumber`** — `String` _(required)_ — vehicle Number — identifier/number.
- **`status`** — `[String]` _(required, default: [], enum: [
      "Maintenance",
      "No Driver",
      "IDLE",
      "Under detention",
      "Under trip",
      "Driver on Leave",
      "Accident",
      "Others",
    ])_ — status. Allowed values: [
      "Maintenance",
      "No Driver",
      "IDLE",
      "Under detention",
      "Under trip",
      "Driver on Leave",
      "Accident",
      "Others",
    ].
- **`otherStatusText`** — `String` — other Status Text.
- **`isClosed`** — `Boolean` _(default: false)_ — is Closed — boolean flag.
- **`history`** — `[historySchema]` — history.
- **`lastUpdatedBy`** — `String` — last Updated By — user/actor who performed this action.
- **`lastUpdatedRole`** — `String` — last Updated Role — date field.


### `Counter` — collection: **`counters`**

- **Source file:** `./counterModel.mjs`
- **Schema variable:** `counterSchema`
- **Timestamps:** not set by schema options (may still have manual createdAt/updatedAt fields below)
- **Top-level field count:** 2

**Fields:**

- **`_id`** — `String` _(required)_ — MongoDB document primary key.
- **`seq`** — `Number` _(default: 0)_ — seq.


### `documentList` — collection: **`documentLists`**

- **Source file:** `./cthDocumentsModel.mjs`
- **Schema variable:** `documentListSchema`
- **Timestamps:** not set by schema options (may still have manual createdAt/updatedAt fields below)
- **Explicit collection override in code:** `cthdocuments`
- **Top-level field count:** 3

**Fields:**

- **`cth`** — `Number` — CTH.
- **`document_code`** — `String` — document code — code value.
- **`document_name`** — `String` — document name.


### `MyFeedBack` — collection: **`myFeedBacks`**

- **Source file:** `./feedbackModel.mjs`
- **Schema variable:** `feedbackSchema`
- **Timestamps:** not set by schema options (may still have manual createdAt/updatedAt fields below)
- **Top-level field count:** 14

**Fields:**

- **`type`** — `String` _(required, enum: ["bug", "suggestion", "improvement", "feature-request", "other"])_ — type.
- **`module`** — `String` _(required, enum: [
      "lr-operations",
      "elock-operation",
      "elock-bill",
      "gps-operation",
      "maintenance",
      "sr-cel",
      "directories",
      "other",
    ])_ — module.
- **`title`** — `String` _(required, enum: [
      "lr-operations",
      "elock-operation",
      "elock-bill",
      "gps-operation",
      "sr-cel",
      "directories",
      "other",
    ])_ — title.
- **`title`** — `String` _(required)_ — title.
- **`description`** — `String` _(required)_ — description.
- **`priority`** — `String` _(default: "medium", enum: ["low", "medium", "high", "critical"])_ — priority.
- **`status`** — `String` _(default: "pending", enum: ["pending", "in-progress", "resolved", "closed", "wont-fix"])_ — status. Allowed values: ["pending", "in-progress", "resolved", "closed", "wont-fix"].
- **`attachments`** — `[String]` — attachments.
- **`submittedBy`** — `String` _(required)_ — submitted By — user/actor who performed this action.
- **`submittedByEmail`** — `String` — submitted By Email — email address.
- **`adminNotes`** — `String` — admin Notes.
- **`resolvedAt`** — `Date` — resolved At — timestamp.
- **`createdAt`** — `Date` _(default: Date.now)_ — Timestamp when the document was created.
- **`updatedAt`** — `Date` _(default: Date.now)_ — Timestamp when the document was last updated.


### `Importer` — collection: **`importers`**

- **Source file:** `./importerSchemaModel.mjs`
- **Schema variable:** `importerSchema`
- **Timestamps:** not set by schema options (may still have manual createdAt/updatedAt fields below)
- **Top-level field count:** 4

**Fields:**

- **`name`** — `String` _(required)_ — name.
- **`contact`** — `String` — contact — phone/contact number.
- **`email`** — `String` _(unique)_ — email — email address.
- **`address`** — `String` — address — address text.


### `Job` — collection: **`jobs`**

- **Source file:** `./jobModel.mjs`
- **Schema variable:** `jobSchema`
- **Timestamps:** not set by schema options (may still have manual createdAt/updatedAt fields below)
- **Top-level field count:** 181

**Fields:**

- **`createdAt`** — `Date` _(default: Date.now)_ — Timestamp when the document was created.
- **`updatedAt`** — `Date` _(default: Date.now)_ — Timestamp when the document was last updated.
- **`job_date`** — `String` _(default: () => new Date().toISOString())_ — job date — date field.
- **`year`** — `String` — year.
- **`job_no`** — `String` — job no — identifier/number.
- **`custom_house`** — `String` — custom house.
- **`job_date`** — `String` — job date — date field.
- **`importer`** — `String` — importer.
- **`supplier_exporter`** — `String` — supplier exporter.
- **`invoice_number`** — `String` — invoice number — identifier/number.
- **`invoice_date`** — `String` — invoice date — date field.
- **`awb_bl_no`** — `String` — AWB BL no — identifier/number.
- **`awb_bl_date`** — `String` — AWB BL date — date field.
- **`description`** — `String` — description.
- **`be_no`** — `String` — Bill of Entry no — identifier/number.
- **`in_bond_be_no`** — `String` — in bond Bill of Entry no — identifier/number.
- **`be_date`** — `String` — Bill of Entry date — date field.
- **`in_bond_be_date`** — `String` — in bond Bill of Entry date — date field.
- **`type_of_b_e`** — `String` — type of b e.
- **`no_of_pkgs`** — `String` — no of pkgs.
- **`unit`** — `String` — unit.
- **`gross_weight`** — `String` — gross weight.
- **`fristCheck`** — `String` — frist Check.
- **`job_net_weight`** — `String` — job net weight.
- **`priorityJob`** — `String` _(default: "Normal")_ — priority Job.
- **`unit_1`** — `String` — unit 1.
- **`gateway_igm`** — `String` — gateway IGM.
- **`gateway_igm_date`** — `String` — gateway IGM date — date field.
- **`hss`** — `String` _(default: "No")_ — hss.
- **`saller_name`** — `String` — saller name.
- **`igm_no`** — `String` — IGM no — identifier/number.
- **`igm_date`** — `String` — IGM date — date field.
- **`loading_port`** — `String` — loading port.
- **`origin_country`** — `String` — origin country — count/quantity.
- **`port_of_reporting`** — `String` — port of reporting.
- **`shipping_line_airline`** — `String` — shipping line airline.
- **`branchSrNo`** — `String` — branch Sr No — identifier/number.
- **`adCode`** — `String` — ad Code — code value.
- **`bank_name`** — `String` — bank name.
- **`isDraftDoc`** — `Boolean` — is Draft Doc — boolean flag.
- **`fta_Benefit_date_time`** — `String` — fta Benefit date time — date field.
- **`exBondValue`** — `String` — ex Bond Value — numeric amount/value.
- **`scheme`** — `String` — scheme.
- **`clearanceValue`** — `String` — clearance Value — numeric amount/value.
- **`line_no`** — `String` — line no — identifier/number.
- **`ie_code_no`** — `String` — IE code no — identifier/number.
- **`container_nos`** — [Embedded Object] — Embedded sub-document (array of objects).
  - **`container_number`** — `String` — container number — identifier/number.
  - **`arrival_date`** — `String` — arrival date — date field.
  - **`detention_from`** — `String` — detention from.
  - **`size`** — `String` — size.
  - **`physical_weight`** — `String` — physical weight.
  - **`tare_weight`** — `String` — tare weight.
  - **`net_weight`** — `String` — net weight.
  - **`container_gross_weight`** — `String` — container gross weight.
  - **`actual_weight`** — `String` — actual weight.
  - **`transporter`** — `String` — transporter.
  - **`vehicle_no`** — `String` — vehicle no — identifier/number.
  - **`driver_name`** — `String` — driver name.
  - **`driver_phone`** — `String` — driver phone — phone/contact number.
  - **`seal_no`** — `String` — seal no — identifier/number.
  - **`pre_weighment`** — `String` — pre weighment.
  - **`post_weighment`** — `String` — post weighment.
  - **`weight_shortage`** — `String` — weight shortage.
  - **`weight_excess`** — `String` — weight excess.
  - **`weighment_slip_images`** — `[String]` — weighment slip images.
  - **`container_pre_damage_images`** — `[String]` — container pre damage images.
  - **`container_images`** — `[String]` — container images.
  - **`loose_material`** — `[String]` — loose material.
  - **`examination_videos`** — `[String]` — examination videos.
  - **`do_revalidation_date`** — `String` — do revalidation date — date field.
  - **`do_validity_upto_container_level`** — `String` — do validity upto container level.
  - **`required_do_validity_upto`** — `String` — required do validity upto.
  - **`seal_number`** — `String` — seal number — identifier/number.
  - **`container_rail_out_date`** — `String` — container rail out date — date field.
  - **`by_road_movement_date`** — `String` — by road movement date — date field.
  - **`emptyContainerOffLoadDate`** — `String` — empty Container Off Load Date — date field.
  - **`net_weight_as_per_PL_document`** — `String` — net weight as per PL document.
  - **`delivery_chalan_file`** — `String` — delivery chalan file.
  - **`delivery_date`** — `String` — delivery date — date field.
  - **`do_revalidation`** — [Embedded Object] — Embedded sub-document (array of objects).
    - **`do_revalidation_upto`** — `String` — do revalidation upto.
    - **`remarks`** — `String` — remarks.
    - **`do_Revalidation_Completed`** — `Boolean` _(default: false)_ — do Revalidation Completed.
- **`container_count`** — `String` — container count — count/quantity.
- **`no_of_container`** — `String` — no of container.
- **`toi`** — `String` — Type of Invoice.
- **`unit_price`** — `String` — unit price — numeric amount/value.
- **`cif_amount`** — `String` — CIF amount — numeric amount/value.
- **`assbl_value`** — `String` — assbl value — numeric amount/value.
- **`total_duty`** — `String` — total duty.
- **`out_of_charge`** — `String` — out of charge.
- **`consignment_type`** — `String` — consignment type.
- **`bill_no`** — `String` — bill no — identifier/number.
- **`bill_date`** — `String` — bill date — date field.
- **`cth_no`** — `String` — CTH no — identifier/number.
- **`exrate`** — `String` — exrate — numeric amount/value.
- **`inv_currency`** — `String` — inv currency.
- **`vessel_berthing`** — `String` — vessel berthing.
- **`importer_address`** — `String` — importer address — address text.
- **`vessel_flight`** — `String` — vessel flight.
- **`voyage_no`** — `String` — voyage no — identifier/number.
- **`job_owner`** — `String` — job owner.
- **`hss_name`** — `String` — hss name.
- **`total_inv_value`** — `String` — total inv value — numeric amount/value.
- **`importerURL`** — `String` — importer URL.
- **`checklist`** — `[String]` — checklist.
- **`checkedDocs`** — `[String]` — checked Docs.
- **`status`** — `String` — status.
- **`detailed_status`** — `String` — detailed status.
- **`obl_telex_bl`** — `String` — obl telex BL.
- **`document_received_date`** — `String` — document received date — date field.
- **`doPlanning`** — `Boolean` — do Planning.
- **`do_planning_date`** — `String` — do planning date — date field.
- **`type_of_Do`** — `String` — type of Do.
- **`do_validity_upto_job_level`** — `String` — do validity upto job level.
- **`do_revalidation_upto_job_level`** — `String` — do revalidation upto job level.
- **`do_revalidation`** — `Boolean` — do revalidation.
- **`do_revalidation_date`** — `String` — do revalidation date — date field.
- **`rail_out_date`** — `String` — rail out date — date field.
- **`examinationPlanning`** — `Boolean` — examination Planning.
- **`examination_planning_date`** — `String` — examination planning date — date field.
- **`processed_be_attachment`** — `[String]` — processed Bill of Entry attachment.
- **`ooc_copies`** — `[String]` — ooc copies.
- **`in_bond_ooc_copies`** — `[String]` — in bond ooc copies.
- **`gate_pass_copies`** — `[String]` — gate pass copies.
- **`sims_reg_no`** — `String` — sims reg no — identifier/number.
- **`pims_reg_no`** — `String` — pims reg no — identifier/number.
- **`nfmims_reg_no`** — `String` — nfmims reg no — identifier/number.
- **`sims_date`** — `String` — sims date — date field.
- **`pims_date`** — `String` — pims date — date field.
- **`nfmims_date`** — `String` — nfmims date — date field.
- **`discharge_date`** — `String` — discharge date — date field.
- **`assessment_date`** — `String` — assessment date — date field.
- **`duty_paid_date`** — `String` — duty paid date — date field.
- **`do_validity`** — `String` — do validity.
- **`containers_arrived_on_same_date`** — `Boolean` — containers arrived on same date — date field.
- **`remarks`** — `String` — remarks.
- **`free_time`** — `Number` — free time.
- **`is_free_time_updated`** — `Boolean` _(default: false)_ — is free time updated — boolean flag.
- **`factory_weighment_slip`** — `String` — factory weighment slip.
- **`assessable_ammount`** — `String` — assessable ammount.
- **`bcd_ammount`** — `String` — bcd ammount.
- **`igst_ammount`** — `String` — IGST ammount.
- **`sws_ammount`** — `String` — sws ammount.
- **`intrest_ammount`** — `String` — intrest ammount.
- **`fine_ammount`** — `String` — fine ammount.
- **`penalty_ammount`** — `String` — penalty ammount.
- **`esanchit_completed_date_time`** — `String` — esanchit completed date time — date field.
- **`shipping_line_bond_completed`** — `String` — shipping line bond completed.
- **`shipping_line_bond_completed_date`** — `String` — shipping line bond completed date — date field.
- **`shipping_line_kyc_completed`** — `String` — shipping line KYC completed.
- **`shipping_line_kyc_completed_date`** — `String` — shipping line KYC completed date — date field.
- **`shipping_line_invoice_received`** — `String` — shipping line invoice received.
- **`shipping_line_invoice_received_date`** — `String` — shipping line invoice received date — date field.
- **`shipping_line_insurance`** — `[String]` — shipping line insurance.
- **`security_deposit`** — `String` — security deposit.
- **`security_amount`** — `String` — security amount — numeric amount/value.
- **`utr`** — `[String]` — utr.
- **`shipping_line_attachment`** — `[String]` — shipping line attachment.
- **`other_invoices`** — `String` — other invoices.
- **`other_invoices_img`** — `[String]` — other invoices img.
- **`other_invoices_date`** — `String` — other invoices date — date field.
- **`payment_made`** — `String` — payment made.
- **`payment_made_date`** — `String` — payment made date — date field.
- **`payment_method`** — `String` _(default: "Transaction")_ — payment method.
- **`do_processed`** — `String` — do processed.
- **`do_documents`** — `[String]` — do documents.
- **`do_processed_date`** — `String` — do processed date — date field.
- **`do_copies`** — `[String]` — do copies.
- **`shipping_line_invoice`** — `String` — shipping line invoice.
- **`shipping_line_invoice_date`** — `String` — shipping line invoice date — date field.
- **`shipping_line_invoice_imgs`** — `[String]` — shipping line invoice imgs.
- **`do_queries`** — [Embedded Object] — Embedded sub-document (array of objects).
  - **`query`** — `String` — query.
  - **`reply`** — `String` — reply.
- **`do_completed`** — `String` — do completed.
- **`icd_cfs_invoice`** — `String` — icd cfs invoice.
- **`icd_cfs_invoice_date`** — `String` — icd cfs invoice date — date field.
- **`do_received`** — `String` — do received.
- **`do_received_date`** — `String` — do received date — date field.
- **`documentation_completed_date_time`** — `String` — documentation completed date time — date field.
- **`pcv_date`** — `String` — pcv date — date field.
- **`examination_date`** — `String` — examination date — date field.
- **`concor_gate_pass_date`** — `String` — concor gate pass date — date field.
- **`concor_gate_pass_validate_up_to`** — `String` — concor gate pass validate up to — date field.
- **`completed_operation_date`** — `String` — completed operation date — date field.
- **`custodian_gate_pass`** — `[String]` — custodian gate pass.
- **`concor_invoice_and_receipt_copy`** — `[String]` — concor invoice and receipt copy.
- **`pr_no`** — `String` — Purchase Request no — identifier/number.
- **`pr_date`** — `String` — Purchase Request date — date field.
- **`consignor`** — `String` — consignor.
- **`consignee`** — `String` — consignee.
- **`type_of_vehicle`** — `String` — type of vehicle.
- **`description_srcc`** — `String` — description srcc.
- **`container_loading`** — `String` — container loading.
- **`container_offloading`** — `String` — container offloading.
- **`instructions`** — `String` — instructions.
- **`goods_pickup`** — `String` — goods pickup.
- **`goods_delivery`** — `String` — goods delivery.
- **`cth_documents`** — `[cthDocumentSchema]` — CTH documents.
- **`eSachitQueries`** — [Embedded Object] — Embedded sub-document (array of objects).
  - **`query`** — `String` — query.
  - **`reply`** — `String` — reply.
- **`documents`** — `[documentSchema]` — documents.
- **`all_documents`** — `[String]` — all documents.
- **`document_entry_completed`** — `Boolean` — document entry completed.
- **`documentationQueries`** — [Embedded Object] — Embedded sub-document (array of objects).
  - **`query`** — `String` — query.
  - **`reply`** — `String` — reply.
- **`checklist_verified_on`** — `String` — checklist verified on.
- **`submission_date`** — `String` — submission date — date field.
- **`submissionQueries`** — [Embedded Object] — Embedded sub-document (array of objects).
  - **`query`** — `String` — query.
  - **`reply`** — `String` — reply.
- **`verified_checklist_upload`** — `[String]` — verified checklist upload.
- **`verified_checklist_upload_date_and_time`** — `String` — verified checklist upload date and time — date field.
- **`submission_completed_date_time`** — `String` — submission completed date time — date field.
- **`job_sticker_upload`** — `[String]` — job sticker upload.
- **`job_sticker_upload_date_and_time`** — `String` — job sticker upload date and time — date field.
- **`billing_completed_date`** — `String` — billing completed date — date field.
- **`bill_document_sent_to_accounts`** — `String` — bill document sent to accounts — count/quantity.
- **`icd_cfs_invoice_img`** — `[String]` — icd cfs invoice img.
- **`upload_agency_bill_img`** — `String` — upload agency bill img.
- **`upload_reimbursement_bill_img`** — `String` — upload reimbursement bill img.
- **`bill_amount`** — `String` — bill amount — numeric amount/value.


### `JobsLastUpdated` — collection: **`jobsLastUpdateds`**

- **Source file:** `./jobsLastUpdatedOnModel.mjs`
- **Schema variable:** `jobsLastUpdatedOnSchema`
- **Timestamps:** not set by schema options (may still have manual createdAt/updatedAt fields below)
- **Top-level field count:** 1

**Fields:**

- **`date`** — `String` _(required)_ — date — date field.


### `ReportFields` — collection: **`reportFieldses`**

- **Source file:** `./reportFieldsModel.mjs`
- **Schema variable:** `reportFieldsSchema`
- **Timestamps:** not set by schema options (may still have manual createdAt/updatedAt fields below)
- **Explicit collection override in code:** `reportFields`
- **Top-level field count:** 6

**Fields:**

- **`importer`** — `String` _(required)_ — importer.
- **`importerURL`** — `String` — importer URL.
- **`email`** — `String` — email — email address.
- **`senderEmail`** — `String` — sender Email — email address.
- **`time`** — `String` — time.
- **`field`** — `[String]` _(required)_ — field.


### `User` — collection: **`users`**

- **Source file:** `./userModel.mjs`
- **Schema variable:** `userSchema`
- **Timestamps:** not set by schema options (may still have manual createdAt/updatedAt fields below)
- **Top-level field count:** 71

**Fields:**

- **`username`** — `String` _(required)_ — username.
- **`password`** — `String` _(required)_ — password.
- **`role`** — `String` — role.
- **`tokenVersion`** — `Number` _(default: 0)_ — token Version.
- **`failedAttempts`** — `Number` _(default: 0)_ — failed Attempts.
- **`lockoutUntil`** — `Date` — lockout Until.
- **`isActive`** — `Boolean` _(default: true)_ — is Active — boolean flag.
- **`assigned_branch`** — `[ObjectId]` _(ref: PortICDcode)_ — Reference to `PortICDcode` document (assigned branch).
- **`assigned_drivers`** — `[ObjectId]` _(ref: DriverDetails)_ — Reference to `DriverDetails` document (assigned drivers).
- **`modules`** — `[String]` — modules.
- **`first_name`** — `String` — first name.
- **`middle_name`** — `String` — middle name.
- **`last_name`** — `String` — last name.
- **`company`** — `String` — company.
- **`email`** — `String` — email — email address.
- **`employment_type`** — `String` — employment type.
- **`skill`** — `String` — skill.
- **`company_policy_visited`** — `String` — company policy visited.
- **`introduction_with_md`** — `String` — introduction with md.
- **`employee_photo`** — `String` — employee photo.
- **`resume`** — `String` — resume.
- **`address_proof`** — `String` — address proof — address text.
- **`nda`** — `String` — nda.
- **`designation`** — `String` — designation.
- **`department`** — `String` — department.
- **`joining_date`** — `String` — joining date — date field.
- **`date_of_birth`** — `String` — date of birth — date field.
- **`permanent_address_line_1`** — `String` — permanent address line 1 — address text.
- **`permanent_address_line_2`** — `String` — permanent address line 2 — address text.
- **`permanent_address_city`** — `String` — permanent address city — address text.
- **`permanent_address_area`** — `String` — permanent address area — address text.
- **`permanent_address_state`** — `String` — permanent address state — address text.
- **`permanent_address_pincode`** — `String` — permanent address pincode — address text.
- **`communication_address_line_1`** — `String` — communication address line 1 — address text.
- **`communication_address_line_2`** — `String` — communication address line 2 — address text.
- **`communication_address_city`** — `String` — communication address city — address text.
- **`communication_address_area`** — `String` — communication address area — address text.
- **`communication_address_state`** — `String` — communication address state — address text.
- **`communication_address_pincode`** — `String` — communication address pincode — address text.
- **`personal_email`** — `String` — personal email — email address.
- **`official_email`** — `String` — official email — email address.
- **`dob`** — `String` — dob.
- **`mobile`** — `String` — mobile — phone/contact number.
- **`emergency_contact`** — `String` — emergency contact — phone/contact number.
- **`emergency_contact_name`** — `String` — emergency contact name — phone/contact number.
- **`family_members`** — `[String]` — family members.
- **`close_friend_contact_no`** — `String` — close friend contact no — identifier/number.
- **`close_friend_contact_name`** — `String` — close friend contact name — phone/contact number.
- **`blood_group`** — `String` — blood group.
- **`highest_qualification`** — `String` — highest qualification.
- **`aadhar_no`** — `String` — aadhar no — identifier/number.
- **`aadhar_photo_front`** — `String` — aadhar photo front.
- **`aadhar_photo_back`** — `String` — aadhar photo back.
- **`pan_no`** — `String` — PAN no — identifier/number.
- **`pan_photo`** — `String` — PAN photo.
- **`pf_no`** — `String` — pf no — identifier/number.
- **`esic_no`** — `String` — esic no — identifier/number.
- **`insurance_status`** — `[String]` — insurance status.
- **`license_front`** — `String` — license front.
- **`license_back`** — `String` — license back.
- **`bank_account_no`** — `String` — bank account no — identifier/number.
- **`bank_name`** — `String` — bank name.
- **`ifsc_code`** — `String` — IFSC code — code value.
- **`favorite_song`** — `String` — favorite song.
- **`marital_status`** — `String` — marital status.
- **`kyc_date`** — `String` — KYC date — date field.
- **`kyc_approval`** — `String` — KYC approval.
- **`lr_register_column_set`** — `ObjectId` _(default: null, ref: LrRegisterColumnSet)_ — Reference to `LrRegisterColumnSet` document (LR register column set).
- **`dsr_column_settings`** — `Object` _(default: null)_ — DSR column settings.
- **`dsr_selected_branches`** — `[ObjectId]` _(ref: PortICDcode)_ — Reference to `PortICDcode` document (DSR selected branches).
- **`week_off`** — `Number` _(default: 0)_ — week off.


## Module: `server/model/FreightMemo/`


### `FreightMemo` — collection: **`freightMemos`**

- **Source file:** `./FreightMemo/freightMemoModel.mjs`
- **Schema variable:** `freightMemoSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 18

**Fields:**

- **`prId`** — `ObjectId` _(required, ref: PrData)_ — Reference to `PrData` document (Purchase Request ID).
- **`containerId`** — `ObjectId` _(required)_ — container ID.
- **`lr_no`** — `String` _(required)_ — LR no — identifier/number.
- **`balance_amount`** — `Number` _(default: 0)_ — balance amount — numeric amount/value.
- **`detentionAmount`** — `Number` _(default: 0)_ — detention Amount — numeric amount/value.
- **`miscAmount`** — `Number` _(default: 0)_ — misc Amount — numeric amount/value.
- **`miscReason`** — `String` _(default: "")_ — misc Reason.
- **`status`** — `String` _(default: "Active", enum: ["Active", "Approval", "Completed"])_ — status. Allowed values: ["Active", "Approval", "Completed"].
- **`createdBy`** — `ObjectId` _(default: null, ref: User)_ — Reference to `User` document (created By).
- **`lastModifiedBy`** — `ObjectId` _(default: null, ref: User)_ — Reference to `User` document (last Modified By).
- **`sentToApprovalBy`** — `ObjectId` _(default: null, ref: User)_ — Reference to `User` document (sent To Approval By).
- **`sentToApprovalDate`** — `Date` _(default: null)_ — sent To Approval Date — date field.
- **`rejectionRemark`** — `String` _(default: "")_ — rejection Remark.
- **`rejectedBy`** — `ObjectId` _(default: null, ref: User)_ — Reference to `User` document (rejected By).
- **`rejectedDate`** — `Date` _(default: null)_ — rejected Date — date field.
- **`approvedToCompletedBy`** — `ObjectId` _(default: null, ref: User)_ — Reference to `User` document (approved To Completed By).
- **`approvedToCompletedDate`** — `Date` _(default: null)_ — approved To Completed Date — date field.
- **`statusHistory`** — [Embedded Object] — Embedded sub-document (array of objects).
  - **`status`** — `String` — status.
  - **`changedAt`** — `Date` _(default: Date.now)_ — changed At — timestamp.
  - **`changedBy`** — `ObjectId` _(ref: User)_ — Reference to `User` document (changed By).
  - **`changedByUserName`** — `String` — changed By User Name.
  - **`changeDescription`** — `String` — change Description.
  - **`balance_amount`** — `Number` — balance amount — numeric amount/value.
  - **`detentionAmount`** — `Number` — detention Amount — numeric amount/value.
  - **`miscAmount`** — `Number` — misc Amount — numeric amount/value.
  - **`miscReason`** — `String` — misc Reason.
  - **`rejectionRemark`** — `String` — rejection Remark.


## Module: `server/model/cashRegister/`


### `AtmLog` — collection: **`atmLogs`**

- **Source file:** `./cashRegister/atmLogsModel.mjs`
- **Schema variable:** `atmLogSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 2

**Fields:**

- **`amount`** — `Number` _(required)_ — amount — numeric amount/value.
- **`userId`** — `ObjectId` _(ref: User)_ — Reference to `User` document (user ID).


### `CashRegister` — collection: **`cashRegisters`**

- **Source file:** `./cashRegister/cashRegisterModel.mjs`
- **Schema variable:** `cashRegisterSchema`
- **Timestamps:** not set by schema options (may still have manual createdAt/updatedAt fields below)
- **Top-level field count:** 30

**Fields:**

- **`prId`** — `ObjectId` _(required, ref: PrData)_ — Reference to `PrData` document (Purchase Request ID).
- **`containerId`** — `ObjectId` _(required)_ — container ID.
- **`lr_no`** — `String` _(required)_ — LR no — identifier/number.
- **`vehicle_no`** — `String` — vehicle no — identifier/number.
- **`driver_name`** — `String` _(default: "")_ — driver name.
- **`destination`** — `ObjectId` _(ref: Location)_ — Reference to `Location` document (destination).
- **`date`** — `Date` _(required)_ — date — date field.
- **`operatorBranch`** — `ObjectId` _(default: null, ref: PortICDcode)_ — Reference to `PortICDcode` document (operator Branch).
- **`operatorBranchCode`** — `String` _(default: null)_ — operator Branch Code — code value.
- **`status`** — `String` _(required, default: "pending", enum: ["pending", "active", "completed"])_ — status. Allowed values: ["pending", "active", "completed"].
- **`statusHistory`** — [Embedded Object] — Embedded sub-document (array of objects).
  - **`status`** — `String` _(required, enum: ["pending", "active", "completed"])_ — status. Allowed values: ["pending", "active", "completed"].
  - **`changedAt`** — `Date` _(required)_ — changed At — timestamp.
  - **`changedBy`** — `ObjectId` _(ref: User)_ — Reference to `User` document (changed By).
  - **`changeDescription`** — `String` — change Description.
  - **`rejectionReason`** — `String` — rejection Reason.
- **`cash`** — `Number` _(default: 0)_ — cash.
- **`mr`** — `Number` _(default: 0)_ — mr.
- **`weight`** — `Number` _(default: 0)_ — weight.
- **`misc`** — `Number` _(default: 0)_ — misc.
- **`remarks`** — `String` — remarks.
- **`total_cash`** — `Number` _(default: 0)_ — total cash.
- **`hp_diesel`** — `Number` _(default: 0)_ — hp diesel.
- **`happay`** — `Number` _(default: 0)_ — happay.
- **`visat_pump`** — `Number` _(default: 0)_ — visat pump.
- **`upi_advance`** — `Number` _(default: 0)_ — upi advance.
- **`upi_weight`** — `Number` _(default: 0)_ — upi weight.
- **`upi_mr`** — `Number` _(default: 0)_ — upi mr.
- **`upi_misc`** — `Number` _(default: 0)_ — upi misc.
- **`upi_remarks`** — `String` — upi remarks.
- **`upi_total`** — `Number` _(default: 0)_ — upi total.
- **`createdBy`** — `ObjectId` _(default: null, ref: User)_ — Reference to `User` document (created By).
- **`lastModifiedBy`** — `ObjectId` _(default: null, ref: User)_ — Reference to `User` document (last Modified By).
- **`createdAt`** — `Date` _(default: Date.now)_ — Timestamp when the document was created.
- **`updatedAt`** — `Date` _(default: Date.now)_ — Timestamp when the document was last updated.


### `GlobalBalance` — collection: **`globalBalances`**

- **Source file:** `./cashRegister/globalBalanceModel.mjs`
- **Schema variable:** `globalBalanceSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 6

**Fields:**

- **`totalHpDiesel`** — `Number` _(required, default: 0)_ — total Hp Diesel.
- **`totalHappay`** — `Number` _(required, default: 0)_ — total Happay.
- **`totalVisatPump`** — `Number` _(required, default: 0)_ — total Visat Pump.
- **`totalUpi`** — `Number` _(required, default: 0)_ — total Upi.
- **`lastUpdated`** — `Date` _(default: Date.now)_ — last Updated — date field.
- **`lastUpdatedBy`** — `ObjectId` _(ref: User)_ — Reference to `User` document (last Updated By).


### `NetBalance` — collection: **`netBalance`**

- **Source file:** `./cashRegister/netBalanceModel.mjs`
- **Schema variable:** `netBalanceSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 8

**Fields:**

- **`branch`** — `ObjectId` _(required, ref: PortICDcode)_ — Reference to `PortICDcode` document (branch).
- **`branchCode`** — `String` _(required)_ — branch Code — code value.
- **`branchName`** — `String` _(required)_ — branch Name.
- **`totalCash`** — `Number` _(required, default: 0)_ — total Cash.
- **`totalHpDiesel`** — `Number` _(required, default: 0)_ — total Hp Diesel.
- **`totalHappay`** — `Number` _(required, default: 0)_ — total Happay.
- **`totalVisatPump`** — `Number` _(required, default: 0)_ — total Visat Pump.
- **`totalUpi`** — `Number` _(required, default: 0)_ — total Upi.


### `NonLR` — collection: **`nonLRs`**

- **Source file:** `./cashRegister/nonLrModel.mjs`
- **Schema variable:** `nonLrSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 8

**Fields:**

- **`non_lr_no`** — `String` _(required, unique)_ — non LR no — identifier/number.
- **`vehicle`** — `String` _(required)_ — vehicle.
- **`date`** — `Date` _(required, default: Date.now)_ — date — date field.
- **`rejection_date`** — `Date` — rejection date — date field.
- **`reject_reason`** — `String` — reject reason.
- **`status`** — `String` _(default: 'Active', enum: ['Active', 'Approval', 'Completed'])_ — status. Allowed values: ['Active', 'Approval', 'Completed'].
- **`expenses`** — Embedded Object — Embedded sub-document (single object).
  - **`hp_diesel`** — `Number` _(default: 0)_ — hp diesel.
  - **`upi_misc`** — `Number` _(default: 0)_ — upi misc.
  - **`upi_remark`** — `String` _(default: '')_ — upi remark.
  - **`hp_remark`** — `String` _(default: '')_ — hp remark.
- **`created_by`** — `ObjectId` _(ref: User)_ — Reference to `User` document (created by).


### `Transaction` — collection: **`transactions`**

- **Source file:** `./cashRegister/transactionModel.mjs`
- **Schema variable:** `transactionSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 15

**Fields:**

- **`branch`** — `ObjectId` _(required, ref: PortICDcode)_ — Reference to `PortICDcode` document (branch).
- **`branchCode`** — `String` _(required)_ — branch Code — code value.
- **`branchName`** — `String` _(required)_ — branch Name.
- **`operatorBranch`** — `ObjectId` _(default: null, ref: PortICDcode)_ — Reference to `PortICDcode` document (operator Branch).
- **`operatorBranchCode`** — `String` _(default: null)_ — operator Branch Code — code value.
- **`transactionType`** — `String` _(required, enum: [
        "ATM_WITHDRAW",
        "MANUAL_RECHARGE",
        "LR_EXPENSE_DEDUCT",
        "LR_EXPENSE_REVERSE",
        "NON_LR_EXPENSE_DEDUCT",
        "NON_LR_EXPENSE_REVERSE",
        
        "VOUCHER_EXPENSE_DEDUCT",
        "VOUCHER_EXPENSE_REVERSE",
        "VOUCHER_COMPLETED",
      ])_ — transaction Type.
- **`mode`** — `String` _(default: "MANUAL", enum: ["ATM", "MANUAL", "LR", "NON_LR", "VOUCHER"])_ — mode.
- **`changes`** — `[changeSchema]` — changes.
- **`selectedLrs`** — `[ObjectId]` _(ref: PrData)_ — Reference to `PrData` document (selected Lrs).
- **`balanceBefore`** — Embedded Object — Embedded sub-document (single object).
  - **`totalCash`** — `Number` _(required)_ — total Cash.
  - **`totalHappay`** — `Number` _(required)_ — total Happay.
  - **`totalHpDiesel`** — `Number` _(required)_ — total Hp Diesel.
  - **`totalUpi`** — `Number` _(required)_ — total Upi.
  - **`totalVisatPump`** — `Number` _(required)_ — total Visat Pump.
- **`balanceAfter`** — Embedded Object — Embedded sub-document (single object).
  - **`totalCash`** — `Number` _(required)_ — total Cash.
  - **`totalHappay`** — `Number` _(required)_ — total Happay.
  - **`totalHpDiesel`** — `Number` _(required)_ — total Hp Diesel.
  - **`totalUpi`** — `Number` _(required)_ — total Upi.
  - **`totalVisatPump`** — `Number` _(required)_ — total Visat Pump.
- **`performedBy`** — Embedded Object — Embedded sub-document (single object).
  - **`userId`** — `ObjectId` _(required, ref: User)_ — Reference to `User` document (user ID).
  - **`userName`** — `String` — user Name.
- **`description`** — `String` — description.
- **`remarks`** — `String` — remarks.
- **`timestamp`** — `Date` _(required, default: Date.now)_ — timestamp.


## Module: `server/model/cashRegister/cashVoucher/`


### `Counter` — collection: **`counters`**

- **Source file:** `./cashRegister/cashVoucher/cashVoucherModel.mjs`
- **Schema variable:** `counterSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 2

**Fields:**

- **`_id`** — `String` _(required)_ — MongoDB document primary key.
- **`seq`** — `Number` _(default: 0)_ — seq.


### `CashVoucher` — collection: **`cashVouchers`**

- **Source file:** `./cashRegister/cashVoucher/cashVoucherModel.mjs`
- **Schema variable:** `cashVoucherSchema`
- **Timestamps:** not set by schema options (may still have manual createdAt/updatedAt fields below)
- **Top-level field count:** 27

**Fields:**

- **`voucher_no`** — `String` _(required, unique)_ — voucher no — identifier/number.
- **`type`** — `String` _(default: "General")_ — type.
- **`category`** — `ObjectId` _(required, ref: CVCategoryDirectory)_ — Reference to `CVCategoryDirectory` document (category).
- **`vehicle_no`** — `String` — vehicle no — identifier/number.
- **`destination`** — `String` — destination.
- **`date`** — `Date` _(required)_ — date — date field.
- **`status`** — `String` _(required, default: "pending", enum: ["pending", "active", "completed"])_ — status. Allowed values: ["pending", "active", "completed"].
- **`statusHistory`** — [Embedded Object] — Embedded sub-document (array of objects).
  - **`status`** — `String` _(required, enum: ["pending", "active", "completed"])_ — status. Allowed values: ["pending", "active", "completed"].
  - **`changedAt`** — `Date` _(required)_ — changed At — timestamp.
  - **`changedBy`** — `ObjectId` _(ref: User)_ — Reference to `User` document (changed By).
  - **`changeDescription`** — `String` — change Description.
- **`cash`** — `Number` _(default: 0)_ — cash.
- **`mr`** — `Number` _(default: 0)_ — mr.
- **`weight`** — `Number` _(default: 0)_ — weight.
- **`misc`** — `Number` _(default: 0)_ — misc.
- **`remarks`** — `String` — remarks.
- **`total_cash`** — `Number` _(default: 0)_ — total cash.
- **`hp_diesel`** — `Number` _(default: 0)_ — hp diesel.
- **`happay`** — `Number` _(default: 0)_ — happay.
- **`visat_pump`** — `Number` _(default: 0)_ — visat pump.
- **`upi_advance`** — `Number` _(default: 0)_ — upi advance.
- **`upi_weight`** — `Number` _(default: 0)_ — upi weight.
- **`upi_mr`** — `Number` _(default: 0)_ — upi mr.
- **`upi_misc`** — `Number` _(default: 0)_ — upi misc.
- **`upi_remarks`** — `String` — upi remarks.
- **`upi_total`** — `Number` _(default: 0)_ — upi total.
- **`createdBy`** — `ObjectId` _(default: null, ref: User)_ — Reference to `User` document (created By).
- **`lastModifiedBy`** — `ObjectId` _(default: null, ref: User)_ — Reference to `User` document (last Modified By).
- **`createdAt`** — `Date` _(default: Date.now)_ — Timestamp when the document was created.
- **`updatedAt`** — `Date` _(default: Date.now)_ — Timestamp when the document was last updated.


## Module: `server/model/dayClose/`


### `DayClose` — collection: **`day_close`**

- **Source file:** `./dayClose/dayCloseModel.mjs`
- **Schema variable:** `dayCloseSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 6

**Fields:**

- **`closedAt`** — `Date` _(required)_ — closed At — timestamp.
- **`closingBalance`** — `balanceDetailSchema` _(required)_ — closing Balance.
- **`openingBalance`** — `balanceDetailSchema` _(required)_ — opening Balance.
- **`reportData`** — Embedded Object — Embedded sub-document (single object).
  - **`lrs`** — `[Mixed]` — lrs.
  - **`transactions`** — `[Mixed]` — transactions.
  - **`cashVouchers`** — `[Mixed]` — cash Vouchers.
  - **`nonLRs`** — `[Mixed]` — non LRs.
  - **`rejections`** — `[Mixed]` — rejections.
  - **`meta`** — Embedded Object — Embedded sub-document (single object).
    - **`generatedAt`** — `Date` — generated At — timestamp.
    - **`rejectionCount`** — `Number` — rejection Count — count/quantity.
    - **`nonLrCount`** — `Number` — non LR Count — count/quantity.
- **`createdBy`** — `ObjectId` _(required, ref: User)_ — Reference to `User` document (created By).
- **`remarks`** — `String` _(default: "")_ — remarks.


## Module: `server/model/maintenance/`


### `AccidentJobCard` — collection: **`accidentJobCards`**

- **Source file:** `./maintenance/AccidentJobCard.mjs`
- **Schema variable:** `accidentJobCardSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 22

**Fields:**

- **`job_number`** — `String` _(required, unique)_ — job number — identifier/number.
- **`job_date`** — `Date` _(required)_ — job date — date field.
- **`vehicle_number`** — `String` _(required)_ — vehicle number — identifier/number.
- **`kilometers`** — `Number` — kilometers.
- **`driver_name`** — `String` — driver name.
- **`accident_date`** — `Date` — accident date — date field.
- **`driver_mobile`** — `String` — driver mobile — phone/contact number.
- **`accident_place`** — `String` — accident place.
- **`total_estimate`** — `Number` _(default: 0)_ — total estimate.
- **`towing_charges`** — `Number` _(default: 0)_ — towing charges.
- **`insurance_company`** — `String` — insurance company.
- **`insurance_validity`** — `Date` — insurance validity.
- **`labor_vendors`** — `[vendorInfoSchema]` — labor vendors.
- **`work_details`** — `[workDetailSchema]` — work details.
- **`remarks`** — `String` — remarks.
- **`status`** — `String` _(default: "Open", enum: ["Open", "Closed"])_ — status. Allowed values: ["Open", "Closed"].
- **`isDeleted`** — `Boolean` _(default: false)_ — is Deleted — boolean flag.
- **`deletedAt`** — `Date` — deleted At — timestamp.
- **`deletedBy`** — `ObjectId` _(ref: User)_ — Reference to `User` document (deleted By).
- **`deletionReason`** — `String` — deletion Reason.
- **`createdBy`** — `ObjectId` _(ref: User)_ — Reference to `User` document (created By).
- **`lastModifiedBy`** — `ObjectId` _(ref: User)_ — Reference to `User` document (last Modified By).


### `ElockForecastUpload` — collection: **`elockForecastUploads`**

- **Source file:** `./maintenance/ElockForecast.mjs`
- **Schema variable:** `ElockForecastUploadSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 11

**Fields:**

- **`fileName`** — `String` — file Name.
- **`title`** — `String` — title.
- **`clientType`** — `String` _(default: "UNKNOWN", enum: ["IMPORT", "EXPORT", "UNKNOWN"])_ — client Type.
- **`clientName`** — `String` _(default: "UNKNOWN")_ — client Name.
- **`planDate`** — `Date` — plan Date — date field.
- **`sourceProject`** — `String` — source Project.
- **`uploadedBy`** — `String` — uploaded By — user/actor who performed this action.
- **`totalRows`** — `Number` _(default: 0)_ — total Rows.
- **`insertedCount`** — `Number` _(default: 0)_ — inserted Count — count/quantity.
- **`updatedCount`** — `Number` _(default: 0)_ — updated Count — date field.
- **`skippedCount`** — `Number` _(default: 0)_ — skipped Count — count/quantity.


### `ElockForecast` — collection: **`elockForecasts`**

- **Source file:** `./maintenance/ElockForecast.mjs`
- **Schema variable:** `ElockForecastSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 13

**Fields:**

- **`uploadId`** — `ObjectId` _(ref: ElockForecastUpload)_ — Reference to `ElockForecastUpload` document (upload ID).
- **`srNo`** — `String` — sr No — identifier/number.
- **`containerNo`** — `String` _(required)_ — container No — identifier/number.
- **`placeOfDelivery`** — `String` — place Of Delivery.
- **`transporter`** — `String` — transporter.
- **`arrivalDateOfFactory`** — `Date` — arrival Date Of Factory — date field.
- **`doValidTill`** — `Date` — do Valid Till.
- **`port`** — `String` — port.
- **`clientType`** — `String` _(default: "UNKNOWN", enum: ["IMPORT", "EXPORT", "UNKNOWN"])_ — client Type.
- **`clientName`** — `String` _(default: "UNKNOWN")_ — client Name.
- **`planDate`** — `Date` — plan Date — date field.
- **`sourceProject`** — `String` — source Project.
- **`raw`** — `Mixed` _(default: {})_ — raw.


### `OCRRecord` — collection: **`oCRRecords`**

- **Source file:** `./maintenance/OCRRecord.mjs`
- **Schema variable:** `ocrRecordSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 10

**Fields:**

- **`imageUrl`** — `String` _(required)_ — image URL.
- **`ocrResponse`** — `Mixed` _(required)_ — OCR Response.
- **`uploadedBy`** — `String` _(required)_ — uploaded By — user/actor who performed this action.
- **`role`** — `String` _(required)_ — role.
- **`dateTime`** — `Date` _(default: Date.now)_ — date Time — date field.
- **`isDeleted`** — `Boolean` _(default: false)_ — is Deleted — boolean flag.
- **`deletedAt`** — `Date` — deleted At — timestamp.
- **`deletedBy`** — `ObjectId` _(ref: User)_ — Reference to `User` document (deleted By).
- **`deletionReason`** — `String` — deletion Reason.
- **`createdBy`** — `ObjectId` _(ref: User)_ — Reference to `User` document (created By).


### `OutsourcedJobCard` — collection: **`outsourcedJobCards`**

- **Source file:** `./maintenance/OutsourcedJobCard.mjs`
- **Schema variable:** `outsourcedJobCardSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 18

**Fields:**

- **`job_number`** — `String` _(required, unique)_ — job number — identifier/number.
- **`dateTime`** — `Date` _(required)_ — date Time — date field.
- **`kilometers`** — `Number` — kilometers.
- **`vehicle_number`** — `String` _(required)_ — vehicle number — identifier/number.
- **`vehicle_model`** — `String` — vehicle model.
- **`driver_name`** — `String` — driver name.
- **`driver_mobile_number`** — `String` — driver mobile number — identifier/number.
- **`vendors`** — `[vendorSchema]` — vendors.
- **`workshop_incharge`** — `String` — workshop incharge.
- **`remarks`** — `String` — remarks.
- **`driver_sign`** — `String` — driver sign.
- **`status`** — `String` _(default: "Open", enum: ["Open", "Closed"])_ — status. Allowed values: ["Open", "Closed"].
- **`isDeleted`** — `Boolean` _(default: false)_ — is Deleted — boolean flag.
- **`deletedAt`** — `Date` — deleted At — timestamp.
- **`deletedBy`** — `ObjectId` _(ref: User)_ — Reference to `User` document (deleted By).
- **`deletionReason`** — `String` — deletion Reason.
- **`createdBy`** — `ObjectId` _(ref: User)_ — Reference to `User` document (created By).
- **`lastModifiedBy`** — `ObjectId` _(ref: User)_ — Reference to `User` document (last Modified By).


### `TyreMaintenance` — collection: **`tyreMaintenances`**

- **Source file:** `./maintenance/TyreMaintenance.mjs`
- **Schema variable:** `tyreMaintenanceSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 19

**Fields:**

- **`job_number`** — `String` _(required, unique)_ — job number — identifier/number.
- **`dateTime`** — `Date` _(required)_ — date Time — date field.
- **`outDateTime`** — `Date` — out Date Time — date field.
- **`vehicle_number`** — `String` _(required)_ — vehicle number — identifier/number.
- **`kms`** — `Number` — kms.
- **`tyre_number`** — `String` — tyre number — identifier/number.
- **`items`** — `[tyreMaintenanceItemSchema]` — items.
- **`total_amount`** — `Number` _(default: 0)_ — total amount — numeric amount/value.
- **`driver_name`** — `String` — driver name.
- **`tyre_mechanic`** — `String` — tyre mechanic.
- **`work_incharge`** — `String` — work incharge.
- **`remarks`** — `String` — remarks.
- **`status`** — `String` _(default: "Open", enum: ["Open", "Closed"])_ — status. Allowed values: ["Open", "Closed"].
- **`isDeleted`** — `Boolean` _(default: false)_ — is Deleted — boolean flag.
- **`deletedAt`** — `Date` — deleted At — timestamp.
- **`deletedBy`** — `ObjectId` _(ref: User)_ — Reference to `User` document (deleted By).
- **`deletionReason`** — `String` — deletion Reason.
- **`createdBy`** — `ObjectId` _(ref: User)_ — Reference to `User` document (created By).
- **`lastModifiedBy`** — `ObjectId` _(ref: User)_ — Reference to `User` document (last Modified By).


### `VehicleMaintenance` — collection: **`vehicleMaintenances`**

- **Source file:** `./maintenance/VehicleMaintenance.mjs`
- **Schema variable:** `vehicleMaintenanceSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 28

**Fields:**

- **`work_order_number`** — `String` _(required, unique)_ — work order number — identifier/number.
- **`dateTime`** — `Date` _(required)_ — date Time — date field.
- **`vehicle_number`** — `String` _(required)_ — vehicle number — identifier/number.
- **`lr_number`** — `String` — LR number — identifier/number.
- **`container_number`** — `String` — container number — identifier/number.
- **`vehicle_make`** — `String` — vehicle make.
- **`vehicle_model`** — `String` — vehicle model.
- **`vehicle_year`** — `String` — vehicle year.
- **`odometer_reading`** — `Number` — odometer reading.
- **`maintenance_type`** — `String` _(required, enum: ["preventive_maintenance", "emergency_repair", "scheduled_service", "other"])_ — maintenance type.
- **`maintenance_type_other`** — `String` — maintenance type other.
- **`requested_service_issue`** — `[workSummarySchema]` — requested service issue.
- **`work_summary`** — `[workSummarySchema]` — work summary.
- **`parts_used`** — `[workSummarySchema]` — parts used.
- **`labor_info`** — `[laborInfoSchema]` — labor info.
- **`photos`** — `[String]` — photos.
- **`authorised_person`** — `String` — authorised person.
- **`authorised_signature`** — `String` — authorised signature.
- **`driver_name`** — `String` — driver name.
- **`driver_mobile`** — `String` — driver mobile — phone/contact number.
- **`driver_signature`** — `String` — driver signature.
- **`status`** — `String` _(default: "Open", enum: ["Open", "Closed"])_ — status. Allowed values: ["Open", "Closed"].
- **`isDeleted`** — `Boolean` _(default: false)_ — is Deleted — boolean flag.
- **`deletedAt`** — `Date` — deleted At — timestamp.
- **`deletedBy`** — `ObjectId` _(ref: User)_ — Reference to `User` document (deleted By).
- **`deletionReason`** — `String` — deletion Reason.
- **`createdBy`** — `ObjectId` _(ref: User)_ — Reference to `User` document (created By).
- **`lastModifiedBy`** — `ObjectId` _(ref: User)_ — Reference to `User` document (last Modified By).


### `WashingBay` — collection: **`washingBays`**

- **Source file:** `./maintenance/WashingBay.mjs`
- **Schema variable:** `washingBaySchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 18

**Fields:**

- **`job_number`** — `String` _(required, unique)_ — job number — identifier/number.
- **`dateTime`** — `Date` _(required)_ — date Time — date field.
- **`vehicle_number`** — `String` _(required)_ — vehicle number — identifier/number.
- **`lr_number`** — `String` — LR number — identifier/number.
- **`container_number`** — `String` — container number — identifier/number.
- **`driver_name`** — `String` — driver name.
- **`driver_mobile`** — `String` — driver mobile — phone/contact number.
- **`items`** — `[washingBayItemSchema]` — items.
- **`total_amount`** — `Number` _(default: 0)_ — total amount — numeric amount/value.
- **`vehicle_incharge_signature`** — `String` — vehicle incharge signature.
- **`remarks`** — `String` — remarks.
- **`status`** — `String` _(default: "Open", enum: ["Open", "Closed"])_ — status. Allowed values: ["Open", "Closed"].
- **`isDeleted`** — `Boolean` _(default: false)_ — is Deleted — boolean flag.
- **`deletedAt`** — `Date` — deleted At — timestamp.
- **`deletedBy`** — `ObjectId` _(ref: User)_ — Reference to `User` document (deleted By).
- **`deletionReason`** — `String` — deletion Reason.
- **`createdBy`** — `ObjectId` _(ref: User)_ — Reference to `User` document (created By).
- **`lastModifiedBy`** — `ObjectId` _(ref: User)_ — Reference to `User` document (last Modified By).


## Module: `server/model/openPoints/`


### `OpenPoint` — collection: **`openPoints`**

- **Source file:** `./openPoints/openPointModel.mjs`
- **Schema variable:** `pointSchema`
- **Timestamps:** not set by schema options (may still have manual createdAt/updatedAt fields below)
- **Top-level field count:** 16

**Fields:**

- **`project_id`** — `ObjectId` _(required, ref: OpenPointProject)_ — Reference to `OpenPointProject` document (project ID).
- **`title`** — `String` _(required)_ — title.
- **`description`** — `String` — description.
- **`responsibility`** — `String` — responsibility.
- **`level`** — `String` _(default: 'L2', enum: ['L1', 'L2', 'L3', 'L4'])_ — level.
- **`gap_action`** — `String` — gap action.
- **`review_date`** — `String` — review date — date field.
- **`remarks`** — `String` — remarks.
- **`department`** — `String` _(default: 'General')_ — department.
- **`priority`** — `String` _(default: 'Low', enum: ['Low', 'Medium', 'High', 'Emergency', 'P1', 'P2', 'P3', 'P4'])_ — priority.
- **`status`** — `String` _(default: 'Red', enum: ['Green', 'Yellow', 'Red', 'Orange'])_ — status. Allowed values: ['Green', 'Yellow', 'Red', 'Orange'].
- **`target_date`** — `Date` — target date — date field.
- **`responsible_person`** — `ObjectId` _(ref: User)_ — Reference to `User` document (responsible person).
- **`reviewer`** — `ObjectId` _(ref: User)_ — Reference to `User` document (reviewer).
- **`evidence`** — [Embedded Object] — Embedded sub-document (array of objects).
  - **`file_url`** — `String` — file URL.
  - **`uploaded_by`** — `ObjectId` _(ref: User)_ — Reference to `User` document (uploaded by).
  - **`uploaded_at`** — `Date` _(default: Date.now)_ — uploaded at — timestamp.
- **`history`** — [Embedded Object] — Embedded sub-document (array of objects).
  - **`action`** — `String` — action.
  - **`changed_by`** — `ObjectId` _(ref: User)_ — Reference to `User` document (changed by).
  - **`timestamp`** — `Date` _(default: Date.now)_ — timestamp.
  - **`remarks`** — `String` — remarks.


### `OpenPointProject` — collection: **`openPointProjects`**

- **Source file:** `./openPoints/openPointProjectModel.mjs`
- **Schema variable:** `projectSchema`
- **Timestamps:** not set by schema options (may still have manual createdAt/updatedAt fields below)
- **Top-level field count:** 6

**Fields:**

- **`name`** — `String` _(required)_ — name.
- **`description`** — `String` — description.
- **`owner`** — `ObjectId` _(required, ref: User)_ — Reference to `User` document (owner).
- **`status`** — `String` _(default: 'Active', enum: ['Active', 'Archived'])_ — status. Allowed values: ['Active', 'Archived'].
- **`team_members`** — [Embedded Object] — Embedded sub-document (array of objects).
  - **`user`** — `ObjectId` _(ref: User)_ — Reference to `User` document (user).
  - **`role`** — `String` _(enum: ['L1', 'L2', 'L3', 'L4'])_ — role.
  - **`department`** — `String` — department.
- **`created_at`** — `Date` _(default: Date.now)_ — Timestamp when the document was created.


## Module: `server/model/srcc/`


### `BulkRequest` — collection: **`bulkRequests`**

- **Source file:** `./srcc/BulkRequest.mjs`
- **Schema variable:** `BulkRequestSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 8

**Fields:**

- **`requestId`** — `String` _(required, unique)_ — request ID — identifier/number.
- **`userGstin`** — `String` _(required)_ — user GSTIN.
- **`action`** — `String` _(default: "eway")_ — action.
- **`payload`** — `Array` _(required)_ — payload.
- **`status`** — `String` _(default: "Pending")_ — status.
- **`createdAt`** — `Date` _(default: Date.now)_ — Timestamp when the document was created.
- **`processedAt`** — `Date` — processed At — timestamp.
- **`response`** — `Object` — response.


### `DeleteElockOthers` — collection: **`deleteElockOtherses`**

- **Source file:** `./srcc/DeleteElockOthers.mjs`
- **Schema variable:** `DeleteElockOthersSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 21

**Fields:**

- **`consignor`** — `ObjectId` _(ref: Organisation)_ — Reference to `Organisation` document (consignor).
- **`consignee`** — `ObjectId` _(ref: Organisation)_ — Reference to `Organisation` document (consignee).
- **`tr_no`** — `String` — tr no — identifier/number.
- **`container_number`** — `String` — container number — identifier/number.
- **`vehicle_no`** — `String` — vehicle no — identifier/number.
- **`driver_name`** — `String` — driver name.
- **`driver_phone`** — `String` — driver phone — phone/contact number.
- **`elock_no`** — `ObjectId` _(ref: Elock)_ — Reference to `Elock` document (e-Lock no).
- **`elock_assign_status`** — `String` _(enum: ["ASSIGNED", "RETURNED", "UNASSIGNED", "NOT RETURNED"])_ — e-Lock assign status. Allowed values: ["ASSIGNED", "RETURNED", "UNASSIGNED", "NOT RETURNED"].
- **`client_call_status`** — `String` _(default: "no", enum: ["yes", "no"])_ — client call status. Allowed values: ["yes", "no"].
- **`billNumber`** — `String` — bill Number — identifier/number.
- **`elock_bill_completed`** — `Boolean` _(default: false)_ — e-Lock bill completed.
- **`goods_pickup`** — `ObjectId` _(ref: Location)_ — Reference to `Location` document (goods pickup).
- **`goods_delivery`** — `ObjectId` _(ref: Location)_ — Reference to `Location` document (goods delivery).
- **`deletion_reason`** — `String` _(required)_ — deletion reason.
- **`deleted_by`** — `String` — deleted by — user/actor who performed this action.
- **`deleted_by_username`** — `String` — deleted by username.
- **`deleted_by_first_name`** — `String` — deleted by first name.
- **`deleted_by_role`** — `String` — deleted by role.
- **`deleted_at`** — `Date` _(default: Date.now)_ — deleted at — timestamp.
- **`original_id`** — `ObjectId` _(ref: ElockAssginOthers)_ — Reference to `ElockAssginOthers` document (original ID).


### `DeletedLR` — collection: **`deletedLRs`**

- **Source file:** `./srcc/DeletedLR.mjs`
- **Schema variable:** `DeletedLRSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 35

**Fields:**

- **`pr_no`** — `String` _(required)_ — Purchase Request no — identifier/number.
- **`pr_date`** — `String` — Purchase Request date — date field.
- **`import_export`** — `String` — import export.
- **`branch`** — `String` — branch.
- **`consignor`** — `ObjectId` _(ref: Organisation)_ — Reference to `Organisation` document (consignor).
- **`consignee`** — `ObjectId` _(ref: Organisation)_ — Reference to `Organisation` document (consignee).
- **`container_type`** — `ObjectId` _(ref: ContainerType)_ — Reference to `ContainerType` document (container type).
- **`container_count`** — `String` — container count — count/quantity.
- **`gross_weight`** — `String` — gross weight.
- **`type_of_vehicle`** — `ObjectId` _(ref: VehicleType)_ — Reference to `VehicleType` document (type of vehicle).
- **`no_of_vehicle`** — `String` — no of vehicle.
- **`description`** — `String` — description.
- **`shipping_line`** — `ObjectId` _(ref: ShippingLine)_ — Reference to `ShippingLine` document (shipping line).
- **`container_loading`** — `ObjectId` _(ref: PortICDcode)_ — Reference to `PortICDcode` document (container loading).
- **`container_offloading`** — `ObjectId` _(ref: PortICDcode)_ — Reference to `PortICDcode` document (container offloading).
- **`do_validity`** — `String` — do validity.
- **`instructions`** — `String` — instructions.
- **`document_no`** — `String` — document no — identifier/number.
- **`document_date`** — `String` — document date — date field.
- **`goods_pickup`** — `ObjectId` _(ref: Location)_ — Reference to `Location` document (goods pickup).
- **`goods_delivery`** — `ObjectId` _(ref: Location)_ — Reference to `Location` document (goods delivery).
- **`suffix`** — `String` — suffix.
- **`prefix`** — `String` — prefix.
- **`deleted_container`** — Embedded Object — Embedded sub-document (single object).
  - **`tr_no`** — `String` — tr no — identifier/number.
  - **`container_number`** — `String` _(required)_ — container number — identifier/number.
  - **`seal_no`** — `String` — seal no — identifier/number.
  - **`gross_weight`** — `String` — gross weight.
  - **`tare_weight`** — `String` — tare weight.
  - **`net_weight`** — `String` — net weight.
  - **`goods_pickup`** — `ObjectId` _(ref: Location)_ — Reference to `Location` document (goods pickup).
  - **`goods_delivery`** — `ObjectId` _(ref: Location)_ — Reference to `Location` document (goods delivery).
  - **`own_hired`** — `String` — own hired.
  - **`type_of_vehicle`** — `ObjectId` _(ref: VehicleType)_ — Reference to `VehicleType` document (type of vehicle).
  - **`vehicle_no`** — `String` — vehicle no — identifier/number.
  - **`driver_name`** — `String` — driver name.
  - **`driver_phone`** — `String` — driver phone — phone/contact number.
  - **`eWay_bill`** — `String` — e Way bill.
  - **`isOccupied`** — `Boolean` — is Occupied — boolean flag.
  - **`sr_cel_no`** — `String` — sr cel no — identifier/number.
  - **`sr_cel_FGUID`** — `String` — sr cel FGUID — identifier/number.
  - **`sr_cel_id`** — `String` — sr cel ID — identifier/number.
  - **`elock_no`** — `ObjectId` _(ref: Elock)_ — Reference to `Elock` document (e-Lock no).
  - **`tracking_status`** — `ObjectId` _(ref: LrTrackingStages)_ — Reference to `LrTrackingStages` document (tracking status).
  - **`tracking_status_history`** — [Embedded Object] — Embedded sub-document (array of objects).
    - **`status`** — `String` _(required)_ — status.
    - **`timestamp`** — `Date` _(default: Date.now)_ — timestamp.
  - **`elock_assign_status`** — `String` _(default: "UNASSIGNED", enum: ["ASSIGNED", "UNASSIGNED", "RETURNED", "NOT RETURNED"])_ — e-Lock assign status. Allowed values: ["ASSIGNED", "UNASSIGNED", "RETURNED", "NOT RETURNED"].
  - **`client_call_status`** — `String` _(default: "no", enum: ["yes", "no"])_ — client call status. Allowed values: ["yes", "no"].
  - **`lr_completed`** — `Boolean` _(default: false)_ — LR completed.
  - **`offloading_date_time`** — `Date` — offloading date time — date field.
  - **`detention_days`** — `Number` — detention days.
  - **`reason_of_detention`** — `String` — reason of detention.
  - **`tipping`** — `Boolean` — tipping.
  - **`document_attachment`** — `[String]` — document attachment.
- **`deleted_tr`** — Embedded Object — Embedded sub-document (single object).
  - **`tr_no`** — `String` — tr no — identifier/number.
  - **`year`** — `String` — year.
  - **`branch_code`** — `String` — branch code — code value.
  - **`tr_no_complete`** — `String` — tr no complete.
- **`deleted_by`** — `String` _(default: "system")_ — deleted by — user/actor who performed this action.
- **`deletion_reason`** — `String` _(required)_ — deletion reason.
- **`deleted_by_username`** — `String` _(default: "")_ — deleted by username.
- **`deleted_by_first_name`** — `String` _(default: "")_ — deleted by first name.
- **`deleted_by_role`** — `String` _(default: "")_ — deleted by role.
- **`deleted_at`** — `Date` _(default: Date.now)_ — deleted at — timestamp.
- **`deletion_method`** — `String` _(required, enum: ["delete-tr", "delete-tr-from-tracking"])_ — deletion method.
- **`original_pr_id`** — `ObjectId` _(ref: PrData)_ — Reference to `PrData` document (original Purchase Request ID).
- **`original_container_id`** — `ObjectId` — original container ID.
- **`original_tr_id`** — `ObjectId` _(ref: Tr)_ — Reference to `Tr` document (original tr ID).


### `ElockAssignOthers` — collection: **`elockAssignOtherses`**

- **Source file:** `./srcc/ElockAssginOthersModel.mjs`
- **Schema variable:** `ElockAssignOthersSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 19

**Fields:**

- **`consignor`** — `ObjectId` _(required, ref: Organisation)_ — Reference to `Organisation` document (consignor).
- **`consignee`** — `ObjectId` _(required, ref: Organisation)_ — Reference to `Organisation` document (consignee).
- **`tr_no`** — `String` — tr no — identifier/number.
- **`container_number`** — `String` — container number — identifier/number.
- **`vehicle_no`** — `String` — vehicle no — identifier/number.
- **`driver_name`** — `String` — driver name.
- **`driver_phone`** — `String` — driver phone — phone/contact number.
- **`elock_no`** — `ObjectId` _(ref: Elock)_ — Reference to `Elock` document (e-Lock no).
- **`elock_assign_status`** — `String` _(default: "UNASSIGNED", enum: ["ASSIGNED", "UNASSIGNED", "RETURNED", "NOT RETURNED", "ARCHIVED"])_ — e-Lock assign status. Allowed values: ["ASSIGNED", "UNASSIGNED", "RETURNED", "NOT RETURNED", "ARCHIVED"].
- **`client_call_status`** — `String` _(default: "no", enum: ["yes", "no"])_ — client call status. Allowed values: ["yes", "no"].
- **`billNumber`** — `String` _(default: null)_ — bill Number — identifier/number.
- **`elock_bill_completed`** — `Boolean` _(default: false)_ — e-Lock bill completed.
- **`billGenerationDate`** — `Date` _(default: null)_ — bill Generation Date — date field.
- **`isDummy`** — `Boolean` _(default: false)_ — is Dummy — boolean flag.
- **`goods_pickup`** — `ObjectId` _(ref: Location)_ — Reference to `Location` document (goods pickup).
- **`goods_delivery`** — `ObjectId` _(ref: Location)_ — Reference to `Location` document (goods delivery).
- **`transporter`** — `String` _(default: null)_ — transporter.
- **`uploadedImageUrls`** — `[String]` — uploaded Image Urls.
- **`prepaid`** — `Boolean` _(default: false)_ — prepaid.


### `EwayBill` — collection: **`ewayBills`**

- **Source file:** `./srcc/EwayBill.mjs`
- **Schema variable:** `EwayBillSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 77

**Fields:**

- **`lr`** — `ObjectId` _(ref: PrData)_ — Reference to `PrData` document (LR).
- **`containerId`** — `String` — container ID — identifier/number.
- **`containerIds`** — `[String]` — container Ids.
- **`ewbNo`** — `String` — E-Way Bill No — identifier/number.
- **`ewbDate`** — `String` — E-Way Bill Date — date field.
- **`validUpto`** — `String` — valid Upto.
- **`ewbStatus`** — `String` _(default: "Pending", enum: ["Pending", "Generated", "Cancelled", "Expired", "Rejected"])_ — E-Way Bill Status. Allowed values: ["Pending", "Generated", "Cancelled", "Expired", "Rejected"].
- **`pdfUrl`** — `String` — PDF URL.
- **`userGstin`** — `String` — user GSTIN.
- **`supplyType`** — `String` — supply Type.
- **`subSupplyType`** — `String` — sub Supply Type.
- **`subSupplyDescription`** — `String` — sub Supply Description.
- **`documentType`** — `String` — document Type.
- **`documentNumber`** — `String` — document Number — identifier/number.
- **`documentDate`** — `String` — document Date — date field.
- **`transactionType`** — `Number` — transaction Type.
- **`generatorRole`** — `String` _(default: "consignor", enum: ["consignor", "consignee", "transporter", "unknown"])_ — generator Role.
- **`consignorGstin`** — `String` — consignor GSTIN.
- **`consignorName`** — `String` — consignor Name.
- **`consignorAddress1`** — `String` — consignor Address1 — address text.
- **`consignorAddress2`** — `String` — consignor Address2 — address text.
- **`consignorPlace`** — `String` — consignor Place.
- **`consignorPincode`** — `Number` — consignor Pincode — code value.
- **`consignorState`** — `String` — consignor State.
- **`dispatchFromAddress1`** — `String` — dispatch From Address1 — address text.
- **`dispatchFromPlace`** — `String` — dispatch From Place.
- **`dispatchFromPincode`** — `Number` — dispatch From Pincode — code value.
- **`actualFromState`** — `String` — actual From State.
- **`consigneeGstin`** — `String` — consignee GSTIN.
- **`consigneeName`** — `String` — consignee Name.
- **`consigneeAddress1`** — `String` — consignee Address1 — address text.
- **`consigneeAddress2`** — `String` — consignee Address2 — address text.
- **`consigneePlace`** — `String` — consignee Place.
- **`consigneePincode`** — `Number` — consignee Pincode — code value.
- **`consigneeState`** — `String` — consignee State.
- **`shipToAddress1`** — `String` — ship To Address1 — address text.
- **`shipToPlace`** — `String` — ship To Place.
- **`shipToPincode`** — `Number` — ship To Pincode — code value.
- **`actualToState`** — `String` — actual To State.
- **`itemList`** — [Embedded Object] — Embedded sub-document (array of objects).
  - **`productName`** — `String` — product Name.
  - **`productDescription`** — `String` — product Description.
  - **`hsnCode`** — `String` — HSN Code — code value.
  - **`quantity`** — `Number` — quantity — count/quantity.
  - **`qtyUnit`** — `String` — qty Unit — count/quantity.
  - **`cgstRate`** — `Number` — CGST Rate — numeric amount/value.
  - **`sgstRate`** — `Number` — SGST Rate — numeric amount/value.
  - **`igstRate`** — `Number` — IGST Rate — numeric amount/value.
  - **`cessRate`** — `Number` _(default: 0)_ — Cess Rate — numeric amount/value.
  - **`cessNonAdvol`** — `Number` _(default: 0)_ — Cess Non Advol.
  - **`taxableAmount`** — `Number` — taxable Amount — numeric amount/value.
- **`totalInvoiceValue`** — `Number` — total Invoice Value — numeric amount/value.
- **`taxableAmount`** — `Number` — taxable Amount — numeric amount/value.
- **`cgstAmount`** — `Number` — CGST Amount — numeric amount/value.
- **`sgstAmount`** — `Number` — SGST Amount — numeric amount/value.
- **`igstAmount`** — `Number` — IGST Amount — numeric amount/value.
- **`cessAmount`** — `Number` _(default: 0)_ — Cess Amount — numeric amount/value.
- **`otherValue`** — `Number` _(default: 0)_ — other Value — numeric amount/value.
- **`calculatedAssessableValue`** — `Number` — calculated Assessable Value — numeric amount/value.
- **`transporterId`** — `String` — transporter ID — identifier/number.
- **`transporterName`** — `String` — transporter Name.
- **`transporterDocNumber`** — `String` — transporter Doc Number — identifier/number.
- **`transporterDocDate`** — `String` — transporter Doc Date — date field.
- **`transportationMode`** — `String` — transportation Mode.
- **`transportDistance`** — `Number` — transport Distance.
- **`vehicleNumber`** — `String` — vehicle Number — identifier/number.
- **`vehicleType`** — `String` — vehicle Type.
- **`vehicleUpdateHistory`** — [Embedded Object] — Embedded sub-document (array of objects).
  - **`updatedAt`** — `Date` _(default: Date.now)_ — Timestamp when the document was last updated.
  - **`updatedBy`** — `ObjectId` _(ref: User)_ — Reference to `User` document (updated By).
  - **`oldVehicle`** — `String` — old Vehicle.
  - **`newVehicle`** — `String` — new Vehicle.
  - **`vehicleType`** — `String` — vehicle Type.
  - **`reasonCode`** — `String` — reason Code — code value.
  - **`reasonText`** — `String` — reason Text.
  - **`fromPlace`** — `String` — from Place.
  - **`fromState`** — `String` — from State.
  - **`modeOfTransport`** — `Number` — mode Of Transport.
  - **`transporterDocNo`** — `String` — transporter Doc No — identifier/number.
  - **`transporterDocDate`** — `String` — transporter Doc Date — date field.
  - **`apiResponse`** — `Object` — API Response.
- **`extensionHistory`** — [Embedded Object] — Embedded sub-document (array of objects).
  - **`extendedAt`** — `Date` _(default: Date.now)_ — extended At — timestamp.
  - **`extendedBy`** — `ObjectId` _(ref: User)_ — Reference to `User` document (extended By).
  - **`previousValidUpto`** — `String` — previous Valid Upto.
  - **`newValidUpto`** — `String` — new Valid Upto.
  - **`remainingDistance`** — `Number` — remaining Distance.
  - **`currentPlace`** — `String` — current Place.
  - **`currentState`** — `String` — current State.
  - **`currentPincode`** — `Number` — current Pincode — code value.
  - **`reason`** — `String` — reason.
  - **`remarks`** — `String` — remarks.
  - **`consignmentStatus`** — `String` — consignment Status.
  - **`transitType`** — `String` — transit Type.
  - **`apiResponse`** — `Object` — API Response.
- **`rejectedBy`** — `ObjectId` _(ref: User)_ — Reference to `User` document (rejected By).
- **`rejectedAt`** — `Date` — rejected At — timestamp.
- **`rejectReason`** — `String` — reject Reason.
- **`isPartOfConsolidation`** — `Boolean` _(default: false)_ — is Part Of Consolidation — boolean flag.
- **`consolidatedEwbNo`** — `String` — consolidated E-Way Bill No — identifier/number.
- **`consolidatedWith`** — [Embedded Object] — Embedded sub-document (array of objects).
  - **`ewbNo`** — `String` — E-Way Bill No — identifier/number.
  - **`addedAt`** — `Date` _(default: Date.now)_ — added At — timestamp.
- **`parentConsolidatedEwb`** — `String` — parent Consolidated E-Way Bill — date field.
- **`isMultiVehicle`** — `Boolean` _(default: false)_ — is Multi Vehicle — boolean flag.
- **`multiVehicleGroups`** — [Embedded Object] — Embedded sub-document (array of objects).
  - **`groupNo`** — `String` — group No — identifier/number.
  - **`createdAt`** — `Date` — Timestamp when the document was created.
  - **`createdBy`** — `ObjectId` _(ref: User)_ — Reference to `User` document (created By).
  - **`totalQuantity`** — `Number` — total Quantity — count/quantity.
  - **`unitCode`** — `String` — unit Code — code value.
  - **`placeOfConsignor`** — `String` — place Of Consignor.
  - **`stateOfConsignor`** — `String` — state Of Consignor.
  - **`placeOfConsignee`** — `String` — place Of Consignee.
  - **`stateOfConsignee`** — `String` — state Of Consignee.
- **`multiVehicleGroup`** — Embedded Object — Embedded sub-document (single object).
  - **`groupNo`** — `String` — group No — identifier/number.
  - **`createdAt`** — `Date` — Timestamp when the document was created.
  - **`createdBy`** — `ObjectId` _(ref: User)_ — Reference to `User` document (created By).
  - **`totalQuantity`** — `Number` — total Quantity — count/quantity.
  - **`unitCode`** — `String` — unit Code — code value.
  - **`placeOfConsignor`** — `String` — place Of Consignor.
  - **`stateOfConsignor`** — `String` — state Of Consignor.
  - **`placeOfConsignee`** — `String` — place Of Consignee.
  - **`stateOfConsignee`** — `String` — state Of Consignee.
- **`multiVehicleList`** — [Embedded Object] — Embedded sub-document (array of objects).
  - **`vehicleNumber`** — `String` — vehicle Number — identifier/number.
  - **`quantity`** — `Number` — quantity — count/quantity.
  - **`transporterDocNo`** — `String` — transporter Doc No — identifier/number.
  - **`transporterDocDate`** — `String` — transporter Doc Date — date field.
  - **`modeOfTransport`** — `Number` _(default: 1)_ — mode Of Transport.
  - **`groupNo`** — `String` — group No — identifier/number.
  - **`addedAt`** — `Date` _(default: Date.now)_ — added At — timestamp.
  - **`addedBy`** — `ObjectId` _(ref: User)_ — Reference to `User` document (added By).
  - **`apiResponse`** — `Object` — API Response.
- **`requestPayload`** — `Object` — request Payload.
- **`responseData`** — `Object` — response Data.
- **`generatedBy`** — `ObjectId` _(ref: User)_ — Reference to `User` document (generated By).
- **`generatedAt`** — `Date` — generated At — timestamp.
- **`cancelledBy`** — `ObjectId` _(ref: User)_ — Reference to `User` document (cancelled By).
- **`cancelledAt`** — `Date` — cancelled At — timestamp.
- **`cancelReason`** — `String` — cancel Reason.
- **`lastSyncedAt`** — `Date` — last Synced At — timestamp.


### `EwayBillErrorLog` — collection: **`ewayBillErrorLogs`**

- **Source file:** `./srcc/Ewaybillerrorlog.mjs`
- **Schema variable:** `EwayBillErrorLogSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 14

**Fields:**

- **`errorMessage`** — `String` _(required)_ — error Message.
- **`errorCode`** — `String` — error Code — code value.
- **`errorDetails`** — `Object` — error Details.
- **`requestPayload`** — `Object` — request Payload.
- **`requestEndpoint`** — `String` — request Endpoint.
- **`validationErrors`** — [Embedded Object] — Embedded sub-document (array of objects).
  - **`field`** — `String` — field.
  - **`message`** — `String` — message.
- **`createdBy`** — `ObjectId` _(ref: User)_ — Reference to `User` document (created By).
- **`ipAddress`** — `String` — IP Address — address text.
- **`userAgent`** — `String` — user Agent.
- **`relatedEwayBill`** — `ObjectId` _(ref: EwayBill)_ — Reference to `EwayBill` document (related Eway Bill).
- **`resolved`** — `Boolean` _(default: false)_ — resolved.
- **`resolvedAt`** — `Date` — resolved At — timestamp.
- **`resolvedBy`** — `ObjectId` _(ref: User)_ — Reference to `User` document (resolved By).
- **`resolutionNotes`** — `String` — resolution Notes.


### `ContainerType` — collection: **`containerTypes`**

- **Source file:** `./srcc/containerType.mjs`
- **Schema variable:** `containerTypeSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 11

**Fields:**

- **`container_type`** — `String` _(required)_ — container type.
- **`iso_code`** — `String` _(required, unique)_ — iso code — boolean flag.
- **`teu`** — `Number` _(required)_ — teu.
- **`outer_dimension`** — Embedded Object — Embedded sub-document (single object).
  - **`length`** — `Number` _(required)_ — length.
  - **`breadth`** — `Number` _(required)_ — breadth.
  - **`height`** — `Number` _(required)_ — height.
  - **`unit`** — `ObjectId` _(required, ref: UnitMeasurement)_ — Reference to `UnitMeasurement` document (unit).
- **`cubic_capacity`** — Embedded Object — Embedded sub-document (single object).
  - **`capacity`** — `Number` _(required)_ — capacity.
  - **`unit`** — `ObjectId` _(required, ref: UnitMeasurement)_ — Reference to `UnitMeasurement` document (unit).
- **`tare_weight`** — Embedded Object — Embedded sub-document (single object).
  - **`value`** — `Number` _(required)_ — value — numeric amount/value.
  - **`unit`** — `ObjectId` _(required, ref: UnitMeasurement)_ — Reference to `UnitMeasurement` document (unit).
- **`payload`** — Embedded Object — Embedded sub-document (single object).
  - **`value`** — `Number` _(required)_ — value — numeric amount/value.
  - **`unit`** — `ObjectId` _(required, ref: UnitMeasurement)_ — Reference to `UnitMeasurement` document (unit).
- **`is_temp_controlled`** — `Boolean` _(default: false)_ — is temp controlled — boolean flag.
- **`is_tank_container`** — `Boolean` _(default: false)_ — is tank container — boolean flag.
- **`size`** — `String` _(required, enum: ["10", "20", "40", "45"])_ — size.
- **`createdBy`** — `ObjectId` _(ref: User)_ — Reference to `User` document (created By).


### `DispatchException` — collection: **`dispatchExceptions`**

- **Source file:** `./srcc/dispatchException.mjs`
- **Schema variable:** `DispatchExceptionSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 7

**Fields:**

- **`date`** — `Date` _(required)_ — date — date field.
- **`tr_no`** — `String` _(required)_ — tr no — identifier/number.
- **`container_no`** — `String` — container no — identifier/number.
- **`vehicle_no`** — `String` — vehicle no — identifier/number.
- **`exception_remark`** — `String` _(required)_ — exception remark.
- **`reason`** — `String` — reason.
- **`createdBy`** — `String` — created By — user/actor who performed this action.


### `DriverDetails` — collection: **`driverDetailses`**

- **Source file:** `./srcc/driverDetails.mjs`
- **Schema variable:** `driverDetailsSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 10

**Fields:**

- **`driver_name`** — `String` — driver name.
- **`driver_address`** — `String` — driver address — address text.
- **`driver_phone`** — `String` — driver phone — phone/contact number.
- **`driver_license`** — `String` — driver license.
- **`license_validity`** — `String` — license validity.
- **`joining_date`** — `String` — joining date — date field.
- **`blood_group`** — `String` — blood group.
- **`driver_photo`** — `String` — driver photo.
- **`license_photo`** — `[String]` — license photo.
- **`createdBy`** — `ObjectId` _(ref: User)_ — Reference to `User` document (created By).


### `engineOilDistribution` — collection: **`engineOilDistributions`**

- **Source file:** `./srcc/engineOilDistribution.mjs`
- **Schema variable:** `engineOilDistributionSchema`
- **Timestamps:** not set by schema options (may still have manual createdAt/updatedAt fields below)
- **Top-level field count:** 6

**Fields:**

- **`quantity`** — `Number` — quantity — count/quantity.
- **`driver`** — `String` — driver.
- **`date`** — `String` — date — date field.
- **`truck_no`** — `String` — truck no — identifier/number.
- **`odometer`** — `Number` — odometer.
- **`location`** — `String` — location.


### `engineOilStock` — collection: **`engineOilStocks`**

- **Source file:** `./srcc/engineOilStock.mjs`
- **Schema variable:** `engineOilStockSchema`
- **Timestamps:** not set by schema options (may still have manual createdAt/updatedAt fields below)
- **Top-level field count:** 1

**Fields:**

- **`quantity`** — `Number` _(default: 0)_ — quantity — count/quantity.


### `LocationMaster` — collection: **`locationMasters`**

- **Source file:** `./srcc/locationMaster.mjs`
- **Schema variable:** `locationMasterSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 4

**Fields:**

- **`location`** — `String` — location.
- **`district`** — `String` — district.
- **`area`** — [Embedded Object] — Embedded sub-document (array of objects).
  - **`area`** — `String` — area.
  - **`pincode`** — `String` — pincode — code value.
- **`createdBy`** — `ObjectId` _(ref: User)_ — Reference to `User` document (created By).


### `PlyRatings` — collection: **`plyRatingses`**

- **Source file:** `./srcc/plyRatings.mjs`
- **Schema variable:** `plyRatingSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 2

**Fields:**

- **`ply_rating`** — `String` — ply rating.
- **`createdBy`** — `ObjectId` _(ref: User)_ — Reference to `User` document (created By).


### `PrData` — collection: **`prDatas`**

- **Source file:** `./srcc/pr.mjs`
- **Schema variable:** `PrDataSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 28

**Fields:**

- **`pr_no`** — `String` — Purchase Request no — identifier/number.
- **`pr_date`** — `String` — Purchase Request date — date field.
- **`import_export`** — `String` — import export.
- **`branch`** — `Mixed` _(ref: PortICDcode)_ — Reference to `PortICDcode` document (branch).
- **`consignor`** — `ObjectId` _(ref: Organisation)_ — Reference to `Organisation` document (consignor).
- **`consignee`** — `ObjectId` _(ref: Organisation)_ — Reference to `Organisation` document (consignee).
- **`invoice_party`** — `ObjectId` _(ref: Organisation)_ — Reference to `Organisation` document (invoice party).
- **`container_type`** — `ObjectId` _(ref: ContainerType)_ — Reference to `ContainerType` document (container type).
- **`container_count`** — `String` — container count — count/quantity.
- **`gross_weight`** — `String` — gross weight.
- **`type_of_vehicle`** — `ObjectId` _(ref: VehicleType)_ — Reference to `VehicleType` document (type of vehicle).
- **`no_of_vehicle`** — `String` — no of vehicle.
- **`description`** — `String` — description.
- **`shipping_line`** — `ObjectId` _(ref: ShippingLine)_ — Reference to `ShippingLine` document (shipping line).
- **`container_loading`** — `ObjectId` _(ref: PortICDcode)_ — Reference to `PortICDcode` document (container loading).
- **`container_offloading`** — `ObjectId` _(ref: PortICDcode)_ — Reference to `PortICDcode` document (container offloading).
- **`do_validity`** — `String` — do validity.
- **`be_no`** — `String` — Bill of Entry no — identifier/number.
- **`do_revalidity`** — [Embedded Object] — Embedded sub-document (array of objects).
  - **`date`** — `Date` — date — date field.
  - **`cha`** — `ObjectId` _(ref: Organisation)_ — Reference to `Organisation` document (CHA).
- **`instructions`** — `String` — instructions.
- **`document_no`** — `String` — document no — identifier/number.
- **`document_date`** — `String` — document date — date field.
- **`goods_pickup`** — `ObjectId` _(ref: Location)_ — Reference to `Location` document (goods pickup).
- **`goods_delivery`** — `ObjectId` _(ref: Location)_ — Reference to `Location` document (goods delivery).
- **`suffix`** — `String` — suffix.
- **`prefix`** — `String` — prefix.
- **`containers`** — [Embedded Object] — Embedded sub-document (array of objects).
  - **`tr_no`** — `String` — tr no — identifier/number.
  - **`container_number`** — `String` — container number — identifier/number.
  - **`seal_no`** — `String` — seal no — identifier/number.
  - **`gross_weight`** — `String` — gross weight.
  - **`tare_weight`** — `String` — tare weight.
  - **`net_weight`** — `String` — net weight.
  - **`goods_pickup`** — `ObjectId` _(ref: Location)_ — Reference to `Location` document (goods pickup).
  - **`goods_delivery`** — `ObjectId` _(ref: Location)_ — Reference to `Location` document (goods delivery).
  - **`own_hired`** — `String` — own hired.
  - **`type_of_vehicle`** — `ObjectId` _(ref: VehicleType)_ — Reference to `VehicleType` document (type of vehicle).
  - **`vehicle_no`** — `String` — vehicle no — identifier/number.
  - **`driver_name`** — `String` — driver name.
  - **`assigned_driver_id`** — `ObjectId` _(ref: DriverType)_ — Reference to `DriverType` document (assigned driver ID).
  - **`driver_phone`** — `String` — driver phone — phone/contact number.
  - **`eWay_bill`** — `String` — e Way bill.
  - **`ewaybillvalidUpto`** — `Date` — ewaybillvalid Upto.
  - **`ewaybillLastChecked`** — `Date` — ewaybill Last Checked.
  - **`ewaybillStatus`** — Embedded Object — Embedded sub-document (single object).
    - **`state`** — `String` _(default: "not-checked", enum: ["valid", "expiring-soon", "expired", "error", "not-checked", "PART_A"])_ — state.
    - **`errorMessage`** — `String` — error Message.
    - **`lastApiResponse`** — `Mixed` — last API Response.
  - **`ewaybillalertstop`** — `Boolean` _(default: false)_ — ewaybillalertstop.
  - **`isOccupied`** — `Boolean` — is Occupied — boolean flag.
  - **`isEmailSent`** — `Boolean` _(default: false)_ — is Email Sent — boolean flag.
  - **`sr_cel_no`** — `String` — sr cel no — identifier/number.
  - **`sr_cel_FGUID`** — `String` — sr cel FGUID — identifier/number.
  - **`sr_cel_id`** — `String` — sr cel ID — identifier/number.
  - **`elock_no`** — `ObjectId` _(ref: Elock)_ — Reference to `Elock` document (e-Lock no).
  - **`tracking_status`** — `ObjectId` _(ref: LrTrackingStages)_ — Reference to `LrTrackingStages` document (tracking status).
  - **`tracking_status_date`** — `Date` _(default: null)_ — tracking status date.
  - **`tracking_status_history`** — `[TrackingHistorySchema]` _(default: [])_ — tracking status history.
  - **`elock_assign_status`** — `String` _(default: "UNASSIGNED", enum: ["ASSIGNED", "UNASSIGNED", "RETURNED", "NOT RETURNED", "ARCHIVED"])_ — e-Lock assign status. Allowed values: ["ASSIGNED", "UNASSIGNED", "RETURNED", "NOT RETURNED", "ARCHIVED"].
  - **`uploadedImageUrls`** — `[String]` — uploaded Image Urls.
  - **`client_call_status`** — `String` _(default: "no", enum: ["yes", "no"])_ — client call status. Allowed values: ["yes", "no"].
  - **`billNumber`** — `String` _(default: null)_ — bill Number — identifier/number.
  - **`freight_vendor_name`** — `ObjectId` _(ref: Organisation)_ — Reference to `Organisation` document (freight vendor name).
  - **`vendor_inv_no`** — `String` — vendor inv no — identifier/number.
  - **`vendor_inv_date`** — `Date` — vendor inv date — date field.
  - **`elock_bill_completed`** — `Boolean` _(default: false)_ — e-Lock bill completed.
  - **`billGenerationDate`** — `Date` _(default: null)_ — bill Generation Date — date field.
  - **`isDummy`** — `Boolean` _(default: false)_ — is Dummy — boolean flag.
  - **`lr_completed`** — `Boolean` _(default: false)_ — LR completed.
  - **`offloading_remark`** — `String` _(default: "")_ — offloading remark.
  - **`invoice_instruction`** — `String` _(default: "")_ — invoice instruction.
  - **`offloading_date_time`** — `Date` — offloading date time — date field.
  - **`detention_days`** — `Number` — detention days.
  - **`reason_of_detention`** — `String` — reason of detention.
  - **`tipping`** — `Boolean` — tipping.
  - **`document_attachment`** — `[String]` — document attachment.
  - **`actual_container_offloading`** — `ObjectId` _(ref: PortICDcode)_ — Reference to `PortICDcode` document (actual container offloading).
  - **`outward_ref_number`** — `String` _(default: null)_ — outward ref number — identifier/number.
  - **`outward_outdate`** — `Date` _(default: null)_ — outward outdate — date field.
  - **`outward_attachment`** — `[String]` _(default: [])_ — outward attachment.
  - **`outward_approve`** — `Boolean` _(default: false)_ — outward approve.
  - **`outward_status`** — `String` _(default: "PENDING", enum: ["PENDING", "ACKNOWLEDGE", "REJECTED", "COMPLETED"])_ — outward status. Allowed values: ["PENDING", "ACKNOWLEDGE", "REJECTED", "COMPLETED"].
  - **`lr_outward_status_history`** — `[OutwardStatusHistorySchema]` _(default: [])_ — LR outward status history.
  - **`outward_details`** — [Embedded Object] _(default: [])_ — Embedded sub-document (array of objects).
  - **`lr_do_validity`** — `Date` _(default: null)_ — LR do validity.
  - **`do_validity_snapshot`** — `Date` _(default: null)_ — do validity snapshot.
  - **`do_revalidity`** — [Embedded Object] — Embedded sub-document (array of objects).
    - **`date`** — `Date` — date — date field.
    - **`cha`** — `ObjectId` _(ref: Organisation)_ — Reference to `Organisation` document (CHA).
  - **`lr_date`** — `Date` _(default: null)_ — LR date — date field.
  - **`tr_createdAt`** — `Date` _(default: null)_ — tr created At — timestamp.
  - **`createdBy`** — `ObjectId` _(ref: User)_ — Reference to `User` document (created By).
  - **`dispatchClosedDate`** — `Date` _(default: null)_ — dispatch Closed Date — date field.
- **`status`** — `String` — status.


### `Pr` — collection: **`prs`**

- **Source file:** `./srcc/prModel.mjs`
- **Schema variable:** `prSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 4

**Fields:**

- **`pr_no`** — `String` _(required)_ — Purchase Request no — identifier/number.
- **`year`** — `String` _(required)_ — year.
- **`branch_code`** — `String` _(required)_ — branch code — code value.
- **`pr_no_complete`** — `String` _(required)_ — Purchase Request no complete.


### `RepairTypes` — collection: **`repairTypeses`**

- **Source file:** `./srcc/repairTypes.mjs`
- **Schema variable:** `repairTypeSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 2

**Fields:**

- **`repair_type`** — `String` — repair type.
- **`createdBy`** — `ObjectId` _(ref: User)_ — Reference to `User` document (created By).


### `Rto` — collection: **`rtos`**

- **Source file:** `./srcc/rtoModel.mjs`
- **Schema variable:** `rtoSchema`
- **Timestamps:** not set by schema options (may still have manual createdAt/updatedAt fields below)
- **Top-level field count:** 24

**Fields:**

- **`truck_no`** — `String` — truck no — identifier/number.
- **`fitness_document`** — `String` — fitness document.
- **`fitness_document_expiry_date`** — `String` — fitness document expiry date — date field.
- **`inspection_due_date`** — `String` — inspection due date — date field.
- **`mv_tax`** — `String` — mv tax.
- **`mv_tax_date`** — `String` — mv tax date — date field.
- **`insurance_expiry_date`** — `String` — insurance expiry date — date field.
- **`puc_expiry_date`** — `String` — puc expiry date — date field.
- **`goods_permit_no`** — `String` — goods permit no — identifier/number.
- **`goods_permit_validity_date`** — `String` — goods permit validity date — date field.
- **`national_permit_no`** — `String` — national permit no — identifier/number.
- **`national_permit_validity_date`** — `String` — national permit validity date — date field.
- **`hp`** — `String` — hp.
- **`hp_financer_name`** — `String` — hp financer name.
- **`number_plate`** — `String` — number plate.
- **`supd`** — `String` — supd.
- **`fitness_document_photo`** — `String` — fitness document photo.
- **`mv_tax_photo`** — `String` — mv tax photo.
- **`insurance_photo`** — `String` — insurance photo.
- **`puc_photo`** — `String` — puc photo.
- **`goods_permit_photo`** — `String` — goods permit photo.
- **`national_permit_photo`** — `String` — national permit photo.
- **`rc_front_photo`** — `String` — rc front photo.
- **`rc_rear_photo`** — `String` — rc rear photo.


### `Tr` — collection: **`trs`**

- **Source file:** `./srcc/trModel.mjs`
- **Schema variable:** `trSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 4

**Fields:**

- **`tr_no`** — `String` _(required)_ — tr no — identifier/number.
- **`year`** — `String` _(required)_ — year.
- **`branch_code`** — `String` _(required)_ — branch code — code value.
- **`tr_no_complete`** — `String` _(required)_ — tr no complete.


### `TypeOfVehicle` — collection: **`typeOfVehicles`**

- **Source file:** `./srcc/typeOfVehicle.mjs`
- **Schema variable:** `typeOfVehicleSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 2

**Fields:**

- **`type_of_vehicle`** — `String` — type of vehicle.
- **`createdBy`** — `ObjectId` _(ref: User)_ — Reference to `User` document (created By).


### `TyreBrands` — collection: **`tyreBrandses`**

- **Source file:** `./srcc/tyreBrand.mjs`
- **Schema variable:** `tyreBrandSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 4

**Fields:**

- **`tyre_brand`** — `String` — tyre brand.
- **`make`** — `String` — make.
- **`description`** — `String` — description.
- **`createdBy`** — `ObjectId` _(ref: User)_ — Reference to `User` document (created By).


### `Tyre` — collection: **`tyres`**

- **Source file:** `./srcc/tyreModel.mjs`
- **Schema variable:** `tyreSchema`
- **Timestamps:** not set by schema options (may still have manual createdAt/updatedAt fields below)
- **Top-level field count:** 20

**Fields:**

- **`tyre_no`** — `String` — tyre no — identifier/number.
- **`vendor_name`** — `String` — vendor name.
- **`vendor_address`** — `String` — vendor address — address text.
- **`vendor_phone`** — `String` — vendor phone — phone/contact number.
- **`bill_no`** — `String` — bill no — identifier/number.
- **`bill_date`** — `String` — bill date — date field.
- **`warranty_date`** — `String` — warranty date — date field.
- **`tyre_brand`** — `String` — tyre brand.
- **`tyre_model`** — `String` — tyre model.
- **`tyre_type`** — `String` — tyre type.
- **`tyre_size`** — `String` — tyre size.
- **`ply_rating`** — `String` — ply rating.
- **`blast_truck_no`** — `String` — blast truck no — identifier/number.
- **`blast_date`** — `String` — blast date — date field.
- **`blast_driver`** — `String` — blast driver.
- **`blast_odometer`** — `String` — blast odometer.
- **`blast_remarks`** — `String` — blast remarks.
- **`blast_images`** — `[String]` — blast images.
- **`tyre_invoice_image`** — `String` — tyre invoice image.
- **`trucks`** — [Embedded Object] — Embedded sub-document (array of objects).
  - **`truck_no`** — `String` — truck no — identifier/number.
  - **`location`** — `String` — location.
  - **`fitting_date`** — `String` — fitting date — date field.
  - **`removal_date`** — `String` — removal date — date field.
  - **`fitting_date_odometer`** — `String` — fitting date odometer — date field.
  - **`removal_date_odometer`** — `String` — removal date odometer — date field.
  - **`_fitting_date_added`** — `String` —  fitting date added — date field.
  - **`repairs`** — [Embedded Object] — Embedded sub-document (array of objects).
    - **`bill_no`** — `String` — bill no — identifier/number.
    - **`bill_date`** — `String` — bill date — date field.
    - **`amount`** — `String` — amount — numeric amount/value.
    - **`repair_type`** — `String` — repair type.
    - **`repair_date_odometer`** — `String` — repair date odometer — date field.
    - **`tyre_repair_invoice_images`** — `[String]` — tyre repair invoice images.
    - **`vendor`** — `String` — vendor.
    - **`_repair_date_added`** — `String` —  repair date added — date field.
  - **`retreading`** — [Embedded Object] — Embedded sub-document (array of objects).
    - **`retreading_date`** — `String` — retreading date — date field.
    - **`amount`** — `String` — amount — numeric amount/value.
    - **`retreading_date_odometer`** — `String` — retreading date odometer — date field.
    - **`vendor`** — `String` — vendor.
    - **`tread_pattern`** — `String` — tread pattern.
    - **`tyre_retreading_invoice_images`** — `[String]` — tyre retreading invoice images.
    - **`_retreading_date_added`** — `String` —  retreading date added — date field.
  - **`drivers`** — [Embedded Object] — Embedded sub-document (array of objects).
    - **`driver_name`** — `String` — driver name.
    - **`driver_address`** — `String` — driver address — address text.
    - **`driver_phone`** — `String` — driver phone — phone/contact number.
    - **`driver_license`** — `String` — driver license.
    - **`license_validity`** — `String` — license validity.
    - **`assign_date`** — `String` — assign date — date field.
    - **`assign_date_odometer`** — `String` — assign date odometer — date field.
    - **`_driver_assign_date_added`** — `String` —  driver assign date added — date field.


### `TyreModels` — collection: **`tyreModelses`**

- **Source file:** `./srcc/tyreModels.mjs`
- **Schema variable:** `tyreModelSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 4

**Fields:**

- **`tyre_brand`** — `String` — tyre brand.
- **`tyre_model`** — `String` — tyre model.
- **`description`** — `String` — description.
- **`createdBy`** — `ObjectId` _(ref: User)_ — Reference to `User` document (created By).


### `TyreSizes` — collection: **`tyreSizeses`**

- **Source file:** `./srcc/tyreSizes.mjs`
- **Schema variable:** `tyreSizeSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 2

**Fields:**

- **`tyre_size`** — `String` — tyre size.
- **`createdBy`** — `ObjectId` _(ref: User)_ — Reference to `User` document (created By).


### `TyreTypes` — collection: **`tyreTypeses`**

- **Source file:** `./srcc/tyreTypes.mjs`
- **Schema variable:** `tyreTypeSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 2

**Fields:**

- **`tyre_type`** — `String` — tyre type.
- **`createdBy`** — `ObjectId` _(ref: User)_ — Reference to `User` document (created By).


### `Vehicles` — collection: **`vehicleses`**

- **Source file:** `./srcc/vehicleModel.mjs`
- **Schema variable:** `vehicleSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 10

**Fields:**

- **`truck_no`** — `String` — truck no — identifier/number.
- **`type_of_vehicle`** — `String` — type of vehicle.
- **`max_tyres`** — `String` — max tyres.
- **`units`** — `String` — units.
- **`drivers`** — [Embedded Object] — Embedded sub-document (array of objects).
  - **`driver_name`** — `String` — driver name.
  - **`driver_address`** — `String` — driver address — address text.
  - **`driver_phone`** — `String` — driver phone — phone/contact number.
  - **`driver_license`** — `String` — driver license.
  - **`license_validity`** — `String` — license validity.
  - **`assign_date`** — `String` — assign date — date field.
  - **`assign_date_odometer`** — `String` — assign date odometer — date field.
- **`tyres`** — [Embedded Object] — Embedded sub-document (array of objects).
  - **`tyre_no`** — `String` — tyre no — identifier/number.
  - **`location`** — `String` — location.
  - **`fitting_date`** — `String` — fitting date — date field.
  - **`fitting_date_odometer`** — `String` — fitting date odometer — date field.
  - **`withdrawal_date`** — `String` — withdrawal date — date field.
  - **`withdrawal_date_odometer`** — `String` — withdrawal date odometer — date field.
- **`rto`** — Embedded Object — Embedded sub-document (single object).
  - **`inspection_due_date`** — `String` — inspection due date — date field.
  - **`mv_tax`** — `String` — mv tax.
  - **`mv_tax_date`** — `String` — mv tax date — date field.
  - **`insurance_expiry_date`** — `String` — insurance expiry date — date field.
  - **`puc_expiry_date`** — `String` — puc expiry date — date field.
  - **`goods_permit_no`** — `String` — goods permit no — identifier/number.
  - **`goods_permit_validity_date`** — `String` — goods permit validity date — date field.
  - **`national_permit_no`** — `String` — national permit no — identifier/number.
  - **`national_permit_validity_date`** — `String` — national permit validity date — date field.
  - **`hp`** — `String` — hp.
  - **`hp_financer_name`** — `String` — hp financer name.
  - **`number_plate`** — `String` — number plate.
  - **`supd`** — `String` — supd.
  - **`mv_tax_photo`** — `[String]` — mv tax photo.
  - **`insurance_photo`** — `[String]` — insurance photo.
  - **`puc_photo`** — `[String]` — puc photo.
  - **`goods_permit_photo`** — `[String]` — goods permit photo.
  - **`national_permit_photo`** — `[String]` — national permit photo.
  - **`rc_front_photo`** — `[String]` — rc front photo.
  - **`rc_rear_photo`** — `[String]` — rc rear photo.
- **`challans`** — [Embedded Object] — Embedded sub-document (array of objects).
  - **`challan_no`** — `String` — challan no — identifier/number.
  - **`challan_date`** — `String` — challan date — date field.
  - **`challan_amount`** — `Number` — challan amount — numeric amount/value.
  - **`challan_driver_contact`** — `String` — challan driver contact — phone/contact number.
  - **`challan_reason`** — `String` — challan reason.
  - **`challan_location`** — `String` — challan location.
  - **`challan_document`** — `[String]` — challan document.
- **`accidents`** — [Embedded Object] — Embedded sub-document (array of objects).
  - **`third_party_vehicle_no`** — `String` — third party vehicle no — identifier/number.
  - **`date`** — `String` — date — date field.
  - **`time`** — `String` — time.
  - **`driver_name`** — `String` — driver name.
  - **`opposite_party_name`** — `String` — opposite party name.
  - **`vehicle_type`** — `String` — vehicle type.
  - **`insured`** — `String` — insured.
  - **`location`** — `String` — location.
  - **`settlement_amount`** — `Number` — settlement amount — numeric amount/value.
  - **`remarks`** — `String` — remarks.
  - **`image`** — `[String]` — image.
- **`createdBy`** — `ObjectId` _(ref: User)_ — Reference to `User` document (created By).


### `Vendors` — collection: **`vendorses`**

- **Source file:** `./srcc/vendors.mjs`
- **Schema variable:** `vendorSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 4

**Fields:**

- **`vendor_name`** — `String` — vendor name.
- **`vendor_address`** — `String` — vendor address — address text.
- **`vendor_phone`** — `String` — vendor phone — phone/contact number.
- **`createdBy`** — `ObjectId` _(ref: User)_ — Reference to `User` document (created By).


## Module: `server/model/srcc/Directory_Management/`


### `AdvanceToDriver` — collection: **`advanceToDrivers`**

- **Source file:** `./srcc/Directory_Management/AdvanceToDriver.mjs`
- **Schema variable:** `AdvanceToDriverSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 14

**Fields:**

- **`startingLocation`** — `ObjectId` _(required, ref: Location)_ — Reference to `Location` document (starting Location).
- **`destinationLocation`** — `ObjectId` _(required, ref: Location)_ — Reference to `Location` document (destination Location).
- **`returnLocation`** — `ObjectId` _(required, ref: Location)_ — Reference to `Location` document (return Location).
- **`vehicleType`** — `ObjectId` _(ref: VehicleType)_ — Reference to `VehicleType` document (vehicle Type).
- **`loadVehicleKms`** — `Number` _(required)_ — load Vehicle Kms.
- **`emptyVehicleKms`** — `Number` _(required)_ — empty Vehicle Kms.
- **`loadVehicleMileage`** — `Number` _(required)_ — load Vehicle Mileage.
- **`emptyVehicleMileage`** — `Number` _(required)_ — empty Vehicle Mileage.
- **`loadingExtraFuelVolume`** — `Number` _(required)_ — loading Extra Fuel Volume.
- **`unloadingExtraFuelVolume`** — `Number` _(required)_ — unloading Extra Fuel Volume.
- **`totalRequiredFuelVolume`** — `Number` _(required)_ — total Required Fuel Volume.
- **`fuelRate`** — `Number` _(required)_ — fuel Rate — numeric amount/value.
- **`cash`** — `Number` _(required)_ — cash.
- **`totalAdvancePayableAmount`** — `Number` _(required)_ — total Advance Payable Amount — numeric amount/value.


### `CVCategoryDirectory` — collection: **`cVCategoryDirectories`**

- **Source file:** `./srcc/Directory_Management/CVCategoryDirectory.mjs`
- **Schema variable:** `cvCategorySchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 4

**Fields:**

- **`categoryName`** — `String` _(required, unique)_ — category Name.
- **`description`** — `String` — description.
- **`createdBy`** — `ObjectId` _(required, ref: User)_ — Reference to `User` document (created By).
- **`updatedBy`** — `ObjectId` _(ref: User)_ — Reference to `User` document (updated By).


### `CommodityCode` — collection: **`commodityCodes`**

- **Source file:** `./srcc/Directory_Management/Commodity.mjs`
- **Schema variable:** `CommoditySchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 3

**Fields:**

- **`name`** — `String` _(required)_ — name.
- **`hsn_code`** — `String` — HSN code — code value.
- **`description`** — `String` _(required)_ — description.


### `Distributor` — collection: **`distributors`**

- **Source file:** `./srcc/Directory_Management/Distributor.mjs`
- **Schema variable:** `DistributorSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 8

**Fields:**

- **`distributor_name`** — `String` _(required)_ — distributor name.
- **`company_name`** — `String` _(required)_ — company name.
- **`elocks_assigned`** — `Number` _(required, default: 0)_ — elocks assigned.
- **`software_provided`** — `Boolean` _(required, default: false)_ — software provided.
- **`start_date`** — `Date` _(required)_ — start date — date field.
- **`end_date`** — `Date` _(required)_ — end date — date field.
- **`total_price`** — `Number` _(required, default: 0)_ — total price — numeric amount/value.
- **`location_port`** — `ObjectId` _(default: null, ref: PortICDcode)_ — Reference to `PortICDcode` document (location port).


### `DriverType` — collection: **`driverTypes`**

- **Source file:** `./srcc/Directory_Management/Driver.mjs`
- **Schema variable:** `DriverSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 33

**Fields:**

- **`name`** — `String` _(required)_ — name.
- **`alias`** — `String` _(required)_ — alias.
- **`photoUpload`** — `[String]` — photo Upload.
- **`licenseUpload`** — `[String]` — license Upload.
- **`licenseNumber`** — `String` _(required, unique)_ — license Number — identifier/number.
- **`licenseIssueAuthority`** — `String` _(required)_ — license Issue Authority.
- **`licenseIssueDate`** — `String` _(required)_ — license Issue Date — date field.
- **`licenseExpiryDate`** — `String` _(required)_ — license Expiry Date — date field.
- **`phoneNumber`** — `String` _(required)_ — phone Number — identifier/number.
- **`alternateNumber`** — `String` — alternate Number — identifier/number.
- **`residentialAddress`** — `String` _(required)_ — residential Address — address text.
- **`permanentAddress`** — `String` — permanent Address — address text.
- **`sameAsPermanentAddress`** — `Boolean` _(default: false)_ — same As Permanent Address — address text.
- **`employeeId`** — `String` _(unique)_ — employee ID — identifier/number.
- **`branch`** — `ObjectId` _(ref: PortICDcode)_ — Reference to `PortICDcode` document (branch).
- **`bloodGroup`** — `String` _(enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"])_ — blood Group.
- **`emergencyContact`** — Embedded Object — Embedded sub-document (single object).
  - **`name`** — `String` — name.
  - **`relation`** — `String` — relation.
  - **`mobile`** — `String` — mobile — phone/contact number.
- **`documents`** — Embedded Object — Embedded sub-document (single object).
  - **`aadhaarCard`** — `[String]` — aadhaar Card.
  - **`bankPassbook`** — `[String]` — bank Passbook.
  - **`voterId`** — `[String]` — voter ID — identifier/number.
  - **`references`** — [Embedded Object] — Embedded sub-document (array of objects).
- **`joiningDate`** — `Date` — joining Date — date field.
- **`joinLeaveLogs`** — [Embedded Object] — Embedded sub-document (array of objects).
  - **`joinDate`** — `Date` _(required)_ — join Date — date field.
  - **`leaveDate`** — `Date` — leave Date — date field.
  - **`reason`** — `String` — reason.
- **`employmentType`** — `String` _(default: "Contract", enum: ["Permanent", "Contract"])_ — employment Type.
- **`reportingManager`** — `String` — reporting Manager.
- **`referredBy`** — `ObjectId` _(ref: DriverType)_ — Reference to `DriverType` document (referred By).
- **`socialSecurity`** — Embedded Object — Embedded sub-document (single object).
  - **`pfNumber`** — `String` — pf Number — identifier/number.
  - **`esicNumber`** — `String` — esic Number — identifier/number.
  - **`notApplicable`** — `Boolean` _(default: false)_ — not Applicable.
- **`insurance`** — Embedded Object — Embedded sub-document (single object).
  - **`accident`** — Embedded Object — Embedded sub-document (single object).
    - **`policyNumber`** — `String` — policy Number — identifier/number.
    - **`provider`** — `String` — provider.
    - **`validityDate`** — `String` — validity Date — date field.
    - **`providerContactNumber`** — `String` — provider Contact Number — identifier/number.
  - **`life`** — Embedded Object — Embedded sub-document (single object).
    - **`policyNumber`** — `String` — policy Number — identifier/number.
    - **`provider`** — `String` — provider.
    - **`validityDate`** — `String` — validity Date — date field.
    - **`providerContactNumber`** — `String` — provider Contact Number — identifier/number.
  - **`medical`** — Embedded Object — Embedded sub-document (single object).
    - **`policyNumber`** — `String` — policy Number — identifier/number.
    - **`provider`** — `String` — provider.
    - **`validityDate`** — `String` — validity Date — date field.
    - **`providerContactNumber`** — `String` — provider Contact Number — identifier/number.
- **`familyDetails`** — [Embedded Object] — Embedded sub-document (array of objects).
  - **`name`** — `String` — name.
  - **`relation`** — `String` — relation.
  - **`age`** — `Number` — age.
  - **`workingStatus`** — `String` _(enum: ["Working", "Non-Working"])_ — working Status. Allowed values: ["Working", "Non-Working"].
  - **`aadhaarNo`** — `String` — aadhaar No — identifier/number.
  - **`contactNo`** — `String` — contact No — identifier/number.
- **`governmentSchemes`** — Embedded Object — Embedded sub-document (single object).
  - **`enrolled`** — `Boolean` _(default: false)_ — enrolled.
  - **`schemes`** — [Embedded Object] — Embedded sub-document (array of objects).
    - **`schemeName`** — `String` _(enum: [
              "PM Jan Dhan Yojana",
              "Ayushman Bharat",
              "PMSBY",
              "PMJJBY",
              "E-Shram",
            ])_ — scheme Name.
    - **`schemeId`** — `String` — scheme ID — identifier/number.
  - **`sarathiCategory`** — `String` _(enum: ["S1", "S2", "S3", "S4", "S5"])_ — sarathi Category.
- **`drivingVehicleTypes`** — `[ObjectId]` _(ref: VehicleType)_ — Reference to `VehicleType` document (driving Vehicle Types).
- **`drivingExperience`** — `String` _(required)_ — driving Experience.
- **`remarks`** — `String` — remarks.
- **`isAssigned`** — `Boolean` _(default: false)_ — is Assigned — boolean flag.
- **`isActive`** — `Boolean` _(default: true)_ — is Active — boolean flag.
- **`notes`** — `[NoteSchema]` — notes.


### `Elock` — collection: **`elocks`**

- **Source file:** `./srcc/Directory_Management/Elock.mjs`
- **Schema variable:** `ElockSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 2

**Fields:**

- **`FAssetID`** — `String` _(required, unique)_ — FAsset ID — identifier/number.
- **`status`** — `String` _(enum: ["AVAILABLE", "ASSIGNED", "MAINTENANCE", "LOST",])_ — status. Allowed values: ["AVAILABLE", "ASSIGNED", "MAINTENANCE", "LOST",].


### `ElockAssignLimit` — collection: **`elockAssignLimits`**

- **Source file:** `./srcc/Directory_Management/ElockAssignLimitModel.mjs`
- **Schema variable:** `ElockAssignLimitSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 4

**Fields:**

- **`organisation`** — `ObjectId` _(required, unique, ref: Organisation)_ — Reference to `Organisation` document (organisation).
- **`elockassignlimit`** — `Number` — elockassignlimit.
- **`dummyassigned`** — `Number` _(required, default: 0)_ — dummyassigned.
- **`prepaid`** — `Boolean` _(default: false)_ — prepaid.


### `ElockBillDirectory` — collection: **`elockBillDirectories`**

- **Source file:** `./srcc/Directory_Management/ElockBillDirectory.mjs`
- **Schema variable:** `elockBillSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 5

**Fields:**

- **`organisationName`** — `String` _(required)_ — organisation Name.
- **`branch`** — Embedded Object — Embedded sub-document (single object).
  - **`branchName`** — `String` — branch Name.
  - **`address`** — `String` — address — address text.
  - **`country`** — `String` — country — count/quantity.
  - **`state`** — `String` — state.
  - **`city`** — `String` — city.
  - **`postalCode`** — `String` — postal Code — code value.
  - **`telephoneNo`** — `String` — telephone No — identifier/number.
  - **`fax`** — `String` — fax.
  - **`website`** — `String` — website.
  - **`emailAddress`** — `String` — email Address — email address.
  - **`taxableType`** — `String` — taxable Type.
- **`gstin`** — `String` — GSTIN.
- **`panNo`** — `String` — PAN No — identifier/number.
- **`elockBillingAmounts`** — [Embedded Object] — Embedded sub-document (array of objects).
  - **`amount`** — `Number` _(required)_ — amount — numeric amount/value.
  - **`date`** — `Date` _(default: Date.now)_ — date — date field.


### `LrRegisterColumnSet` — collection: **`lrRegisterColumnSets`**

- **Source file:** `./srcc/Directory_Management/LrRegisterColumnSet.mjs`
- **Schema variable:** `LrRegisterColumnSetSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 4

**Fields:**

- **`name`** — `String` _(required, unique)_ — name.
- **`description`** — `String` — description.
- **`columns`** — `[String]` — columns.
- **`createdBy`** — `ObjectId` _(default: null, ref: User)_ — Reference to `User` document (created By).


### `LrTrackingStages` — collection: **`lrTrackingStageses`**

- **Source file:** `./srcc/Directory_Management/LrTrackingStages.mjs`
- **Schema variable:** `LrTrackingStagesSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 3

**Fields:**

- **`name`** — `String` _(required, unique)_ — name.
- **`description`** — `String` — description.
- **`requiredTrackingClose`** — `Boolean` _(default: false)_ — required Tracking Close.


### `Organisation` — collection: **`organisations`**

- **Source file:** `./srcc/Directory_Management/Organisation.mjs`
- **Schema variable:** `OrganisationSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 17

**Fields:**

- **`name`** — `String` _(required, unique)_ — name.
- **`alias`** — `String` — alias.
- **`type`** — `[String]` _(required, enum: [
        "Consignor",
        "Consignee",
        "Services",
        "Transporter",
        "Agent",
        "Carrier",
        "Global",
      ])_ — type.
- **`binNo`** — `String` — bin No — identifier/number.
- **`cinNo`** — `String` — CIN No — identifier/number.
- **`cstNo`** — `String` — cst No — identifier/number.
- **`stNo`** — `String` — st No — identifier/number.
- **`stRegNo`** — `String` — st Reg No — identifier/number.
- **`tanNo`** — `String` — TAN No — identifier/number.
- **`vatNo`** — `String` — vat No — identifier/number.
- **`gstin`** — `String` — GSTIN.
- **`panNo`** — `String` — PAN No — identifier/number.
- **`ieCodeNo`** — `String` — IE Code No — identifier/number.
- **`instructions`** — `String` — instructions.
- **`branches`** — `[BranchSchema]` — branches.
- **`elockBillingAmount`** — `Number` _(default: 0)_ — e-Lock Billing Amount — numeric amount/value.
- **`createdBy`** — `ObjectId` _(ref: User)_ — Reference to `User` document (created By).


### `PortICDcode` — collection: **`portICDcodes`**

- **Source file:** `./srcc/Directory_Management/PortsCfsYard.mjs`
- **Schema variable:** `PortsCfsYardSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 13

**Fields:**

- **`organisation`** — Embedded Object — Embedded sub-document (single object).
  - **`_id`** — `ObjectId` _(required, ref: Organisation)_ — Reference to `Organisation` document ( ID).
- **`name`** — `String` _(required)_ — name.
- **`icd_code`** — `String` _(required, unique)_ — icd code — code value.
- **`state`** — `String` _(required)_ — state.
- **`country`** — `String` _(required)_ — country — count/quantity.
- **`active`** — `Boolean` _(default: true)_ — active.
- **`type`** — `String` _(required, enum: ["Air custodian", "CFS", "Ports", "Empty yard", "ICD", "Terminal"])_ — type.
- **`contactPersonName`** — `String` — contact Person Name — phone/contact number.
- **`contactPersonEmail`** — `String` — contact Person Email — email address.
- **`contactPersonPhone`** — `String` — contact Person Phone — phone/contact number.
- **`isBranch`** — `Boolean` _(default: false)_ — is Branch — boolean flag.
- **`prefix`** — `String` — prefix.
- **`suffix`** — `String` — suffix.


### `ShippingLine` — collection: **`shippingLines`**

- **Source file:** `./srcc/Directory_Management/ShippingLine.mjs`
- **Schema variable:** `ShippingLineSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 3

**Fields:**

- **`name`** — `String` _(required, unique)_ — name.
- **`organisation`** — `ObjectId` _(required, ref: Organisation)_ — Reference to `Organisation` document (organisation).
- **`code`** — `String` _(required, unique)_ — code — code value.


### `StateDistrict` — collection: **`stateDistricts`**

- **Source file:** `./srcc/Directory_Management/StateDistrict.mjs`
- **Schema variable:** `stateDistrictSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 1

**Fields:**

- **`states`** — [Embedded Object] — Embedded sub-document (array of objects).
  - **`state`** — `String` _(required, unique)_ — state.
  - **`districts`** — `[String]` _(required)_ — districts.


### `TollData` — collection: **`tollDatas`**

- **Source file:** `./srcc/Directory_Management/TollData.mjs`
- **Schema variable:** `TollDataSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 6

**Fields:**

- **`tollBoothName`** — `String` _(required)_ — toll Booth Name.
- **`vehicleType`** — `[ObjectId]` _(ref: VehicleType)_ — Reference to `VehicleType` document (vehicle Type).
- **`fastagClassId`** — `String` _(required)_ — fastag Class ID — identifier/number.
- **`singleAmount`** — `Number` — single Amount — numeric amount/value.
- **`returnAmount`** — `Number` — return Amount — numeric amount/value.
- **`secondPassTollBooth`** — `ObjectId` _(ref: TollData)_ — Reference to `TollData` document (second Pass Toll Booth).


### `UnitMeasurement` — collection: **`unitMeasurements`**

- **Source file:** `./srcc/Directory_Management/UnitMeasurementModal.mjs`
- **Schema variable:** `unitMeasurementSchema`
- **Timestamps:** not set by schema options (may still have manual createdAt/updatedAt fields below)
- **Top-level field count:** 2

**Fields:**

- **`name`** — `String` — name.
- **`measurements`** — `[measurementSchema]` — measurements.


### `VehicleRegistration` — collection: **`vehicleRegistrations`**

- **Source file:** `./srcc/Directory_Management/VehicleRegistration.mjs`
- **Schema variable:** `VehicleRegistrationSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 25

**Fields:**

- **`vehicleNumber`** — `String` _(required)_ — vehicle Number — identifier/number.
- **`registrationName`** — `String` _(required)_ — registration Name.
- **`type`** — `ObjectId` _(required, ref: VehicleType)_ — Reference to `VehicleType` document (type).
- **`engineNumber`** — `String` _(required)_ — engine Number — identifier/number.
- **`chassisNumber`** — `String` _(required)_ — chassis Number — identifier/number.
- **`pucDate`** — `Date` — puc Date — date field.
- **`insuranceDate`** — `Date` — insurance Date — date field.
- **`roadTaxOrLtt`** — `Date` — road Tax Or Ltt.
- **`goodsPermitDate`** — `Date` — goods Permit Date — date field.
- **`nationalPermitDate`** — `Date` — national Permit Date — date field.
- **`fitnessDate`** — `Date` — fitness Date — date field.
- **`pucDocument`** — `[String]` — puc Document.
- **`insuranceDocument`** — `[String]` — insurance Document.
- **`roadTaxDocument`** — `[String]` — road Tax Document.
- **`goodsPermitDocument`** — `[String]` — goods Permit Document.
- **`nationalPermitDocument`** — `[String]` — national Permit Document.
- **`fitnessDocument`** — `[String]` — fitness Document.
- **`shortName`** — `String` — short Name.
- **`depotName`** — `ObjectId` _(required, ref: PortICDcode)_ — Reference to `PortICDcode` document (depot Name).
- **`initialOdometer`** — Embedded Object — Embedded sub-document (single object).
  - **`value`** — `Number` _(required)_ — value — numeric amount/value.
  - **`unit`** — `ObjectId` _(required, ref: UnitMeasurement)_ — Reference to `UnitMeasurement` document (unit).
- **`loadCapacity`** — Embedded Object — Embedded sub-document (single object).
  - **`value`** — `Number` _(required)_ — value — numeric amount/value.
  - **`unit`** — `ObjectId` _(required, ref: UnitMeasurement)_ — Reference to `UnitMeasurement` document (unit).
- **`driver`** — Embedded Object — Embedded sub-document (single object).
  - **`_id`** — `ObjectId` _(ref: DriverType)_ — Reference to `DriverType` document ( ID).
  - **`name`** — `String` — name.
  - **`phoneNumber`** — `String` — phone Number — identifier/number.
- **`purchase`** — `Date` — purchase.
- **`vehicleManufacturingDetails`** — `String` — vehicle Manufacturing Details.
- **`isOccupied`** — `Boolean` _(default: false)_ — is Occupied — boolean flag.


### `VehicleType` — collection: **`vehicleTypes`**

- **Source file:** `./srcc/Directory_Management/VehicleType.mjs`
- **Schema variable:** `VehicleTypeSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 7

**Fields:**

- **`vehicleType`** — `String` _(required)_ — vehicle Type.
- **`shortName`** — `String` _(required)_ — short Name.
- **`loadCapacity`** — Embedded Object — Embedded sub-document (single object).
  - **`value`** — `Number` _(required)_ — value — numeric amount/value.
  - **`unit`** — `ObjectId` _(required, ref: UnitMeasurement)_ — Reference to `UnitMeasurement` document (unit).
- **`engineCapacity`** — Embedded Object — Embedded sub-document (single object).
  - **`value`** — `Number` _(required)_ — value — numeric amount/value.
  - **`unit`** — `ObjectId` _(required, ref: UnitMeasurement)_ — Reference to `UnitMeasurement` document (unit).
- **`cargoTypeAllowed`** — `[String]` — cargo Type Allowed.
- **`CommodityCarry`** — `[ObjectId]` _(ref: CommodityCode)_ — Reference to `CommodityCode` document (Commodity Carry).
- **`createdBy`** — `ObjectId` _(ref: User)_ — Reference to `User` document (created By).


### `Country` — collection: **`countries`**

- **Source file:** `./srcc/Directory_Management/contryCode.mjs`
- **Schema variable:** `CountrySchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 8

**Fields:**

- **`cntry_cd`** — `String` — cntry cd.
- **`cntry_nm`** — `String` — cntry nm.
- **`dgcis_cd`** — `String` — dgcis cd.
- **`cntry_cd_old`** — `String` — cntry cd old.
- **`aepc_cntry_cd`** — `String` — aepc cntry cd.
- **`cntry_grp`** — `String` — cntry grp.
- **`ref_cntry_cd`** — `String` — ref cntry cd.
- **`status`** — `String` — status.


### `Location` — collection: **`locations`**

- **Source file:** `./srcc/Directory_Management/location.mjs`
- **Schema variable:** `locationSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 6

**Fields:**

- **`name`** — `String` _(required)_ — name.
- **`postal_code`** — `String` _(required)_ — postal code — code value.
- **`city`** — `String` _(required)_ — city.
- **`district`** — `String` _(required)_ — district.
- **`state`** — `String` _(required)_ — state.
- **`country`** — `String` _(required)_ — country — count/quantity.


### `UnitConversion` — collection: **`unitConversions`**

- **Source file:** `./srcc/Directory_Management/unitConversion.mjs`
- **Schema variable:** `UnitConversionSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 3

**Fields:**

- **`uqc`** — `String` _(required)_ — uqc.
- **`uqc_desc`** — `String` _(required)_ — uqc desc.
- **`type`** — `String` _(required)_ — type.


## Module: `server/model/srcc/sr_cel/`


### `Srcel` — collection: **`srcels`**

- **Source file:** `./srcc/sr_cel/srCel.mjs`
- **Schema variable:** `SrcelSchema`
- **Timestamps:** not set by schema options (may still have manual createdAt/updatedAt fields below)
- **Top-level field count:** 15

**Fields:**

- **`FGUID`** — `String` _(required)_ — FGUID — identifier/number.
- **`FAssetID`** — `String` _(required)_ — FAsset ID — identifier/number.
- **`FAssetTypeID`** — `Number` _(required)_ — FAsset Type ID — identifier/number.
- **`FDescription`** — `String` _(default: "")_ — FDescription.
- **`FSIMNumber`** — `String` _(default: "")_ — FSIMNumber — identifier/number.
- **`FAgentGUID`** — `String` _(required)_ — FAgent GUID — identifier/number.
- **`FAgentName`** — `String` _(required)_ — FAgent Name.
- **`FGroupGUID`** — `String` _(default: null)_ — FGroup GUID — identifier/number.
- **`FGroupName`** — `String` _(default: "")_ — FGroup Name.
- **`FCreateTime`** — `Date` _(required)_ — FCreate Time.
- **`FExpireTime`** — `Date` _(required)_ — FExpire Time.
- **`FFactorySimNo`** — `String` _(default: null)_ — FFactory Sim No — identifier/number.
- **`FVehicleName`** — `String` _(required)_ — FVehicle Name.
- **`sr_cel_no`** — `String` — sr cel no — identifier/number.
- **`sr_cel_locked`** — `Boolean` _(required, default: false)_ — sr cel locked.


## Module: `server/model/vendormgt/`


### `VendorInvoice` — collection: **`vendorInvoices`**

- **Source file:** `./vendormgt/vendorInvoice.mjs`
- **Schema variable:** `VendorInvoiceSchema`
- **Timestamps:** `createdAt`/`updatedAt` auto-managed (`timestamps: true`)
- **Top-level field count:** 5

**Fields:**

- **`serialNumber`** — `String` _(required, unique)_ — serial Number — identifier/number.
- **`invoiceNumber`** — `String` _(required)_ — invoice Number — identifier/number.
- **`invoiceDate`** — `Date` _(required)_ — invoice Date — date field.
- **`vendorName`** — `String` _(required)_ — vendor Name.
- **`invoiceimageUrls`** — `[String]` _(required)_ — invoiceimage Urls.


### `VendorInvoiceCounter` — collection: **`vendorInvoiceCounters`**

- **Source file:** `./vendormgt/vendorInvoiceCounter.mjs`
- **Schema variable:** `VendorInvoiceCounterSchema`
- **Timestamps:** not set by schema options (may still have manual createdAt/updatedAt fields below)
- **Top-level field count:** 2

**Fields:**

- **`_id`** — `String` _(required)_ — MongoDB document primary key.
- **`seq`** — `Number` _(default: 0)_ — seq.


---

## Summary

- **Total Mongoose models/collections documented:** 103
- **Total top-level fields parsed:** 1299
- **Source:** `server/model/` directory tree from `eximtransport-ewaybillchild.zip`
