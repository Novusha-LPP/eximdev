import cron from "node-cron";
import moment from "moment";
import InvoicingDailyEntryModel from "../../model/invoicing/InvoicingDailyEntryModel.mjs";
import InvoicingTargetSettingModel from "../../model/invoicing/InvoicingTargetSettingModel.mjs";
import InvoicingCompanyMappingModel from "../../model/invoicing/InvoicingCompanyMappingModel.mjs";
import InvoicingSyncScheduleModel from "../../model/invoicing/InvoicingSyncScheduleModel.mjs";
import InvoicingExceptionLogModel from "../../model/invoicing/InvoicingExceptionLogModel.mjs";
import InvoicingProformaModel from "../../model/invoicing/InvoicingProformaModel.mjs";
import UserModel from "../../model/userModel.mjs";
import { getOffDayInfo } from "./invoicingCalculationService.mjs";

export const DEFAULT_COMPANIES = [
    {
        company_key: "SFPL_GUJ",
        tally_company_name: "Suraj Forwarders Private Limited - Gujarat",
        display_name: "SFPL Gujarat",
        group_category: "SFPL",
        default_projection_days: 30,
        responsible_person_name: "Yash",
        sort_order: 1
    },
    {
        company_key: "SFPL_NON_GUJ",
        tally_company_name: "Suraj Forwarders Private Limited - Non Gujarat",
        display_name: "SFPL Non-Gujarat",
        group_category: "SFPL",
        default_projection_days: 30,
        responsible_person_name: "Yash",
        sort_order: 2
    },
    {
        company_key: "SRCC",
        tally_company_name: "SR Container Carriers",
        display_name: "SRCC",
        group_category: "SRCC",
        default_projection_days: 36, // Configurable default: 36 days as required in doc
        responsible_person_name: "Ayan",
        sort_order: 3
    },
    {
        company_key: "NOVUSHA_ALV",
        tally_company_name: "Novusha Alvision Logistics",
        display_name: "Novusha Alvision",
        group_category: "Novusha",
        default_projection_days: 30,
        responsible_person_name: "Ayan",
        sort_order: 4
    },
    {
        company_key: "NOVUSHA_NEXT",
        tally_company_name: "Novusha Nextwave Technologies",
        display_name: "Novusha Nextwave",
        group_category: "Novusha",
        default_projection_days: 30,
        responsible_person_name: "Ayan",
        sort_order: 5
    },
    {
        company_key: "PARAMOUNT",
        tally_company_name: "Paramount Propack Private Limited",
        display_name: "Paramount",
        group_category: "Paramount",
        default_projection_days: 30,
        responsible_person_name: "Naresh",
        sort_order: 6
    },
    {
        company_key: "ALLUVIUM",
        tally_company_name: "Alluvium IoT Solutions Private Limited",
        display_name: "Alluvium",
        group_category: "Alluvium",
        default_projection_days: 30,
        responsible_person_name: "Naresh",
        sort_order: 7
    },
    {
        company_key: "RABS",
        tally_company_name: "RABS Industries India Private Limited",
        display_name: "RABS",
        group_category: "RABS",
        default_projection_days: 30,
        responsible_person_name: "Naresh",
        sort_order: 8
    }
];

/**
 * Seed initial company mappings, schedule config, target settings, and sample data if collections are empty.
 */
