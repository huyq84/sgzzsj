const getLLMManager = require('./LLMManager');
const StandardsLibrary = require('../models/StandardsLibrary');
const KnowledgeBase = require('../models/KnowledgeBase');
const Document = require('../models/Document');
const VectorDBManager = require('../scripts/vectorDBManager');

/**
 * 增强版RAG (检索增强生成) 服务
 * 整合多个LLM提供商和专业知识库
 */
class EnhancedRAGService {
  
  constructor() {
    this.llmManager = getLLMManager();
    this.vectorDBManager = new VectorDBManager();
    this.isInitialized = false;
  }
  
  /**
   * 初始化服务
   */
  async initialize() {
    if (this.isInitialized) return;
    
    console.log('初始化增强版RAG服务...');
    
    // 初始化LLM管理器
    await this.llmManager.initialize();
    
    // 初始化向量数据库管理器
    await this.vectorDBManager.initializeClient();
    
    this.isInitialized = true;
    console.log('增强版RAG服务初始化完成');
  }
  
  /**
   * 生成施工组织设计
   * @param {Object} project - 项目信息
   * @param {Object} template - 模板信息
   * @param {Object} options - 生成选项
   * @returns {Object} 生成结果
   */
  async generateOrganizationDesign(project, template, options = {}) {
    await this.initialize();
    
    try {
      console.log('开始RAG增强版施工组织设计生成...');
      
      // 1. 构建查询上下文
      const queryContext = await this.buildQueryContext(project, options);
      
      // 2. 检索相关知识
      const retrievedKnowledge = await this.retrieveKnowledge(queryContext, options);
      
      // 3. 生成每个章节
      const generatedSections = {};
      const sections = template.sections;
      
      for (const [sectionKey, sectionConfig] of Object.entries(sections)) {
        if (sectionConfig.required) {
          console.log(`正在生成章节: ${sectionConfig.title}`);
          
          generatedSections[sectionKey] = await this.generateSection(
            sectionKey,
            sectionConfig,
            project,
            retrievedKnowledge,
            options
          );
        }
      }
      
      // 4. 后处理和质量检查
      const finalResult = await this.postProcessContent(
        generatedSections,
        project,
        retrievedKnowledge,
        options
      );
      
      console.log('RAG增强版施工组织设计生成完成');
      return finalResult;
      
    } catch (error) {
      console.error('RAG生成失败:', error);
      throw new Error('RAG生成失败: ' + error.message);
    }
  }
  
  /**
   * 构建查询上下文
   */
  async buildQueryContext(project, options) {
    const context = {
      projectInfo: {
        name: project.projectName,
        type: project.projectType,
        scale: project.projectScale,
        location: project.location,
        constructionType: project.constructionType,
        participants: project.participants,
        schedule: project.projectSchedule
      },
      
      // 生成查询关键词
      keywords: this.extractKeywords(project),
      
      // 用户偏好
      userPreferences: {
        provider: options.preferredProvider,
        model: options.preferredModel,
        detailLevel: options.detailLevel || 'standard',
        includeReferences: options.includeReferences !== false,
        language: options.language || 'zh-CN'
      },
      
      // 上下文约束
      constraints: {
        maxSections: options.maxSections || 20,
        maxWordsPerSection: options.maxWordsPerSection || 2000,
        requiredStandards: options.requiredStandards || [],
        excludeContent: options.excludeContent || []
      }
    };
    
    return context;
  }
  
