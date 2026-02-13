from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings
from app.core.database import engine, Base
from app.api import endpoints, training_plans, data_management, cache_debug

# 导入模型以确保表被创建
from app.models.training_plan import TrainingPlan
from app.models.school_hierarchy import SchoolHierarchy

settings = get_settings()

# 创建数据库表
Base.metadata.create_all(bind=engine)

# 初始化学校层级缓存
print("[Startup] 初始化学校层级缓存...")
from app.services.hierarchy_cache_service import hierarchy_cache
hierarchy_cache.initialize_cache()
print("[Startup] 学校层级缓存初始化完成")

# 初始化 Neo4j（如果启用）
if settings.NEO4J_ENABLED:
    print("[Startup] 初始化 Neo4j 连接...")
    from app.core.neo4j_client import init_neo4j
    if init_neo4j():
        print("[Startup] Neo4j 连接成功")
    else:
        print("[Startup] Neo4j 连接失败，将使用 JSON 文件存储")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Set all CORS enabled origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# 注册路由
app.include_router(endpoints.router, prefix=settings.API_V1_STR)
app.include_router(training_plans.router, prefix=f"{settings.API_V1_STR}/training-plans")
app.include_router(data_management.router, prefix=f"{settings.API_V1_STR}/data")
app.include_router(cache_debug.router, prefix=settings.API_V1_STR)

@app.get("/")
async def root():
    return {
        "message": "Welcome to Chongqing Training Program Agent API",
        "docs": "/docs",
        "status": "running"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