export const seedDefaultInvoicingData = async () => {
    try {
        // 1. Seed Company Mappings
        const existingMappings = await InvoicingCompanyMappingModel.countDocuments();
        if (existingMappings === 0) {
            console.log("[Invoicing] Seeding default company mappings...");
            for (const c of DEFAULT_COMPANIES) {
                const user = await UserModel.findOne({
                    $or: [
                        { username: new RegExp(c.responsible_person_name, "i") },
                        { first_name: new RegExp(c.responsible_person_name, "i") }
                    ]
                }).lean();

                await InvoicingCompanyMappingModel.create({
                    ...c,
                    responsible_person_id: user ? user._id : null,
                    responsible_person_email: user ? user.email : ""
                });
            }
        }

        // 2. Seed Sync Schedule
        const existingSchedule = await InvoicingSyncScheduleModel.findOne({ config_key: "PRIMARY_TALLY_SCHEDULE" });
        if (!existingSchedule) {
            console.log("[Invoicing] Seeding primary sync schedule...");
            await InvoicingSyncScheduleModel.create({
                config_key: "PRIMARY_TALLY_SCHEDULE",
                auto_retrieve_enabled: true,
                frequency: "CUSTOM",
                scheduled_times: ["09:00", "13:00", "18:00"],
                last_sync_status: "SUCCESS",
                last_successful_sync: new Date(),
                next_scheduled_sync: new Date(Date.now() + 4 * 60 * 60 * 1000)
            });
        }

        // 3. Seed Monthly Targets if none exist for current FY
        const today = moment();
        const currentYear = today.year();
        const fy = `${String(currentYear).slice(-2)}-${String(currentYear + 1).slice(-2)}`;
        const existingTargets = await InvoicingTargetSettingModel.countDocuments({ financial_year: fy });

        if (existingTargets === 0) {
            console.log("[Invoicing] Seeding baseline target settings...");
            const defaultTargets = {
                SFPL_GUJ: { target: 8500000, projDays: 30 },
                SFPL_NON_GUJ: { target: 4500000, projDays: 30 },
                SRCC: { target: 12000000, projDays: 36 }, // 36 days default for SRCC
                NOVUSHA_ALV: { target: 3500000, projDays: 30 },
                NOVUSHA_NEXT: { target: 2000000, projDays: 30 },
                PARAMOUNT: { target: 5000000, projDays: 30 },
                ALLUVIUM: { target: 2500000, projDays: 30 },
                RABS: { target: 1500000, projDays: 30 }
            };

            for (let m = 0; m < 12; m++) {
                for (const comp of DEFAULT_COMPANIES) {
                    const cfg = defaultTargets[comp.company_key] || { target: 2000000, projDays: 30 };
                    await InvoicingTargetSettingModel.create({
                        company_key: comp.company_key,
                        financial_year: fy,
                        month: m,
                        monthly_target: cfg.target,
                        projection_days: cfg.projDays,
                        daily_target: Math.round(cfg.target / 26)
                    });
                }
            }
        }

        // 4. Seed Historical & MTD Daily Invoicing Data if empty
        const entryCount = await InvoicingDailyEntryModel.countDocuments();
        if (entryCount === 0) {
            console.log("[Invoicing] Seeding initial daily invoicing baseline data...");
            await generateInitialDailyData();
        }

        // 5. Seed Proforma Invoices if empty
        const proformaCount = await InvoicingProformaModel.countDocuments();
        if (proformaCount === 0) {
            console.log("[Invoicing] Seeding sample proforma monitoring entries...");
            await generateInitialProformaData();
        }

        console.log("[Invoicing] Module initialized successfully.");
    } catch (err) {
        console.error("[Invoicing] Initialization error:", err);
    }
};

/**
 * Generate initial daily data for the past 60 days
 */
const generateInitialDailyData = async () => {
    const entries = [];

    for (let d = 60; d >= 0; d--) {
        const targetDate = moment().subtract(d, "days");
        const dateStr = targetDate.format("YYYY-MM-DD");
        const offDayInfo = getOffDayInfo(targetDate.toDate());

        for (const comp of DEFAULT_COMPANIES) {
            let baseDaily = 0;
            let invCount = 0;
            let creditNotes = 0;

            if (!offDayInfo.isOffDay) {
                switch (comp.company_key) {
                    case "SRCC":
                        baseDaily = Math.round(350000 + Math.random() * 180000);
                        invCount = Math.floor(8 + Math.random() * 6);
                        break;
                    case "SFPL_GUJ":
                        baseDaily = Math.round(250000 + Math.random() * 120000);
                        invCount = Math.floor(6 + Math.random() * 5);
                        break;
                    case "SFPL_NON_GUJ":
                        baseDaily = Math.round(140000 + Math.random() * 80000);
                        invCount = Math.floor(3 + Math.random() * 4);
                        break;
                    case "PARAMOUNT":
                        baseDaily = Math.round(160000 + Math.random() * 90000);
                        invCount = Math.floor(4 + Math.random() * 4);
                        break;
                    case "NOVUSHA_ALV":
                        baseDaily = Math.round(110000 + Math.random() * 60000);
                        invCount = Math.floor(2 + Math.random() * 3);
                        break;
                    case "ALLUVIUM":
                        baseDaily = Math.round(80000 + Math.random() * 50000);
                        invCount = Math.floor(2 + Math.random() * 3);
                        break;
                    case "NOVUSHA_NEXT":
                        baseDaily = Math.round(65000 + Math.random() * 40000);
                        invCount = Math.floor(1 + Math.random() * 3);
                        break;
                    case "RABS":
                        baseDaily = Math.round(50000 + Math.random() * 30000);
                        invCount = Math.floor(1 + Math.random() * 2);
                        break;
                    default:
                        baseDaily = Math.round(50000 + Math.random() * 20000);
                        invCount = 1;
                }

                if (Math.random() < 0.15) {
                    creditNotes = Math.round(baseDaily * (0.05 + Math.random() * 0.1));
                }
            }

            entries.push({
                date: dateStr,
                company_key: comp.company_key,
                company_name: comp.tally_company_name,
                display_name: comp.display_name,
                sales_amount: baseDaily,
                invoice_count: invCount,
                credit_notes_amount: creditNotes,
                cancelled_invoices_amount: 0,
                net_amount: baseDaily - creditNotes,
                is_off_day: offDayInfo.isOffDay,
                off_day_reason: offDayInfo.reason,
                source: "TALLY",
                last_refreshed_at: new Date()
            });
        }
    }

    await InvoicingDailyEntryModel.insertMany(entries);
};