  /**
   * 检索相关知识
   */
  async retrieveKnowledge(context, options) {
    const knowledge = {
      standards: [],
      knowledgeBase: [],
      documents: [],
      vectorResults: [],
      metadata: {
        totalSources: 0,
        retrievalTime: 0,
        relevanceScores: []
      }
    };
    
    const startTime = Date.now();
    
    try {
      // 并行检索各种知识源
      const [standards, knowledgeItems, documents, vectorResults] = await Promise.all([
        this.retrieveStandards(context),
        this.retrieveKnowledgeBase(context),
        this.retrieveProjectDocuments(context),
        this.retrieveFromVectorDB(context, options)
      ]);
      
      knowledge.standards = standards;
      knowledge.knowledgeBase = knowledgeItems;
      knowledge.documents = documents;
      knowledge.vectorResults = vectorResults;
      
      // 计算总数和相关性
      knowledge.metadata.totalSources = 
        standards.length + knowledgeItems.length + documents.length + vectorResults.length;
      knowledge.metadata.retrievalTime = Date.now() - startTime;
      
      // 重新排序和筛选
      const rankedKnowledge = await this.rankAndFilterKnowledge(knowledge, context);
      
      console.log(`知识检索完成，共找到 ${knowledge.metadata.totalSources} 个相关条目`);
      return rankedKnowledge;
      
    } catch (error) {
      console.error('知识检索失败:', error);
      knowledge.metadata.retrievalTime = Date.now() - startTime;
      return knowledge;
    }
  }
  
  /**
   * 生成单个章节
   */
  async generateSection(sectionKey, sectionConfig, project, knowledge, options) {
    try {
      // 1. 准备章节特定的上下文
      const sectionContext = this.prepareSectionContext(
        sectionKey, 
        sectionConfig, 
        project, 
        knowledge, 
        options
      );
      
      // 2. 构建提示词
      const prompt = this.buildSectionPrompt(sectionKey, sectionContext, options);
      
      // 3. 选择合适的模型和提供商
      const generationOptions = this.selectGenerationOptions(sectionKey, options);
      
      // 4. 生成内容
      const result = await this.llmManager.generateText(
        prompt.messages,
        generationOptions
      );
      
      // 5. 后处理章节内容
      const processedContent = this.processSectionContent(
        result.content,
        sectionKey,
        knowledge,
        options
      );
      
      return {
        content: processedContent,
        metadata: {
          ...result.metadata,
          sectionKey: sectionKey,
          generationTime: Date.now(),
          knowledgeSourcesUsed: this.getUsedSources(knowledge, sectionKey),
          qualityScore: this.assessContentQuality(processedContent, sectionContext)
        }
      };
      
    } catch (error) {
      console.error(`生成章节 ${sectionKey} 失败:`, error);
      
      // 使用备用生成方法
      return await this.generateFallbackSection(sectionKey, sectionConfig, project, knowledge);
    }
  }
  
  /**
   * 准备章节特定上下文
   */
  prepareSectionContext(sectionKey, sectionConfig, project, knowledge, options) {
    // 筛选与当前章节相关的知识
    const relevantKnowledge = this.filterKnowledgeForSection(knowledge, sectionKey);
    
    return {
      section: {
        key: sectionKey,
        title: sectionConfig.title,
        description: sectionConfig.description,
        requirements: sectionConfig.requirements || []
      },
      project: project,
      knowledge: relevantKnowledge,
      templates: this.getSectionTemplates(sectionKey),
      examples: this.getSectionExamples(sectionKey, project.projectType),
      constraints: {
        maxLength: options.maxWordsPerSection || 2000,
        includeReferences: options.includeReferences !== false,
        detailLevel: options.detailLevel || 'standard'
      }
    };
  }
  
  /**
   * 构建章节提示词
   */
  buildSectionPrompt(sectionKey, context, options) {
    const systemPrompt = this.getSystemPrompt(sectionKey, options);
    const userPrompt = this.getUserPrompt(sectionKey, context, options);
    
    return {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    };
  }
  
  /**
   * 获取系统提示词
   */
  getSystemPrompt(sectionKey, options) {
    const basePrompt = `你是一位资深的建筑工程专家，专门负责编写施工组织设计。你的任务是基于提供的项目信息和检索到的专业知识，生成专业、准确、符合规范的施工组织设计内容。

要求：
1. 严格按照国家和行业标准规范
2. 内容具体、可操作性强
3. 语言规范、逻辑清晰
4. 适当引用相关标准条文
5. 结合项目实际情况
6. 确保内容的完整性和一致性
7. 避免模糊和泛泛而谈的表述`;

    const sectionSpecificPrompts = {
      projectOverview: `${basePrompt}

当前任务：编写"工程概况"部分
- 全面介绍项目基本情况
- 分析工程特点和难点
- 说明适用的主要技术标准
- 突出项目的特殊性和复杂性`,

      constructionDeployment: `${basePrompt}

当前任务：编写"施工部署"部分
- 制定明确的施工目标
- 设计合理的组织架构
- 确定科学的部署原则
- 安排有序的施工顺序`,

      qualityControl: `${basePrompt}

当前任务：编写"质量保证措施"部分
- 建立完善的质量管理体系
- 制定具体的质量控制措施
- 明确质量检验标准和方法
- 确保质量目标的实现`,

      safetyMeasures: `${basePrompt}

当前任务：编写"安全保证措施"部分
- 建立全面的安全管理制度
- 制定针对性的安全技术措施
- 制定详细的应急预案
- 确保施工全过程安全`
    };

    return sectionSpecificPrompts[sectionKey] || basePrompt;
  }
  
