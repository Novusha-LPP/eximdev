import mongoose from "mongoose";

const InvoicingCompanyMappingSchema = new mongoose.Schema(
    {
        company_key: {
            type: String,
            required: true,
            unique: true,
            index: true
        },
        tally_company_name: {
            type: String,
            required: true
        },
        display_name: {
            type: String,
            required: true
        },
        group_category: {
            type: String,
            default: "Core Group" // 'SFPL', 'SRCC', 'NOVUSHA', 'OTHER'
        },
        default_projection_days: {
            type: Number,
            default: 30
        },
        responsible_person_name: {
            type: String,
            default: "Yash" // Yash / Ayan / Naresh
        },
        responsible_person_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },
        responsible_person_email: {
            type: String,
            default: ""
        },
        sort_order: {
            type: Number,
            default: 1
        },
        is_active: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true,
        collection: "invoicing_company_mappings"
    }
);

const InvoicingCompanyMappingModel = mongoose.model("InvoicingCompanyMapping", InvoicingCompanyMappingSchema);
export default InvoicingCompanyMappingModel;
