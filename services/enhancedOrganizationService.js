const handlebars = require('handlebars');
const moment = require('moment');
const StandardsLibrary = require('../models/StandardsLibrary');
const KnowledgeBase = require('../models/KnowledgeBase');

// 注册Handlebars助手
handlebars.registerHelper('formatDate', function(date, format) {
  if (!date) return '';
  return moment(date).format(format || 'YYYY年MM月DD日');
});

handlebars.registerHelper('formatNumber', function(number) {
  if (!number) return '0';
  return number.toLocaleString('zh-CN');
});

handlebars.registerHelper('ifEquals', function(arg1, arg2, options) {
  return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
});

/**
 * 增强版施工组织设计生成服务
 * 基于标准规范库和专业知识库生成高质量、专业的施工组织设计
 */
class EnhancedOrganizationService {
  
  /**
   * 生成施工组织设计
   * @param {Object} project - 项目对象
   * @param {Object} template - 模板对象
   * @param {Object} customVariables - 自定义变量
   * @param {Object} options - 生成选项
   * @returns {Object} 生成的内容
   */
  async generateOrganizationDesign(project, template, customVariables = {}, options = {}) {
    try {
      console.log('开始生成施工组织设计...');
      
      // 1. 获取相关标准规范
      const applicableStandards = await this.getApplicableStandards(project);
      console.log(`找到 ${applicableStandards.length} 个相关标准规范`);
      
      // 2. 获取专业知识
      const relevantKnowledge = await this.getRelevantKnowledge(project);
      console.log(`找到 ${relevantKnowledge.length} 个相关知识条目`);
      
      // 3. 分析项目特点和难点
      const projectAnalysis = await this.analyzeProject(project, relevantKnowledge);
      
      // 4. 生成质量控制要点
      const qualityControlPoints = await this.generateQualityControlPoints(project, relevantKnowledge);
      
      // 5. 生成安全措施
      const safetyMeasures = await this.generateSafetyMeasures(project, applicableStandards);
      
      // 6. 生成技术方案
      const technicalSolutions = await this.generateTechnicalSolutions(project, relevantKnowledge);
      
      // 7. 准备模板数据
      const templateData = await this.prepareEnhancedTemplateData(
        project, 
        customVariables,
        applicableStandards,
        relevantKnowledge,
        projectAnalysis,
        qualityControlPoints,
        safetyMeasures,
        technicalSolutions
      );
      
      // 8. 生成各个章节内容
      const generatedContent = {};
      const sections = template.sections;
      
      for (const sectionKey in sections) {
        const section = sections[sectionKey];
        
        if (section.template && section.required) {
          try {
            const compiledTemplate = handlebars.compile(section.template);
            generatedContent[sectionKey] = compiledTemplate(templateData);
            
            // 添加引用的标准规范
            if (options.includeReferences) {
              generatedContent[sectionKey] += this.generateReferences(applicableStandards, sectionKey);
            }
            
          } catch (error) {
            console.error(`生成${section.title}时出错:`, error);
            generatedContent[sectionKey] = await this.generateFallbackContent(sectionKey, templateData);
          }
        }
      }
      
      // 9. 添加质量保证信息
      generatedContent.qualityAssurance = {
        standardsUsed: applicableStandards.map(s => ({ code: s.code, name: s.name })),
        knowledgeSourcesCount: relevantKnowledge.length,
        generationTimestamp: new Date().toISOString(),
        confidenceLevel: this.calculateConfidenceLevel(applicableStandards, relevantKnowledge)
      };
      
      console.log('施工组织设计生成完成');
      return generatedContent;
      
    } catch (error) {
      console.error('生成施工组织设计失败:', error);
      throw new Error('生成施工组织设计失败: ' + error.message);
    }
  }
  
  /**
   * 获取适用的标准规范
   * @param {Object} project - 项目对象
   * @returns {Array} 标准规范列表
   */
  async getApplicableStandards(project) {
    try {
      const province = project.location?.province || '全国';
      const standards = await StandardsLibrary.findApplicableStandards(
        project.projectType,
        this.mapProjectTypeToCategory(project.projectType),
        province
      );
      
      return standards.slice(0, 20); // 限制数量，避免过多
    } catch (error) {
      console.error('获取标准规范失败:', error);
      return [];
    }
  }
  
