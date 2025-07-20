const OpenAIProvider = require('./llmProviders/OpenAIProvider');
const ClaudeProvider = require('./llmProviders/ClaudeProvider');
const QianfanProvider = require('./llmProviders/QianfanProvider');
const LocalLLMProvider = require('./llmProviders/LocalLLMProvider');

/**
 * 大语言模型管理器
 * 统一管理多个LLM提供商，支持自动切换和负载均衡
 */
class LLMManager {
  
  constructor() {
    this.providers = new Map();
    this.activeProvider = null;
    this.fallbackProviders = [];
    this.config = this.loadConfig();
  }
  
  /**
   * 加载配置
   */
  loadConfig() {
    return {
      // 默认提供商
      defaultProvider: process.env.LLM_DEFAULT_PROVIDER || 'openai',
      
      // 启用的提供商列表
      enabledProviders: (process.env.LLM_ENABLED_PROVIDERS || 'openai,qianfan,local').split(','),
      
      // 自动故障转移
      autoFailover: process.env.LLM_AUTO_FAILOVER === 'true',
      
      // 负载均衡策略 (round_robin, weighted, cost_optimized)
      loadBalancingStrategy: process.env.LLM_LOAD_BALANCING || 'cost_optimized',
      
      // 重试配置
      maxRetries: parseInt(process.env.LLM_MAX_RETRIES) || 3,
      retryDelay: parseInt(process.env.LLM_RETRY_DELAY) || 1000,
      
      // 健康检查
      healthCheckInterval: parseInt(process.env.LLM_HEALTH_CHECK_INTERVAL) || 300000, // 5分钟
      
      // 提供商配置
      providerConfigs: {
        openai: {
          apiKey: process.env.OPENAI_API_KEY,
          baseURL: process.env.OPENAI_BASE_URL,
          model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
          embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-ada-002',
          maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 2000,
          temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.3
        },
        claude: {
          apiKey: process.env.CLAUDE_API_KEY,
          baseURL: process.env.CLAUDE_BASE_URL,
          model: process.env.CLAUDE_MODEL || 'claude-3-sonnet-20240229',
          maxTokens: parseInt(process.env.CLAUDE_MAX_TOKENS) || 2000,
          temperature: parseFloat(process.env.CLAUDE_TEMPERATURE) || 0.3
        },
        qianfan: {
          apiKey: process.env.QIANFAN_API_KEY,
          secretKey: process.env.QIANFAN_SECRET_KEY,
          baseURL: process.env.QIANFAN_BASE_URL,
          model: process.env.QIANFAN_MODEL || 'ERNIE-Bot-turbo',
          maxTokens: parseInt(process.env.QIANFAN_MAX_TOKENS) || 2000,
          temperature: parseFloat(process.env.QIANFAN_TEMPERATURE) || 0.3
        },
        local: {
          baseURL: process.env.LOCAL_LLM_URL || 'http://localhost:11434',
          serverType: process.env.LOCAL_LLM_TYPE || 'ollama',
          model: process.env.LOCAL_LLM_MODEL || 'llama2:7b-chat',
          embeddingModel: process.env.LOCAL_EMBEDDING_MODEL || 'nomic-embed-text',
          maxTokens: parseInt(process.env.LOCAL_MAX_TOKENS) || 2000,
          temperature: parseFloat(process.env.LOCAL_TEMPERATURE) || 0.3,
          timeout: parseInt(process.env.LOCAL_TIMEOUT) || 60000
        }
      }
    };
  }
  
  /**
   * 初始化管理器
   */
  async initialize() {
    console.log('初始化LLM Manager...');
    
    // 初始化所有启用的提供商
    for (const providerName of this.config.enabledProviders) {
      await this.initializeProvider(providerName);
    }
    
    // 设置默认提供商
    await this.setDefaultProvider(this.config.defaultProvider);
    
    // 启动健康检查
    this.startHealthCheck();
    
    console.log(`LLM Manager初始化完成，当前活动提供商: ${this.activeProvider?.name}`);
  }
  
  /**
   * 初始化单个提供商
   */
  async initializeProvider(providerName) {
    try {
      const config = this.config.providerConfigs[providerName];
      if (!config) {
        console.warn(`未找到${providerName}的配置`);
        return;
      }
      
      let provider;
      
      switch (providerName) {
        case 'openai':
          provider = new OpenAIProvider(config);
          break;
        case 'claude':
          provider = new ClaudeProvider(config);
          break;
        case 'qianfan':
          provider = new QianfanProvider(config);
          break;
        case 'local':
          provider = new LocalLLMProvider(config);
          break;
        default:
          console.warn(`不支持的提供商: ${providerName}`);
          return;
      }
      
      // 验证配置
      const validation = provider.validateConfig();
      if (!validation.valid) {
        console.error(`${providerName}配置验证失败:`, validation.errors);
        return;
      }
      
      // 尝试初始化
      await provider.initialize();
      
      this.providers.set(providerName, {
        provider: provider,
        isHealthy: true,
        lastHealthCheck: new Date(),
        requestCount: 0,
        errorCount: 0,
        totalCost: 0,
        weight: this.getProviderWeight(providerName)
      });
      
      console.log(`${providerName} provider初始化成功`);
      
    } catch (error) {
      console.error(`初始化${providerName} provider失败:`, error.message);
    }
  }
  
