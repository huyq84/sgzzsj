# 建筑工程施工组织设计系统

一个专业的建筑工程施工组织设计管理系统，支持智能生成投标阶段和施工阶段的施工组织设计文档。

## 🚀 系统特性

### 核心功能
- **项目管理**: 完整的项目生命周期管理
- **智能生成**: 基于模板和项目信息自动生成施工组织设计
- **模板管理**: 可自定义的施工组织设计模板
- **文档管理**: 统一的文档存储和版本控制
- **团队协作**: 多用户权限管理和协作编辑
- **进度跟踪**: 实时项目进度监控

### 技术特色
- **现代化架构**: React + Node.js + MongoDB
- **响应式设计**: 支持桌面和移动端访问
- **权限控制**: 基于角色的访问控制(RBAC)
- **文件处理**: 支持多种格式文档上传和解析
- **模板引擎**: 基于Handlebars的智能内容生成

## 🛠️ 技术栈

### 后端
- **Node.js** - 服务器运行环境
- **Express.js** - Web应用框架
- **MongoDB** - 数据库
- **Mongoose** - ODM对象建模
- **JWT** - 身份认证
- **Multer** - 文件上传处理
- **Handlebars** - 模板引擎

### 前端
- **React 18** - 用户界面框架
- **Ant Design** - UI组件库
- **React Router** - 路由管理
- **Axios** - HTTP客户端
- **React Query** - 数据获取和缓存
- **Styled Components** - CSS-in-JS样式

## 📋 系统要求

- **Node.js** >= 16.0.0
- **npm** >= 8.0.0  
- **MongoDB** >= 5.0

## 🚀 快速开始

### 1. 克隆项目
```bash
git clone <repository-url>
cd construction-organization-system
```

### 2. 自动安装和配置
```bash
chmod +x start.sh
./start.sh
```

### 3. 环境配置
复制并配置环境变量文件：
```bash
cp .env.example .env
```

编辑 `.env` 文件，配置以下关键参数：
```env
# 数据库配置
MONGODB_URI=mongodb://localhost:27017/construction_system

# JWT密钥（生产环境请使用强密码）
JWT_SECRET=your_super_secret_jwt_key_here

# 服务器配置
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000
```

### 4. 启动系统

#### 开发模式（推荐）
```bash
npm run dev
```

#### 分别启动前后端
```bash
# 终端1 - 启动后端
npm run server

# 终端2 - 启动前端
npm run client
```

#### 生产模式
```bash
npm run build
npm start
```

### 5. 访问系统
- 前端地址: http://localhost:3000
- 后端API: http://localhost:5000/api

## 📁 项目结构

```
construction-organization-system/
├── README.md                 # 项目说明
├── package.json             # 后端依赖配置
├── server.js               # 服务器入口文件
├── .env                    # 环境变量配置
├── start.sh               # 启动脚本
│
├── models/                # 数据模型
│   ├── User.js           # 用户模型
│   ├── Project.js        # 项目模型
│   ├── Template.js       # 模板模型
│   └── Document.js       # 文档模型
│
├── routes/               # API路由
│   ├── auth.js          # 认证路由
│   ├── projects.js      # 项目路由
│   ├── templates.js     # 模板路由
│   └── files.js         # 文件路由
│
├── middleware/          # 中间件
│   └── auth.js         # 认证中间件
│
├── services/           # 业务服务
│   └── organizationService.js  # 施工组织设计生成服务
│
├── uploads/           # 文件上传目录
├── public/           # 静态文件
│
└── client/          # 前端React应用
    ├── package.json # 前端依赖配置
    ├── public/     # 公共资源
    └── src/        # 源代码
        ├── components/    # 通用组件
        ├── pages/        # 页面组件
        ├── contexts/     # React上下文
        ├── services/     # API服务
        └── App.js       # 主应用组件
```

## 💡 主要功能模块

### 1. 用户管理
- 用户注册和登录
- 角色权限管理（管理员、项目经理、工程师等）
- 个人信息管理
- 专业认证管理

### 2. 项目管理
- 项目创建和基本信息管理
- 项目团队成员管理
- 项目进度跟踪
- 项目文档关联

### 3. 施工组织设计
- **投标阶段设计**: 适用于投标文件准备
- **施工阶段设计**: 适用于实际施工指导
- 智能内容生成基于：
  - 项目基本信息
  - 工程规模和特点
  - 参建单位信息
  - 预设模板内容

### 4. 模板管理
- 可自定义的施工组织设计模板
- 模板版本控制
- 模板变量配置
- 模板使用统计

### 5. 文档管理
- 多格式文档上传（PDF、Word、Excel、图片等）
- 文档分类和标签
- 文档版本管理
- 文档权限控制

## 🔧 开发指南

### API接口文档
系统提供RESTful API接口，主要端点包括：

```
POST /api/auth/login          # 用户登录
POST /api/auth/register       # 用户注册
GET  /api/projects           # 获取项目列表
POST /api/projects           # 创建新项目
GET  /api/projects/:id       # 获取项目详情
POST /api/projects/:id/generate  # 生成施工组织设计
GET  /api/templates          # 获取模板列表
POST /api/files/upload       # 上传文件
```

### 数据库设计
系统使用MongoDB存储数据，主要集合包括：
- `users` - 用户信息
- `projects` - 项目信息
- `templates` - 模板信息
- `documents` - 文档信息

### 扩展开发
要添加新功能，请遵循以下步骤：
1. 在 `models/` 中定义数据模型
2. 在 `routes/` 中创建API路由
3. 在 `client/src/pages/` 中创建前端页面
4. 在 `client/src/services/` 中添加API调用

## 🔒 安全性

系统实施多层安全措施：
- JWT令牌身份验证
- 密码加密存储
- 请求速率限制
- 文件上传安全检查
- CORS跨域保护
- SQL注入防护

## 📝 使用说明

### 1. 系统管理员
- 管理用户账户和权限
- 配置系统模板
- 监控系统使用情况

### 2. 项目经理
- 创建和管理项目
- 分配团队成员和权限
- 审核施工组织设计

### 3. 工程师
- 参与项目协作
- 上传和管理文档
- 生成施工组织设计

## 🤝 贡献指南

欢迎贡献代码！请遵循以下步骤：
1. Fork 项目仓库
2. 创建功能分支
3. 提交代码变更
4. 推送到分支
5. 创建Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 📞 技术支持

如有问题或需要技术支持，请通过以下方式联系：
- 提交 GitHub Issue
- 发送邮件至项目维护者

## 🔄 版本历史

- **v1.0.0** - 初始版本发布
  - 基础项目管理功能
  - 施工组织设计生成
  - 用户认证和权限管理
  - 文档管理系统

---

**注意**: 本系统为建筑工程专业软件，使用前请确保了解相关建筑行业标准和规范。