const handlebars = require('handlebars');
const moment = require('moment');

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
 * 生成施工组织设计
 * @param {Object} project - 项目对象
 * @param {Object} template - 模板对象
 * @param {Object} customVariables - 自定义变量
 * @returns {Object} 生成的内容
 */
async function generateOrganizationDesign(project, template, customVariables = {}) {
  try {
    const generatedContent = {};
    
    // 准备模板变量
    const templateData = prepareTemplateData(project, customVariables);
    
    // 处理每个章节
    const sections = template.sections;
    
    for (const sectionKey in sections) {
      const section = sections[sectionKey];
      
      if (section.template && section.required) {
        try {
          const compiledTemplate = handlebars.compile(section.template);
          generatedContent[sectionKey] = compiledTemplate(templateData);
        } catch (error) {
          console.error(`生成${section.title}时出错:`, error);
          generatedContent[sectionKey] = `生成${section.title}时出错: ${error.message}`;
        }
      }
    }
    
    return generatedContent;
    
  } catch (error) {
    console.error('生成施工组织设计失败:', error);
    throw new Error('生成施工组织设计失败: ' + error.message);
  }
}

/**
 * 准备模板数据
 * @param {Object} project - 项目对象
 * @param {Object} customVariables - 自定义变量
 * @returns {Object} 模板数据
 */
function prepareTemplateData(project, customVariables) {
  const currentDate = new Date();
  
  return {
    // 项目基本信息
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
    
    // 项目规模信息
    scale: {
      buildingArea: project.projectScale?.buildingArea || 0,
      floors: project.projectScale?.floors || 0,
      height: project.projectScale?.height || 0,
      investment: project.projectScale?.investment || 0,
      contractValue: project.projectScale?.contractValue || 0
    },
    
    // 时间信息
    dates: {
      current: currentDate,
      plannedStart: project.projectSchedule?.plannedStartDate,
      plannedEnd: project.projectSchedule?.plannedEndDate,
      totalDuration: project.projectSchedule?.totalDuration || 0
    },
    
    // 地理位置信息
    location: {
      province: project.location?.province || '',
      city: project.location?.city || '',
      district: project.location?.district || '',
      address: project.location?.address || ''
    },
    
    // 参建单位
    owner: project.participants?.owner || {},
    contractor: project.participants?.contractor || {},
    supervisor: project.participants?.supervisor || {},
    designer: project.participants?.designer || {},
    
    // 工程特点（根据项目类型和规模自动生成）
    features: generateProjectFeatures(project),
    
    // 工程重难点
    difficulties: generateProjectDifficulties(project),
    
    // 质量目标
    qualityTarget: generateQualityTarget(project),
    
    // 安全目标
    safetyTarget: generateSafetyTarget(project),
    
    // 环保目标
    environmentTarget: generateEnvironmentTarget(project),
    
    // 工期目标
    scheduleTarget: generateScheduleTarget(project),
    
    // 自定义变量
    custom: customVariables,
    
    // 系统生成的变量
    generated: {
      timestamp: currentDate.toISOString(),
      year: currentDate.getFullYear(),
      month: currentDate.getMonth() + 1,
      day: currentDate.getDate()
    }
  };
}

/**
 * 生成工程特点
 * @param {Object} project - 项目对象
 * @returns {Array} 工程特点列表
 */
function generateProjectFeatures(project) {
  const features = [];
  
  // 根据项目类型添加特点
  switch (project.projectType) {
    case '住宅建筑':
      features.push('住宅功能要求高，需要满足居住舒适性要求');
      features.push('户型多样化，结构布局复杂');
      break;
    case '商业建筑':
      features.push('商业功能要求高，需要考虑人流动线');
      features.push('装修标准高，机电设备复杂');
      break;
    case '工业建筑':
      features.push('承载能力要求高，结构跨度大');
      features.push('工艺要求特殊，施工精度要求高');
      break;
    default:
      features.push('功能要求复杂，技术标准高');
  }
  
  // 根据规模添加特点
  if (project.projectScale?.buildingArea > 50000) {
    features.push('工程规模大，施工工期紧');
    features.push('参建单位多，协调难度大');
  }
  
  if (project.projectScale?.floors > 20) {
    features.push('建筑高度高，垂直运输要求高');
    features.push('结构复杂，施工技术要求高');
  }
  
  return features;
}

/**
 * 生成工程重难点
 * @param {Object} project - 项目对象
 * @returns {Array} 重难点列表
 */
function generateProjectDifficulties(project) {
  const difficulties = [];
  
  difficulties.push('确保工程质量，满足设计要求和规范标准');
  difficulties.push('控制施工进度，确保按期完工');
  difficulties.push('加强安全管理，确保施工安全');
  
  if (project.projectScale?.floors > 10) {
    difficulties.push('高空作业安全控制');
    difficulties.push('垂直运输组织');
  }
  
  if (project.constructionType === '改建' || project.constructionType === '扩建') {
    difficulties.push('与既有建筑的协调配合');
    difficulties.push('施工过程中的功能保障');
  }
  
  return difficulties;
}

