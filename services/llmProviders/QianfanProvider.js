const axios = require('axios');
const BaseLLMProvider = require('./BaseLLMProvider');

/**
 * 百度千帆大模型提供商
 * 支持文心一言、Llama2、ChatGLM等模型
 */
class QianfanProvider extends BaseLLMProvider {
  
  constructor(config = {}) {
    super(config);
    this.name = 'qianfan';
    this.client = null;
    this.defaultModel = config.model || 'ERNIE-Bot-turbo';
    this.baseURL = config.baseURL || 'https://aip.baidubce.com';
    this.accessToken = null;
    this.tokenExpiresAt = null;
  }
  
  async initialize() {
    try {
      this.client = axios.create({
        baseURL: this.baseURL,
        timeout: this.config.timeout || 30000
      });
      
      // 获取访问令牌
      await this.getAccessToken();
      
      console.log(`百度千帆Provider初始化成功，使用模型: ${this.defaultModel}`);
      return true;
    } catch (error) {
      console.error('百度千帆Provider初始化失败:', error);
      throw error;
    }
  }
  
  async getAccessToken() {
    try {
      const response = await this.client.post('/oauth/2.0/token', null, {
        params: {
          grant_type: 'client_credentials',
          client_id: this.config.apiKey,
          client_secret: this.config.secretKey
        }
      });
      
      this.accessToken = response.data.access_token;
      this.tokenExpiresAt = Date.now() + (response.data.expires_in * 1000);
      
      console.log('百度千帆访问令牌获取成功');
    } catch (error) {
      console.error('获取百度千帆访问令牌失败:', error);
      throw error;
    }
  }
  
  async ensureValidToken() {
    if (!this.accessToken || Date.now() >= this.tokenExpiresAt - 60000) {
      await this.getAccessToken();
    }
  }
  
