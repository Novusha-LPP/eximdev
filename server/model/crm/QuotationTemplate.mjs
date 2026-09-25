import mongoose from 'mongoose';

const quotationTemplateSchema = new mongoose.Schema({
  templateName: { type: String, required: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'QuotationCompany', required: true },
  description: { type: String, default: '' },
  category: { type: String, default: 'general' }, // customs_import, customs_export, freight, transport, pfp, general
  
  // Template design & style options
  templateStyle: {
    themeColor: { type: String, default: '#1e3a8a' }, // Classic Navy
    accentColor: { type: String, default: '#2563eb' },
    headerLayout: { type: String, default: 'top_right' }, // top_right, left_stacked, compact
    fontFamily: { type: String, default: 'helvetica' },
    showLogo: { type: Boolean, default: true },
    showBankDetails: { type: Boolean, default: true },
    showSignatory: { type: Boolean, default: true },
    showHsnSac: { type: Boolean, default: true },
    termsAndConditions: { type: String, default: '' },
    footerNotes: { type: String, default: '' }
  },
  customColumns: [{
    key: { type: String, required: true }, // e.g., 'containerSize', 'cbm', 'pol'
    label: { type: String, required: true }, // e.g., 'Container Size', 'Volume (CBM)', 'Port of Loading'
    type: { type: String, enum: ['text', 'number', 'select', 'date'], default: 'text' },
    options: [{ type: String }], // options if type is select
    defaultValue: { type: String, default: '' },
    width: { type: String, default: '120px' },
    align: { type: String, enum: ['left', 'center', 'right'], default: 'left' },
    required: { type: Boolean, default: false }
  }],

  // Default preset line items for template
  defaultLineItems: [{
    productName: { type: String, default: '' },
    hsnSac: { type: String, default: '' },
    quantity: { type: Number, default: 1 },
    unitPrice: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 18 },
    customFields: { type: mongoose.Schema.Types.Mixed, default: {} }
  }],

  isDefault: { type: Boolean, default: false },
  createdById: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model('QuotationTemplate', quotationTemplateSchema);
