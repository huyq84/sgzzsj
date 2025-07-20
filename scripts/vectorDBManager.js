const { PineconeClient } = require('@pinecone-database/pinecone');
const { ChromaClient } = require('chromadb');
const weaviate = require('weaviate-client');
const { OpenAI } = require('openai');
const StandardsLibrary = require('../models/StandardsLibrary');
const KnowledgeBase = require('../models/KnowledgeBase');
require('dotenv').config();

/**
 * 向量数据库管理脚本
 * 支持Pinecone、ChromaDB、Weaviate等向量数据库
 */
class VectorDBManager {
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    this.dbType = process.env.VECTOR_DB_TYPE || 'none';
    this.client = null;
    
    this.initializeClient();
  }
  
  async initializeClient() {
    switch (this.dbType) {
      case 'pinecone':
        await this.initializePinecone();
        break;
      case 'chroma':
        await this.initializeChroma();
        break;
      case 'weaviate':
        await this.initializeWeaviate();
        break;
      default:
        console.log('未配置向量数据库，将跳过向量化存储');
    }
  }
  
  async initializePinecone() {
    try {
      this.client = new PineconeClient({
        apiKey: process.env.PINECONE_API_KEY,
        environment: process.env.PINECONE_ENVIRONMENT
      });
      
      console.log('Pinecone客户端初始化成功');
    } catch (error) {
      console.error('Pinecone初始化失败:', error);
    }
  }
  
  async initializeChroma() {
    try {
      this.client = new ChromaClient({
        host: process.env.CHROMA_HOST || 'localhost',
        port: process.env.CHROMA_PORT || 8000
      });
      
      console.log('ChromaDB客户端初始化成功');
    } catch (error) {
      console.error('ChromaDB初始化失败:', error);
    }
  }
  
  async initializeWeaviate() {
    try {
      this.client = weaviate.client({
        scheme: 'http',
        host: process.env.WEAVIATE_URL || 'localhost:8080',
        headers: process.env.WEAVIATE_API_KEY ? {
          'Authorization': `Bearer ${process.env.WEAVIATE_API_KEY}`
        } : {}
      });
      
      console.log('Weaviate客户端初始化成功');
    } catch (error) {
      console.error('Weaviate初始化失败:', error);
    }
  }
  
  /**
   * 获取文本嵌入向量
   */
  async getEmbedding(text) {
    try {
      const response = await this.openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: text
      });
      
      return response.data[0].embedding;
    } catch (error) {
      console.error('获取嵌入向量失败:', error);
      return null;
    }
  }
  
  /**
   * 向量化并存储标准规范库
   */
  async vectorizeStandards() {
    if (this.dbType === 'none') {
      console.log('未配置向量数据库，跳过标准规范向量化');
      return;
    }
    
    console.log('开始向量化标准规范库...');
    
    const standards = await StandardsLibrary.find({ status: '现行', isActive: true });
    console.log(`找到 ${standards.length} 个标准规范`);
    
    for (const standard of standards) {
      try {
        // 构建文本内容
        const textContent = this.buildStandardText(standard);
        
        // 获取嵌入向量
        const embedding = await this.getEmbedding(textContent);
        
        if (embedding) {
          // 存储到向量数据库
          await this.storeVector({
            id: `standard_${standard._id}`,
            vector: embedding,
            metadata: {
              type: 'standard',
              code: standard.code,
              name: standard.name,
              category: standard.category,
              project_types: standard.applicableScope.projectTypes,
              content: textContent.substring(0, 1000), // 限制长度
              source: 'standards_library'
            }
          });
          
          console.log(`已向量化标准: ${standard.code}`);
        }
        
        // 避免API限制，添加延迟
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`向量化标准 ${standard.code} 失败:`, error);
      }
    }
    
    console.log('标准规范库向量化完成');
  }
  
  /**
   * 向量化并存储专业知识库
   */
  async vectorizeKnowledge() {
    if (this.dbType === 'none') {
      console.log('未配置向量数据库，跳过知识库向量化');
      return;
    }
    
    console.log('开始向量化专业知识库...');
    
    const knowledgeItems = await KnowledgeBase.find({ status: '已发布', isActive: true });
    console.log(`找到 ${knowledgeItems.length} 个知识条目`);
    
    for (const item of knowledgeItems) {
      try {
        // 构建文本内容
        const textContent = this.buildKnowledgeText(item);
        
        // 获取嵌入向量
        const embedding = await this.getEmbedding(textContent);
        
        if (embedding) {
          // 存储到向量数据库
          await this.storeVector({
            id: `knowledge_${item._id}`,
            vector: embedding,
            metadata: {
              type: 'knowledge',
              title: item.title,
              category: item.category,
              knowledge_type: item.type,
              project_types: item.applicableConditions.projectTypes,
              content: textContent.substring(0, 1000),
              source: 'knowledge_base'
            }
          });
          
          console.log(`已向量化知识: ${item.title}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`向量化知识 ${item.title} 失败:`, error);
      }
    }
    
    console.log('专业知识库向量化完成');
  }
  
  /**
   * 构建标准规范文本
   */
  buildStandardText(standard) {
    const parts = [
      `标准编号: ${standard.code}`,
      `标准名称: ${standard.name}`,
      `标准类型: ${standard.type}`,
      `适用范围: ${standard.applicableScope.projectTypes.join(', ')}`
    ];
    
    if (standard.contents.generalProvisions) {
      parts.push(`总则: ${standard.contents.generalProvisions}`);
    }
    
    if (standard.contents.basicRequirements) {
      parts.push(`基本规定: ${standard.contents.basicRequirements}`);
    }
    
    if (standard.commonClauses && standard.commonClauses.length > 0) {
      const clauses = standard.commonClauses.map(clause => 
        `${clause.clauseNumber} ${clause.title}: ${clause.content}`
      ).join(' ');
      parts.push(`主要条款: ${clauses}`);
    }
    
    return parts.join(' ');
  }
  
  /**
   * 构建知识条目文本
   */
  buildKnowledgeText(item) {
    const parts = [
      `标题: ${item.title}`,
      `类型: ${item.type}`,
      `分类: ${item.category}`,
      `适用项目: ${item.applicableConditions.projectTypes.join(', ')}`
    ];
    
    if (item.content.overview) {
      parts.push(`概述: ${item.content.overview}`);
    }
    
    if (item.content.technicalRequirements) {
      parts.push(`技术要求: ${item.content.technicalRequirements}`);
    }
    
    if (item.content.qualityStandards) {
      parts.push(`质量标准: ${item.content.qualityStandards}`);
    }
    
    if (item.qualityControlPoints && item.qualityControlPoints.length > 0) {
      const controlPoints = item.qualityControlPoints.map(point => 
        `${point.controlItem}: ${point.controlMethod}`
      ).join(' ');
      parts.push(`质量控制要点: ${controlPoints}`);
    }
    
    return parts.join(' ');
  }
  
  /**
   * 存储向量到数据库
   */
  async storeVector(vectorData) {
    switch (this.dbType) {
      case 'pinecone':
        await this.storeToPinecone(vectorData);
        break;
      case 'chroma':
        await this.storeToChroma(vectorData);
        break;
      case 'weaviate':
        await this.storeToWeaviate(vectorData);
        break;
    }
  }
  
  async storeToPinecone(vectorData) {
    try {
      const index = this.client.Index(process.env.PINECONE_INDEX_NAME);
      
      await index.upsert({
        upsertRequest: {
          vectors: [{
            id: vectorData.id,
            values: vectorData.vector,
            metadata: vectorData.metadata
          }]
        }
      });
    } catch (error) {
      console.error('存储到Pinecone失败:', error);
    }
  }
  
  async storeToChroma(vectorData) {
    try {
      const collection = await this.client.getOrCreateCollection({
        name: process.env.CHROMA_COLLECTION_NAME || 'construction_knowledge'
      });
      
      await collection.add({
        ids: [vectorData.id],
        embeddings: [vectorData.vector],
        metadatas: [vectorData.metadata],
        documents: [vectorData.metadata.content]
      });
    } catch (error) {
      console.error('存储到ChromaDB失败:', error);
    }
  }
  
  async storeToWeaviate(vectorData) {
    try {
      await this.client
        .data
        .creator()
        .withClassName('ConstructionKnowledge')
        .withProperties(vectorData.metadata)
        .withVector(vectorData.vector)
        .do();
    } catch (error) {
      console.error('存储到Weaviate失败:', error);
    }
  }
  
  /**
   * 搜索相似向量
   */
  async searchSimilar(query, topK = 10) {
    if (this.dbType === 'none') {
      return [];
    }
    
    const queryEmbedding = await this.getEmbedding(query);
    if (!queryEmbedding) {
      return [];
    }
    
    switch (this.dbType) {
      case 'pinecone':
        return await this.searchPinecone(queryEmbedding, topK);
      case 'chroma':
        return await this.searchChroma(queryEmbedding, topK);
      case 'weaviate':
        return await this.searchWeaviate(queryEmbedding, topK);
      default:
        return [];
    }
  }
  
  async searchPinecone(vector, topK) {
    try {
      const index = this.client.Index(process.env.PINECONE_INDEX_NAME);
      
      const queryResponse = await index.query({
        queryRequest: {
          vector: vector,
          topK: topK,
          includeMetadata: true
        }
      });
      
      return queryResponse.matches || [];
    } catch (error) {
      console.error('Pinecone搜索失败:', error);
      return [];
    }
  }
  
  async searchChroma(vector, topK) {
    try {
      const collection = await this.client.getCollection({
        name: process.env.CHROMA_COLLECTION_NAME || 'construction_knowledge'
      });
      
      const results = await collection.query({
        queryEmbeddings: [vector],
        nResults: topK,
        include: ['metadatas', 'documents', 'distances']
      });
      
      return results.metadatas[0].map((metadata, index) => ({
        metadata: metadata,
        score: 1 - results.distances[0][index], // 转换为相似度分数
        document: results.documents[0][index]
      }));
    } catch (error) {
      console.error('ChromaDB搜索失败:', error);
      return [];
    }
  }
  
  async searchWeaviate(vector, topK) {
    try {
      const result = await this.client
        .graphql
        .get()
        .withClassName('ConstructionKnowledge')
        .withFields('content type title category')
        .withNearVector({ vector: vector })
        .withLimit(topK)
        .do();
      
      return result.data.Get.ConstructionKnowledge || [];
    } catch (error) {
      console.error('Weaviate搜索失败:', error);
      return [];
    }
  }
  
  /**
   * 清空向量数据库
   */
  async clearDatabase() {
    console.log('清空向量数据库...');
    
    switch (this.dbType) {
      case 'pinecone':
        await this.clearPinecone();
        break;
      case 'chroma':
        await this.clearChroma();
        break;
      case 'weaviate':
        await this.clearWeaviate();
        break;
    }
    
    console.log('向量数据库已清空');
  }
  
  async clearPinecone() {
    try {
      const index = this.client.Index(process.env.PINECONE_INDEX_NAME);
      await index.delete1({ deleteAll: true });
    } catch (error) {
      console.error('清空Pinecone失败:', error);
    }
  }
  
  async clearChroma() {
    try {
      await this.client.deleteCollection({
        name: process.env.CHROMA_COLLECTION_NAME || 'construction_knowledge'
      });
    } catch (error) {
      console.error('清空ChromaDB失败:', error);
    }
  }
  
  async clearWeaviate() {
    try {
      await this.client.schema.classDeleter().withClassName('ConstructionKnowledge').do();
    } catch (error) {
      console.error('清空Weaviate失败:', error);
    }
  }
}

/**
 * 主要执行函数
 */
async function main() {
  const manager = new VectorDBManager();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'vectorize':
      console.log('开始向量化所有数据...');
      await manager.vectorizeStandards();
      await manager.vectorizeKnowledge();
      break;
      
    case 'clear':
      await manager.clearDatabase();
      break;
      
    case 'search':
      const query = process.argv[3] || '混凝土浇筑施工工艺';
      console.log(`搜索查询: ${query}`);
      const results = await manager.searchSimilar(query, 5);
      console.log('搜索结果:', JSON.stringify(results, null, 2));
      break;
      
    default:
      console.log(`
使用方法:
  node vectorDBManager.js vectorize  # 向量化所有数据
  node vectorDBManager.js clear      # 清空向量数据库
  node vectorDBManager.js search "查询内容"  # 测试搜索功能

当前配置的向量数据库类型: ${manager.dbType}
      `);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = VectorDBManager;