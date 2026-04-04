import mongoose from 'mongoose';

const automationRuleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  
  // Rule type
  type: {
    type: String,
    enum: ['lead', 'opportunity', 'account', 'contact', 'activity', 'task', 'email'],
    required: true
  },
  
  // Trigger
  trigger: {
    event: {
      type: String,
      enum: [
        'record_created',
        'record_updated',
        'field_changed',
        'time_based',
        'lead_scored',
        'deal_won',
        'deal_lost',
        'activity_logged',
        'email_received'
      ],
      required: true
    },
    
    // Field that triggered
    triggerField: String,
    triggerValue: mongoose.Schema.Types.Mixed, // Any type of value
    
    // Time-based trigger
    timeTrigger: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'immediately'], // immediately = no delay
      default: 'immediately'
    },
    timeDelay: Number, // in minutes for immediate, day of month for daily, etc
    
    // Conditions that must be met
    conditions: [{
      field: String,
      operator: {
        type: String,
        enum: ['equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'not_contains', 'is_empty', 'is_not_empty', 'in_list']
      },
      value: mongoose.Schema.Types.Mixed,
      logicalOperator: { type: String, enum: ['AND', 'OR'], default: 'AND' }
    }]
  },
  
  // Actions to execute
  actions: [{
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    type: {
      type: String,
      enum: [
        'assign_to',
        'assign_to_team',
        'change_field',
        'create_task',
        'send_email',
        'create_activity',
        'send_notification',
        'update_score',
        'move_to_stage',
        'add_tag',
        'remove_tag',
        'escalate',
        'create_lead'
      ],
      required: true
    },
    
    // Action parameters (varies by type)
    params: {
      assigneeId: mongoose.Schema.Types.ObjectId,
      teamId: mongoose.Schema.Types.ObjectId,
      fieldName: String,
      fieldValue: mongoose.Schema.Types.Mixed,
      taskTitle: String,
      taskDescription: String,
      taskDueDate: Date,
      taskPriority: { type: String, enum: ['low', 'medium', 'high', 'urgent'] },
      emailTemplate: String,
      emailSubject: String,
      recipientType: String, // 'assignee', 'manager', 'custom'
      notificationMessage: String,
      stageName: String,
      tags: [String]
    },
    
    // Execution tracking
    executionCount: { type: Number, default: 0 },
    lastExecuted: Date
  }],
  
  // Execution settings
  executionOrder: { type: Number, default: 0 },
  
  // Scope & Filtering
  scope: {
    appliesToAll: { type: Boolean, default: true },
    appliesTo: {
      ownerId: [mongoose.Schema.Types.ObjectId],
      teamId: [mongoose.Schema.Types.ObjectId],
      territoryId: [mongoose.Schema.Types.ObjectId],
      recordType: [String]
    }
  },
  
  // Status
  isActive: { type: Boolean, default: true },
  isTemplate: { type: Boolean, default: false }, // Reusable template
  
  // Execution logs
  executionLogs: [{
    recordId: mongoose.Schema.Types.ObjectId,
    recordType: String,
    executedAt: { type: Date, default: Date.now },
    executedBy: mongoose.Schema.Types.ObjectId,
    status: { type: String, enum: ['success', 'failed', 'skipped'] },
    errorMessage: String
  }],
  
  // Performance metrics
  stats: {
    totalExecutions: { type: Number, default: 0 },
    successfulExecutions: { type: Number, default: 0 },
    failedExecutions: { type: Number, default: 0 },
    lastExecutedAt: Date
  },
  
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Indexes
automationRuleSchema.index({ type: 1, isActive: 1 });
automationRuleSchema.index({ isActive: 1 });
automationRuleSchema.index({ createdAt: -1 });

export default mongoose.model('AutomationRule', automationRuleSchema);
