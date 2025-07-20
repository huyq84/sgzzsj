/**
 * 大模型提供商基础抽象类
 * 定义所有LLM提供商需要实现的接口
 */
class BaseLLMProvider {
  
  constructor(config = {}) {
    this.config = config;
    this.name = 'base';
    this.maxTokens = config.maxTokens || 2000;
    this.temperature = config.temperature || 0.3;
  }
  
  /**
   * 初始化客户端连接
   * 子类必须实现此方法
   */
  async initialize() {
    throw new Error('initialize() method must be implemented by subclass');
  }
  
  /**
   * 生成文本内容
   * @param {Array} messages - 消息数组 [{role: 'system'|'user'|'assistant', content: string}]
   * @param {Object} options - 生成选项
   * @returns {Object} 生成结果 {content: string, usage: Object, model: string}
   */
  async generateText(messages, options = {}) {
    throw new Error('generateText() method must be implemented by subclass');
  }
  
  /**
   * 获取文本嵌入向量
   * @param {string|Array} text - 待嵌入的文本
   * @returns {Array} 嵌入向量数组
   */
  async getEmbeddings(text) {
    throw new Error('getEmbeddings() method must be implemented by subclass');
  }
  
  /**
   * 检查模型是否可用
   * @returns {boolean} 是否可用
   */
  async isAvailable() {
    try {
      await this.generateText([{
        role: 'user',
        content: '测试连接'
      }], { maxTokens: 10 });
      return true;
    } catch (error) {
      console.error(`${this.name} provider unavailable:`, error.message);
      return false;
    }
  }
  
  /**
   * 获取支持的模型列表
   * @returns {Array} 模型列表
   */
  getSupportedModels() {
    return [];
  }
  
  /**
   * 获取定价信息
   * @returns {Object} 定价信息
   */
  getPricing() {
    return {
      input: 0,   // 输入token价格（每1K token）
      output: 0,  // 输出token价格（每1K token）
      embedding: 0 // 嵌入价格（每1K token）
    };
  }
  
  /**
   * 获取模型限制信息
   * @returns {Object} 限制信息
   */
  getLimits() {
    return {
      maxTokens: this.maxTokens,
      contextWindow: 4096,
      rateLimit: {
        requestsPerMinute: 60,
        tokensPerMinute: 60000
      }
    };
  }
  
  /**
   * 格式化错误信息
   * @param {Error} error - 原始错误
   * @returns {Object} 格式化的错误信息
   */
  formatError(error) {
    return {
      provider: this.name,
      type: error.name || 'UnknownError',
      message: error.message,
      code: error.code || 'UNKNOWN',
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * 计算token数量（简单估算）
   * @param {string} text - 文本内容
   * @returns {number} token数量
   */
  estimateTokens(text) {
    // 简单估算：中文1字符≈1token，英文1词≈1.3token
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
    const otherChars = text.length - chineseChars - englishWords;
    
    return Math.ceil(chineseChars + englishWords * 1.3 + otherChars * 0.5);
  }
  
  /**
   * 验证配置
   * @returns {Object} 验证结果 {valid: boolean, errors: Array}
   */
  validateConfig() {
    const errors = [];
    
    if (!this.config.apiKey && this.requiresApiKey()) {
      errors.push('API Key is required');
    }
    
    if (this.config.temperature < 0 || this.config.temperature > 1) {
      errors.push('Temperature must be between 0 and 1');
    }
    
    if (this.config.maxTokens <= 0) {
      errors.push('Max tokens must be greater than 0');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors
    };
  }
  
  /**
   * 是否需要API密钥
   * @returns {boolean}
   */
  requiresApiKey() {
    return true;
  }
  
  /**
   * 获取健康状态
   * @returns {Object} 健康状态信息
   */
  async getHealthStatus() {
    const startTime = Date.now();
    
    try {
      const available = await this.isAvailable();
      const responseTime = Date.now() - startTime;
      
      return {
        provider: this.name,
        status: available ? 'healthy' : 'unhealthy',
        responseTime: responseTime,
        timestamp: new Date().toISOString(),
        config: {
          maxTokens: this.maxTokens,
          temperature: this.temperature,
          model: this.config.model
        }
      };
    } catch (error) {
      return {
        provider: this.name,
        status: 'error',
        error: this.formatError(error),
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = BaseLLMProvider;