  /**
   * 设置默认提供商
   */
  async setDefaultProvider(providerName) {
    const providerInfo = this.providers.get(providerName);
    if (!providerInfo || !providerInfo.isHealthy) {
      // 如果默认提供商不可用，选择第一个健康的提供商
      for (const [name, info] of this.providers.entries()) {
        if (info.isHealthy) {
          this.activeProvider = info.provider;
          console.log(`默认提供商${providerName}不可用，切换到${name}`);
          return;
        }
      }
      throw new Error('没有可用的LLM提供商');
    }
    
    this.activeProvider = providerInfo.provider;
    
    // 设置故障转移顺序
    this.updateFallbackProviders();
  }
  
  /**
   * 更新故障转移提供商列表
   */
  updateFallbackProviders() {
    this.fallbackProviders = Array.from(this.providers.entries())
      .filter(([name, info]) => info.isHealthy && info.provider !== this.activeProvider)
      .sort((a, b) => {
        // 根据负载均衡策略排序
        switch (this.config.loadBalancingStrategy) {
          case 'cost_optimized':
            return this.calculateCost(a[1]) - this.calculateCost(b[1]);
          case 'weighted':
            return b[1].weight - a[1].weight;
          default: // round_robin
            return a[1].requestCount - b[1].requestCount;
        }
      })
      .map(([name, info]) => info.provider);
  }
  
  /**
   * 生成文本内容
   */
  async generateText(messages, options = {}) {
    const startTime = Date.now();
    let lastError = null;
    
    // 如果指定了提供商，直接使用
    if (options.provider) {
      const providerInfo = this.providers.get(options.provider);
      if (providerInfo && providerInfo.isHealthy) {
        return await this.executeGeneration(providerInfo, messages, options, startTime);
      }
    }
    
    // 使用活动提供商
    if (this.activeProvider) {
      try {
        const activeProviderInfo = this.getProviderInfo(this.activeProvider);
        return await this.executeGeneration(activeProviderInfo, messages, options, startTime);
      } catch (error) {
        lastError = error;
        console.warn(`主提供商${this.activeProvider.name}失败:`, error.message);
        
        if (!this.config.autoFailover) {
          throw error;
        }
      }
    }
    
    // 故障转移
    if (this.config.autoFailover && this.fallbackProviders.length > 0) {
      for (const fallbackProvider of this.fallbackProviders) {
        try {
          const providerInfo = this.getProviderInfo(fallbackProvider);
          console.log(`尝试故障转移到${fallbackProvider.name}`);
          
          const result = await this.executeGeneration(providerInfo, messages, options, startTime);
          
          // 成功后更新活动提供商
          this.activeProvider = fallbackProvider;
          this.updateFallbackProviders();
          
          return result;
        } catch (error) {
          lastError = error;
          console.warn(`故障转移提供商${fallbackProvider.name}也失败:`, error.message);
          continue;
        }
      }
    }
    
    throw lastError || new Error('所有LLM提供商都不可用');
  }
  