  /**
   * 获取相关专业知识
   * @param {Object} project - 项目对象
   * @returns {Array} 知识条目列表
   */
  async getRelevantKnowledge(project) {
    try {
      const keywords = this.extractProjectKeywords(project);
      const knowledge = await KnowledgeBase.findRelevantKnowledge(
        project.projectType,
        this.mapProjectTypeToCategory(project.projectType),
        keywords
      );
      
      return knowledge;
    } catch (error) {
      console.error('获取专业知识失败:', error);
      return [];
    }
  }
  
  /**
   * 分析项目特点和难点
   * @param {Object} project - 项目对象
   * @param {Array} knowledge - 知识库条目
   * @returns {Object} 项目分析结果
   */
  async analyzeProject(project, knowledge) {
    const analysis = {
      features: [],
      difficulties: [],
      risks: [],
      opportunities: [],
      recommendations: []
    };
    
    // 基于项目类型的特点分析
    const typeFeatures = this.getProjectTypeFeatures(project.projectType);
    analysis.features.push(...typeFeatures);
    
    // 基于规模的特点分析
    const scaleFeatures = this.getProjectScaleFeatures(project.projectScale);
    analysis.features.push(...scaleFeatures);
    
    // 基于地理位置的特点分析
    const locationFeatures = this.getLocationFeatures(project.location);
    analysis.features.push(...locationFeatures);
    
    // 基于知识库的难点分析
    const knowledgeBasedDifficulties = this.extractDifficultiesFromKnowledge(knowledge, project);
    analysis.difficulties.push(...knowledgeBasedDifficulties);
    
    // 风险识别
    analysis.risks = this.identifyProjectRisks(project, knowledge);
    
    // 机会识别
    analysis.opportunities = this.identifyProjectOpportunities(project);
    
    // 专业建议
    analysis.recommendations = this.generateRecommendations(project, knowledge);
    
    return analysis;
  }
  
  /**
   * 生成质量控制要点
   * @param {Object} project - 项目对象
   * @param {Array} knowledge - 知识库条目
   * @returns {Array} 质量控制要点
   */
  async generateQualityControlPoints(project, knowledge) {
    const qualityPoints = [];
    
    // 从知识库提取质量控制要点
    for (const item of knowledge) {
      if (item.qualityControlPoints && item.qualityControlPoints.length > 0) {
        qualityPoints.push(...item.qualityControlPoints.map(point => ({
          ...point,
          source: item.title,
          category: item.category
        })));
      }
    }
    
    // 基于项目特点补充质量控制要点
    const projectSpecificPoints = this.getProjectSpecificQualityPoints(project);
    qualityPoints.push(...projectSpecificPoints);
    
    // 去重和排序
    return this.deduplicateAndSortQualityPoints(qualityPoints);
  }
  
  /**
   * 生成安全措施
   * @param {Object} project - 项目对象
   * @param {Array} standards - 标准规范
   * @returns {Object} 安全措施
   */
  async generateSafetyMeasures(project, standards) {
    const safetyMeasures = {
      generalMeasures: [],
      specificMeasures: [],
      emergencyProcedures: [],
      trainingRequirements: [],
      inspectionProtocols: []
    };
    
    // 从标准规范中提取安全要求
    for (const standard of standards) {
      if (standard.contents && standard.contents.safetyRequirements) {
        safetyMeasures.generalMeasures.push({
          content: standard.contents.safetyRequirements,
          source: standard.code,
          standardName: standard.name
        });
      }
    }
    
    // 基于项目特点的具体安全措施
    const projectSafetyMeasures = this.getProjectSpecificSafetyMeasures(project);
    safetyMeasures.specificMeasures.push(...projectSafetyMeasures);
    
    // 应急程序
    safetyMeasures.emergencyProcedures = this.generateEmergencyProcedures(project);
    
    // 培训要求
    safetyMeasures.trainingRequirements = this.generateTrainingRequirements(project);
    
    // 检查制度
    safetyMeasures.inspectionProtocols = this.generateInspectionProtocols(project);
    
    return safetyMeasures;
  }
  
