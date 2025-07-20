const express = require('express');
const { body, validationResult, param } = require('express-validator');
const Project = require('../models/Project');
const Template = require('../models/Template');
const { auth, authorize } = require('../middleware/auth');
const { generateOrganizationDesign } = require('../services/organizationService');

const router = express.Router();

// 获取项目列表
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, type, status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    const query = {};
    
    // 根据用户角色过滤项目
    if (req.user.role !== 'admin') {
      query.$or = [
        { createdBy: req.user.userId },
        { 'teamMembers.user': req.user.userId }
      ];
    }

    // 搜索过滤
    if (search) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { projectName: { $regex: search, $options: 'i' } },
          { projectCode: { $regex: search, $options: 'i' } },
          { 'location.city': { $regex: search, $options: 'i' } }
        ]
      });
    }

    // 类型过滤
    if (type) {
      query.projectType = type;
    }

    // 状态过滤
    if (status) {
      query['organizationDesign.status'] = status;
    }

    // 只显示活跃项目
    query.isActive = true;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 },
      populate: [
        { path: 'createdBy', select: 'fullName username' },
        { path: 'teamMembers.user', select: 'fullName username' },
        { path: 'organizationDesign.template', select: 'name type' }
      ]
    };

    const projects = await Project.paginate(query, options);

    // 计算每个项目的完成度
    const projectsWithProgress = projects.docs.map(project => {
      const projectObj = project.toObject({ virtuals: true });
      return projectObj;
    });

    res.json({
      success: true,
      data: {
        projects: projectsWithProgress,
        pagination: {
          currentPage: projects.page,
          totalPages: projects.totalPages,
          totalProjects: projects.totalDocs,
          hasNextPage: projects.hasNextPage,
          hasPrevPage: projects.hasPrevPage
        }
      }
    });

  } catch (error) {
    console.error('获取项目列表错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 获取项目详情
router.get('/:id', auth, param('id').isMongoId(), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '无效的项目ID',
        errors: errors.array()
      });
    }

    const project = await Project.findById(req.params.id)
      .populate('createdBy', 'fullName username email')
      .populate('teamMembers.user', 'fullName username email role')
      .populate('organizationDesign.template', 'name type description')
      .populate('organizationDesign.generatedBy', 'fullName username')
      .populate('documents');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: '项目不存在'
      });
    }

    // 检查用户是否有权限访问
    const hasAccess = project.createdBy._id.toString() === req.user.userId ||
                     project.teamMembers.some(member => member.user._id.toString() === req.user.userId) ||
                     req.user.role === 'admin';

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: '权限不足'
      });
    }

    const projectObj = project.toObject({ virtuals: true });

    res.json({
      success: true,
      data: {
        project: projectObj
      }
    });

  } catch (error) {
    console.error('获取项目详情错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 创建新项目
router.post('/', auth, [
  body('projectName', '项目名称不能为空').notEmpty().trim(),
  body('projectCode', '项目编码不能为空').notEmpty().trim(),
  body('projectType', '请选择项目类型').isIn([
    '住宅建筑', '商业建筑', '工业建筑', '公共建筑', '基础设施',
    '市政工程', '水利工程', '交通工程', '能源工程', '环保工程'
  ]),
  body('constructionType', '请选择建设类型').isIn(['新建', '改建', '扩建', '维修', '加固', '拆除']),
  body('organizationDesign.type', '请选择施工组织设计类型').isIn(['投标阶段', '施工阶段'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '输入验证失败',
        errors: errors.array()
      });
    }

    const {
      projectName,
      projectCode,
      projectType,
      constructionType,
      projectScale,
      location,
      projectSchedule,
      participants,
      organizationDesign,
      tags,
      notes
    } = req.body;

    // 检查项目编码是否已存在
    const existingProject = await Project.findOne({ projectCode });
    if (existingProject) {
      return res.status(400).json({
        success: false,
        message: '项目编码已存在'
      });
    }

    // 创建项目
    const project = new Project({
      projectName,
      projectCode,
      projectType,
      constructionType,
      projectScale,
      location,
      projectSchedule,
      participants,
      organizationDesign: {
        type: organizationDesign.type,
        status: '未开始'
      },
      createdBy: req.user.userId,
      tags: tags || [],
      notes
    });

    await project.save();

    // 添加创建者为项目经理
    await project.addTeamMember(req.user.userId, '项目经理', ['读取', '编辑', '审核', '审批', '删除']);

    // 查找默认模板
    const defaultTemplate = await Template.getDefaultTemplate(organizationDesign.type, projectType);
    if (defaultTemplate) {
      project.organizationDesign.template = defaultTemplate._id;
      await project.save();
    }

    const populatedProject = await Project.findById(project._id)
      .populate('createdBy', 'fullName username')
      .populate('organizationDesign.template', 'name type');

    res.status(201).json({
      success: true,
      message: '项目创建成功',
      data: {
        project: populatedProject.toObject({ virtuals: true })
      }
    });

  } catch (error) {
    console.error('创建项目错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 更新项目
router.put('/:id', auth, param('id').isMongoId(), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '无效的项目ID',
        errors: errors.array()
      });
    }

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: '项目不存在'
      });
    }

    // 检查权限
    const teamMember = project.teamMembers.find(member => 
      member.user.toString() === req.user.userId
    );
    
    const hasEditPermission = project.createdBy.toString() === req.user.userId ||
                             (teamMember && teamMember.permissions.includes('编辑')) ||
                             req.user.role === 'admin';

    if (!hasEditPermission) {
      return res.status(403).json({
        success: false,
        message: '权限不足'
      });
    }

    const allowedFields = [
      'projectName', 'projectType', 'constructionType', 'projectScale',
      'location', 'projectSchedule', 'participants', 'tags', 'notes'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        project[field] = req.body[field];
      }
    });

    await project.save();

    const updatedProject = await Project.findById(project._id)
      .populate('createdBy', 'fullName username')
      .populate('teamMembers.user', 'fullName username')
      .populate('organizationDesign.template', 'name type');

    res.json({
      success: true,
      message: '项目更新成功',
      data: {
        project: updatedProject.toObject({ virtuals: true })
      }
    });

  } catch (error) {
    console.error('更新项目错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 生成施工组织设计
router.post('/:id/generate', auth, param('id').isMongoId(), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '无效的项目ID',
        errors: errors.array()
      });
    }

    const { templateId, customVariables } = req.body;

    const project = await Project.findById(req.params.id)
      .populate('organizationDesign.template');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: '项目不存在'
      });
    }

    // 检查权限
    const teamMember = project.teamMembers.find(member => 
      member.user.toString() === req.user.userId
    );
    
    const hasEditPermission = project.createdBy.toString() === req.user.userId ||
                             (teamMember && teamMember.permissions.includes('编辑')) ||
                             req.user.role === 'admin';

    if (!hasEditPermission) {
      return res.status(403).json({
        success: false,
        message: '权限不足'
      });
    }

    // 获取模板
    let template = project.organizationDesign.template;
    if (templateId) {
      template = await Template.findById(templateId);
      if (!template) {
        return res.status(404).json({
          success: false,
          message: '模板不存在'
        });
      }
    }

    if (!template) {
      return res.status(400).json({
        success: false,
        message: '未找到可用的模板'
      });
    }

    // 生成施工组织设计
    const generatedContent = await generateOrganizationDesign(project, template, customVariables);

    // 更新项目
    project.organizationDesign.status = '已完成';
    project.organizationDesign.lastGenerated = new Date();
    project.organizationDesign.generatedBy = req.user.userId;
    project.organizationDesign.template = template._id;

    // 更新各部分内容
    Object.keys(generatedContent).forEach(sectionName => {
      if (project.organizationDesign.sections[sectionName]) {
        project.organizationDesign.sections[sectionName].content = generatedContent[sectionName];
        project.organizationDesign.sections[sectionName].completed = true;
        project.organizationDesign.sections[sectionName].lastUpdated = new Date();
      }
    });

    await project.save();

    // 增加模板使用次数
    await template.incrementUsage(req.user.userId, project._id);

    res.json({
      success: true,
      message: '施工组织设计生成成功',
      data: {
        organizationDesign: project.organizationDesign,
        completionPercentage: project.completionPercentage
      }
    });

  } catch (error) {
    console.error('生成施工组织设计错误:', error);
    res.status(500).json({
      success: false,
      message: '生成失败：' + error.message
    });
  }
});

