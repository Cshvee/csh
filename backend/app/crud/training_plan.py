"""
Training Plan CRUD Operations
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.models.training_plan import TrainingPlan
from app.schemas.training_plan import TrainingPlanCreate, TrainingPlanUpdate


def create_training_plan(
    db: Session,
    school: str,
    college: str,
    major: str,
    original_filename: str,
    stored_filename: str,
    file_path: str,
    file_size: int,
    file_type: str,
    extracted_content: Optional[str] = None,
    description: Optional[str] = None
) -> TrainingPlan:
    """创建培养方案记录"""
    db_plan = TrainingPlan(
        school=school,
        college=college,
        major=major,
        original_filename=original_filename,
        stored_filename=stored_filename,
        file_path=file_path,
        file_size=file_size,
        file_type=file_type,
        extracted_content=extracted_content,
        content_length=len(extracted_content) if extracted_content else 0,
        description=description,
        is_active=1
    )
    db.add(db_plan)
    db.commit()
    db.refresh(db_plan)
    return db_plan


def get_training_plan_by_id(db: Session, plan_id: int) -> Optional[TrainingPlan]:
    """根据ID获取培养方案"""
    return db.query(TrainingPlan).filter(
        TrainingPlan.id == plan_id,
        TrainingPlan.is_active == 1
    ).first()


def get_training_plans(
    db: Session,
    school: Optional[str] = None,
    college: Optional[str] = None,
    major: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
) -> tuple[List[TrainingPlan], int]:
    """获取培养方案列表，返回数据和总数"""
    query = db.query(TrainingPlan).filter(TrainingPlan.is_active == 1)
    
    if school:
        query = query.filter(TrainingPlan.school == school)
    if college:
        query = query.filter(TrainingPlan.college == college)
    if major:
        query = query.filter(TrainingPlan.major == major)
    
    # 获取总数
    total = query.count()
    
    # 分页查询，按创建时间倒序
    plans = query.order_by(desc(TrainingPlan.created_at)).offset(skip).limit(limit).all()
    
    return plans, total


def get_latest_training_plan(
    db: Session,
    school: str,
    college: str,
    major: str
) -> Optional[TrainingPlan]:
    """获取指定学校-专业最新的培养方案"""
    return db.query(TrainingPlan).filter(
        TrainingPlan.school == school,
        TrainingPlan.college == college,
        TrainingPlan.major == major,
        TrainingPlan.is_active == 1
    ).order_by(desc(TrainingPlan.created_at)).first()


def update_training_plan(
    db: Session,
    plan_id: int,
    update_data: TrainingPlanUpdate
) -> Optional[TrainingPlan]:
    """更新培养方案信息"""
    db_plan = get_training_plan_by_id(db, plan_id)
    if not db_plan:
        return None
    
    if update_data.description is not None:
        db_plan.description = update_data.description
    
    db.commit()
    db.refresh(db_plan)
    return db_plan


def delete_training_plan(db: Session, plan_id: int) -> bool:
    """软删除培养方案"""
    db_plan = get_training_plan_by_id(db, plan_id)
    if not db_plan:
        return False
    
    db_plan.is_active = 0
    db.commit()
    return True


def get_plans_by_school(db: Session, school: str) -> List[TrainingPlan]:
    """获取指定学校的所有培养方案"""
    return db.query(TrainingPlan).filter(
        TrainingPlan.school == school,
        TrainingPlan.is_active == 1
    ).order_by(desc(TrainingPlan.created_at)).all()


def get_all_schools_with_plans(db: Session) -> List[str]:
    """获取所有有培养方案的学校列表"""
    results = db.query(TrainingPlan.school).filter(
        TrainingPlan.is_active == 1
    ).distinct().all()
    return [r[0] for r in results]
