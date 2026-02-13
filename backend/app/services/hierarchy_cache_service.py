"""
Hierarchy Cache Service - 学校层级缓存服务
"""
from typing import Dict, List, Optional
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.crud import school_hierarchy as crud
from app.services.data_loader import data_loader


class HierarchyCacheService:
    """学校层级缓存服务"""
    
    _instance = None
    _memory_cache: Optional[Dict[str, Dict[str, List[str]]]] = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def initialize_cache(self) -> Dict[str, Dict[str, List[str]]]:
        """
        初始化缓存：
        1. 尝试从数据库读取
        2. 如果数据库为空，从 CSV 加载并写入数据库
        3. 同时建立内存缓存
        """
        db = SessionLocal()
        try:
            # 检查数据库缓存
            if not crud.is_cache_empty(db):
                print("[Cache] 从数据库加载学校层级数据")
                hierarchy = crud.get_full_hierarchy(db)
                self._memory_cache = hierarchy
                stats = crud.get_cache_stats(db)
                print(f"[Cache] 加载完成: {stats['schools_count']} 所学校, "
                      f"{stats['colleges_count']} 个学院, "
                      f"{stats['total_records']} 条记录")
                return hierarchy
            
            # 数据库为空，从 CSV 加载
            print("[Cache] 数据库缓存为空，从 CSV 加载...")
            csv_hierarchy = data_loader.get_hierarchy()
            
            if csv_hierarchy:
                # 写入数据库缓存
                count = crud.refresh_hierarchy_cache(db, csv_hierarchy)
                print(f"[Cache] 已写入数据库: {count} 条记录")
                self._memory_cache = csv_hierarchy
                return csv_hierarchy
            else:
                print("[Cache] CSV 数据为空，使用默认数据")
                return {}
                
        except Exception as e:
            print(f"[Cache] 初始化失败: {e}")
            return {}
        finally:
            db.close()
    
    def refresh_from_csv(self) -> Dict[str, Dict[str, List[str]]]:
        """强制从 CSV 刷新缓存"""
        db = SessionLocal()
        try:
            print("[Cache] 从 CSV 强制刷新...")
            csv_hierarchy = data_loader.get_hierarchy()
            
            if csv_hierarchy:
                count = crud.refresh_hierarchy_cache(db, csv_hierarchy)
                print(f"[Cache] 刷新完成: {count} 条记录")
                self._memory_cache = csv_hierarchy
                return csv_hierarchy
            else:
                return self._memory_cache or {}
        except Exception as e:
            print(f"[Cache] 刷新失败: {e}")
            return self._memory_cache or {}
        finally:
            db.close()
    
    def get_hierarchy(self) -> Dict[str, Dict[str, List[str]]]:
        """获取层级数据（优先内存缓存）"""
        if self._memory_cache is None:
            return self.initialize_cache()
        return self._memory_cache
    
    def get_schools(self) -> List[str]:
        """获取学校列表"""
        hierarchy = self.get_hierarchy()
        return sorted(hierarchy.keys())
    
    def get_colleges(self, school: str) -> List[str]:
        """获取学院列表"""
        hierarchy = self.get_hierarchy()
        return sorted(hierarchy.get(school, {}).keys())
    
    def get_majors(self, school: str, college: str) -> List[str]:
        """获取专业列表"""
        hierarchy = self.get_hierarchy()
        return sorted(hierarchy.get(school, {}).get(college, []))


# 全局单例
hierarchy_cache = HierarchyCacheService()
