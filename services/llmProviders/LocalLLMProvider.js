const axios = require('axios');
const BaseLLMProvider = require('./BaseLLMProvider');

/**
 * 本地大模型提供商
 * 支持Ollama、Text Generation WebUI、vLLM等本地部署方案
 */
class LocalLLMProvider extends BaseLLMProvider {
  
  constructor(config = {}) {
    super(config);
    this.name = 'local';
    this.client = null;
    this.defaultModel = config.model || 'llama2:7b-chat';
    this.baseURL = config.baseURL || 'http://localhost:11434'; // Ollama默认端口
    this.serverType = config.serverType || 'ollama'; // ollama, textgen, vllm
  }
  
  async initialize() {
    try {
      this.client = axios.create({
        baseURL: this.baseURL,
        timeout: this.config.timeout || 60000, // 本地模型可能较慢
        headers: this.getHeaders()
      });
      
      // 检查服务器连接
      await this.checkServerHealth();
      
      console.log(`本地LLM Provider初始化成功，服务器类型: ${this.serverType}，模型: ${this.defaultModel}`);
      return true;
    } catch (error) {
      console.error('本地LLM Provider初始化失败:', error);
      throw error;
    }
  }
  
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // 根据不同的服务器类型设置请求头
    if (this.serverType === 'textgen' && this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }
    