/**
 * 生成质量目标
 * @param {Object} project - 项目对象
 * @returns {String} 质量目标
 */
function generateQualityTarget(project) {
  const baseTarget = '确保工程质量达到国家验收标准，一次验收合格率100%';
  
  if (project.projectScale?.contractValue > 10000000) { // 1000万以上
    return baseTarget + '，争创省级优质工程奖';
  } else if (project.projectScale?.contractValue > 5000000) { // 500万以上
    return baseTarget + '，争创市级优质工程奖';
  }
  
  return baseTarget;
}

/**
 * 生成安全目标
 * @param {Object} project - 项目对象
 * @returns {String} 安全目标
 */
function generateSafetyTarget(project) {
  return '确保施工过程中无重大安全事故，轻伤事故控制在3‰以内，争创安全文明标准化工地';
}

/**
 * 生成环保目标
 * @param {Object} project - 项目对象
 * @returns {String} 环保目标
 */
function generateEnvironmentTarget(project) {
  return '严格执行环保法规，控制施工噪音、粉尘和废水排放，创建绿色施工示范工程';
}

/**
 * 生成工期目标
 * @param {Object} project - 项目对象
 * @returns {String} 工期目标
 */
function generateScheduleTarget(project) {
  const duration = project.projectSchedule?.totalDuration || 365;
  const startDate = project.projectSchedule?.plannedStartDate;
  const endDate = project.projectSchedule?.plannedEndDate;
  
  if (startDate && endDate) {
    return `确保工程按计划于${moment(endDate).format('YYYY年MM月DD日')}完工，总工期${duration}天`;
  }
  
  return `确保工程按计划完工，总工期${duration}天`;
}

/**
 * 生成默认模板内容
 * @param {String} sectionType - 章节类型
 * @param {Object} templateData - 模板数据
 * @returns {String} 生成的内容
 */
function generateDefaultContent(sectionType, templateData) {
  const templates = {
    projectOverview: `
# 工程概况

## 1.1 工程基本情况

工程名称：{{project.name}}
工程地点：{{location.province}}{{location.city}}{{location.district}}{{location.address}}
建设单位：{{owner.name}}
设计单位：{{designer.name}}
施工单位：{{contractor.name}}
监理单位：{{supervisor.name}}

## 1.2 工程规模

建筑面积：{{formatNumber scale.buildingArea}}平方米
建筑层数：{{scale.floors}}层
建筑高度：{{scale.height}}米
合同金额：{{formatNumber scale.contractValue}}元

## 1.3 工程特点

{{#each features}}
- {{this}}
{{/each}}

## 1.4 工程重难点

{{#each difficulties}}
- {{this}}
{{/each}}
    `,
    
    constructionDeployment: `
# 施工部署

## 2.1 施工目标

### 质量目标
{{qualityTarget}}

### 安全目标
{{safetyTarget}}

### 工期目标
{{scheduleTarget}}

### 环保目标
{{environmentTarget}}

## 2.2 施工组织机构

根据工程特点和规模，成立项目经理部，实行项目经理负责制。

## 2.3 施工准备

### 技术准备
1. 组织图纸会审和技术交底
2. 编制专项施工方案
3. 进行技术培训

### 现场准备
1. 搭设临时设施
2. 布置施工机械
3. 组织材料进场

## 2.4 施工部署原则

1. 统一指挥，分工协作
2. 均衡施工，重点突出
3. 安全第一，质量至上
4. 文明施工，环保优先
    `,
    
    constructionSchedule: `
# 施工进度计划

## 3.1 工期安排

计划开工日期：{{formatDate dates.plannedStart}}
计划竣工日期：{{formatDate dates.plannedEnd}}
总施工工期：{{dates.totalDuration}}天

## 3.2 施工阶段划分

### 第一阶段：前期准备阶段
主要工作：场地平整、临时设施搭设、施工准备

### 第二阶段：基础施工阶段
主要工作：基础开挖、基础施工、地下室施工

### 第三阶段：主体施工阶段
主要工作：主体结构施工、设备安装

### 第四阶段：装饰装修阶段
主要工作：装饰装修、设备调试

### 第五阶段：竣工验收阶段
主要工作：收尾工程、联合验收、工程交付

## 3.3 关键节点控制

1. 基础工程完成时间
2. 主体结构封顶时间
3. 装饰装修开始时间
4. 工程竣工验收时间

## 3.4 进度保证措施

1. 加强施工组织管理
2. 合理配置施工资源
3. 采用先进施工工艺
4. 实施动态进度控制
    `
  };
  
  return templates[sectionType] || '';
}

module.exports = {
  generateOrganizationDesign,
  prepareTemplateData,
  generateDefaultContent
};