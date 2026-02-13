"""
School Hierarchy Model - 学校层级数据缓存
用于缓存学校-学院-专业层级结构，加速查询
"""
from sqlalchemy import Column, Integer, String, DateTime, UniqueConstraint
from sqlalchemy.sql import func
from app.core.database import Base


class SchoolHierarchy(Base):
    """学校层级缓存表"""
    __tablename__ = "school_hierarchy"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    school = Column(String(100), nullable=False, index=True, comment="学校名称")
    college = Column(String(100), nullable=False, index=True, comment="学院名称")
    major = Column(String(100), nullable=False, comment="专业名称")
    
    # 唯一约束：学校+学院+专业
    __table_args__ = (
        UniqueConstraint('school', 'college', 'major', name='uix_school_college_major'),
    )
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="创建时间")
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), comment="更新时间")
    
    def __repr__(self):
        return f"<SchoolHierarchy({self.school} - {self.college} - {self.major})>"
    
    def to_dict(self):
        return {
            "id": self.id,
            "school": self.school,
            "college": self.college,
            "major": self.major
        }
