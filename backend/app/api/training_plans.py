"""
Training Plan API Endpoints - 培养方案上传管理接口
"""
import os
import uuid
import io
from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Query
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import get_settings
from app.crud import training_plan as crud
from app.schemas.training_plan import (
    TrainingPlanResponse,
    TrainingPlanListResponse,
    TrainingPlanDetailResponse,
    TrainingPlanUpdate
)

# 文件解析
import pypdf
import docx

router = APIRouter(tags=["training-plans"])
settings = get_settings()

# 确保上传目录存在
UPLOAD_DIR = settings.UPLOAD_DIR
os.makedirs(UPLOAD_DIR, exist_ok=True)


ALLOWED_EXTENSIONS = {'.pdf', '.docx', '.doc', '.txt'}
MAX_FILE_SIZE = settings.MAX_FILE_SIZE  # 50MB


def get_file_extension(filename: str) -> str:
    """获取文件扩展名"""
    return os.path.splitext(filename)[1].lower()


def is_allowed_file(filename: str) -> bool:
    """检查文件类型是否允许"""
    return get_file_extension(filename) in ALLOWED_EXTENSIONS


def extract_text_content(file: UploadFile, content: bytes) -> Optional[str]:
    """提取文件文本内容"""
    filename = file.filename.lower()
    text = ""
    
    try:
        if filename.endswith('.pdf'):
            pdf_file = io.BytesIO(content)
            reader = pypdf.PdfReader(pdf_file)
            for page in reader.pages:
                text += page.extract_text() or ""
                text += "\n"
                
        elif filename.endswith('.docx'):
            doc_file = io.BytesIO(content)
            doc = docx.Document(doc_file)
            for para in doc.paragraphs:
                text += para.text + "\n"
                
        elif filename.endswith('.txt'):
            text = content.decode('utf-8')
            
        return text.strip() if text else None
        
    except Exception as e:
        print(f"Error extracting text: {e}")
        return None


def save_upload_file(content: bytes, stored_filename: str) -> str:
    """保存上传文件到本地"""
    file_path = os.path.join(UPLOAD_DIR, stored_filename)
    with open(file_path, 'wb') as f:
        f.write(content)
    return file_path


@router.post("/upload", response_model=TrainingPlanResponse)
async def upload_training_plan(
    school: str = Form(..., description="学校名称"),
    college: str = Form(..., description="学院名称"),
    major: str = Form(..., description="专业名称"),
    description: Optional[str] = Form(None, description="方案描述/备注"),
    file: UploadFile = File(..., description="培养方案文件 (PDF/DOCX/TXT)"),
    db: Session = Depends(get_db)
):
    """
    上传培养方案文件
    
    - 支持格式: PDF, DOCX, DOC, TXT
    - 最大文件大小: 50MB
    - 自动提取文本内容存储到数据库
    """
    # 验证文件类型
    if not is_allowed_file(file.filename):
        raise HTTPException(
            status_code=400, 
            detail=f"不支持的文件类型。允许: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # 读取文件内容
    content = await file.read()
    
    # 检查文件大小
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"文件大小超过限制。最大允许: {MAX_FILE_SIZE / 1024 / 1024:.1f}MB"
        )
    
    # 生成存储文件名
    file_ext = get_file_extension(file.filename)
    stored_filename = f"{uuid.uuid4().hex}{file_ext}"
    
    # 提取文本内容
    extracted_text = extract_text_content(file, content)
    
    # 保存文件
    try:
        file_path = save_upload_file(content, stored_filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"文件保存失败: {str(e)}")
    
    # 创建数据库记录
    try:
        db_plan = crud.create_training_plan(
            db=db,
            school=school,
            college=college,
            major=major,
            original_filename=file.filename,
            stored_filename=stored_filename,
            file_path=file_path,
            file_size=len(content),
            file_type=file_ext.lstrip('.'),
            extracted_content=extracted_text,
            description=description
        )
        return db_plan
    except Exception as e:
        # 清理已保存的文件
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"数据库保存失败: {str(e)}")


@router.get("/list", response_model=TrainingPlanListResponse)
def list_training_plans(
    school: Optional[str] = Query(None, description="按学校筛选"),
    college: Optional[str] = Query(None, description="按学院筛选"),
    major: Optional[str] = Query(None, description="按专业筛选"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    db: Session = Depends(get_db)
):
    """
    获取培养方案列表（支持分页和筛选）
    """
    skip = (page - 1) * page_size
    plans, total = crud.get_training_plans(
        db=db,
        school=school,
        college=college,
        major=major,
        skip=skip,
        limit=page_size
    )
    
    return {
        "total": total,
        "items": [plan.to_dict() for plan in plans]
    }


@router.get("/{plan_id}", response_model=TrainingPlanDetailResponse)
def get_training_plan(
    plan_id: int,
    db: Session = Depends(get_db)
):
    """
    获取培养方案详情（包含提取的文本内容）
    """
    plan = crud.get_training_plan_by_id(db, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="培养方案不存在")
    
    return {
        **plan.to_dict(),
        "extracted_content": plan.extracted_content
    }


@router.get("/{plan_id}/download")
def download_training_plan(
    plan_id: int,
    db: Session = Depends(get_db)
):
    """
    下载培养方案原文件
    """
    plan = crud.get_training_plan_by_id(db, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="培养方案不存在")
    
    if not os.path.exists(plan.file_path):
        raise HTTPException(status_code=404, detail="文件不存在或已被删除")
    
    return FileResponse(
        path=plan.file_path,
        filename=plan.original_filename,
        media_type='application/octet-stream'
    )


@router.get("/{plan_id}/content")
def get_training_plan_content(
    plan_id: int,
    db: Session = Depends(get_db)
):
    """
    获取培养方案提取的文本内容（用于前端直接展示）
    """
    plan = crud.get_training_plan_by_id(db, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="培养方案不存在")
    
    return {
        "id": plan.id,
        "school": plan.school,
        "college": plan.college,
        "major": plan.major,
        "content": plan.extracted_content,
        "content_length": plan.content_length
    }


@router.put("/{plan_id}", response_model=TrainingPlanResponse)
def update_training_plan(
    plan_id: int,
    update_data: TrainingPlanUpdate,
    db: Session = Depends(get_db)
):
    """
    更新培养方案信息（仅支持修改描述）
    """
    plan = crud.update_training_plan(db, plan_id, update_data)
    if not plan:
        raise HTTPException(status_code=404, detail="培养方案不存在")
    
    return plan


@router.delete("/{plan_id}")
def delete_training_plan(
    plan_id: int,
    db: Session = Depends(get_db)
):
    """
    删除培养方案（软删除）
    """
    success = crud.delete_training_plan(db, plan_id)
    if not success:
        raise HTTPException(status_code=404, detail="培养方案不存在")
    
    return {"message": "删除成功", "plan_id": plan_id}


@router.get("/by-school/{school}")
def get_plans_by_school(
    school: str,
    db: Session = Depends(get_db)
):
    """
    获取指定学校的所有培养方案
    """
    plans = crud.get_plans_by_school(db, school)
    return {
        "school": school,
        "total": len(plans),
        "items": [plan.to_dict() for plan in plans]
    }


@router.get("/stats/schools")
def get_schools_with_plans(
    db: Session = Depends(get_db)
):
    """
    获取所有有培养方案的学校列表
    """
    schools = crud.get_all_schools_with_plans(db)
    return {
        "total": len(schools),
        "schools": schools
    }
