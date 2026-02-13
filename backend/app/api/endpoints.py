from fastapi import APIRouter, HTTPException, Query, Body, UploadFile, File
from fastapi.responses import StreamingResponse, FileResponse
from typing import List, Dict
import asyncio
import random
import os
import io
import docx
import pypdf
from sqlalchemy.orm import Session

from app.services.kg_service import kg_service
from app.services.data_loader import data_loader
from app.services.hierarchy_cache_service import hierarchy_cache
from app.core.database import get_db

router = APIRouter()

# 重庆邮电大学扩展数据
CQUPT_DATA = {
    "通信与信息工程学院": ["通信工程", "电子信息工程"],
    "计算机科学与技术学院（示范性软件学院）": ["计算机科学与技术", "软件工程", "信息安全", "网络空间安全", "智能科学与技术", "数据科学与大数据技术", "人工智能"],
    "自动化学院": ["自动化", "电气工程及其自动化", "物联网工程", "测控技术与仪器", "智能车辆工程"],
    "光电工程学院（电子科学与工程学院）": ["光电信息科学与工程", "电子科学与技术", "电磁场与无线技术", "微电子科学与工程", "集成电路设计与集成系统"],
    "先进制造工程学院": ["机械设计制造及其自动化", "智能制造工程", "机器人工程"],
    "经济管理学院": ["经济学", "金融工程", "信息管理与信息系统", "大数据管理与应用", "工商管理", "市场营销", "会计学", "工程管理（含非全）"],
    "现代邮政学院": ["邮政工程", "电子商务", "物流管理", "项目管理（非全）"],
    "数学与统计学院": ["数学与应用数学", "信息与计算科学", "数据计算及应用", "应用统计学"],
    "生物信息学院": ["生物医学工程", "生物信息学", "医学信息工程"],
    "外国语学院": ["英语", "翻译"],
    "法学院": ["法学", "知识产权"],
    "传媒艺术学院": ["广播电视编导", "动画", "数字媒体艺术", "产品设计"],
    "体育学院": ["社会体育指导与管理"],
    "国际学院（中外合作办学）": ["通信工程（与英国布鲁内尔大学合作 4+0）", "电子信息工程（中外合作办学）", "物联网工程（与俄罗斯远东联邦大学合作 4+0）", "软件工程（中外合作办学）"],
    "联合培养项目（跨校双学位）": ["数据科学与大数据技术 + 经济学（与重庆工商大学联合学士学位）", "法学 + 网络空间安全（与西南政法大学联合学士学位）"],
    "继续教育学院（负责专升本、继续教育，此处仅列对应专业）": ["英语", "软件工程", "电子商务等（详见当年专升本招生简章）"]
}

# 初始化层级数据（从缓存服务获取）
HIERARCHY_DATA = hierarchy_cache.get_hierarchy()

# 如果缓存为空，使用Mock数据
if not HIERARCHY_DATA:
    print("[Endpoints] 缓存为空，使用Mock数据")
    HIERARCHY_DATA = {
        "重庆大学": {
            "计算机学院": ["计算机科学与技术", "软件工程", "人工智能"],
            "微电子与通信工程学院": ["通信工程", "电子信息工程", "集成电路设计与集成系统"],
            "自动化学院": ["自动化", "机器人工程", "测控技术与仪器"]
        },
        "西南大学": {
            "人工智能学院": ["智能科学与技术", "数据科学与大数据技术", "自动化"],
            "计算机与信息科学学院": ["计算机科学与技术", "软件工程", "网络工程"],
            "工程技术学院": ["土木工程", "机械设计制造及其自动化"]
        },
        "重庆邮电大学": {
            "通信与信息工程学院": ["通信工程", "电子信息工程", "广播电视工程"],
            "计算机科学与技术学院": ["计算机科学与技术", "智能科学与技术", "空间信息与数字技术"],
            "自动化学院": ["自动化", "测控技术与仪器", "电气工程及其自动化"]
        }
    }