  /**
   * 获取用户提示词
   */
  getUserPrompt(sectionKey, context, options) {
    let prompt = `请基于以下信息生成${context.section.title}：

## 项目基本信息
- 工程名称：${context.project.projectName}
- 工程类型：${context.project.projectType}
- 建设性质：${context.project.constructionType}
- 建设地点：${context.project.location?.province || ''}${context.project.location?.city || ''}`;

    if (context.project.projectScale) {
      prompt += `
- 建筑面积：${context.project.projectScale.buildingArea || '待定'} 平方米
- 建筑层数：${context.project.projectScale.floors || '待定'} 层
- 建筑高度：${context.project.projectScale.height || '待定'} 米
- 合同金额：${context.project.projectScale.contractValue || '待定'} 万元`;
    }

    // 添加参建单位信息
    if (context.project.participants) {
      prompt += `

## 参建单位
- 建设单位：${context.project.participants.owner?.name || '待定'}
- 设计单位：${context.project.participants.designer?.name || '待定'}
- 施工单位：${context.project.participants.contractor?.name || '待定'}
- 监理单位：${context.project.participants.supervisor?.name || '待定'}`;
    }

    // 添加相关标准规范
    if (context.knowledge.standards && context.knowledge.standards.length > 0) {
      prompt += `

## 相关标准规范
${context.knowledge.standards.slice(0, 8).map(s => `- ${s.code} ${s.name}`).join('\n')}`;
    }

    // 添加专业知识要点
    if (context.knowledge.knowledgeBase && context.knowledge.knowledgeBase.length > 0) {
      prompt += `

## 专业技术要点
${context.knowledge.knowledgeBase.slice(0, 5).map(k => `- ${k.title}: ${k.content?.overview || k.content || ''}`).join('\n')}`;
    }

    // 添加生成要求
    prompt += `

## 生成要求
1. 内容详实，重点突出
2. 符合建筑工程规范要求
3. 结合项目实际特点
4. 逻辑清晰，条理分明
5. 字数控制在 ${context.constraints.maxLength} 字以内`;

    if (context.constraints.includeReferences) {
      prompt += `
6. 适当引用相关标准规范条文`;
    }

    return prompt;
  }
  
  /**
   * 选择生成选项
   */
  selectGenerationOptions(sectionKey, options) {
    const generationOptions = {
      maxTokens: options.maxTokens || 2000,
      temperature: options.temperature || 0.3,
      provider: options.preferredProvider,
      model: options.preferredModel
    };

    // 根据章节类型调整参数
    const sectionSettings = {
      projectOverview: { temperature: 0.2 }, // 更确定的内容
      qualityControl: { temperature: 0.1 }, // 严格按规范
      safetyMeasures: { temperature: 0.1 }, // 安全措施要求严格
      constructionDeployment: { temperature: 0.3 }, // 允许一定创新
      resourceAllocation: { temperature: 0.4 } // 资源配置可以更灵活
    };

    return {
      ...generationOptions,
      ...(sectionSettings[sectionKey] || {})
    };
  }

  // 辅助方法实现
  extractKeywords(project) {
    const keywords = [
      project.projectType,
      project.constructionType,
      project.location?.province,
      project.location?.city
    ];

    if (project.projectScale) {
      if (project.projectScale.floors > 20) keywords.push('高层建筑');
      if (project.projectScale.buildingArea > 50000) keywords.push('大型工程');
      if (project.projectScale.height > 100) keywords.push('超高层');
    }

    return keywords.filter(k => k).join(' ');
  }