  /**
   * 生成技术方案
   * @param {Object} project - 项目对象
   * @param {Array} knowledge - 知识库条目
   * @returns {Object} 技术方案
   */
  async generateTechnicalSolutions(project, knowledge) {
    const solutions = {
      constructionMethods: [],
      materialSolutions: [],
      equipmentSolutions: [],
      innovativeTechniques: []
    };
    
    // 从知识库提取施工方法
    for (const item of knowledge) {
      if (item.type === '施工工艺' && item.content.procedures) {
        solutions.constructionMethods.push({
          method: item.title,
          procedures: item.content.procedures,
          applicableConditions: item.applicableConditions,
          source: item.title
        });
      }
      
      if (item.content.materialRequirements) {
        solutions.materialSolutions.push(...item.content.materialRequirements);
      }
      
      if (item.content.equipmentRequirements) {
        solutions.equipmentSolutions.push(...item.content.equipmentRequirements);
      }
    }
    
    // 基于项目特点推荐创新技术
    solutions.innovativeTechniques = this.recommendInnovativeTechniques(project);
    
    return solutions;
  }
  
  /**
   * 准备增强版模板数据
   */
  async prepareEnhancedTemplateData(project, customVariables, standards, knowledge, analysis, qualityPoints, safetyMeasures, technicalSolutions) {
    const currentDate = new Date();
    
    return {
      // 基础项目信息
      project: {
        name: project.projectName,
        code: project.projectCode,
        type: project.projectType,
        constructionType: project.constructionType,
        scale: project.projectScale,
        location: project.location,
        schedule: project.projectSchedule
      },
      
      // 参建单位信息
      participants: project.participants,
      
      // 项目分析结果
      analysis: analysis,
      
      // 专业数据
      standards: standards,
      knowledge: knowledge,
      qualityControlPoints: qualityPoints,
      safetyMeasures: safetyMeasures,
      technicalSolutions: technicalSolutions,
      
      // 智能生成的目标
      targets: {
        quality: this.generateIntelligentQualityTarget(project, standards),
        safety: this.generateIntelligentSafetyTarget(project, safetyMeasures),
        schedule: this.generateIntelligentScheduleTarget(project, knowledge),
        cost: this.generateIntelligentCostTarget(project, technicalSolutions),
        environment: this.generateIntelligentEnvironmentTarget(project, standards)
      },
      
      // 时间信息
      dates: {
        current: currentDate,
        plannedStart: project.projectSchedule?.plannedStartDate,
        plannedEnd: project.projectSchedule?.plannedEndDate,
        totalDuration: project.projectSchedule?.totalDuration || 0
      },
      
      // 自定义变量
      custom: customVariables,
      
      // 系统生成信息
      generated: {
        timestamp: currentDate.toISOString(),
        version: '2.0',
        standardsCount: standards.length,
        knowledgeItemsCount: knowledge.length,
        qualityLevel: 'enhanced'
      }
    };
  }
  
  /**
   * 计算置信度
   */
  calculateConfidenceLevel(standards, knowledge) {
    let confidence = 0.5; // 基础置信度
    
    // 标准规范数量对置信度的影响
    confidence += Math.min(standards.length * 0.05, 0.3);
    
    // 知识条目数量对置信度的影响
    confidence += Math.min(knowledge.length * 0.02, 0.2);
    
    // 限制在0-1之间
    return Math.min(Math.max(confidence, 0), 1);
  }
  
  /**
   * 项目类型到类别的映射
   */
  mapProjectTypeToCategory(projectType) {
    const mapping = {
      '住宅建筑': '建筑工程',
      '商业建筑': '建筑工程',
      '工业建筑': '建筑工程',
      '公共建筑': '建筑工程',
      '基础设施': '市政工程',
      '市政工程': '市政工程',
      '水利工程': '水利工程',
      '交通工程': '公路工程',
      '能源工程': '工业建筑',
      '环保工程': '市政工程'
    };
    
    return mapping[projectType] || '建筑工程';
  }
  
  /**
   * 提取项目关键词
   */
  extractProjectKeywords(project) {
    const keywords = [];
    
    keywords.push(project.projectType);
    keywords.push(project.constructionType);
    
    if (project.projectScale) {
      if (project.projectScale.floors > 20) keywords.push('高层建筑');
      if (project.projectScale.buildingArea > 50000) keywords.push('大型工程');
    }
    
    if (project.location) {
      keywords.push(project.location.province);
      keywords.push(project.location.city);
    }
    
    return keywords.join(' ');
  }
  