  async generateText(messages, options = {}) {
    if (!this.client) {
      await this.initialize();
    }
    
    await this.ensureValidToken();
    
    try {
      // 转换消息格式为千帆格式
      const qianfanMessages = this.convertMessages(messages);
      
      const modelEndpoints = {
        'ERNIE-Bot': 'rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions',
        'ERNIE-Bot-turbo': 'rpc/2.0/ai_custom/v1/wenxinworkshop/chat/eb-instant',
        'ERNIE-Bot-4': 'rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions_pro',
        'Llama-2-7b-chat': 'rpc/2.0/ai_custom/v1/wenxinworkshop/chat/llama_2_7b',
        'ChatGLM2-6B-32K': 'rpc/2.0/ai_custom/v1/wenxinworkshop/chat/chatglm2_6b_32k'
      };
      
      const endpoint = modelEndpoints[options.model || this.defaultModel] || 
                     modelEndpoints['ERNIE-Bot-turbo'];
      
      const response = await this.client.post(`/${endpoint}`, {
        messages: qianfanMessages,
        temperature: options.temperature || this.temperature,
        max_output_tokens: options.maxTokens || this.maxTokens,
        top_p: options.topP || 0.9,
        penalty_score: options.penaltyScore || 1.0
      }, {
        params: {
          access_token: this.accessToken
        }
      });
      
      const data = response.data;
      
      return {
        content: data.result,
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0
        },
        model: options.model || this.defaultModel,
        finishReason: data.finish_reason || 'stop'
      };
    } catch (error) {
      throw this.formatError(error);
    }
  }
  
  convertMessages(messages) {
    // 千帆API的消息格式转换
    const qianfanMessages = [];
    
    for (const message of messages) {
      if (message.role === 'system') {
        // 千帆将system消息合并到第一个user消息中
        continue;
      }
      
      qianfanMessages.push({
        role: message.role === 'assistant' ? 'assistant' : 'user',
        content: message.content
      });
    }
    
    // 如果有system消息，将其前置到第一个user消息
    const systemMessage = messages.find(m => m.role === 'system');
    if (systemMessage && qianfanMessages.length > 0 && qianfanMessages[0].role === 'user') {
      qianfanMessages[0].content = systemMessage.content + '\n\n' + qianfanMessages[0].content;
    }
    
    return qianfanMessages;
  }
  
  async getEmbeddings(text) {
    await this.ensureValidToken();
    
    try {
      const input = Array.isArray(text) ? text : [text];
      const embeddings = [];
      
      for (const textItem of input) {
        const response = await this.client.post('/rpc/2.0/ai_custom/v1/wenxinworkshop/embeddings/embedding-v1', {
          input: [textItem]
        }, {
          params: {
            access_token: this.accessToken
          }
        });
        
        embeddings.push(response.data.data[0].embedding);
      }
      
      return embeddings;
    } catch (error) {
      throw this.formatError(error);
    }
  }
  
  getSupportedModels() {
    return [
      {
        id: 'ERNIE-Bot-4',
        name: '文心一言4.0',
        description: '百度最强大的大语言模型',
        contextWindow: 8192,
        pricing: { input: 0.12, output: 0.12 }
      },
      {
        id: 'ERNIE-Bot',
        name: '文心一言',
        description: '百度主力大语言模型',
        contextWindow: 8192,
        pricing: { input: 0.012, output: 0.012 }
      },
      {
        id: 'ERNIE-Bot-turbo',
        name: '文心一言Turbo',
        description: '高性价比的快速模型',
        contextWindow: 8192,
        pricing: { input: 0.008, output: 0.008 }
      },
      {
        id: 'Llama-2-7b-chat',
        name: 'Llama-2-7B',
        description: 'Meta开源模型，支持中英文',
        contextWindow: 4096,
        pricing: { input: 0.006, output: 0.006 }
      },
      {
        id: 'ChatGLM2-6B-32K',
        name: 'ChatGLM2-6B',
        description: '清华开源模型，长上下文',
        contextWindow: 32768,
        pricing: { input: 0.004, output: 0.004 }
      }
    ];
  }
  
  getPricing() {
    const modelPricing = {
      'ERNIE-Bot-4': { input: 0.12, output: 0.12 },
      'ERNIE-Bot': { input: 0.012, output: 0.012 },
      'ERNIE-Bot-turbo': { input: 0.008, output: 0.008 },
      'Llama-2-7b-chat': { input: 0.006, output: 0.006 },
      'ChatGLM2-6B-32K': { input: 0.004, output: 0.004 }
    };
    
    return {
      ...modelPricing[this.defaultModel] || modelPricing['ERNIE-Bot-turbo'],
      embedding: 0.002
    };
  }
  
  getLimits() {
    const modelLimits = {
      'ERNIE-Bot-4': { contextWindow: 8192, maxTokens: 2048 },
      'ERNIE-Bot': { contextWindow: 8192, maxTokens: 2048 },
      'ERNIE-Bot-turbo': { contextWindow: 8192, maxTokens: 2048 },
      'Llama-2-7b-chat': { contextWindow: 4096, maxTokens: 2048 },
      'ChatGLM2-6B-32K': { contextWindow: 32768, maxTokens: 2048 }
    };
    
    const limits = modelLimits[this.defaultModel] || modelLimits['ERNIE-Bot-turbo'];
    
    return {
      ...limits,
      rateLimit: {
        requestsPerMinute: 300,
        tokensPerMinute: 300000
      }
    };
  }
  
  formatError(error) {
    const baseError = super.formatError(error);
    
    if (error.response?.data?.error_code) {
      baseError.qianfanErrorCode = error.response.data.error_code;
      baseError.message = error.response.data.error_msg || baseError.message;
      
      // 百度千帆特定错误码处理
      switch (error.response.data.error_code) {
        case 100:
          baseError.message = '无效的参数';
          break;
        case 110:
          baseError.message = '访问令牌无效';
          break;
        case 111:
          baseError.message = 'API密钥无效';
          break;
        case 336003:
          baseError.message = '请求频率超限';
          break;
      }
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
      errors.push('百度千帆API Key是必需的');
    }
    
    if (!this.config.secretKey) {
      errors.push('百度千帆Secret Key是必需的');
    }
    
    const supportedModels = this.getSupportedModels().map(m => m.id);
    if (this.defaultModel && !supportedModels.includes(this.defaultModel)) {
      errors.push(`不支持的千帆模型: ${this.defaultModel}`);
    }
    
    return {
      valid: errors.length === 0,
      errors: [...baseValidation.errors, ...errors]
    };
  }
}

module.exports = QianfanProvider;