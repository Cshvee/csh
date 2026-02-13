"""
Training Plan Model - 培养方案模型
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, BigInteger
from sqlalchemy.sql import func
from app.core.database import Base


class TrainingPlan(Base):
    """培养方案表"""
    __tablename__ = "training_plans"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    # 学校-学院-专业层级
    school = Column(String(100), nullable=False, index=True, comment="学校名称")
    college = Column(String(100), nullable=False, index=True, comment="学院名称")
    major = Column(String(100), nullable=False, index=True, comment="专业名称")
    
    # 文件信息
    original_filename = Column(String(255), nullable=False, comment="原始文件名")
    stored_filename = Column(String(255), nullable=False, comment="存储文件名(UUID)")
    file_path = Column(String(500), nullable=False, comment="文件存储路径")
    file_size = Column(BigInteger, nullable=True, comment="文件大小(字节)")
    file_type = Column(String(50), nullable=True, comment="文件类型(pdf/docx/txt)")
    
    # 内容提取
    extracted_content = Column(Text, nullable=True, comment="提取的文本内容")
    content_length = Column(Integer, nullable=True, comment="文本内容长度")
    
    # 元数据
    description = Column(String(500), nullable=True, comment="方案描述/备注")
    is_active = Column(Integer, default=1, comment="是否有效(1:有效,0:删除)")
    
    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="上传时间")
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), comment="更新时间")
    
    def __repr__(self):
        return f"<TrainingPlan(id={self.id}, school={self.school}, major={self.major})>"
    
    def to_dict(self):
        """转换为字典格式"""
        return {
            "id": self.id,
            "school": self.school,
            "college": self.college,
            "major": self.major,
            "original_filename": self.original_filename,
            "file_size": self.file_size,
            "file_type": self.file_type,
            "content_length": self.content_length,
            "description": self.description,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
