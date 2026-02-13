import pandas as pd
import os
from typing import List, Dict, Any

class DataLoader:
    def __init__(self, data_dir: str):
        self.data_dir = data_dir
        self.jobs_df = None
        self.talks_df = None
        self.fairs_df = None
        self._load_data()

    def _load_data(self):
        try:
            # Paths
            jobs_path = os.path.join(self.data_dir, "职位.csv")
            talks_path = os.path.join(self.data_dir, "宣讲会.csv")
            fairs_path = os.path.join(self.data_dir, "招聘会.csv")

            # Load Jobs
            if os.path.exists(jobs_path):
                self.jobs_df = pd.read_csv(jobs_path, encoding='gbk', low_memory=False)
                # Clean column names (strip whitespace)
                self.jobs_df.columns = self.jobs_df.columns.str.strip()
                # Ensure string type for matching columns
                if '需求专业' in self.jobs_df.columns:
                    self.jobs_df['需求专业'] = self.jobs_df['需求专业'].astype(str)
                if '单位名称' in self.jobs_df.columns:
                    self.jobs_df['单位名称'] = self.jobs_df['单位名称'].astype(str).str.strip()

            # Load Talks
            if os.path.exists(talks_path):
                self.talks_df = pd.read_csv(talks_path, encoding='gbk')
                self.talks_df.columns = self.talks_df.columns.str.strip()
                if '单位全称' in self.talks_df.columns:
                    self.talks_df['单位全称'] = self.talks_df['单位全称'].astype(str).str.strip()
                if '来源高校' in self.talks_df.columns:
                    self.talks_df['来源高校'] = self.talks_df['来源高校'].astype(str).str.strip()
                if '跟进部门' in self.talks_df.columns:
                    self.talks_df['跟进部门'] = self.talks_df['跟进部门'].astype(str).str.strip()

            # Load Fairs
            if os.path.exists(fairs_path):
                self.fairs_df = pd.read_csv(fairs_path, encoding='gbk')
                self.fairs_df.columns = self.fairs_df.columns.str.strip()
                
            print("[OK] Data loaded successfully.")
            
        except Exception as e:
            print(f"[ERROR] Error loading data: {e}")

    def search_jobs_by_major(self, major: str, limit: int = None) -> List[Dict[str, Any]]:
        """
        Search for jobs where '需求专业' contains the major keyword.
        If limit is None, returns all matching jobs.
        """
        if self.jobs_df is None:
            return []
        
        # Filter logic: Check if major is in '需求专业'
        mask = self.jobs_df['需求专业'].str.contains(major, na=False, case=False)
        
        if limit:
            matched_jobs = self.jobs_df[mask].head(limit)
        else:
            matched_jobs = self.jobs_df[mask]
        
        return matched_jobs.to_dict('records')

    def get_related_talks(self, school: str, college: str = None, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get campus talks related to the school and optional college.
        """
        if self.talks_df is None:
            return []
        
        mask = self.talks_df['来源高校'].str.contains(school, na=False, case=False)
        
        if college:
            # Filter by college (跟进部门) if provided
            college_mask = self.talks_df['跟进部门'].str.contains(college, na=False, case=False)
            mask = mask & college_mask
            
        return self.talks_df[mask].head(limit).to_dict('records')

    def get_related_fairs(self, school: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get campus fairs related to the school (if '主办单位' or '来源' matches).
        """
        if self.fairs_df is None:
            return []
            
        # Check both Organizer and Source if possible, mostly '主办单位'
        mask = self.fairs_df['主办单位'].str.contains(school, na=False, case=False)
        return self.fairs_df[mask].head(limit).to_dict('records')

    def get_dataset_stats(self) -> Dict[str, int]:
        """
        Get global statistics of the loaded dataset.
        """
        stats = {
            "total_companies": 0,
            "total_positions": 0
        }
        
        if self.jobs_df is not None:
            stats["total_companies"] = self.jobs_df['单位名称'].nunique()
            if '需求人数' in self.jobs_df.columns:
                # Convert to numeric, coerce errors to NaN
                recruits = pd.to_numeric(self.jobs_df['需求人数'], errors='coerce')
                stats["total_positions"] = int(recruits.sum())
                
        return stats

    def get_hierarchy(self) -> Dict[str, Dict[str, List[str]]]:
        """
        Extract School -> College -> Majors hierarchy from data.
        Returns: { School: { College: [Major1, Major2, ...] } }
        """
        if self.jobs_df is None or self.talks_df is None:
            return {}
            
        # 1. Prepare DataFrames with minimal columns
        # Ensure we are using the cleaned columns from _load_data
        talks = self.talks_df[['来源高校', '跟进部门', '单位全称']].copy()
        talks.columns = ['school', 'college', 'company']
        
        jobs = self.jobs_df[['单位名称', '需求专业']].copy()
        jobs.columns = ['company', 'majors']
        
        # 2. Merge on Company Name
        # This links a School/College (via Talk) to potential Majors (via Job posted by Company)
        merged = pd.merge(talks, jobs, on='company', how='inner')
        
        # 3. Process into Hierarchy
        hierarchy = {}
        
        # Use simple iteration for flexibility
        for _, row in merged.iterrows():
            school = str(row['school']).strip()
            college = str(row['college']).strip()
            majors_str = str(row['majors']).strip()
            
            # Skip invalid entries
            if school == 'nan' or not school: continue
            
            # Handle missing college
            if college == 'nan' or not college: 
                college = "未指定学院/部门"
            
            if majors_str == 'nan' or not majors_str: continue
            
            # Initialize dicts
            if school not in hierarchy:
                hierarchy[school] = {}
            if college not in hierarchy[school]:
                hierarchy[school][college] = set()
                
            # Split and clean majors
            # Handle common separators: Chinese comma, English comma, spaces, etc.
            # Here we assume mostly comma separated
            current_majors = [m.strip() for m in majors_str.replace('，', ',').split(',')]
            for m in current_majors:
                if m and m.lower() != 'nan':
                    hierarchy[school][college].add(m)
                    
        # 4. Convert sets to sorted lists for JSON serialization
        return {
            s: {
                c: sorted(list(ms)) 
                for c, ms in cols.items()
            }
            for s, cols in hierarchy.items()
        }

# Singleton instance or factory can be used. 
# For now, we instantiate it when needed or as a global.

# Priority 1: Environment Variable
DATA_DIR = os.getenv("DATA_DIR")

if not DATA_DIR:
    # Try to find the data directory relative to the project root first
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Calculate paths relative to this file
    # services -> app -> backend
    backend_service_dir = os.path.dirname(os.path.dirname(os.path.dirname(current_dir))) # This is ROOT
    backend_dir_real = os.path.dirname(os.path.dirname(current_dir)) # This is BACKEND
    
    # Construct potential paths
    possible_paths = [
        # 1. Standard deployment path (Docker)
        "/app/data",
        
        # 2. Relative path from this file: ../../events_kg/input/...
        # (services -> app -> backend -> events_kg)
        os.path.abspath(os.path.join(current_dir, "..", "..", "events_kg", "input", "就业市场数据(2)")),
        
        # 3. Path from Project Root: backend/events_kg/input/...
        os.path.join(backend_service_dir, "backend", "events_kg", "input", "就业市场数据(2)"),
        
        # 4. Path from Project Root: events_kg/input/... (Old structure fallback)
        os.path.join(backend_service_dir, "events_kg", "input", "就业市场数据(2)"),
        
        # 5. CWD based paths
        os.path.join(os.getcwd(), "events_kg", "input", "就业市场数据(2)"),
        os.path.join(os.getcwd(), "backend", "events_kg", "input", "就业市场数据(2)"),
    ]
    
    print(f"DEBUG: Searching for data in paths: {possible_paths}")

    for path in possible_paths:
        if os.path.exists(path):
            DATA_DIR = path
            break

# Fallback if nothing found (warn user)
if not DATA_DIR:
    print("WARNING: Data directory not found. Using default empty path.")
    DATA_DIR = "./data"

data_loader = DataLoader(DATA_DIR)
