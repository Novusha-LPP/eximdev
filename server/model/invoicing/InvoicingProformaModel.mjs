import mongoose from "mongoose";

const InvoicingProformaSchema = new mongoose.Schema(
    {
        proforma_no: {
            type: String,
            required: true,
            unique: true,
            index: true
        },
        proforma_date: {
            type: String, // YYYY-MM-DD
            required: true,
            index: true
        },
        company_key: {
            type: String,
            required: true,
            index: true
        },
        company_name: {
            type: String,
            required: true
        },
        customer_name: {
            type: String,
            required: true
        },
        amount: {
            type: Number,
            default: 0
        },
        conversion_status: {
            type: String,
            enum: ["PENDING", "CONVERTED", "CANCELLED"],
            default: "PENDING",
            index: true
        },
        final_invoice_no: {
            type: String,
            default: null
        },
        final_invoice_date: {
            type: String,
            default: null
        },
        ageing_days: {
            type: Number,
            default: 0
        },
        remarks: {
            type: String,
            default: ""
        }
    },
    {
        timestamps: true,
        collection: "invoicing_proforma_invoices"
    }
);

InvoicingProformaSchema.index({ conversion_status: 1, proforma_date: -1 });

const InvoicingProformaModel = mongoose.model("InvoicingProforma", InvoicingProformaSchema);
export default InvoicingProformaModel;
