const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  mimetype: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  uploadPath: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: [
      '投标文件',
      '设计图纸',
      '技术规范',
      '合同文件',
      '施工方案',
      '质量文件',
      '安全文件',
      '进度文件',
      '成本文件',
      '验收文件',
      '其他文件'
    ]
  },
  subcategory: {
    type: String,
    enum: [
      // 投标文件子类
      '商务标',
      '技术标',
      '资格标',
      
      // 设计图纸子类
      '建筑图',
      '结构图',
      '机电图',
      '装修图',
      '景观图',
      
      // 技术规范子类
      '设计规范',
      '施工规范',
      '验收规范',
      '安全规范',
      '质量标准',
      
      // 施工方案子类
      '总体方案',
      '专项方案',
      '应急预案',
      '技术交底',
      
      // 其他
      '现场照片',
      '检测报告',
      '会议纪要',
      '变更文件'
    ]
  },
  description: {
    type: String,
    trim: true
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  version: {
    type: String,
    default: '1.0'
  },
  status: {
    type: String,
    enum: ['待审核', '已审核', '已驳回', '已归档'],
    default: '待审核'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date,
  reviewComments: String,
  tags: [String],
  metadata: {
    // 针对不同类型文件的元数据
    pageCount: Number,       // PDF页数
    drawingNumber: String,   // 图纸编号
    drawingVersion: String,  // 图纸版本
    scale: String,          // 图纸比例
    discipline: String,     // 专业
    dateCreated: Date,      // 文件创建日期
    dateModified: Date,     // 文件修改日期
    author: String,         // 文件作者
    software: String,       // 制作软件
    keywords: [String],     // 关键词
    
    // 解析后的文本内容（用于搜索）
    extractedText: String,
    
    // 缩略图路径
    thumbnailPath: String
  },
  accessControl: {
    isPublic: {
      type: Boolean,
      default: false
    },
    allowedUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    allowedRoles: [{
      type: String,
      enum: ['项目经理', '技术负责人', '施工员', '质量员', '安全员', '材料员', '资料员', '监理工程师']
    }]
  },
  downloadCount: {
    type: Number,
    default: 0
  },
  lastDownloaded: Date,
  isArchived: {
    type: Boolean,
    default: false
  },
  archivedAt: Date,
  archivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// 索引
documentSchema.index({ project: 1, category: 1 });
documentSchema.index({ uploadedBy: 1 });
documentSchema.index({ originalName: 'text', description: 'text', 'metadata.extractedText': 'text' });
documentSchema.index({ tags: 1 });
documentSchema.index({ status: 1 });
documentSchema.index({ createdAt: -1 });

// 虚拟字段
documentSchema.virtual('sizeFormatted').get(function() {
  const bytes = this.size;
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
});

documentSchema.virtual('fileExtension').get(function() {
  return this.originalName.split('.').pop().toLowerCase();
});

// 静态方法
documentSchema.statics.findByProject = function(projectId, category = null) {
  const query = { project: projectId, isArchived: false };
  if (category) query.category = category;
  
  return this.find(query)
    .populate('uploadedBy', 'fullName username')
    .populate('reviewedBy', 'fullName username')
    .sort({ createdAt: -1 });
};

documentSchema.statics.searchDocuments = function(projectId, searchTerm) {
  return this.find({
    project: projectId,
    isArchived: false,
    $text: { $search: searchTerm }
  }, {
    score: { $meta: 'textScore' }
  })
  .populate('uploadedBy', 'fullName username')
  .sort({ score: { $meta: 'textScore' } });
};

// 实例方法
documentSchema.methods.incrementDownload = function() {
  this.downloadCount += 1;
  this.lastDownloaded = new Date();
  return this.save();
};

documentSchema.methods.archive = function(userId) {
  this.isArchived = true;
  this.archivedAt = new Date();
  this.archivedBy = userId;
  return this.save();
};

documentSchema.methods.restore = function() {
  this.isArchived = false;
  this.archivedAt = null;
  this.archivedBy = null;
  return this.save();
};

documentSchema.methods.approve = function(userId, comments = '') {
  this.status = '已审核';
  this.reviewedBy = userId;
  this.reviewedAt = new Date();
  this.reviewComments = comments;
  return this.save();
};

documentSchema.methods.reject = function(userId, comments) {
  this.status = '已驳回';
  this.reviewedBy = userId;
  this.reviewedAt = new Date();
  this.reviewComments = comments;
  return this.save();
};

documentSchema.methods.hasAccess = function(user) {
  // 如果是公开文件
  if (this.accessControl.isPublic) return true;
  
  // 如果是上传者
  if (this.uploadedBy.toString() === user._id.toString()) return true;
  
  // 如果在允许用户列表中
  if (this.accessControl.allowedUsers.includes(user._id)) return true;
  
  // 如果用户角色在允许角色列表中
  const userProjectRole = user.getProjectRole ? user.getProjectRole(this.project) : null;
  if (userProjectRole && this.accessControl.allowedRoles.includes(userProjectRole)) return true;
  
  // 管理员有所有权限
  if (user.role === 'admin') return true;
  
  return false;
};

const Document = mongoose.model('Document', documentSchema);

module.exports = Document;