# 合并重庆邮电大学详细数据
if "重庆邮电大学" not in HIERARCHY_DATA:
    HIERARCHY_DATA["重庆邮电大学"] = {}
HIERARCHY_DATA["重庆邮电大学"].update(CQUPT_DATA)


@router.get("/schools", response_model=List[str])
async def get_schools():
    """
    Get list of available schools (from cache).
    """
    return sorted(list(HIERARCHY_DATA.keys()))


@router.get("/schools/{school_name}/colleges", response_model=List[str])
async def get_colleges(school_name: str):
    """
    Get list of colleges for a specific school.
    """
    if school_name not in HIERARCHY_DATA:
        raise HTTPException(status_code=404, detail="School not found")
    return sorted(list(HIERARCHY_DATA[school_name].keys()))


@router.get("/schools/{school_name}/colleges/{college_name}/majors", response_model=List[str])
async def get_majors(school_name: str, college_name: str):
    """
    Get list of majors for a specific college in a school.
    """
    if school_name not in HIERARCHY_DATA:
        raise HTTPException(status_code=404, detail="School not found")
    if college_name not in HIERARCHY_DATA[school_name]:
        raise HTTPException(status_code=404, detail="College not found")
    return sorted(HIERARCHY_DATA[school_name][college_name])


@router.get("/stats")
async def get_stats(major: str = Query(..., description="Major name to generate stats for")):
    """
    Get generated stats for a specific major (Deterministic mock).
    """
    # Deterministic hash generation logic (same as frontend for now)
    base_hash = sum(ord(char) for char in major)
    
    return {
        "jobs": f"相关就业岗位{int((base_hash * 13) % 100) + 20}万个",
        "companies": f"相关企业{int((base_hash * 113) % 5000) + 2000}家",
        "reports": f"行业发展报告{int((base_hash * 7) % 30) + 5}个",
        "policies": f"政策文件{int((base_hash * 3) % 20) + 5}个"
    }


@router.post("/parse-file")
async def parse_file(file: UploadFile = File(...)):
    """
    Parse uploaded file (pdf, docx, txt) and return text content.
    """
    content = ""
    filename = file.filename.lower()
    
    try:
        contents = await file.read()
        file_obj = io.BytesIO(contents)
        
        if filename.endswith(".pdf"):
            reader = pypdf.PdfReader(file_obj)
            for page in reader.pages:
                content += page.extract_text() + "\n"
                
        elif filename.endswith(".docx"):
            doc = docx.Document(file_obj)
            for para in doc.paragraphs:
                content += para.text + "\n"
                
        elif filename.endswith(".txt"):
            content = contents.decode("utf-8")
            
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Please upload .pdf, .docx, or .txt")
            
        return {"filename": file.filename, "content": content}
        
    except Exception as e:
        print(f"Error parsing file: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to parse file: {str(e)}")


@router.post("/agent/build-graph")
async def build_knowledge_graph(
    school: str = Body(..., embed=True), 
    college: str = Body(..., embed=True), 
    major: str = Body(..., embed=True)
):
    """
    Trigger the Knowledge Graph construction process.
    """
    # 1. Start the KG extraction process (Simulated async task)
    kg_data = await kg_service.build_graph_for_major(school, college, major)
    
    # 2. Return the execution plan (Frontend visualization)
    return {
        "status": "started",
        "message": f"Started building knowledge graph for {school} - {college} - {major}",
        "kg_preview": kg_data, # Return the extracted data for preview
        "initial_plan": [
            {"id": 1, "content": f"用户选择专业: {major}", "status": "completed", "time": "10ms"},
            {"id": 2, "content": f"启动 {school} 知识图谱构建任务...", "status": "running", "time": "50ms"},
            {"id": 3, "content": f"读取人才培养方案文本...", "status": "pending", "time": "..."},
            {"id": 4, "content": f"LLM 实体抽取 (Prompt: training_plan_kg_prompt.yaml)...", "status": "pending", "time": "..."},
            {"id": 5, "content": f"识别实体: {len(kg_data['entities'])} 个 (课程, 技能, 岗位)...", "status": "pending", "time": "..."},
            {"id": 6, "content": f"构建关系: {len(kg_data['relationships'])} 条...", "status": "pending", "time": "..."},
            {"id": 7, "content": "生成能力素质图谱节点...", "status": "pending", "time": "..."},
            {"id": 8, "content": "写入图数据库 (Neo4j)...", "status": "pending", "time": "..."},
            {"id": 9, "content": "可视化渲染准备就绪。", "status": "pending", "time": "..."}
        ]
    }


