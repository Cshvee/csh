from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    PROJECT_NAME: str = "Chongqing Training Program Agent API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # CORS Configuration
    CORS_ORIGINS: list = ["*"]

    # DeepSeek Configuration
    DEEPSEEK_API_KEY: str = ""
    DEEPSEEK_BASE_URL: str = "https://api.deepseek.com"
    DEEPSEEK_MODEL: str = "deepseek-chat"

    # MySQL Database Configuration
    DB_HOST: str = "localhost"
    DB_PORT: int = 3306
    DB_NAME: str = "training_agent"
    DB_USER: str = "root"
    DB_PASSWORD: str = ""
    
    # File Upload Configuration
    UPLOAD_DIR: str = "uploads/training-plans"
    MAX_FILE_SIZE: int = 52428800  # 50MB
    
    # Neo4j Graph Database Configuration (Optional)
    NEO4J_ENABLED: bool = False
    NEO4J_URI: str = "bolt://localhost:7687"
    NEO4J_USER: str = "neo4j"
    NEO4J_PASSWORD: str = "password"
    
    # Knowledge Graph Storage: "json" or "neo4j"
    KG_STORAGE: str = "json"
    
    @property
    def DATABASE_URL(self) -> str:
        return f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}?charset=utf8mb4"

    class Config:
        env_file = ".env"

@lru_cache()
def get_settings():
    return Settings()
