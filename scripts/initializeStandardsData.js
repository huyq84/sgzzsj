const mongoose = require('mongoose');
const StandardsLibrary = require('../models/StandardsLibrary');
const KnowledgeBase = require('../models/KnowledgeBase');
require('dotenv').config();

/**
 * 初始化标准规范库数据
 * 这个脚本用于导入建筑工程相关的国家标准、行业标准等
 */

// 建筑工程常用标准规范数据
const standardsData = [
  {
    code: 'GB 50010-2010',
    name: '混凝土结构设计规范',
    type: '国家标准',
    category: '结构工程',
    version: '2010版',
    publishDate: new Date('2010-08-18'),
    effectiveDate: new Date('2011-07-01'),
    status: '现行',
    applicableScope: {
      projectTypes: ['住宅建筑', '商业建筑', '工业建筑', '公共建筑'],
      buildingTypes: ['钢筋混凝土结构', '预应力混凝土结构'],
      regions: ['全国'],
      climateZones: ['全国']
    },
    contents: {
      generalProvisions: '本规范适用于房屋和一般构筑物的钢筋混凝土、预应力混凝土承重结构设计。',
      basicRequirements: '混凝土结构设计应符合国家的技术经济政策，做到技术先进、经济合理、安全适用、确保质量。',
      constructionRequirements: '混凝土结构的施工应按现行国家标准《混凝土结构工程施工质量验收规范》GB 50204等的有关规定执行。',
      qualityControl: '混凝土结构应按现行国家标准进行质量检验和验收。',
      safetyRequirements: '混凝土结构设计应考虑施工阶段结构的安全性。',
      acceptanceCriteria: '混凝土结构工程的验收应符合现行国家标准的规定。'
    },
    commonClauses: [
      {
        clauseNumber: '3.1.1',
        title: '混凝土强度等级',
        content: '混凝土强度等级应按立方体抗压强度标准值确定。',
        category: '质量',
        importance: '强制性'
      },
      {
        clauseNumber: '4.1.1',
        title: '钢筋强度等级',
        content: '钢筋应按强度等级和品种选用。',
        category: '质量',
        importance: '强制性'
      }
    ],
    tags: ['混凝土', '结构设计', '钢筋']
  },
  
  {
    code: 'GB 50204-2015',
    name: '混凝土结构工程施工质量验收规范',
    type: '国家标准',
    category: '建筑工程',
    version: '2015版',
    publishDate: new Date('2014-12-03'),
    effectiveDate: new Date('2015-09-01'),
    status: '现行',
    applicableScope: {
      projectTypes: ['住宅建筑', '商业建筑', '工业建筑', '公共建筑'],
      buildingTypes: ['混凝土结构'],
      regions: ['全国'],
      climateZones: ['全国']
    },
    contents: {
      generalProvisions: '本规范适用于建筑工程混凝土结构施工质量的验收。',
      basicRequirements: '混凝土结构工程施工前应具备相应的施工技术标准。',
      constructionRequirements: '模板安装应符合设计要求，保证工程结构和构件各部分形状尺寸的准确性。',
      qualityControl: '混凝土结构子分部工程可按楼层、变形缝等进行验收。',
      safetyRequirements: '施工过程中应采取安全技术措施。',
      acceptanceCriteria: '混凝土结构工程验收时应检查相关的施工记录。'
    },
    commonClauses: [
      {
        clauseNumber: '4.1.1',
        title: '模板工程',
        content: '模板及其支架应根据工程结构形式、荷载大小、地基土类别等条件进行设计。',
        category: '质量',
        importance: '强制性'
      },
      {
        clauseNumber: '5.2.1',
        title: '钢筋工程',
        content: '钢筋进场时应按国家现行相关标准的规定抽取试件作力学性能检验。',
        category: '质量',
        importance: '强制性'
      }
    ],
    tags: ['混凝土', '施工', '质量验收']
  },
  
  {
    code: 'GB 50009-2012',
    name: '建筑结构荷载规范',
    type: '国家标准',
    category: '结构工程',
    version: '2012版',
    publishDate: new Date('2012-05-11'),
    effectiveDate: new Date('2012-10-01'),
    status: '现行',
    applicableScope: {
      projectTypes: ['住宅建筑', '商业建筑', '工业建筑', '公共建筑'],
      buildingTypes: ['各类建筑结构'],
      regions: ['全国'],
      climateZones: ['全国']
    },
    contents: {
      generalProvisions: '本规范适用于建筑结构设计时确定荷载取值。',
      basicRequirements: '建筑结构设计时应考虑可能出现的各种荷载作用。',
      constructionRequirements: '施工过程中的荷载应按实际情况确定。',
      qualityControl: '荷载取值应符合本规范规定。',
      safetyRequirements: '应考虑荷载效应的不利组合。',
      acceptanceCriteria: '荷载计算书应符合设计要求。'
    },
    tags: ['荷载', '结构设计', '安全']
  }
];

