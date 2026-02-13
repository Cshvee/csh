"""
Optimized JSON Storage for Large Scale Data
针对大数据量的 JSON 文件存储优化
"""
import json
import os
import pickle
import gzip
from typing import Dict, Any, Optional, List
from functools import lru_cache
import hashlib
import time


class OptimizedJSONStorage:
    """
    优化的 JSON 存储，适用于大数据量场景
    - 使用 pickle + gzip 压缩存储
    - 内存缓存热点数据
    - 延迟加载
    """
    
    def __init__(self, cache_dir: str = "data/graphs"):
        self.cache_dir = cache_dir
        self.memory_cache = {}  # 内存缓存
        self.cache_metadata = {}  # 缓存元数据
        os.makedirs(cache_dir, exist_ok=True)
    
    def _get_cache_key(self, school: str, college: str, major: str) -> str:
        """生成缓存键"""
        key = f"{school}_{college}_{major}"
        return hashlib.md5(key.encode()).hexdigest()
    
    def _get_file_path(self, cache_key: str, compressed: bool = True) -> str:
        """获取缓存文件路径"""
        ext = ".pkl.gz" if compressed else ".json"
        return os.path.join(self.cache_dir, f"{cache_key}{ext}")
    
    def save_graph(self, school: str, college: str, major: str, 
                   data: Dict[str, Any], use_compression: bool = True):
        """
        保存图谱数据
        
        Args:
            use_compression: 是否使用压缩（推荐用于大数据）
        """
        cache_key = self._get_cache_key(school, college, major)
        
        # 保存到内存缓存
        self.memory_cache[cache_key] = {
            'data': data,
            'timestamp': time.time(),
            'access_count': 0
        }
        
        # 保存到磁盘
        if use_compression:
            # 使用 pickle + gzip 压缩存储
            file_path = self._get_file_path(cache_key, compressed=True)
            with gzip.open(file_path, 'wb') as f:
                pickle.dump(data, f, protocol=pickle.HIGHEST_PROTOCOL)
        else:
            # 普通 JSON 存储
            file_path = self._get_file_path(cache_key, compressed=False)
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        
        # 更新元数据
        self.cache_metadata[cache_key] = {
            'school': school,
            'college': college,
            'major': major,
            'compressed': use_compression,
            'entity_count': len(data.get('entities', [])),
            'relation_count': len(data.get('relationships', [])),
            'saved_at': time.time()
        }
        
        self._save_metadata()
    
    def load_graph(self, school: str, college: str, major: str) -> Optional[Dict[str, Any]]:
        """加载图谱数据"""
        cache_key = self._get_cache_key(school, college, major)
        
        # 1. 先检查内存缓存
        if cache_key in self.memory_cache:
            self.memory_cache[cache_key]['access_count'] += 1
            return self.memory_cache[cache_key]['data']
        
        # 2. 检查磁盘缓存（优先压缩格式）
        compressed_path = self._get_file_path(cache_key, compressed=True)
        json_path = self._get_file_path(cache_key, compressed=False)
        
        data = None
        
        if os.path.exists(compressed_path):
            # 加载压缩格式
            with gzip.open(compressed_path, 'rb') as f:
                data = pickle.load(f)
        elif os.path.exists(json_path):
            # 加载 JSON 格式
            with open(json_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
        
        # 3. 缓存到内存
        if data:
            self.memory_cache[cache_key] = {
                'data': data,
                'timestamp': time.time(),
                'access_count': 1
            }
            # 清理旧缓存
            self._cleanup_memory_cache()
        
        return data
    
    def _cleanup_memory_cache(self, max_items: int = 10):
        """清理内存缓存，保留热点数据"""
        if len(self.memory_cache) <= max_items:
            return
        
        # 按访问次数排序，保留访问最多的
        sorted_cache = sorted(
            self.memory_cache.items(),
            key=lambda x: x[1]['access_count'],
            reverse=True
        )
        
        # 保留前 max_items 个
        self.memory_cache = dict(sorted_cache[:max_items])
    
    def _save_metadata(self):
        """保存缓存元数据"""
        meta_path = os.path.join(self.cache_dir, "cache_metadata.json")
        with open(meta_path, 'w', encoding='utf-8') as f:
            json.dump(self.cache_metadata, f, ensure_ascii=False, indent=2)
    
    def load_metadata(self):
        """加载缓存元数据"""
        meta_path = os.path.join(self.cache_dir, "cache_metadata.json")
        if os.path.exists(meta_path):
            with open(meta_path, 'r', encoding='utf-8') as f:
                self.cache_metadata = json.load(f)
    
    def get_stats(self) -> Dict[str, Any]:
        """获取存储统计信息"""
        total_graphs = len(self.cache_metadata)
        total_entities = sum(m.get('entity_count', 0) for m in self.cache_metadata.values())
        total_relations = sum(m.get('relation_count', 0) for m in self.cache_metadata.values())
        
        # 计算磁盘使用
        total_size = 0
        for filename in os.listdir(self.cache_dir):
            filepath = os.path.join(self.cache_dir, filename)
            if os.path.isfile(filepath):
                total_size += os.path.getsize(filepath)
        
        return {
            'total_graphs': total_graphs,
            'total_entities': total_entities,
            'total_relations': total_relations,
            'memory_cached': len(self.memory_cache),
            'disk_usage_mb': round(total_size / 1024 / 1024, 2)
        }
    
    def batch_load_all(self) -> Dict[str, Dict[str, Any]]:
        """
        批量加载所有图谱到内存（适用于小内存机器分批处理）
        返回生成器，避免一次性加载所有数据
        """
        for cache_key, meta in self.cache_metadata.items():
            data = self.load_graph(
                meta['school'], 
                meta['college'], 
                meta['major']
            )
            if data:
                yield cache_key, data
    
    def compress_existing_json(self):
        """将现有的 JSON 文件压缩为 pickle.gz 格式"""
        import shutil
        
        converted = 0
        for filename in os.listdir(self.cache_dir):
            if filename.endswith('_graph.json'):
                json_path = os.path.join(self.cache_dir, filename)
                # 解析文件名
                parts = filename.replace('_graph.json', '').split('_')
                if len(parts) >= 3:
                    school, college = parts[0], parts[1]
                    major = '_'.join(parts[2:])
                    
                    # 加载 JSON
                    with open(json_path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                    
                    # 保存为压缩格式
                    self.save_graph(school, college, major, data, use_compression=True)
                    
                    # 备份原文件
                    backup_path = json_path + '.backup'
                    shutil.move(json_path, backup_path)
                    
                    converted += 1
                    print(f"压缩完成: {filename}")
        
        return converted


# 全局实例
optimized_storage = OptimizedJSONStorage()