// 添加团队成员
router.post('/:id/members', auth, [
  param('id').isMongoId(),
  body('userId', '请选择用户').isMongoId(),
  body('role', '请选择角色').isIn([
    '项目经理', '技术负责人', '施工员', '质量员', '安全员', '材料员', '资料员', '监理工程师'
  ]),
  body('permissions', '请设置权限').isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '输入验证失败',
        errors: errors.array()
      });
    }

    const { userId, role, permissions } = req.body;

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: '项目不存在'
      });
    }

    // 检查权限
    const hasManagePermission = project.createdBy.toString() === req.user.userId ||
                               req.user.role === 'admin';

    if (!hasManagePermission) {
      return res.status(403).json({
        success: false,
        message: '权限不足'
      });
    }

    // 检查用户是否已在项目中
    const existingMember = project.teamMembers.find(member => 
      member.user.toString() === userId
    );

    if (existingMember) {
      return res.status(400).json({
        success: false,
        message: '用户已在项目团队中'
      });
    }

    await project.addTeamMember(userId, role, permissions);

    const updatedProject = await Project.findById(project._id)
      .populate('teamMembers.user', 'fullName username email');

    res.json({
      success: true,
      message: '团队成员添加成功',
      data: {
        teamMembers: updatedProject.teamMembers
      }
    });

  } catch (error) {
    console.error('添加团队成员错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 删除项目
router.delete('/:id', auth, param('id').isMongoId(), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '无效的项目ID',
        errors: errors.array()
      });
    }

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: '项目不存在'
      });
    }

    // 检查权限
    const hasDeletePermission = project.createdBy.toString() === req.user.userId ||
                               req.user.role === 'admin';

    if (!hasDeletePermission) {
      return res.status(403).json({
        success: false,
        message: '权限不足'
      });
    }

    // 软删除
    project.isActive = false;
    await project.save();

    res.json({
      success: true,
      message: '项目删除成功'
    });

  } catch (error) {
    console.error('删除项目错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

module.exports = router;