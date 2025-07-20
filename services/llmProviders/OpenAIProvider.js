const { OpenAI } = require('openai');
const BaseLLMProvider = require('./BaseLLMProvider');

/**
 * OpenAI大模型提供商
 * 支持GPT-3.5、GPT-4等模型
 */
class OpenAIProvider extends BaseLLMProvider {
  
  constructor(config = {}) {
    super(config);
    this.name = 'openai';
    this.client = null;
    this.defaultModel = config.model || 'gpt-3.5-turbo';
    this.embeddingModel = config.embeddingModel || 'text-embedding-ada-002';
  }
  
  async initialize() {
    try {
      this.client = new OpenAI({
        apiKey: this.config.apiKey,
        baseURL: this.config.baseURL || 'https://api.openai.com/v1',
        timeout: this.config.timeout || 30000,
        maxRetries: this.config.maxRetries || 3
      });
      
      console.log(`OpenAI Provider初始化成功，使用模型: ${this.defaultModel}`);
      return true;
    } catch (error) {
      console.error('OpenAI Provider初始化失败:', error);
      throw error;
    }
  }
  
  async generateText(messages, options = {}) {
    if (!this.client) {
      await this.initialize();
    }
    
    try {
      const response = await this.client.chat.completions.create({
        model: options.model || this.defaultModel,
        messages: messages,
        temperature: options.temperature || this.temperature,
        max_tokens: options.maxTokens || this.maxTokens,
        top_p: options.topP || 0.9,
        frequency_penalty: options.frequencyPenalty || 0,
        presence_penalty: options.presencePenalty || 0,
        stream: false
      });
      
      return {
        content: response.choices[0].message.content,
        usage: {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens
        },
        model: response.model,
        finishReason: response.choices[0].finish_reason
      };
    } catch (error) {
      throw this.formatError(error);
    }
  }
  
  async getEmbeddings(text) {
    if (!this.client) {
      await this.initialize();
    }
    
    try {
      const input = Array.isArray(text) ? text : [text];
      
      const response = await this.client.embeddings.create({
        model: this.embeddingModel,
        input: input
      });
      
      return response.data.map(item => item.embedding);
    } catch (error) {
      throw this.formatError(error);
    }
  }
  
  getSupportedModels() {
    return [
      {
        id: 'gpt-4',
        name: 'GPT-4',
        description: '最强大的模型，适合复杂任务',
        contextWindow: 8192,
        pricing: { input: 0.03, output: 0.06 }
      },
      {
        id: 'gpt-4-turbo-preview',
        name: 'GPT-4 Turbo',
        description: '更快的GPT-4，支持更长上下文',
        contextWindow: 128000,
        pricing: { input: 0.01, output: 0.03 }
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        description: '性价比最高的模型',
        contextWindow: 4096,
        pricing: { input: 0.0015, output: 0.002 }
      },
      {
        id: 'gpt-3.5-turbo-16k',
        name: 'GPT-3.5 Turbo 16K',
        description: '支持更长上下文的GPT-3.5',
        contextWindow: 16384,
        pricing: { input: 0.003, output: 0.004 }
      }
    ];
  }
  
  getPricing() {
    const modelPricing = {
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-4-turbo-preview': { input: 0.01, output: 0.03 },
      'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
      'gpt-3.5-turbo-16k': { input: 0.003, output: 0.004 }
    };
    
    return {
      ...modelPricing[this.defaultModel] || modelPricing['gpt-3.5-turbo'],
      embedding: 0.0001
    };
  }
  
  getLimits() {
    const modelLimits = {
      'gpt-4': { contextWindow: 8192, maxTokens: 4096 },
      'gpt-4-turbo-preview': { contextWindow: 128000, maxTokens: 4096 },
      'gpt-3.5-turbo': { contextWindow: 4096, maxTokens: 2048 },
      'gpt-3.5-turbo-16k': { contextWindow: 16384, maxTokens: 4096 }
    };
    
    const limits = modelLimits[this.defaultModel] || modelLimits['gpt-3.5-turbo'];
    
    return {
      ...limits,
      rateLimit: {
        requestsPerMinute: 3500,
        tokensPerMinute: 90000
      }
    };
  }
  
  formatError(error) {
    const baseError = super.formatError(error);
    
    // OpenAI特定的错误处理
    if (error.response?.status) {
      baseError.httpStatus = error.response.status;
      
      switch (error.response.status) {
        case 401:
          baseError.message = 'API密钥无效或已过期';
          break;
        case 429:
          baseError.message = '请求频率超限，请稍后重试';
          break;
        case 500:
          baseError.message = 'OpenAI服务器错误';
          break;
        case 503:
          baseError.message = 'OpenAI服务暂时不可用';
          break;
      }
    }
    
    if (error.code === 'context_length_exceeded') {
      baseError.message = '输入文本过长，超出模型上下文限制';
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
    
    if (!this.config.apiKey || !this.config.apiKey.startsWith('sk-')) {
      errors.push('无效的OpenAI API密钥格式');
    }
    
    const supportedModels = this.getSupportedModels().map(m => m.id);
    if (this.defaultModel && !supportedModels.includes(this.defaultModel)) {
      errors.push(`不支持的模型: ${this.defaultModel}`);
    }
    
    return {
      valid: errors.length === 0,
      errors: [...baseValidation.errors, ...errors]
    };
  }
  
  /**
   * 流式生成文本（可选功能）
   */
  async generateTextStream(messages, options = {}, onChunk = null) {
    if (!this.client) {
      await this.initialize();
    }
    
    try {
      const stream = await this.client.chat.completions.create({
        model: options.model || this.defaultModel,
        messages: messages,
        temperature: options.temperature || this.temperature,
        max_tokens: options.maxTokens || this.maxTokens,
        stream: true
      });
      
      let fullContent = '';
      
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullContent += content;
          if (onChunk) {
            onChunk(content);
          }
        }
      }
      
      return {
        content: fullContent,
        model: options.model || this.defaultModel
      };
    } catch (error) {
      throw this.formatError(error);
    }
  }
}

module.exports = OpenAIProvider;