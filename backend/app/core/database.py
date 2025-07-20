from sqlalchemy import create_engine, Column, String, DateTime, Boolean, Text, Integer, DECIMAL, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid

from app.core.config import settings

# 创建数据库引擎
engine = create_engine(settings.DATABASE_URL)

# 创建会话工厂
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 创建基类
Base = declarative_base()

# 数据库依赖
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 通用模型字段
class TimestampMixin:
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# 用户模型
class User(Base, TimestampMixin):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    profession = Column(String(50), nullable=False, index=True)
    role = Column(String(20), nullable=False, default="user")
    company = Column(String(100))
    phone = Column(String(20))
    is_active = Column(Boolean, default=True)
    
    # 关系
    projects = relationship("Project", back_populates="created_by_user")
    documents = relationship("Document", back_populates="uploader")
    designs = relationship("ConstructionDesign", back_populates="creator")
    project_members = relationship("ProjectMember", back_populates="user")

# 项目模型
class Project(Base, TimestampMixin):
    __tablename__ = "projects"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    project_type = Column(String(50), nullable=False)
    construction_type = Column(String(50), nullable=False)
    total_area = Column(DECIMAL(10, 2))
    building_height = Column(DECIMAL(8, 2))
    floors_count = Column(Integer)
    underground_floors = Column(Integer, default=0)
    client_name = Column(String(100))
    location = Column(String(200))
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    status = Column(String(20), default="draft", index=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # 关系
    created_by_user = relationship("User", back_populates="projects")
    documents = relationship("Document", back_populates="project", cascade="all, delete-orphan")
    designs = relationship("ConstructionDesign", back_populates="project", cascade="all, delete-orphan")
    members = relationship("ProjectMember", back_populates="project", cascade="all, delete-orphan")

# 文档模型
class Document(Base, TimestampMixin):
    __tablename__ = "documents"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=False)
    file_type = Column(String(50), nullable=False)
    document_type = Column(String(50), nullable=False, index=True)
    uploader_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    upload_time = Column(DateTime, default=datetime.utcnow)
    is_processed = Column(Boolean, default=False)
    processing_status = Column(String(20), default="pending")
    metadata = Column(JSON)
    
    # 关系
    project = relationship("Project", back_populates="documents")
    uploader = relationship("User", back_populates="documents")
    analysis_results = relationship("AIAnalysisResult", back_populates="document", cascade="all, delete-orphan")

# 施工组织设计模型
class ConstructionDesign(Base, TimestampMixin):
    __tablename__ = "construction_designs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    design_type = Column(String(20), nullable=False, index=True)  # bid, construction
    title = Column(String(200), nullable=False)
    content = Column(JSON, nullable=False)
    generated_file_path = Column(String(500))
    status = Column(String(20), default="draft", index=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # 关系
    project = relationship("Project", back_populates="designs")
    creator = relationship("User", back_populates="designs")
    history = relationship("DesignHistory", back_populates="design", cascade="all, delete-orphan")

# 设计模板模型
class DesignTemplate(Base, TimestampMixin):
    __tablename__ = "design_templates"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    template_type = Column(String(20), nullable=False)  # bid, construction
    profession = Column(String(50), nullable=False)
    content_template = Column(JSON, nullable=False)
    is_active = Column(Boolean, default=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

# AI分析结果模型
class AIAnalysisResult(Base, TimestampMixin):
    __tablename__ = "ai_analysis_results"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=False, index=True)
    analysis_type = Column(String(50), nullable=False)
    result_data = Column(JSON, nullable=False)
    confidence_score = Column(DECIMAL(3, 2))
    processing_time = Column(Integer)
    
    # 关系
    document = relationship("Document", back_populates="analysis_results")

# 项目成员模型
class ProjectMember(Base, TimestampMixin):
    __tablename__ = "project_members"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # owner, member, viewer
    joined_at = Column(DateTime, default=datetime.utcnow)
    
    # 关系
    project = relationship("Project", back_populates="members")
    user = relationship("User", back_populates="project_members")

# 设计历史记录模型
class DesignHistory(Base, TimestampMixin):
    __tablename__ = "design_history"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    design_id = Column(UUID(as_uuid=True), ForeignKey("construction_designs.id"), nullable=False)
    version = Column(Integer, nullable=False)
    content = Column(JSON, nullable=False)
    change_description = Column(Text)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)