  async retrieveStandards(context) {
    try {
      const standards = await StandardsLibrary.findApplicableStandards(
        context.projectInfo.type,
        this.mapProjectTypeToCategory(context.projectInfo.type),
        context.projectInfo.location?.province || '全国'
      );
      return standards.slice(0, 15);
    } catch (error) {
      console.error('检索标准规范失败:', error);
      return [];
    }
  }

  async retrieveKnowledgeBase(context) {
    try {
      const knowledge = await KnowledgeBase.findRelevantKnowledge(
        context.projectInfo.type,
        this.mapProjectTypeToCategory(context.projectInfo.type),
        context.keywords
      );
      return knowledge.slice(0, 20);
    } catch (error) {
      console.error('检索知识库失败:', error);
      return [];
    }
  }

  async retrieveProjectDocuments(context) {
    try {
      // 这里可以根据项目ID检索相关文档
      return [];
    } catch (error) {
      console.error('检索项目文档失败:', error);
      return [];
    }
  }

  async retrieveFromVectorDB(context, options) {
    try {
      return await this.vectorDBManager.searchSimilar(context.keywords, 10);
    } catch (error) {
      console.error('向量数据库检索失败:', error);
      return [];
    }
  }

  async rankAndFilterKnowledge(knowledge, context) {
    // 简单的排序和过滤逻辑
    return knowledge;
  }

  filterKnowledgeForSection(knowledge, sectionKey) {
    // 根据章节过滤相关知识
    return knowledge;
  }

  processSectionContent(content, sectionKey, knowledge, options) {
    // 后处理内容，添加引用等
    return content;
  }

  getUsedSources(knowledge, sectionKey) {
    return [];
  }

  assessContentQuality(content, context) {
    // 简单的质量评估
    return 0.8;
  }

  async generateFallbackSection(sectionKey, sectionConfig, project, knowledge) {
    return {
      content: `# ${sectionConfig.title}\n\n基于项目"${project.projectName}"的基本信息生成。\n\n请专业工程师进一步完善此章节内容。`,
      metadata: {
        isFallback: true,
        generationTime: Date.now()
      }
    };
  }

  getSectionTemplates(sectionKey) {
    return [];
  }

  getSectionExamples(sectionKey, projectType) {
    return [];
  }

  mapProjectTypeToCategory(projectType) {
    const mapping = {
      '住宅建筑': '建筑工程',
      '商业建筑': '建筑工程',
      '工业建筑': '建筑工程',
      '公共建筑': '建筑工程',
      '基础设施': '市政工程'
    };
    return mapping[projectType] || '建筑工程';
  }

  async postProcessContent(sections, project, knowledge, options) {
    return {
      sections: sections,
      metadata: {
        generationTimestamp: new Date().toISOString(),
        totalSections: Object.keys(sections).length,
        knowledgeSourcesUsed: knowledge.metadata.totalSources,
        qualityLevel: 'enhanced',
        providerUsed: this.llmManager.activeProvider?.name,
        version: '2.0'
      }
    };
  }

  /**
   * 获取系统状态
   */
  async getSystemStatus() {
    const llmStatus = await this.llmManager.getSystemStatus();
    const costStats = this.llmManager.getCostStatistics();

    return {
      rag: {
        isInitialized: this.isInitialized,
        lastInitialization: new Date().toISOString()
      },
      llm: llmStatus,
      costs: costStats,
      vectorDB: {
        type: process.env.VECTOR_DB_TYPE || 'none',
        isConnected: this.vectorDBManager.client !== null
      }
    };
  }

  /**
   * 切换LLM提供商
   */
  async switchLLMProvider(providerName) {
    return await this.llmManager.switchProvider(providerName);
  }

  /**
   * 获取可用模型列表
   */
  async getAvailableModels() {
    return await this.llmManager.getAvailableModels();
  }
}

// 单例模式
let instance = null;

function getEnhancedRAGService() {
  if (!instance) {
    instance = new EnhancedRAGService();
  }
  return instance;
}

module.exports = getEnhancedRAGService;