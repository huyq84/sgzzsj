from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
import uvicorn

from services.document_analyzer import DocumentAnalyzer
from services.design_generator import DesignGenerator
from services.text_extractor import TextExtractor
from services.drawing_analyzer import DrawingAnalyzer

app = FastAPI(
    title="建筑工程施工组织设计AI服务",
    description="提供文档分析、图纸识别、设计生成等AI功能",
    version="1.0.0"
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 初始化服务
document_analyzer = DocumentAnalyzer()
design_generator = DesignGenerator()
text_extractor = TextExtractor()
drawing_analyzer = DrawingAnalyzer()

class AnalysisRequest(BaseModel):
    document_id: str
    analysis_type: str
    parameters: Dict[str, Any] = {}

class DesignRequest(BaseModel):
    project_info: Dict[str, Any]
    analyzed_documents: List[Dict[str, Any]]
    design_type: str  # bid 或 construction
    profession: str
    template_id: str = None

@app.get("/")
async def root():
    """根路径"""
    return {
        "message": "建筑工程施工组织设计AI服务",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    """健康检查"""
    return {"status": "healthy"}

@app.post("/analyze/document")
async def analyze_document(
    file: UploadFile = File(...),
    analysis_type: str = "text_extraction"
):
    """分析上传的文档"""
    try:
        if analysis_type == "text_extraction":
            result = await text_extractor.extract_text(file)
        elif analysis_type == "drawing_analysis":
            result = await drawing_analyzer.analyze_drawing(file)
        else:
            result = await document_analyzer.analyze_document(file, analysis_type)
        
        return {
            "success": True,
            "analysis_type": analysis_type,
            "result": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate/design")
async def generate_design(request: DesignRequest):
    """生成施工组织设计"""
    try:
        design_content = await design_generator.generate_design(
            project_info=request.project_info,
            analyzed_documents=request.analyzed_documents,
            design_type=request.design_type,
            profession=request.profession,
            template_id=request.template_id
        )
        
        return {
            "success": True,
            "design_content": design_content,
            "design_type": request.design_type
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/extract/text")
async def extract_text(file: UploadFile = File(...)):
    """提取文档中的文本"""
    try:
        result = await text_extractor.extract_text(file)
        return {
            "success": True,
            "text_content": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze/drawing")
async def analyze_drawing(file: UploadFile = File(...)):
    """分析图纸"""
    try:
        result = await drawing_analyzer.analyze_drawing(file)
        return {
            "success": True,
            "drawing_analysis": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/templates")
async def get_templates():
    """获取可用的设计模板"""
    templates = design_generator.get_available_templates()
    return {
        "success": True,
        "templates": templates
    }

@app.post("/validate/project")
async def validate_project_info(project_info: Dict[str, Any]):
    """验证项目信息"""
    try:
        validation_result = design_generator.validate_project_info(project_info)
        return {
            "success": True,
            "validation_result": validation_result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )