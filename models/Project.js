const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const projectSchema = new mongoose.Schema({
  projectName: {
    type: String,
    required: true,
    trim: true
  },
  projectCode: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  projectType: {
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
  constructionType: {
    type: String,
    required: true,
    enum: ['新建', '改建', '扩建', '维修', '加固', '拆除']
  },
  projectScale: {
    buildingArea: {
      type: Number,
      min: 0
    },
    floors: {
      type: Number,
      min: 0
    },
    height: {
      type: Number,
      min: 0
    },
    investment: {
      type: Number,
      min: 0
    },
    contractValue: {
      type: Number,
      min: 0
    }
  },
  location: {
    province: String,
    city: String,
    district: String,
    address: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  projectSchedule: {
    plannedStartDate: Date,
    plannedEndDate: Date,
    actualStartDate: Date,
    actualEndDate: Date,
    totalDuration: Number, // 天数
    currentPhase: {
      type: String,
      enum: ['前期准备', '基础施工', '主体施工', '装饰装修', '机电安装', '竣工验收', '已完工'],
      default: '前期准备'
    }
  },
  participants: {
    owner: {
      name: String,
      contact: String,
      address: String
    },
    contractor: {
      name: String,
      contact: String,
      address: String,
      qualificationLevel: String
    },
    supervisor: {
      name: String,
      contact: String,
      address: String
    },
    designer: {
      name: String,
      contact: String,
      address: String
    }
  },
  organizationDesign: {
    type: {
      type: String,
      enum: ['投标阶段', '施工阶段'],
      required: true
    },
    status: {
      type: String,
      enum: ['未开始', '进行中', '已完成', '需要修订'],
      default: '未开始'
    },
    lastGenerated: Date,
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    template: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Template'
    },
    sections: {
      projectOverview: {
        completed: { type: Boolean, default: false },
        content: String,
        lastUpdated: Date
      },
      constructionDeployment: {
        completed: { type: Boolean, default: false },
        content: String,
        lastUpdated: Date
      },
      constructionSchedule: {
        completed: { type: Boolean, default: false },
        content: String,
        lastUpdated: Date
      },
      resourceAllocation: {
        completed: { type: Boolean, default: false },
        content: String,
        lastUpdated: Date
      },
      qualityControl: {
        completed: { type: Boolean, default: false },
        content: String,
        lastUpdated: Date
      },
      safetyMeasures: {
        completed: { type: Boolean, default: false },
        content: String,
        lastUpdated: Date
      },
      environmentalProtection: {
        completed: { type: Boolean, default: false },
        content: String,
        lastUpdated: Date
      },
      costControl: {
        completed: { type: Boolean, default: false },
        content: String,
        lastUpdated: Date
      },
      riskManagement: {
        completed: { type: Boolean, default: false },
        content: String,
        lastUpdated: Date
      }
    }
  },
  documents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document'
  }],
  teamMembers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['项目经理', '技术负责人', '施工员', '质量员', '安全员', '材料员', '资料员', '监理工程师']
    },
    permissions: [{
      type: String,
      enum: ['读取', '编辑', '审核', '审批', '删除']
    }],
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  tags: [String],
  notes: String
}, {
  timestamps: true
});

// 添加分页插件
projectSchema.plugin(mongoosePaginate);

// 索引
projectSchema.index({ projectCode: 1 });
projectSchema.index({ projectName: 'text', 'location.city': 'text' });
projectSchema.index({ createdBy: 1 });
projectSchema.index({ 'organizationDesign.status': 1 });

// 虚拟字段
projectSchema.virtual('completionPercentage').get(function() {
  const sections = this.organizationDesign.sections;
  const totalSections = Object.keys(sections).length;
  const completedSections = Object.values(sections).filter(section => section.completed).length;
  return Math.round((completedSections / totalSections) * 100);
});

// 方法
projectSchema.methods.updateProgress = function(sectionName, content) {
  if (this.organizationDesign.sections[sectionName]) {
    this.organizationDesign.sections[sectionName].content = content;
    this.organizationDesign.sections[sectionName].completed = true;
    this.organizationDesign.sections[sectionName].lastUpdated = new Date();
  }
  return this.save();
};

projectSchema.methods.addTeamMember = function(userId, role, permissions) {
  this.teamMembers.push({
    user: userId,
    role: role,
    permissions: permissions || ['读取']
  });
  return this.save();
};

projectSchema.methods.removeTeamMember = function(userId) {
  this.teamMembers = this.teamMembers.filter(member => 
    member.user.toString() !== userId.toString()
  );
  return this.save();
};

const Project = mongoose.model('Project', projectSchema);

module.exports = Project;