const mongoose = require('mongoose');

// 专业知识库模型
const knowledgeBaseSchema = new mongoose.Schema({
  // 知识条目基本信息
  title: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      '施工工艺', '质量控制', '安全措施', '技术方案',
      '材料选用', '设备配置', '检测方法', '验收标准',
      '风险控制', '成本控制', '进度管理', '环保措施'
    ]
  },
  category: {
    type: String,
    required: true,
    enum: [
      '土建工程', '钢结构工程', '机电工程', '装饰装修',
      '基础工程', '主体结构', '屋面工程', '防水工程',
      '暖通工程', '给排水', '电气工程', '智能化工程'
    ]
  },
  
  // 适用条件
  applicableConditions: {
    projectTypes: [String], // 适用项目类型
    buildingTypes: [String], // 适用建筑类型
    climateConditions: [String], // 适用气候条件
    soilConditions: [String], // 适用土质条件
    scaleRange: { // 适用规模范围
      minArea: Number,
      maxArea: Number,
      minFloors: Number,
      maxFloors: Number,
      minHeight: Number,
      maxHeight: Number
    },
    specialConditions: [String] // 特殊适用条件
  },
  
  // 知识内容
  content: {
    overview: String, // 概述
    principles: String, // 基本原理
    procedures: [{ // 施工程序
      step: Number,
      description: String,
      keyPoints: [String],
      duration: String,
      resources: [String]
    }],
    technicalRequirements: String, // 技术要求
    qualityStandards: String, // 质量标准
    safetyMeasures: String, // 安全措施
    materialRequirements: [{ // 材料要求
      name: String,
      specification: String,
      standard: String,
      quantity: String,
      qualityRequirements: String
    }],
    equipmentRequirements: [{ // 设备要求
      name: String,
      type: String,
      specification: String,
      quantity: String,
      performanceRequirements: String
    }],
    personnelRequirements: [{ // 人员要求
      position: String,
      qualifications: [String],
      responsibilities: String,
      quantity: String
    }]
  },
  
  // 技术参数
  technicalParameters: [{
    name: String,
    value: String,
    unit: String,
    tolerance: String,
    testMethod: String,
    frequency: String
  }],
  
  // 质量控制要点
  qualityControlPoints: [{
    phase: String, // 施工阶段
    controlItem: String, // 控制项目
    controlMethod: String, // 控制方法
    acceptanceCriteria: String, // 验收标准
    inspectionFrequency: String, // 检查频率
    responsibleParty: String // 责任方
  }],
  
  // 常见问题和解决方案
  commonIssues: [{
    problem: String,
    causes: [String],
    preventiveMeasures: [String],
    correctiveActions: [String],
    caseStudies: [String]
  }],
  
  // 成本参考
  costReference: {
    laborCost: {
      description: String,
      unit: String,
      estimatedCost: Number,
      factors: [String]
    },
    materialCost: {
      description: String,
      unit: String,
      estimatedCost: Number,
      factors: [String]
    },
    equipmentCost: {
      description: String,
      unit: String,
      estimatedCost: Number,
      factors: [String]
    },
    totalCostRange: {
      min: Number,
      max: Number,
      unit: String,
      baseYear: Number
    }
  },
  
  // 时间参考
  timeReference: {
    preparationTime: String,
    executionTime: String,
    completionTime: String,
    factors: [String] // 影响工期的因素
  },
  
  // 相关规范引用
  relatedStandards: [{
    code: String,
    name: String,
    clause: String,
    relevance: String
  }],
  
  // 案例研究
  caseStudies: [{
    projectName: String,
    projectType: String,
    scale: String,
    challenges: [String],
    solutions: [String],
    results: String,
    lessonsLearned: [String],
    images: [String],
    documents: [String]
  }],
  
  // 知识来源和可信度
  sources: [{
    type: String, // 来源类型：规范、教材、论文、工程实践等
    title: String,
    author: String,
    publisher: String,
    publishDate: Date,
    reliability: {
      type: String,
      enum: ['高', '中', '低'],
      default: '中'
    }
  }],
  
  // 专家评审
  expertReview: {
    reviewedBy: [{
      expert: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      reviewDate: Date,
      rating: {
        type: Number,
        min: 1,
        max: 5
      },
      comments: String
    }],
    averageRating: Number,
    lastReviewDate: Date
  },
  
  // 使用统计
  usage: {
    viewCount: {
      type: Number,
      default: 0
    },
    citationCount: {
      type: Number,
      default: 0
    },
    feedbackCount: {
      type: Number,
      default: 0
    },
    lastUsed: Date
  },
  
  // 版本控制
  version: {
    type: String,
    default: '1.0'
  },
  versionHistory: [{
    version: String,
    changeDate: Date,
    changeDescription: String,
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  
  // 创建和维护信息
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  maintainedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // 状态管理
  status: {
    type: String,
    enum: ['草稿', '待审核', '已发布', '已废弃'],
    default: '草稿'
  },
  
  tags: [String],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// 全文搜索索引
knowledgeBaseSchema.index({
  title: 'text',
  'content.overview': 'text',
  'content.technicalRequirements': 'text',
  tags: 'text'
});

// 其他索引
knowledgeBaseSchema.index({ type: 1, category: 1 });
knowledgeBaseSchema.index({ 'applicableConditions.projectTypes': 1 });
knowledgeBaseSchema.index({ status: 1, isActive: 1 });
knowledgeBaseSchema.index({ 'expertReview.averageRating': -1 });
knowledgeBaseSchema.index({ 'usage.citationCount': -1 });

// 静态方法
knowledgeBaseSchema.statics.findRelevantKnowledge = function(projectType, category, keywords) {
  const query = {
    'applicableConditions.projectTypes': projectType,
    category: category,
    status: '已发布',
    isActive: true
  };
  
  if (keywords) {
    query.$text = { $search: keywords };
  }
  
  return this.find(query)
    .sort({ 'expertReview.averageRating': -1, 'usage.citationCount': -1 })
    .limit(10);
};

knowledgeBaseSchema.statics.getQualityControlPoints = function(category, phase) {
  return this.aggregate([
    { $match: { category: category, status: '已发布', isActive: true } },
    { $unwind: '$qualityControlPoints' },
    { $match: { 'qualityControlPoints.phase': phase } },
    { $group: {
      _id: '$qualityControlPoints.controlItem',
      methods: { $addToSet: '$qualityControlPoints.controlMethod' },
      criteria: { $addToSet: '$qualityControlPoints.acceptanceCriteria' },
      frequency: { $first: '$qualityControlPoints.inspectionFrequency' }
    }}
  ]);
};

const KnowledgeBase = mongoose.model('KnowledgeBase', knowledgeBaseSchema);

module.exports = KnowledgeBase;