  /**
   * 执行文本生成
   */
  async executeGeneration(providerInfo, messages, options, startTime) {
    const { provider } = providerInfo;
    
    try {
      providerInfo.requestCount++;
      
      const result = await provider.generateText(messages, options);
      
      // 计算成本
      const cost = this.calculateRequestCost(provider, result.usage);
      providerInfo.totalCost += cost;
      
      // 添加元数据
      result.metadata = {
        provider: provider.name,
        model: result.model,
        cost: cost,
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
      
      return result;
      
    } catch (error) {
      providerInfo.errorCount++;
      throw error;
    }
  }
  
  /**
   * 获取嵌入向量
   */
  async getEmbeddings(text, options = {}) {
    // 优先使用支持embedding的提供商
    const embeddingProviders = ['openai', 'qianfan', 'local'];
    
    for (const providerName of embeddingProviders) {
      const providerInfo = this.providers.get(providerName);
      if (providerInfo && providerInfo.isHealthy) {
        try {
          return await providerInfo.provider.getEmbeddings(text);
        } catch (error) {
          console.warn(`${providerName} embedding失败:`, error.message);
          continue;
        }
      }
    }
    
    throw new Error('没有可用的embedding服务');
  }
  
  /**
   * 获取可用的模型列表
   */
  async getAvailableModels() {
    const models = [];
    
    for (const [providerName, providerInfo] of this.providers.entries()) {
      if (providerInfo.isHealthy) {
        try {
          const providerModels = providerInfo.provider.getSupportedModels();
          models.push({
            provider: providerName,
            models: providerModels
          });
        } catch (error) {
          console.warn(`获取${providerName}模型列表失败:`, error.message);
        }
      }
    }
    
    return models;
  }
  
  /**
   * 获取系统状态
   */
  async getSystemStatus() {
    const status = {
      activeProvider: this.activeProvider?.name,
      totalProviders: this.providers.size,
      healthyProviders: 0,
      providers: {}
    };
    
    for (const [name, info] of this.providers.entries()) {
      if (info.isHealthy) {
        status.healthyProviders++;
      }
      
      status.providers[name] = {
        isHealthy: info.isHealthy,
        requestCount: info.requestCount,
        errorCount: info.errorCount,
        totalCost: info.totalCost,
        errorRate: info.requestCount > 0 ? (info.errorCount / info.requestCount) : 0,
        lastHealthCheck: info.lastHealthCheck
      };
    }
    
    return status;
  }
  
  /**
   * 健康检查
   */
  async healthCheck() {
    for (const [name, info] of this.providers.entries()) {
      try {
        const isHealthy = await info.provider.isAvailable();
        info.isHealthy = isHealthy;
        info.lastHealthCheck = new Date();
        
        if (!isHealthy && this.activeProvider === info.provider) {
          // 活动提供商不健康，需要切换
          await this.switchToHealthyProvider();
        }
      } catch (error) {
        console.error(`${name}健康检查失败:`, error.message);
        info.isHealthy = false;
        info.lastHealthCheck = new Date();
      }
    }
    
    this.updateFallbackProviders();
  }
  
  /**
   * 切换到健康的提供商
   */
  async switchToHealthyProvider() {
    for (const [name, info] of this.providers.entries()) {
      if (info.isHealthy) {
        this.activeProvider = info.provider;
        this.updateFallbackProviders();
        console.log(`切换到健康的提供商: ${name}`);
        return;
      }
    }
    
    console.error('没有可用的健康提供商');
  }
  
  /**
   * 启动健康检查定时器
   */
  startHealthCheck() {
    if (this.config.healthCheckInterval > 0) {
      setInterval(() => {
        this.healthCheck();
      }, this.config.healthCheckInterval);
      
      console.log(`健康检查已启动，间隔: ${this.config.healthCheckInterval}ms`);
    }
  }
  
  /**
   * 计算请求成本
   */
  calculateRequestCost(provider, usage) {
    const pricing = provider.getPricing();
    
    if (!usage || !pricing) {
      return 0;
    }
    
    const inputCost = (usage.promptTokens || 0) * pricing.input / 1000;
    const outputCost = (usage.completionTokens || 0) * pricing.output / 1000;
    
    return inputCost + outputCost;
  }
  
  /**
   * 计算提供商成本评分
   */
  calculateCost(providerInfo) {
    const pricing = providerInfo.provider.getPricing();
    return (pricing.input + pricing.output) / 2;
  }
  
  /**
   * 获取提供商权重
   */
  getProviderWeight(providerName) {
    const weights = {
      openai: 10,
      claude: 8,
      qianfan: 6,
      local: 4
    };
    
    return weights[providerName] || 1;
  }
  
  /**
   * 获取提供商信息
   */
  getProviderInfo(provider) {
    for (const [name, info] of this.providers.entries()) {
      if (info.provider === provider) {
        return info;
      }
    }
    return null;
  }
  
  /**
   * 手动切换提供商
   */
  async switchProvider(providerName) {
    const providerInfo = this.providers.get(providerName);
    if (!providerInfo) {
      throw new Error(`提供商${providerName}不存在`);
    }
    
    if (!providerInfo.isHealthy) {
      throw new Error(`提供商${providerName}不健康`);
    }
    
    this.activeProvider = providerInfo.provider;
    this.updateFallbackProviders();
    
    console.log(`手动切换到提供商: ${providerName}`);
  }
  
  /**
   * 获取成本统计
   */
  getCostStatistics() {
    const stats = {
      totalCost: 0,
      providerCosts: {}
    };
    
    for (const [name, info] of this.providers.entries()) {
      stats.totalCost += info.totalCost;
      stats.providerCosts[name] = info.totalCost;
    }
    
    return stats;
  }
}

// 单例模式
let instance = null;

function getLLMManager() {
  if (!instance) {
    instance = new LLMManager();
  }
  return instance;
}

module.exports = getLLMManager;