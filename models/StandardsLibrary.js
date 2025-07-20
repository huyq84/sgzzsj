const mongoose = require('mongoose');

// 工程标准规范库模型
const standardsLibrarySchema = new mongoose.Schema({
  // 规范基本信息
  code: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      '国家标准', '行业标准', '地方标准', '企业标准',
      '设计规范', '施工规范', '验收规范', '质量标准',
      '安全规范', '环保标准', '技术规程'
    ]
  },
  category: {
    type: String,
    required: true,
    enum: [
      '建筑工程', '结构工程', '机电工程', '装饰工程',
      '市政工程', '水利工程', '公路工程', '桥梁工程',
      '隧道工程', '园林工程'
    ]
  },
  
  // 规范详细信息
  version: {
    type: String,
    required: true
  },
  publishDate: {
    type: Date,
    required: true
  },
  effectiveDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['现行', '废止', '修订中'],
    default: '现行'
  },
  
  // 适用范围
  applicableScope: {
    projectTypes: [String], // 适用的项目类型
    buildingTypes: [String], // 适用的建筑类型
    regions: [String], // 适用地区
    climateZones: [String] // 适用气候区
  },
  
  // 规范内容结构化存储
  contents: {
    generalProvisions: String, // 总则
    terms: [{ // 术语定义
      term: String,
      definition: String
    }],
    basicRequirements: String, // 基本规定
    technicalRequirements: [{ // 技术要求
      section: String,
      content: String,
      parameters: [{
        name: String,
        value: String,
        unit: String,
        condition: String
      }]
    }],
    constructionRequirements: String, // 施工要求
    qualityControl: String, // 质量控制
    safetyRequirements: String, // 安全要求
    acceptanceCriteria: String // 验收标准
  },
  
  // 关键技术参数
  technicalParameters: [{
    category: String, // 参数类别
    name: String, // 参数名称
    value: String, // 参数值
    unit: String, // 单位
    condition: String, // 适用条件
    reference: String // 参考条款
  }],
  
  // 常用条款和要求
  commonClauses: [{
    clauseNumber: String,
    title: String,
    content: String,
    category: String, // 分类：质量、安全、进度、成本等
    importance: {
      type: String,
      enum: ['强制性', '推荐性', '参考性'],
      default: '推荐性'
    }
  }],
  
  // 相关标准引用
  relatedStandards: [{
    code: String,
    name: String,
    relationship: String // 引用关系：配套使用、参考、替代等
  }],
  
  // 更新历史
  revisionHistory: [{
    version: String,
    changeDate: Date,
    changeDescription: String,
    changedBy: String
  }],
  
  // 使用统计
  usage: {
    citationCount: {
      type: Number,
      default: 0
    },
    lastUsed: Date,
    popularClauses: [String] // 最常引用的条款
  },
  
  // 质量控制
  qualityReview: {
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewDate: Date,
    reviewStatus: {
      type: String,
      enum: ['未审核', '已审核', '需要更新'],
      default: '未审核'
    },
    reviewComments: String
  },
  
  tags: [String],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// 索引优化
standardsLibrarySchema.index({ code: 1, version: 1 });
standardsLibrarySchema.index({ type: 1, category: 1 });
standardsLibrarySchema.index({ 'applicableScope.projectTypes': 1 });
standardsLibrarySchema.index({ status: 1, isActive: 1 });
standardsLibrarySchema.index({ tags: 1 });

// 静态方法
standardsLibrarySchema.statics.findApplicableStandards = function(projectType, category, region) {
  return this.find({
    'applicableScope.projectTypes': projectType,
    category: category,
    'applicableScope.regions': { $in: [region, '全国'] },
    status: '现行',
    isActive: true
  }).sort({ 'usage.citationCount': -1 });
};

standardsLibrarySchema.statics.getCommonClauses = function(category, importance) {
  return this.aggregate([
    { $match: { status: '现行', isActive: true } },
    { $unwind: '$commonClauses' },
    { $match: { 
      'commonClauses.category': category,
      'commonClauses.importance': importance
    }},
    { $group: {
      _id: '$commonClauses.content',
      count: { $sum: 1 },
      standards: { $push: '$code' },
      clause: { $first: '$commonClauses' }
    }},
    { $sort: { count: -1 } },
    { $limit: 20 }
  ]);
};

const StandardsLibrary = mongoose.model('StandardsLibrary', standardsLibrarySchema);

module.exports = StandardsLibrary;