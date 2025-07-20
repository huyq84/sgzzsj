const axios = require('axios');
const BaseLLMProvider = require('./BaseLLMProvider');

/**
 * Anthropic Claude大模型提供商
 * 支持Claude-3 Haiku, Sonnet, Opus等模型
 */
class ClaudeProvider extends BaseLLMProvider {
  
  constructor(config = {}) {
    super(config);
    this.name = 'claude';
    this.client = null;
    this.defaultModel = config.model || 'claude-3-sonnet-20240229';
    this.baseURL = config.baseURL || 'https://api.anthropic.com';
  }
  
  async initialize() {
    try {
      this.client = axios.create({
        baseURL: this.baseURL,
        headers: {
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        },
        timeout: this.config.timeout || 30000
      });
      
      console.log(`Claude Provider初始化成功，使用模型: ${this.defaultModel}`);
      return true;
    } catch (error) {
      console.error('Claude Provider初始化失败:', error);
      throw error;
    }
  }
  
  async generateText(messages, options = {}) {
    if (!this.client) {
      await this.initialize();
    }
    
    try {
      // 转换消息格式：Claude需要分离system消息
      const systemMessage = messages.find(m => m.role === 'system');
      const conversationMessages = messages.filter(m => m.role !== 'system');
      
      const response = await this.client.post('/v1/messages', {
        model: options.model || this.defaultModel,
        max_tokens: options.maxTokens || this.maxTokens,
        temperature: options.temperature || this.temperature,
        system: systemMessage?.content || '',
        messages: conversationMessages
      });
      
      const data = response.data;
      
      return {
        content: data.content[0].text,
        usage: {
          promptTokens: data.usage.input_tokens,
          completionTokens: data.usage.output_tokens,
          totalTokens: data.usage.input_tokens + data.usage.output_tokens
        },
        model: data.model,
        finishReason: data.stop_reason
      };
    } catch (error) {
      throw this.formatError(error);
    }
  }
  
  async getEmbeddings(text) {
    // Claude目前不直接提供embedding服务
    // 可以使用OpenAI的embedding或其他服务
    throw new Error('Claude暂不支持embedding功能，请使用其他提供商的embedding服务');
  }
  
  getSupportedModels() {
    return [
      {
        id: 'claude-3-opus-20240229',
        name: 'Claude-3 Opus',
        description: '最强大的Claude模型，适合复杂推理任务',
        contextWindow: 200000,
        pricing: { input: 0.015, output: 0.075 }
      },
      {
        id: 'claude-3-sonnet-20240229',
        name: 'Claude-3 Sonnet',
        description: '平衡性能和成本的Claude模型',
        contextWindow: 200000,
        pricing: { input: 0.003, output: 0.015 }
      },
      {
        id: 'claude-3-haiku-20240307',
        name: 'Claude-3 Haiku',
        description: '最快速且经济的Claude模型',
        contextWindow: 200000,
        pricing: { input: 0.00025, output: 0.00125 }
      }
    ];
  }
  
  getPricing() {
    const modelPricing = {
      'claude-3-opus-20240229': { input: 0.015, output: 0.075 },
      'claude-3-sonnet-20240229': { input: 0.003, output: 0.015 },
      'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 }
    };
    
    return {
      ...modelPricing[this.defaultModel] || modelPricing['claude-3-sonnet-20240229'],
      embedding: 0 // Claude不提供embedding
    };
  }
  
  getLimits() {
    return {
      maxTokens: this.maxTokens,
      contextWindow: 200000, // Claude-3的上下文窗口
      rateLimit: {
        requestsPerMinute: 1000,
        tokensPerMinute: 40000
      }
    };
  }
  
  formatError(error) {
    const baseError = super.formatError(error);
    
    if (error.response?.status) {
      baseError.httpStatus = error.response.status;
      
      switch (error.response.status) {
        case 401:
          baseError.message = 'Claude API密钥无效或已过期';
          break;
        case 400:
          baseError.message = 'Claude请求参数错误';
          break;
        case 429:
          baseError.message = 'Claude请求频率超限，请稍后重试';
          break;
        case 500:
          baseError.message = 'Claude服务器错误';
          break;
      }
    }
    
    if (error.response?.data?.error) {
      baseError.details = error.response.data.error;
    }
    
    return baseError;
  }
  
  requiresApiKey() {
    return true;
  }
  
  validateConfig() {
    const baseValidation = super.validateConfig();
    
    if (!baseValidation.valid) {
      return baseValidation;
    }
    
    const errors = [];
    
    if (!this.config.apiKey) {
      errors.push('Claude API密钥是必需的');
    }
    
    const supportedModels = this.getSupportedModels().map(m => m.id);
    if (this.defaultModel && !supportedModels.includes(this.defaultModel)) {
      errors.push(`不支持的Claude模型: ${this.defaultModel}`);
    }
    
    return {
      valid: errors.length === 0,
      errors: [...baseValidation.errors, ...errors]
    };
  }
  
  /**
   * Claude特有的安全性检查
   */
  async checkContentSafety(text) {
    // Claude有内置的安全性检查
    // 这里可以添加额外的安全性验证逻辑
    return {
      safe: true,
      reason: null
    };
  }
}

module.exports = ClaudeProvider;