"""
重庆市招聘职位数据加载器
"""
import pandas as pd
import os
import re
from typing import List, Dict, Any


class ChongqingJobLoader:
    """重庆市招聘职位数据加载器"""
    
    def __init__(self, data_dir: str):
        self.data_dir = data_dir
        self.jobs_df = None
        self._load_data()
    
    def _load_data(self):
        """加载招聘数据"""
        try:
            # 尝试多个可能的文件名
            possible_files = [
                "重庆市职位招聘.csv",
                "职位.csv",
                "jobs.csv",
                "招聘数据.csv"
            ]
            
            file_path = None
            for filename in possible_files:
                path = os.path.join(self.data_dir, filename)
                if os.path.exists(path):
                    file_path = path
                    break
            
            if not file_path:
                print(f"[ChongqingJobLoader] 未找到数据文件，尝试目录: {self.data_dir}")
                # 列出目录中的文件
                if os.path.exists(self.data_dir):
                    files = os.listdir(self.data_dir)
                    print(f"[ChongqingJobLoader] 目录中的文件: {files}")
                    # 尝试找到任何 CSV 文件
                    csv_files = [f for f in files if f.endswith('.csv')]
                    if csv_files:
                        file_path = os.path.join(self.data_dir, csv_files[0])
                        print(f"[ChongqingJobLoader] 使用文件: {csv_files[0]}")
            
            if file_path and os.path.exists(file_path):
                # 尝试不同编码
                encodings = ['utf-8', 'gbk', 'gb2312', 'utf-8-sig']
                for encoding in encodings:
                    try:
                        self.jobs_df = pd.read_csv(file_path, encoding=encoding)
                        print(f"[ChongqingJobLoader] 成功加载 {len(self.jobs_df)} 条招聘数据 (编码: {encoding})")
                        # 清理列名（去除空格和特殊字符）
                        self.jobs_df.columns = self.jobs_df.columns.str.strip().str.replace('"', '')
                        # 清理数据中的引号
                        for col in self.jobs_df.columns:
                            if self.jobs_df[col].dtype == 'object':
                                self.jobs_df[col] = self.jobs_df[col].str.replace('"', '').str.strip()
                        break
                    except Exception as e:
                        continue
            else:
                print(f"[ChongqingJobLoader] 警告: 未找到数据文件")
                
        except Exception as e:
            print(f"[ChongqingJobLoader] 加载数据错误: {e}")
    
    def _extract_keywords(self, major: str) -> List[str]:
        """
        从专业名称中提取关键词
        例如: "电气工程及其自动化" -> ["电气", "电气工程", "自动化"]
        """
        # 去除常见后缀
        major_clean = major.replace("专业", "").replace("类", "").strip()
        
        keywords = [major_clean]  # 完整名称
        
        # 按"及其"、"与"、"和"分隔
        for sep in ["及其", "与", "和"]:
            if sep in major_clean:
                parts = major_clean.split(sep)
                keywords.extend([p.strip() for p in parts if len(p.strip()) >= 2])
        
        # 提取前4个字作为大类关键词（如"电气工程"）
        if len(major_clean) >= 4:
            keywords.append(major_clean[:4])
        
        # 提取最后几个字（如"自动化"）
        if "及其" in major_clean:
            keywords.append(major_clean.split("及其")[-1])
        
        # 去重并保持顺序
        seen = set()
        unique_keywords = []
        for kw in keywords:
            if kw not in seen and len(kw) >= 2:
                seen.add(kw)
                unique_keywords.append(kw)
        
        return unique_keywords
    
    def search_jobs_by_major(self, major: str, limit: int = None) -> List[Dict[str, Any]]:
        """
        按专业搜索相关职位 - 支持多种匹配策略
        
        Args:
            major: 专业名称
            limit: 限制返回数量
        
        Returns:
            匹配的职位列表
        """
        if self.jobs_df is None or self.jobs_df.empty:
            print(f"[ChongqingJobLoader] 数据未加载，无法搜索专业: {major}")
            return []
        
        if '需求专业' not in self.jobs_df.columns:
            print(f"[ChongqingJobLoader] 列'需求专业'不存在")
            return []
        
        # 提取关键词进行匹配（去掉"专业"、"类"等后缀）
        keywords = self._extract_keywords(major)
        print(f"[ChongqingJobLoader] 搜索专业 '{major}'，提取关键词: {keywords}")
        
        # 策略1: 精确匹配完整专业名
        mask = self.jobs_df['需求专业'].str.contains(major, na=False, case=False, regex=False)
        matched = self.jobs_df[mask]
        print(f"[ChongqingJobLoader] 精确匹配 '{major}': {len(matched)} 条")
        
        # 策略2: 如果精确匹配不足，用关键词匹配
        if len(matched) < 10 and keywords:
            for kw in keywords:
                if len(kw) >= 2:  # 至少2个字符
                    kw_mask = self.jobs_df['需求专业'].str.contains(kw, na=False, case=False, regex=False)
                    matched = pd.concat([matched, self.jobs_df[kw_mask]]).drop_duplicates()
            print(f"[ChongqingJobLoader] 关键词匹配后: {len(matched)} 条")
        
        # 策略3: 如果还不足，尝试匹配专业大类（如"电气类"）
        if len(matched) < 5:
            # 提取专业大类名称（如"电气工程及其自动化" -> "电气"）
            broad_keywords = [kw for kw in keywords if len(kw) >= 4]
            for bkw in broad_keywords:
                broad_mask = self.jobs_df['需求专业'].str.contains(bkw[:4], na=False, case=False, regex=False)
                matched = pd.concat([matched, self.jobs_df[broad_mask]]).drop_duplicates()
            print(f"[ChongqingJobLoader] 大类匹配后: {len(matched)} 条")
        
        if limit:
            matched = matched.head(limit)
        
        # 转换为字典列表，过滤 nan 值
        results = []
        for _, row in matched.iterrows():
            # 辅助函数：清理值，将 nan 转为空字符串
            def clean_value(val):
                if pd.isna(val) or str(val).lower() == 'nan':
                    return ''
                return str(val).strip()
            
            job_dict = {
                '编号': clean_value(row.get('编号', '')),
                '职位名称': clean_value(row.get('职位名称', '')),
                '需求人数': clean_value(row.get('需求人数', '')),
                '薪资': clean_value(row.get('薪资', '')),
                '职位类别': clean_value(row.get('职位类别', '')),
                '学历要求': clean_value(row.get('学历要求', '')),
                '需求专业': clean_value(row.get('需求专业', '')),
                '职位描述': clean_value(row.get('职位描述', '')),
                '单位名称': clean_value(row.get('单位名称', '')),
                '单位所在地': clean_value(row.get('单位所在地', '')),
                '单位规模': clean_value(row.get('单位规模', '')),
            }
            
            # 跳过职位名称为空的记录
            if not job_dict['职位名称']:
                continue
                
            results.append(job_dict)
        
        return results
    
    def get_jobs_by_category(self, category: str, limit: int = 50) -> List[Dict[str, Any]]:
        """按职位类别获取职位"""
        if self.jobs_df is None or '职位类别' not in self.jobs_df.columns:
            return []
        
        mask = self.jobs_df['职位类别'].str.contains(category, na=False, case=False)
        matched = self.jobs_df[mask].head(limit)
        
        return matched.to_dict('records')
    
    def get_all_categories(self) -> List[str]:
        """获取所有职位类别"""
        if self.jobs_df is None or '职位类别' not in self.jobs_df.columns:
            return []
        
        categories = self.jobs_df['职位类别'].dropna().unique()
        return sorted([str(c) for c in categories])
    
    def get_dataset_stats(self) -> Dict[str, int]:
        """获取数据集统计信息"""
        if self.jobs_df is None:
            return {
                "total_jobs": 0,
                "total_companies": 0,
                "categories": 0
            }
        
        stats = {
            "total_jobs": len(self.jobs_df),
            "total_companies": self.jobs_df['单位名称'].nunique() if '单位名称' in self.jobs_df.columns else 0,
            "categories": self.jobs_df['职位类别'].nunique() if '职位类别' in self.jobs_df.columns else 0
        }
        
        return stats
    
    def get_sample_for_major(self, major: str, sample_size: int = 20) -> str:
        """
        获取指定专业的职位样本，用于 LLM 分析
        
        Args:
            major: 专业名称
            sample_size: 采样数量
        
        Returns:
            拼接的职位描述文本
        """
        jobs = self.search_jobs_by_major(major, limit=sample_size)
        
        if not jobs:
            return ""
        
        # 拼接职位信息
        texts = []
        for job in jobs:
            text = f"""
职位: {job.get('职位名称', '')}
类别: {job.get('职位类别', '')}
薪资: {job.get('薪资', '')}
学历: {job.get('学历要求', '')}
专业: {job.get('需求专业', '')}
描述: {job.get('职位描述', '')}
"""
            texts.append(text)
        
        return "\n---\n".join(texts)


# 全局实例
def get_chongqing_loader():
    """获取重庆市数据加载器实例"""
    # 尝试多个可能的数据目录
    possible_paths = [
        "/app/data",
        os.path.join(os.path.dirname(__file__), "../../events_kg/input/就业市场数据(2)"),
        os.path.join(os.path.dirname(__file__), "../../data"),
        os.path.join(os.getcwd(), "backend/events_kg/input/就业市场数据(2)"),
    ]
    
    for path in possible_paths:
        if os.path.exists(path):
            return ChongqingJobLoader(path)
    
    # 默认使用第一个路径
    return ChongqingJobLoader(possible_paths[0])


chongqing_loader = get_chongqing_loader()
