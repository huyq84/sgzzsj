const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['投标阶段', '施工阶段']
  },
  category: {
    type: String,
    required: true,
    enum: [
      '住宅建筑',
      '商业建筑',
      '工业建筑',
      '公共建筑',
      '基础设施',
      '市政工程',
      '水利工程',
      '交通工程',
      '能源工程',
      '环保工程'
    ]
  },
  description: {
    type: String,
    trim: true
  },
  version: {
    type: String,
    default: '1.0.0'
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sections: {
    projectOverview: {
      title: {
        type: String,
        default: '工程概况'
      },
      required: {
        type: Boolean,
        default: true
      },
      template: String,
      order: {
        type: Number,
        default: 1
      },
      variables: [{
        name: String,
        type: {
          type: String,
          enum: ['text', 'number', 'date', 'select', 'multiselect', 'textarea']
        },
        label: String,
        required: Boolean,
        options: [String], // 用于select和multiselect
        defaultValue: String
      }]
    },
    constructionDeployment: {
      title: {
        type: String,
        default: '施工部署'
      },
      required: {
        type: Boolean,
        default: true
      },
      template: String,
      order: {
        type: Number,
        default: 2
      },
      variables: [{
        name: String,
        type: {
          type: String,
          enum: ['text', 'number', 'date', 'select', 'multiselect', 'textarea']
        },
        label: String,
        required: Boolean,
        options: [String],
        defaultValue: String
      }]
    },
    constructionSchedule: {
      title: {
        type: String,
        default: '施工进度计划'
      },
      required: {
        type: Boolean,
        default: true
      },
      template: String,
      order: {
        type: Number,
        default: 3
      },
      variables: [{
        name: String,
        type: {
          type: String,
          enum: ['text', 'number', 'date', 'select', 'multiselect', 'textarea']
        },
        label: String,
        required: Boolean,
        options: [String],
        defaultValue: String
      }]
    },
    resourceAllocation: {
      title: {
        type: String,
        default: '资源配置计划'
      },
      required: {
        type: Boolean,
        default: true
      },
      template: String,
      order: {
        type: Number,
        default: 4
      },
      variables: [{
        name: String,
        type: {
          type: String,
          enum: ['text', 'number', 'date', 'select', 'multiselect', 'textarea']
        },
        label: String,
        required: Boolean,
        options: [String],
        defaultValue: String
      }]
    },
    qualityControl: {
      title: {
        type: String,
        default: '质量保证措施'
      },
      required: {
        type: Boolean,
        default: true
      },
      template: String,
      order: {
        type: Number,
        default: 5
      },
      variables: [{
        name: String,
        type: {
          type: String,
          enum: ['text', 'number', 'date', 'select', 'multiselect', 'textarea']
        },
        label: String,
        required: Boolean,
        options: [String],
        defaultValue: String
      }]
    },
    safetyMeasures: {
      title: {
        type: String,
        default: '安全保证措施'
      },
      required: {
        type: Boolean,
        default: true
      },
      template: String,
      order: {
        type: Number,
        default: 6
      },
      variables: [{
        name: String,
        type: {
          type: String,
          enum: ['text', 'number', 'date', 'select', 'multiselect', 'textarea']
        },
        label: String,
        required: Boolean,
        options: [String],
        defaultValue: String
      }]
    },
    environmentalProtection: {
      title: {
        type: String,
        default: '环境保护措施'
      },
      required: {
        type: Boolean,
        default: true
      },
      template: String,
      order: {
        type: Number,
        default: 7
      },
      variables: [{
        name: String,
        type: {
          type: String,
          enum: ['text', 'number', 'date', 'select', 'multiselect', 'textarea']
        },
        label: String,
        required: Boolean,
        options: [String],
        defaultValue: String
      }]
    },
    costControl: {
      title: {
        type: String,
        default: '成本控制措施'
      },
      required: {
        type: Boolean,
        default: false
      },
      template: String,
      order: {
        type: Number,
        default: 8
      },
      variables: [{
        name: String,
        type: {
          type: String,
          enum: ['text', 'number', 'date', 'select', 'multiselect', 'textarea']
        },
        label: String,
        required: Boolean,
        options: [String],
        defaultValue: String
      }]
    },
    riskManagement: {
      title: {
        type: String,
        default: '风险管理措施'
      },
      required: {
        type: Boolean,
        default: false
      },
      template: String,
      order: {
        type: Number,
        default: 9
      },
      variables: [{
        name: String,
        type: {
          type: String,
          enum: ['text', 'number', 'date', 'select', 'multiselect', 'textarea']
        },
        label: String,
        required: Boolean,
        options: [String],
        defaultValue: String
      }]
    }
  },
  usage: {
    totalUsed: {
      type: Number,
      default: 0
    },
    lastUsed: Date,
    usedBy: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      usedAt: {
        type: Date,
        default: Date.now
      },
      project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project'
      }
    }]
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  tags: [String],
  attachments: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    uploadPath: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// 索引
templateSchema.index({ name: 'text', description: 'text' });
templateSchema.index({ type: 1, category: 1 });
templateSchema.index({ isDefault: 1, isActive: 1 });
templateSchema.index({ createdBy: 1 });

// 静态方法
templateSchema.statics.getDefaultTemplate = function(type, category) {
  return this.findOne({
    type: type,
    category: category,
    isDefault: true,
    isActive: true
  });
};

templateSchema.statics.getPopularTemplates = function(limit = 10) {
  return this.find({ isActive: true })
    .sort({ 'usage.totalUsed': -1 })
    .limit(limit);
};

// 实例方法
templateSchema.methods.incrementUsage = function(userId, projectId) {
  this.usage.totalUsed += 1;
  this.usage.lastUsed = new Date();
  this.usage.usedBy.push({
    user: userId,
    project: projectId
  });
  
  // 保持最近使用记录不超过100条
  if (this.usage.usedBy.length > 100) {
    this.usage.usedBy = this.usage.usedBy.slice(-100);
  }
  
  return this.save();
};

templateSchema.methods.clone = function(newName, userId) {
  const clonedTemplate = new this.constructor({
    name: newName,
    type: this.type,
    category: this.category,
    description: this.description + ' (克隆)',
    version: '1.0.0',
    isDefault: false,
    sections: this.sections,
    createdBy: userId,
    tags: [...this.tags, '克隆']
  });
  
  return clonedTemplate.save();
};

const Template = mongoose.model('Template', templateSchema);

module.exports = Template;