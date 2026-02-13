"""
数据管理 API - 针对大数据量的管理接口
"""
from fastapi import APIRouter, Query
from typing import Optional, Dict, Any
import os

from app.services.chongqing_job_loader import chongqing_loader
from app.services.optimized_json_storage import optimized_storage
from app.services.data_loader import data_loader

router = APIRouter(tags=["data-management"])


@router.get("/stats")
async def get_data_stats():
    """
    获取招聘数据统计信息
    """
    # CSV 数据 stats
    csv_stats = chongqing_loader.get_dataset_stats()
    
    # 图谱缓存 stats
    graph_stats = optimized_storage.get_stats()
    
    # 旧数据源 stats
    old_stats = data_loader.get_dataset_stats()
    
    return {
        "status": "success",
        "chongqing_data": {
            "source": "重庆市招聘职位",
            "total_jobs": csv_stats.get("total_jobs", 0),
            "total_companies": csv_stats.get("total_companies", 0),
            "categories": csv_stats.get("categories", 0)
        },
        "old_data": {
            "source": "旧数据源",
            "total_companies": old_stats.get("total_companies", 0),
            "total_positions": old_stats.get("total_positions", 0)
        },
        "graph_cache": graph_stats
    }


@router.get("/search")
async def search_jobs(
    keyword: str = Query(..., description="搜索关键词"),
    limit: int = Query(20, ge=1, le=100)
):
    """
    搜索职位（用于测试数据加载）n    """
    jobs = chongqing_loader.search_jobs_by_major(keyword, limit=limit)
    
    return {
        "status": "success",
        "keyword": keyword,
        "total_found": len(jobs),
        "jobs": jobs
    }


@router.post("/cache/compress-existing")
async def compress_existing_graphs():
    """
    将现有的 JSON 图谱压缩为优化格式
    """
    try:
        converted = optimized_storage.compress_existing_json()
        return {
            "status": "success",
            "message": f"成功压缩 {converted} 个图谱文件",
            "converted_count": converted
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"压缩失败: {str(e)}"
        }


@router.get("/cache/clear-memory")
async def clear_memory_cache():
    """
    清空内存缓存（释放内存）
    """
    optimized_storage.memory_cache.clear()
    return {
        "status": "success",
        "message": "内存缓存已清空"
    }


@router.get("/sample/{major}")
async def get_major_sample(
    major: str,
    sample_size: int = Query(10, ge=1, le=50)
):
    """
    获取指定专业的职位样本（用于调试）
    """
    sample_text = chongqing_loader.get_sample_for_major(major, sample_size)
    
    return {
        "status": "success",
        "major": major,
        "sample_size": sample_size,
        "text_length": len(sample_text),
        "sample_preview": sample_text[:1000] + "..." if len(sample_text) > 1000 else sample_text
    }
