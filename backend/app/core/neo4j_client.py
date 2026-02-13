"""
Neo4j Graph Database Client - Neo4j 图数据库客户端
可选的图数据库存储后端
"""
from neo4j import GraphDatabase, AsyncGraphDatabase
from typing import List, Dict, Any, Optional
import json
from app.core.config import get_settings

settings = get_settings()


class Neo4jClient:
    """Neo4j 图数据库客户端"""
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._driver = None
        return cls._instance
    
    def connect(self) -> bool:
        """连接到 Neo4j 数据库"""
        try:
            if not settings.NEO4J_ENABLED:
                return False
            
            self._driver = GraphDatabase.driver(
                settings.NEO4J_URI,
                auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD)
            )
            # 测试连接
            self._driver.verify_connectivity()
            print(f"[Neo4j] 成功连接到 {settings.NEO4J_URI}")
            return True
        except Exception as e:
            print(f"[Neo4j] 连接失败: {e}")
            self._driver = None
            return False
    
    def close(self):
        """关闭连接"""
        if self._driver:
            self._driver.close()
            self._driver = None
    
    def is_connected(self) -> bool:
        """检查是否已连接"""
        return self._driver is not None
    
    def ensure_schema(self):
        """确保数据库模式（创建约束和索引）"""
        if not self._driver:
            return
        
        with self._driver.session() as session:
            # 创建实体 ID 唯一约束
            try:
                session.run("""
                    CREATE CONSTRAINT entity_id IF NOT EXISTS
                    FOR (e:Entity) REQUIRE e.id IS UNIQUE
                """)
                print("[Neo4j] 约束创建成功")
            except Exception as e:
                print(f"[Neo4j] 约束已存在或创建失败: {e}")
            
            # 创建索引
            try:
                session.run("""
                    CREATE INDEX entity_type IF NOT EXISTS
                    FOR (e:Entity) ON (e.type)
                """)
                session.run("""
                    CREATE INDEX entity_category IF NOT EXISTS
                    FOR (e:Entity) ON (e.category)
                """)
                print("[Neo4j] 索引创建成功")
            except Exception as e:
                print(f"[Neo4j] 索引创建失败: {e}")
    
    def save_graph(self, school: str, college: str, major: str, 
                   entities: List[Dict], relationships: List[Dict]):
        """保存知识图谱到 Neo4j"""
        if not self._driver:
            return False
        
        graph_id = f"{school}_{college}_{major}"
        
        with self._driver.session() as session:
            # 清除旧的图谱数据
            session.run("""
                MATCH (e:Entity)-[r]->(t:Entity)
                WHERE e.graph_id = $graph_id
                DELETE r, e, t
            """, graph_id=graph_id)
            
            # 创建实体节点
            for entity in entities:
                session.run("""
                    MERGE (e:Entity {id: $id})
                    SET e.name = $name,
                        e.type = $type,
                        e.category = $category,
                        e.graph_id = $graph_id,
                        e.school = $school,
                        e.college = $college,
                        e.major = $major
                """, 
                    id=entity.get('id'),
                    name=entity.get('name'),
                    type=entity.get('type'),
                    category=entity.get('category', ''),
                    graph_id=graph_id,
                    school=school,
                    college=college,
                    major=major
                )
            
            # 创建关系
            for rel in relationships:
                session.run("""
                    MATCH (head:Entity {id: $head_id})
                    MATCH (tail:Entity {id: $tail_id})
                    MERGE (head)-[r:RELATES {type: $relation}]->(tail)
                    SET r.relation = $relation
                """,
                    head_id=rel.get('head'),
                    tail_id=rel.get('tail'),
                    relation=rel.get('relation')
                )
        
        return True
    
    def load_graph(self, school: str, college: str, major: str) -> Optional[Dict]:
        """从 Neo4j 加载知识图谱"""
        if not self._driver:
            return None
        
        graph_id = f"{school}_{college}_{major}"
        
        with self._driver.session() as session:
            # 查询实体
            entities_result = session.run("""
                MATCH (e:Entity)
                WHERE e.graph_id = $graph_id
                RETURN e.id as id, e.name as name, 
                       e.type as type, e.category as category
            """, graph_id=graph_id)
            
            entities = [dict(record) for record in entities_result]
            
            if not entities:
                return None
            
            # 查询关系
            relationships_result = session.run("""
                MATCH (head:Entity)-[r:RELATES]->(tail:Entity)
                WHERE head.graph_id = $graph_id
                RETURN head.id as head, r.relation as relation, tail.id as tail
            """, graph_id=graph_id)
            
            relationships = [dict(record) for record in relationships_result]
            
            return {
                "entities": entities,
                "relationships": relationships
            }
    
    def get_graph_stats(self, school: str = None, college: str = None, major: str = None) -> Dict:
        """获取图谱统计信息"""
        if not self._driver:
            return {"error": "Not connected"}
        
        with self._driver.session() as session:
            # 构建查询条件
            where_clause = ""
            params = {}
            if school:
                where_clause = "WHERE e.school = $school"
                params['school'] = school
            
            # 统计实体
            entity_result = session.run(f"""
                MATCH (e:Entity)
                {where_clause}
                RETURN count(e) as total,
                       count(DISTINCT e.type) as types,
                       count(DISTINCT e.graph_id) as graphs
            """, **params)
            
            stats = dict(entity_result.single())
            
            # 统计关系
            rel_result = session.run(f"""
                MATCH (e:Entity)-[r:RELATES]->(t:Entity)
                {where_clause.replace('e.', 'e.').replace('WHERE', 'WHERE e.') if where_clause else ''}
                RETURN count(r) as relationships
            """, **params)
            
            stats['relationships'] = rel_result.single()['relationships']
            
            return stats
    
    def search_entities(self, keyword: str, entity_type: str = None) -> List[Dict]:
        """搜索实体"""
        if not self._driver:
            return []
        
        with self._driver.session() as session:
            if entity_type:
                result = session.run("""
                    MATCH (e:Entity)
                    WHERE e.name CONTAINS $keyword AND e.type = $type
                    RETURN e.id as id, e.name as name, 
                           e.type as type, e.category as category,
                           e.school as school, e.major as major
                    LIMIT 20
                """, keyword=keyword, type=entity_type)
            else:
                result = session.run("""
                    MATCH (e:Entity)
                    WHERE e.name CONTAINS $keyword
                    RETURN e.id as id, e.name as name, 
                           e.type as type, e.category as category,
                           e.school as school, e.major as major
                    LIMIT 20
                """, keyword=keyword)
            
            return [dict(record) for record in result]
    
    def get_related_entities(self, entity_id: str, relation_type: str = None, 
                             depth: int = 1) -> List[Dict]:
        """获取相关实体（图遍历）"""
        if not self._driver:
            return []
        
        with self._driver.session() as session:
            if relation_type:
                result = session.run("""
                    MATCH path = (e:Entity {id: $entity_id})-[r:RELATES*1..$depth]->(related:Entity)
                    WHERE ALL(rel IN r WHERE rel.relation = $relation_type)
                    RETURN related.id as id, related.name as name, 
                           related.type as type, length(path) as distance
                    LIMIT 50
                """, entity_id=entity_id, relation_type=relation_type, depth=depth)
            else:
                result = session.run("""
                    MATCH path = (e:Entity {id: $entity_id})-[r:RELATES*1..$depth]->(related:Entity)
                    RETURN related.id as id, related.name as name, 
                           related.type as type, length(path) as distance
                    LIMIT 50
                """, entity_id=entity_id, depth=depth)
            
            return [dict(record) for record in result]


# 全局实例
neo4j_client = Neo4jClient()


def init_neo4j():
    """初始化 Neo4j 连接"""
    if neo4j_client.connect():
        neo4j_client.ensure_schema()
        return True
    return False