/**
 * Generate initial proforma data
 */
const generateInitialProformaData = async () => {
    const proformas = [
        {
            proforma_no: "PI/SRCC/26-27/00142",
            proforma_date: moment().subtract(5, "days").format("YYYY-MM-DD"),
            company_key: "SRCC",
            company_name: "SR Container Carriers",
            customer_name: "LAXCON STEELS LIMITED",
            amount: 485000,
            conversion_status: "PENDING",
            ageing_days: 5,
            remarks: "Awaiting final clearance documents"
        },
        {
            proforma_no: "PI/SFPL/26-27/00098",
            proforma_date: moment().subtract(12, "days").format("YYYY-MM-DD"),
            company_key: "SFPL_GUJ",
            company_name: "Suraj Forwarders Private Limited",
            customer_name: "RATNAMANI METALS & TUBES LTD",
            amount: 320000,
            conversion_status: "PENDING",
            ageing_days: 12,
            remarks: "Pending shipping line verification"
        },
        {
            proforma_no: "PI/PARAM/26-27/00045",
            proforma_date: moment().subtract(25, "days").format("YYYY-MM-DD"),
            company_key: "PARAMOUNT",
            company_name: "Paramount Propack Private Limited",
            customer_name: "RELIANCE INDUSTRIES LIMITED",
            amount: 750000,
            conversion_status: "PENDING",
            ageing_days: 25,
            remarks: "Long pending - high value follow-up required"
        },
        {
            proforma_no: "PI/SRCC/26-27/00110",
            proforma_date: moment().subtract(18, "days").format("YYYY-MM-DD"),
            company_key: "SRCC",
            company_name: "SR Container Carriers",
            customer_name: "JINDAL SAW LIMITED",
            amount: 620000,
            conversion_status: "CONVERTED",
            final_invoice_no: "INV/SRCC/26-27/00892",
            final_invoice_date: moment().subtract(2, "days").format("YYYY-MM-DD"),
            ageing_days: 16,
            remarks: "Converted to final invoice"
        },
        {
            proforma_no: "PI/NOV/26-27/00031",
            proforma_date: moment().subtract(40, "days").format("YYYY-MM-DD"),
            company_key: "NOVUSHA_ALV",
            company_name: "Novusha Alvision Logistics",
            customer_name: "ADANI ENTERPRISES LTD",
            amount: 290000,
            conversion_status: "PENDING",
            ageing_days: 40,
            remarks: "Overdue > 30 days exception flagged"
        }
    ];

    await InvoicingProformaModel.insertMany(proformas);
};

/**
 * Ingest / Upsert Tally Sales Register Entry and detect historical deltas
 */