    return headers;
  }
  
  async checkServerHealth() {
    try {
      let healthEndpoint = '';
      
      switch (this.serverType) {
        case 'ollama':
          healthEndpoint = '/api/tags';
          break;
        case 'textgen':
          healthEndpoint = '/v1/models';
          break;
        case 'vllm':
          healthEndpoint = '/v1/models';
          break;
        default:
          healthEndpoint = '/health';
      }
      
      await this.client.get(healthEndpoint);
      console.log(`${this.serverType}服务器连接正常`);
    } catch (error) {
      throw new Error(`无法连接到${this.serverType}服务器: ${error.message}`);
    }
  }
  
  async generateText(messages, options = {}) {
    if (!this.client) {
      await this.initialize();
    }
    
    try {
      switch (this.serverType) {
        case 'ollama':
          return await this.generateWithOllama(messages, options);
        case 'textgen':
          return await this.generateWithTextGen(messages, options);
        case 'vllm':
          return await this.generateWithVLLM(messages, options);
        default:
          throw new Error(`不支持的服务器类型: ${this.serverType}`);
      }
    } catch (error) {
      throw this.formatError(error);
    }
  }
  
  async generateWithOllama(messages, options) {
    // Ollama API格式
    const response = await this.client.post('/api/chat', {
      model: options.model || this.defaultModel,
      messages: messages,
      options: {
        temperature: options.temperature || this.temperature,
        num_predict: options.maxTokens || this.maxTokens,
        top_p: options.topP || 0.9,
        stop: options.stop || []
      },
      stream: false
    });
    
    return {
      content: response.data.message.content,
      usage: {
        promptTokens: response.data.prompt_eval_count || 0,
        completionTokens: response.data.eval_count || 0,
        totalTokens: (response.data.prompt_eval_count || 0) + (response.data.eval_count || 0)
      },
      model: response.data.model || this.defaultModel,
      finishReason: response.data.done ? 'stop' : 'length'
    };
  }
  
  async generateWithTextGen(messages, options) {
    // Text Generation WebUI OpenAI兼容API
    const response = await this.client.post('/v1/chat/completions', {
      model: options.model || this.defaultModel,
      messages: messages,
      temperature: options.temperature || this.temperature,
      max_tokens: options.maxTokens || this.maxTokens,
      top_p: options.topP || 0.9,
      frequency_penalty: options.frequencyPenalty || 0,
      presence_penalty: options.presencePenalty || 0
    });
    
    const data = response.data;
    
    return {
      content: data.choices[0].message.content,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0
      },
      model: data.model,
      finishReason: data.choices[0].finish_reason
    };
  }
  
  async generateWithVLLM(messages, options) {
    // vLLM OpenAI兼容API
    const response = await this.client.post('/v1/chat/completions', {
      model: options.model || this.defaultModel,
      messages: messages,
      temperature: options.temperature || this.temperature,
      max_tokens: options.maxTokens || this.maxTokens,
      top_p: options.topP || 0.9
    });
    
    const data = response.data;
    
    return {
      content: data.choices[0].message.content,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0
      },
      model: data.model,
      finishReason: data.choices[0].finish_reason
    };
  }
  
  async getEmbeddings(text) {
    if (this.serverType !== 'ollama') {
      throw new Error('当前本地服务器类型不支持embedding功能');
    }
    
    try {
      const input = Array.isArray(text) ? text : [text];
      const embeddings = [];
      
      for (const textItem of input) {
        const response = await this.client.post('/api/embeddings', {
          model: this.config.embeddingModel || 'nomic-embed-text',
          prompt: textItem
        });
        
        embeddings.push(response.data.embedding);
      }
      
      return embeddings;
    } catch (error) {
      throw this.formatError(error);
    }
  }
  
  getSupportedModels() {
    // 本地模型列表可能需要动态获取
    const commonModels = [
      {
        id: 'llama2:7b-chat',
        name: 'Llama 2 7B Chat',
        description: '轻量级对话模型',
        contextWindow: 4096,
        pricing: { input: 0, output: 0 } // 本地部署无API费用
      },
      {
        id: 'llama2:13b-chat',
        name: 'Llama 2 13B Chat',
        description: '中等规模对话模型',
        contextWindow: 4096,
        pricing: { input: 0, output: 0 }
      },
      {
        id: 'codellama:7b-instruct',
        name: 'Code Llama 7B',
        description: '代码生成专用模型',
        contextWindow: 4096,
        pricing: { input: 0, output: 0 }
      },
      {
        id: 'mistral:7b-instruct',
        name: 'Mistral 7B Instruct',
        description: '高性能指令跟随模型',
        contextWindow: 8192,
        pricing: { input: 0, output: 0 }
      },
      {
        id: 'qwen:7b-chat',
        name: '通义千问 7B',
        description: '阿里巴巴开源中文模型',
        contextWindow: 8192,
        pricing: { input: 0, output: 0 }
      }
    ];
    
    return commonModels;
  }
  
  async getAvailableModels() {
    // 动态获取服务器上可用的模型
    try {
      let endpoint = '';
      
      switch (this.serverType) {
        case 'ollama':
          endpoint = '/api/tags';
          break;
        case 'textgen':
        case 'vllm':
          endpoint = '/v1/models';
          break;
      }
      
      const response = await this.client.get(endpoint);
      
      if (this.serverType === 'ollama') {
        return response.data.models.map(model => ({
          id: model.name,
          name: model.name,
          size: model.size,
          modified: model.modified_at
        }));
      } else {
        return response.data.data.map(model => ({
          id: model.id,
          name: model.id,
          created: model.created
        }));
      }
    } catch (error) {
      console.error('获取可用模型列表失败:', error);
      return this.getSupportedModels();
    }
  }
  
  getPricing() {
    return {
      input: 0,
      output: 0,
      embedding: 0
    };
  }
  
  getLimits() {
    return {
      maxTokens: this.maxTokens,
      contextWindow: 8192, // 根据具体模型调整
      rateLimit: {
        requestsPerMinute: 1000, // 本地部署通常没有严格限制
        tokensPerMinute: 1000000
      }
    };
  }
  
  formatError(error) {
    const baseError = super.formatError(error);
    
    if (error.code === 'ECONNREFUSED') {
      baseError.message = `无法连接到本地${this.serverType}服务器 (${this.baseURL})`;
    } else if (error.response?.status === 404) {
      baseError.message = `模型 ${this.defaultModel} 未找到，请检查模型是否已下载`;
    }
    
    return baseError;
  }
  
  requiresApiKey() {
    return this.serverType === 'textgen' && this.config.requireAuth;
  }
  
  validateConfig() {
    const baseValidation = super.validateConfig();
    
    const errors = [];
    
    if (!this.baseURL) {
      errors.push('本地服务器URL是必需的');
    }
    
    const supportedServerTypes = ['ollama', 'textgen', 'vllm'];
    if (!supportedServerTypes.includes(this.serverType)) {
      errors.push(`不支持的服务器类型: ${this.serverType}`);
    }
    
    return {
      valid: errors.length === 0,
      errors: [...baseValidation.errors, ...errors]
    };
  }
  
  /**
   * 拉取模型（仅Ollama支持）
   */
  async pullModel(modelName) {
    if (this.serverType !== 'ollama') {
      throw new Error('只有Ollama支持模型拉取功能');
    }
    
    try {
      const response = await this.client.post('/api/pull', {
        name: modelName
      });
      
      return response.data;
    } catch (error) {
      throw this.formatError(error);
    }
  }
  
  /**
   * 删除模型（仅Ollama支持）
   */
  async deleteModel(modelName) {
    if (this.serverType !== 'ollama') {
      throw new Error('只有Ollama支持模型删除功能');
    }
    
    try {
      const response = await this.client.delete('/api/delete', {
        data: { name: modelName }
      });
      
      return response.data;
    } catch (error) {
      throw this.formatError(error);
    }
  }
}

module.exports = LocalLLMProvider;