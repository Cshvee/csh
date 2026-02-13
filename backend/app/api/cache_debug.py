"""
缓存调试 API - 查看缓存命中情况
"""
from fastapi import APIRouter, Query
import os
import json
from typing import Optional

from app.services.kg_service import kg_service
from app.services.optimized_json_storage import optimized_storage

router = APIRouter(tags=["cache-debug"])


@router.get("/cache/check")
async def check_cache(
    school: str = Query(..., description="学校名称"),
    college: str = Query(..., description="学院名称"),
    major: str = Query(..., description="专业名称")
):
    """
    检查指定专业的图谱缓存状态
    """
    # 生成缓存键
    cache_path = kg_service._get_cache_path(school, college, major)
    
    # 检查各种缓存
    standard_json_exists = os.path.exists(cache_path)
    
    # 检查优化存储
    from app.services.optimized_json_storage import optimized_storage
    opt_data = optimized_storage.load_graph(school, college, major)
    optimized_exists = opt_data is not None
    
    # 检查 Neo4j
    neo4j_exists = False
    if kg_service.use_neo4j:
        try:
            from app.core.neo4j_client import neo4j_client
            neo4j_data = neo4j_client.load_graph(school, college, major)
            neo4j_exists = neo4j_data is not None
        except:
            pass
    
    # 检查内存缓存
    from app.services.optimized_json_storage import optimized_storage
    cache_key = optimized_storage._get_cache_key(school, college, major)
    memory_cached = cache_key in optimized_storage.memory_cache
    
    return {
        "school": school,
        "college": college,
        "major": major,
        "cache_key": cache_key,
        "cache_path": cache_path,
        "exists": {
            "standard_json": standard_json_exists,
            "optimized_storage": optimized_exists,
            "neo4j": neo4j_exists,
            "memory": memory_cached
        },
        "will_use_cache": standard_json_exists or optimized_exists or neo4j_exists,
        "storage_backend": "neo4j" if neo4j_exists else ("optimized_json" if optimized_exists else ("standard_json" if standard_json_exists else "none"))
    }


@router.get("/cache/list")
async def list_cached_graphs(
    school: Optional[str] = Query(None, description="按学校筛选")
):
    """
    列出所有已缓存的图谱
    """
    graphs = []
    cache_dir = kg_service._get_cache_path("", "", "").replace("___graph.json", "")
    
    if os.path.exists(cache_dir):
        for filename in os.listdir(cache_dir):
            if filename.endswith("_graph.json") or filename.endswith(".pkl.gz"):
                filepath = os.path.join(cache_dir, filename)
                stat = os.stat(filepath)
                
                # 解析文件名
                name = filename.replace("_graph.json", "").replace(".pkl.gz", "")
                parts = name.split("_")
                
                if len(parts) >= 3:
                    graphs.append({
                        "filename": filename,
                        "school": parts[0],
                        "college": parts[1],
                        "major": "_".join(parts[2:]),
                        "size_kb": round(stat.st_size / 1024, 2),
                        "modified": stat.st_mtime
                    })
    
    # 按学校筛选
    if school:
        graphs = [g for g in graphs if school in g["school"]]
    
    return {
        "total": len(graphs),
        "graphs": sorted(graphs, key=lambda x: x["modified"], reverse=True)
    }


@router.post("/cache/clear/{school}/{college}/{major}")
async def clear_cache(
    school: str,
    college: str,
    major: str
):
    """
    清除指定专业的缓存（强制重新构建）
    """
    cache_path = kg_service._get_cache_path(school, college, major)
    
    deleted = []
    
    # 删除标准 JSON
    if os.path.exists(cache_path):
        os.remove(cache_path)
        deleted.append("standard_json")
    
    # 删除优化存储
    opt_deleted = optimized_storage.delete_graph(school, college, major) if hasattr(optimized_storage, 'delete_graph') else False
    if opt_deleted:
        deleted.append("optimized_storage")
    
    return {
        "message": f"已清除 {len(deleted)} 个缓存",
        "deleted_types": deleted
    }