// 专业知识库初始数据
const knowledgeData = [
  {
    title: '混凝土浇筑施工工艺',
    type: '施工工艺',
    category: '土建工程',
    applicableConditions: {
      projectTypes: ['住宅建筑', '商业建筑', '工业建筑'],
      buildingTypes: ['混凝土结构'],
      climateConditions: ['全年适用'],
      scaleRange: {
        minArea: 0,
        maxArea: 999999,
        minFloors: 1,
        maxFloors: 50
      }
    },
    content: {
      overview: '混凝土浇筑是混凝土结构施工的关键工序，直接影响工程质量。',
      principles: '混凝土浇筑应连续进行，避免出现冷缝。浇筑过程中应振捣密实，确保混凝土质量。',
      procedures: [
        {
          step: 1,
          description: '浇筑前准备工作',
          keyPoints: ['检查模板', '检查钢筋', '清理杂物'],
          duration: '1-2小时',
          resources: ['检查人员', '清理工具']
        },
        {
          step: 2,
          description: '混凝土运输',
          keyPoints: ['控制运输时间', '防止离析', '保持和易性'],
          duration: '根据距离确定',
          resources: ['混凝土运输车', '泵车']
        },
        {
          step: 3,
          description: '混凝土浇筑',
          keyPoints: ['分层浇筑', '连续作业', '控制浇筑速度'],
          duration: '根据工程量确定',
          resources: ['振捣器', '作业人员']
        }
      ],
      technicalRequirements: '混凝土浇筑应符合GB 50204-2015相关要求。',
      qualityStandards: '混凝土强度应达到设计要求，表面应平整密实。',
      safetyMeasures: '高空作业应系安全带，机械操作应专人负责。'
    },
    qualityControlPoints: [
      {
        phase: '浇筑前',
        controlItem: '模板检查',
        controlMethod: '尺寸测量、稳定性检查',
        acceptanceCriteria: '符合设计要求',
        inspectionFrequency: '每次浇筑前',
        responsibleParty: '质量员'
      },
      {
        phase: '浇筑中',
        controlItem: '振捣质量',
        controlMethod: '观察气泡排出情况',
        acceptanceCriteria: '表面无气泡，振动器周围混凝土不再显著下沉',
        inspectionFrequency: '连续监控',
        responsibleParty: '施工员'
      }
    ],
    status: '已发布',
    tags: ['混凝土', '浇筑', '施工工艺']
  },
  
  {
    title: '高层建筑施工安全措施',
    type: '安全措施',
    category: '土建工程',
    applicableConditions: {
      projectTypes: ['住宅建筑', '商业建筑', '公共建筑'],
      buildingTypes: ['高层建筑'],
      scaleRange: {
        minFloors: 10,
        maxFloors: 100,
        minHeight: 30,
        maxHeight: 500
      }
    },
    content: {
      overview: '高层建筑施工具有高空作业多、垂直运输量大等特点，安全风险较高。',
      principles: '坚持安全第一、预防为主的方针，建立完善的安全管理体系。',
      safetyMeasures: '设置安全防护设施，加强人员安全教育，建立应急预案。',
      technicalRequirements: '安全防护应符合JGJ 80-2016建筑施工高处作业安全技术规范。'
    },
    qualityControlPoints: [
      {
        phase: '施工全过程',
        controlItem: '安全防护设施',
        controlMethod: '日常检查、专项检查',
        acceptanceCriteria: '防护设施完好有效',
        inspectionFrequency: '每日检查',
        responsibleParty: '安全员'
      }
    ],
    status: '已发布',
    tags: ['高层建筑', '安全措施', '高空作业']
  }
];

async function initializeData() {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('数据库连接成功');
    
    // 清空现有数据（可选）
    console.log('清空现有标准规范数据...');
    await StandardsLibrary.deleteMany({});
    await KnowledgeBase.deleteMany({});
    
    // 插入标准规范数据
    console.log('插入标准规范数据...');
    for (const standard of standardsData) {
      const standardDoc = new StandardsLibrary(standard);
      await standardDoc.save();
      console.log(`已插入标准: ${standard.code} - ${standard.name}`);
    }
    
    // 插入专业知识数据
    console.log('插入专业知识数据...');
    for (const knowledge of knowledgeData) {
      // 为了示例，我们设置一个默认的创建者ID
      knowledge.createdBy = new mongoose.Types.ObjectId();
      const knowledgeDoc = new KnowledgeBase(knowledge);
      await knowledgeDoc.save();
      console.log(`已插入知识条目: ${knowledge.title}`);
    }
    
    console.log('数据初始化完成！');
    console.log(`共插入 ${standardsData.length} 个标准规范`);
    console.log(`共插入 ${knowledgeData.length} 个知识条目`);
    
  } catch (error) {
    console.error('数据初始化失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('数据库连接已关闭');
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  initializeData();
}

module.exports = { initializeData, standardsData, knowledgeData };