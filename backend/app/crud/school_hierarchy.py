"""
School Hierarchy CRUD Operations
"""
from typing import List, Dict, Set, Optional
from sqlalchemy.orm import Session
from sqlalchemy import distinct
from collections import defaultdict

from app.models.school_hierarchy import SchoolHierarchy


def refresh_hierarchy_cache(db: Session, hierarchy_data: Dict[str, Dict[str, List[str]]]) -> int:
    """
    刷新学校层级缓存
    
    Args:
        db: 数据库会话
        hierarchy_data: {school: {college: [major1, major2, ...]}}
    
    Returns:
        插入的记录数
    """
    # 清空旧数据
    db.query(SchoolHierarchy).delete()
    
    count = 0
    for school, colleges in hierarchy_data.items():
        for college, majors in colleges.items():
            for major in majors:
                db_record = SchoolHierarchy(
                    school=school,
                    college=college,
                    major=major
                )
                db.add(db_record)
                count += 1
    
    db.commit()
    return count


def get_all_schools(db: Session) -> List[str]:
    """获取所有学校列表"""
    results = db.query(distinct(SchoolHierarchy.school)).all()
    return sorted([r[0] for r in results])


def get_colleges_by_school(db: Session, school: str) -> List[str]:
    """获取指定学校的所有学院"""
    results = db.query(distinct(SchoolHierarchy.college)).filter(
        SchoolHierarchy.school == school
    ).all()
    return sorted([r[0] for r in results])


def get_majors_by_college(db: Session, school: str, college: str) -> List[str]:
    """获取指定学校-学院的所有专业"""
    results = db.query(SchoolHierarchy.major).filter(
        SchoolHierarchy.school == school,
        SchoolHierarchy.college == college
    ).all()
    return sorted([r[0] for r in results])


def get_full_hierarchy(db: Session) -> Dict[str, Dict[str, List[str]]]:
    """获取完整层级结构"""
    records = db.query(SchoolHierarchy).all()
    
    hierarchy = defaultdict(lambda: defaultdict(list))
    for record in records:
        hierarchy[record.school][record.college].append(record.major)
    
    # 转换为普通 dict 并排序
    return {
        school: {
            college: sorted(majors)
            for college, majors in colleges.items()
        }
        for school, colleges in sorted(hierarchy.items())
    }


def is_cache_empty(db: Session) -> bool:
    """检查缓存是否为空"""
    return db.query(SchoolHierarchy).first() is None


def get_cache_stats(db: Session) -> Dict[str, int]:
    """获取缓存统计信息"""
    total = db.query(SchoolHierarchy).count()
    schools = db.query(distinct(SchoolHierarchy.school)).count()
    colleges = db.query(distinct(SchoolHierarchy.college)).count()
    
    return {
        "total_records": total,
        "schools_count": schools,
        "colleges_count": colleges
    }
