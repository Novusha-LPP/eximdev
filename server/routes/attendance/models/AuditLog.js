const mongoose = require('mongoose');

const auditSchema = new mongoose.Schema({
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  
  entity_type: { type: String, required: true }, 
  entity_id: { type: mongoose.Schema.Types.ObjectId },
  action: { type: String, required: true }, 
  
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  user_name: { type: String },
  
  old_value: { type: Object },
  new_value: { type: Object },
  
  reason: { type: String },
  ip_address: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', auditSchema);