-- 建筑工程施工组织设计系统数据库初始化脚本

-- 创建扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 用户表
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    profession VARCHAR(50) NOT NULL, -- 专业：建筑、结构、机电、装饰等
    role VARCHAR(20) NOT NULL DEFAULT 'user', -- 角色：admin, user, manager
    company VARCHAR(100),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 项目表
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    project_type VARCHAR(50) NOT NULL, -- 项目类型：住宅、商业、工业等
    construction_type VARCHAR(50) NOT NULL, -- 建筑类型：框架、剪力墙、钢结构等
    total_area DECIMAL(10,2), -- 总建筑面积
    building_height DECIMAL(8,2), -- 建筑高度
    floors_count INTEGER, -- 楼层数
    underground_floors INTEGER DEFAULT 0, -- 地下层数
    client_name VARCHAR(100),
    location VARCHAR(200),
    start_date DATE,
    end_date DATE,
    status VARCHAR(20) DEFAULT 'draft', -- 状态：draft, in_progress, completed
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 文档表
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(50) NOT NULL, -- 文件类型：pdf, dwg, docx等
    document_type VARCHAR(50) NOT NULL, -- 文档类型：bid_document, drawing, specification等
    uploader_id UUID REFERENCES users(id),
    upload_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_processed BOOLEAN DEFAULT FALSE,
    processing_status VARCHAR(20) DEFAULT 'pending', -- 处理状态：pending, processing, completed, failed
    metadata JSONB -- 存储文档的元数据信息
);

-- 施工组织设计表
CREATE TABLE construction_designs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    design_type VARCHAR(20) NOT NULL, -- 设计类型：bid, construction
    title VARCHAR(200) NOT NULL,
    content JSONB NOT NULL, -- 设计内容，结构化存储
    generated_file_path VARCHAR(500),
    status VARCHAR(20) DEFAULT 'draft', -- 状态：draft, generated, approved
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 设计模板表
CREATE TABLE design_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    template_type VARCHAR(20) NOT NULL, -- 模板类型：bid, construction
    profession VARCHAR(50) NOT NULL, -- 适用专业
    content_template JSONB NOT NULL, -- 模板内容结构
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI分析结果表
CREATE TABLE ai_analysis_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    analysis_type VARCHAR(50) NOT NULL, -- 分析类型：text_extraction, drawing_analysis等
    result_data JSONB NOT NULL, -- 分析结果数据
    confidence_score DECIMAL(3,2), -- 置信度分数
    processing_time INTEGER, -- 处理时间（毫秒）
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 项目成员表
CREATE TABLE project_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL, -- 项目中的角色：owner, member, viewer
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, user_id)
);

-- 设计历史记录表
CREATE TABLE design_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    design_id UUID REFERENCES construction_designs(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    content JSONB NOT NULL,
    change_description TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_profession ON users(profession);
CREATE INDEX idx_projects_created_by ON projects(created_by);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_documents_project_id ON documents(project_id);
CREATE INDEX idx_documents_type ON documents(document_type);
CREATE INDEX idx_designs_project_id ON construction_designs(project_id);
CREATE INDEX idx_designs_type ON construction_designs(design_type);
CREATE INDEX idx_analysis_document_id ON ai_analysis_results(document_id);
CREATE INDEX idx_project_members_project_id ON project_members(project_id);
CREATE INDEX idx_project_members_user_id ON project_members(user_id);

-- 创建触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 创建触发器
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_designs_updated_at BEFORE UPDATE ON construction_designs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 插入默认数据
INSERT INTO users (username, email, password_hash, full_name, profession, role) VALUES
('admin', 'admin@construction.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8i', '系统管理员', '建筑', 'admin'),
('architect1', 'architect1@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8i', '张建筑师', '建筑', 'user'),
('structural1', 'structural1@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8i', '李结构师', '结构', 'user'),
('mep1', 'mep1@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8i', '王机电师', '机电', 'user');

-- 插入默认设计模板
INSERT INTO design_templates (name, description, template_type, profession, content_template, created_by) VALUES
('住宅建筑投标模板', '适用于住宅建筑项目的投标阶段施工组织设计', 'bid', '建筑', 
 '{"sections": ["工程概况", "施工部署", "施工准备", "主要施工方法", "质量保证措施", "安全文明施工", "进度计划", "资源配置"]}', 
 (SELECT id FROM users WHERE username = 'admin')),
('商业建筑施工模板', '适用于商业建筑项目的施工阶段施工组织设计', 'construction', '建筑',
 '{"sections": ["工程概况", "施工部署", "施工准备", "主要施工方法", "质量保证措施", "安全文明施工", "进度计划", "资源配置", "技术措施", "应急预案"]}',
 (SELECT id FROM users WHERE username = 'admin'));