@router.get("/agent/stream-build-graph")
async def stream_build_graph(
    school: str = Query(...), 
    college: str = Query(...), 
    major: str = Query(...)
):
    """
    Stream the KG construction process with real-time updates using Server-Sent Events (SSE) compatible format.
    """
    return StreamingResponse(
        kg_service.build_graph_for_major_stream(school, college, major),
        media_type="application/x-ndjson"
    )


@router.post("/agent/analyze")
async def analyze_graph(
    school: str = Body(..., embed=True),
    college: str = Body(..., embed=True),
    major: str = Body(..., embed=True),
    graph_data: Dict = Body(..., embed=True),
    training_plan_text: str = Body(None, embed=True)
):
    """
    Generate an improvement analysis report based on the knowledge graph.
    """
    report = await kg_service.analyze_graph_improvement(school, college, major, graph_data, training_plan_text)
    return {"report": report}


@router.post("/agent/download-report")
async def download_report(
    school: str = Body(..., embed=True),
    major: str = Body(..., embed=True),
    report_content: str = Body(..., embed=True)
):
    """
    Generate and download the DOCX report.
    """
    file_path = kg_service.generate_improvement_docx(school, major, report_content)
    
    # Ensure file exists
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=500, detail="Failed to generate report file")
        
    return FileResponse(
        path=file_path, 
        filename=os.path.basename(file_path),
        media_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )


# 缓存管理接口
@router.post("/admin/refresh-hierarchy-cache")
async def refresh_hierarchy_cache():
    """
    手动刷新学校层级缓存（从 CSV 重新加载）
    管理员接口
    """
    try:
        hierarchy = hierarchy_cache.refresh_from_csv()
        
        # 重新加载全局数据
        global HIERARCHY_DATA
        HIERARCHY_DATA = hierarchy
        if "重庆邮电大学" not in HIERARCHY_DATA:
            HIERARCHY_DATA["重庆邮电大学"] = {}
        HIERARCHY_DATA["重庆邮电大学"].update(CQUPT_DATA)
        
        return {
            "status": "success",
            "message": "缓存刷新成功",
            "schools_count": len(hierarchy)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"刷新失败: {str(e)}")


@router.get("/admin/hierarchy-cache-stats")
async def get_hierarchy_cache_stats():
    """
    获取学校层级缓存统计信息
    """
    from sqlalchemy.orm import Session
    from app.core.database import SessionLocal
    from app.crud import school_hierarchy as crud
    
    db = SessionLocal()
    try:
        stats = crud.get_cache_stats(db)
        return {
            "status": "success",
            "cache_stats": stats,
            "memory_cached": hierarchy_cache._memory_cache is not None
        }
    finally:
        db.close()


@router.get("/admin/storage-status")
async def get_storage_status():
    """
    获取知识图谱存储后端状态
    """
    from app.core.config import get_settings
    from app.core.neo4j_client import neo4j_client
    
    settings = get_settings()
    
    status = {
        "storage_type": settings.KG_STORAGE,
        "neo4j_enabled": settings.NEO4J_ENABLED,
        "neo4j_connected": neo4j_client.is_connected() if settings.NEO4J_ENABLED else False,
        "neo4j_uri": settings.NEO4J_URI if settings.NEO4J_ENABLED else None
    }
    
    # 如果 Neo4j 已连接，获取统计信息
    if status["neo4j_connected"]:
        try:
            neo4j_stats = neo4j_client.get_graph_stats()
            status["neo4j_stats"] = neo4j_stats
        except Exception as e:
            status["neo4j_error"] = str(e)
    
    return status