export const processTallySalesSync = async (salesEntries, triggeredBy = "MANUAL_TRIGGER") => {
    const results = { updated: 0, created: 0, exceptions: 0 };
    const now = new Date();

    for (const entry of salesEntries) {
        const { date, company_key, sales_amount, invoice_count, credit_notes_amount, invoices } = entry;
        const offDayInfo = getOffDayInfo(date);

        const companyMapping = await InvoicingCompanyMappingModel.findOne({ company_key }).lean();
        const displayName = companyMapping ? companyMapping.display_name : company_key;
        const companyName = companyMapping ? companyMapping.tally_company_name : company_key;
        const responsiblePerson = companyMapping ? companyMapping.responsible_person_name : "Yash";

        const existingEntry = await InvoicingDailyEntryModel.findOne({ date, company_key });
        const netAmount = (sales_amount || 0) - (credit_notes_amount || 0);

        if (existingEntry) {
            const oldNet = existingEntry.net_amount || 0;
            const variance = Math.abs(netAmount - oldNet);

            if (variance > 100) {
                await InvoicingExceptionLogModel.create({
                    exception_type: "HISTORICAL_CORRECTION",
                    severity: variance > 100000 ? "HIGH" : "MEDIUM",
                    company_key,
                    display_name: displayName,
                    affected_date: date,
                    title: `Historical Data Revision: ${displayName}`,
                    description: `Billing figure for ${date} changed from ₹${oldNet.toLocaleString("en-IN")} to ₹${netAmount.toLocaleString("en-IN")} (Diff: ₹${(netAmount - oldNet).toLocaleString("en-IN")})`,
                    details: {
                        previous_value: oldNet,
                        revised_value: netAmount,
                        diff: netAmount - oldNet,
                        credit_notes: credit_notes_amount || 0,
                        sync_time: now
                    },
                    responsible_person: responsiblePerson,
                    status: "PENDING"
                });
                results.exceptions++;
            }

            existingEntry.sales_amount = sales_amount || 0;
            existingEntry.invoice_count = invoice_count || 0;
            existingEntry.credit_notes_amount = credit_notes_amount || 0;
            existingEntry.net_amount = netAmount;
            existingEntry.is_off_day = offDayInfo.isOffDay;
            existingEntry.off_day_reason = offDayInfo.reason;
            existingEntry.source = "TALLY";
            existingEntry.last_refreshed_at = now;
            existingEntry.refreshed_by = triggeredBy;
            if (invoices) existingEntry.invoices = invoices;

            await existingEntry.save();
            results.updated++;
        } else {
            await InvoicingDailyEntryModel.create({
                date,
                company_key,
                company_name: companyName,
                display_name: displayName,
                sales_amount: sales_amount || 0,
                invoice_count: invoice_count || 0,
                credit_notes_amount: credit_notes_amount || 0,
                net_amount: netAmount,
                is_off_day: offDayInfo.isOffDay,
                off_day_reason: offDayInfo.reason,
                source: "TALLY",
                invoices: invoices || [],
                last_refreshed_at: now,
                refreshed_by: triggeredBy
            });
            results.created++;
        }
    }

    await InvoicingSyncScheduleModel.findOneAndUpdate(
        { config_key: "PRIMARY_TALLY_SCHEDULE" },
        {
            last_sync_status: "SUCCESS",
            last_successful_sync: now,
            last_attempt_at: now,
            last_error_message: null
        }
    );

    return results;
};

/**
 * Initialize background cron job for auto-retrieve schedule
 */
export const initInvoicingCronScheduler = () => {
    cron.schedule("*/15 * * * *", async () => {
        try {
            const schedule = await InvoicingSyncScheduleModel.findOne({ config_key: "PRIMARY_TALLY_SCHEDULE" });
            if (!schedule || !schedule.auto_retrieve_enabled) return;

            const now = moment();
            const currentHourMin = now.format("HH:mm");

            const isDue = (schedule.scheduled_times || []).some(t => {
                const [h, m] = t.split(":");
                const scheduledMinutes = parseInt(h, 10) * 60 + parseInt(m, 10);
                const currentMinutes = now.hour() * 60 + now.minute();
                return Math.abs(currentMinutes - scheduledMinutes) <= 14;
            });

            if (isDue) {
                console.log(`[Invoicing Cron] Scheduled Auto-Retrieve triggered at ${currentHourMin}`);
                await InvoicingSyncScheduleModel.updateOne(
                    { config_key: "PRIMARY_TALLY_SCHEDULE" },
                    { last_attempt_at: new Date(), last_sync_status: "IN_PROGRESS" }
                );
            }
        } catch (err) {
            console.error("[Invoicing Cron] Error during auto-retrieve check:", err);
        }
    });

    console.log("[Invoicing Cron] Background sync scheduler active.");
};