  /**
   * 获取项目类型特点
   */
  getProjectTypeFeatures(projectType) {
    const features = {
      '住宅建筑': [
        '功能性要求高，需要满足居住舒适性和实用性要求',
        '户型设计多样化，平面布局相对复杂',
        '对保温隔热、隔声等性能要求较高',
        '装修标准要求符合居住需求'
      ],
      '商业建筑': [
        '商业功能导向明确，需要考虑商业流线设计',
        '空间灵活性要求高，后期改造可能性大',
        '装修标准高，机电设备系统复杂',
        '消防安全要求严格，人员疏散考虑周全'
      ],
      '工业建筑': [
        '结构承载能力要求高，跨度大无柱空间需求',
        '生产工艺要求特殊，施工精度要求高',
        '设备安装复杂，预留孔洞定位精确',
        '安全生产要求严格，防爆防腐考虑充分'
      ]
    };
    
    return features[projectType] || ['建筑功能要求特殊，技术标准要求高'];
  }
  
  /**
   * 生成备用内容
   */
  async generateFallbackContent(sectionKey, templateData) {
    const fallbackTemplates = {
      projectOverview: `
# 工程概况

## 工程基本情况
工程名称：${templateData.project.name}
工程地点：${templateData.project.location?.province || ''}${templateData.project.location?.city || ''}
项目类型：${templateData.project.type}
建设性质：${templateData.project.constructionType}

## 工程规模
${templateData.project.scale ? `
建筑面积：${templateData.project.scale.buildingArea || 0} 平方米
建筑层数：${templateData.project.scale.floors || 0} 层
建筑高度：${templateData.project.scale.height || 0} 米
` : ''}

## 参建单位
建设单位：${templateData.participants?.owner?.name || '待确定'}
设计单位：${templateData.participants?.designer?.name || '待确定'}
施工单位：${templateData.participants?.contractor?.name || '待确定'}
监理单位：${templateData.participants?.supervisor?.name || '待确定'}
      `,
      
      constructionDeployment: `
# 施工部署

## 施工目标
质量目标：${templateData.targets?.quality || '确保工程质量达到设计要求和验收标准'}
安全目标：${templateData.targets?.safety || '确保施工安全，无重大安全事故'}
工期目标：${templateData.targets?.schedule || '按计划完成施工任务'}

## 施工原则
1. 统一领导，精心组织，科学管理
2. 均衡施工，突出重点，确保质量
3. 安全第一，预防为主，文明施工
4. 保护环境，节约资源，绿色施工
      `
    };
    
    return fallbackTemplates[sectionKey] || `# ${sectionKey}\n\n内容生成中，请稍后完善...`;
  }
  
  // ... 其他辅助方法实现
  getProjectScaleFeatures(scale) { return []; }
  getLocationFeatures(location) { return []; }
  extractDifficultiesFromKnowledge(knowledge, project) { return []; }
  identifyProjectRisks(project, knowledge) { return []; }
  identifyProjectOpportunities(project) { return []; }
  generateRecommendations(project, knowledge) { return []; }
  getProjectSpecificQualityPoints(project) { return []; }
  deduplicateAndSortQualityPoints(points) { return points; }
  getProjectSpecificSafetyMeasures(project) { return []; }
  generateEmergencyProcedures(project) { return []; }
  generateTrainingRequirements(project) { return []; }
  generateInspectionProtocols(project) { return []; }
  recommendInnovativeTechniques(project) { return []; }
  generateIntelligentQualityTarget(project, standards) { return '确保工程质量达到设计要求'; }
  generateIntelligentSafetyTarget(project, safety) { return '确保施工安全'; }
  generateIntelligentScheduleTarget(project, knowledge) { return '按期完成施工'; }
  generateIntelligentCostTarget(project, solutions) { return '控制工程成本'; }
  generateIntelligentEnvironmentTarget(project, standards) { return '保护施工环境'; }
  generateReferences(standards, sectionKey) { return ''; }
}

module.exports = new EnhancedOrganizationService();