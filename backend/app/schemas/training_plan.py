"""
Training Plan Schemas - Pydantic 模型
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class TrainingPlanBase(BaseModel):
    """基础模型"""
    school: str
    college: str
    major: str
    description: Optional[str] = None


class TrainingPlanCreate(TrainingPlanBase):
    """创建模型"""
    pass


class TrainingPlanUpdate(BaseModel):
    """更新模型"""
    description: Optional[str] = None


class TrainingPlanResponse(TrainingPlanBase):
    """响应模型"""
    id: int
    original_filename: str
    file_size: Optional[int] = None
    file_type: Optional[str] = None
    content_length: Optional[int] = None
    is_active: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class TrainingPlanListResponse(BaseModel):
    """列表响应"""
    total: int
    items: List[TrainingPlanResponse]


class TrainingPlanDetailResponse(TrainingPlanResponse):
    """详情响应（包含提取的文本内容）"""
    extracted_content: Optional[str] = None


class TrainingPlanQuery(BaseModel):
    """查询参数"""
    school: Optional[str] = None
    college: Optional[str] = None
    major: Optional[str] = None
    page: int = 1
    page_size: int = 20
