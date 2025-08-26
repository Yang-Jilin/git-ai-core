import sqlite3
import os
import json
from pathlib import Path
from typing import List, Dict, Optional, Any
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class GitHubRecommendationDB:
    def __init__(self):
        # 数据库文件路径
        self.db_path = Path(__file__).parent.parent / "data" / "github_recommendations.db"
        self._ensure_db_directory()
        self._init_database()

    def _ensure_db_directory(self):
        """确保数据库目录存在"""
        try:
            os.makedirs(self.db_path.parent, exist_ok=True)
            logger.info(f"数据库目录已确保存在: {self.db_path.parent}")
        except Exception as e:
            logger.error(f"创建数据库目录失败: {e}")
            raise

    def _init_database(self):
        """初始化数据库表结构"""
        try:
            conn = self._get_connection()
            cursor = conn.cursor()

            # 创建用户行为记录表
            cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_github_actions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL DEFAULT 'default',
                repo_full_name TEXT NOT NULL,
                action_type TEXT NOT NULL CHECK(action_type IN ('view', 'star', 'clone', 'search')),
                search_query TEXT,
                action_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                duration_seconds INTEGER
            )
            ''')

            # 创建项目特征缓存表
            cursor.execute('''
            CREATE TABLE IF NOT EXISTS cached_repo_features (
                repo_full_name TEXT PRIMARY KEY,
                language TEXT,
                stars INTEGER,
                forks INTEGER,
                open_issues INTEGER,
                created_at DATETIME,
                updated_at DATETIME,
                topics TEXT,
                description TEXT,
                quality_score FLOAT DEFAULT 0,
                last_crawled DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            ''')

            # 创建推荐历史表
            cursor.execute('''
            CREATE TABLE IF NOT EXISTS recommendation_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL DEFAULT 'default',
                repo_full_name TEXT NOT NULL,
                recommendation_score FLOAT NOT NULL,
                recommendation_type TEXT NOT NULL CHECK(recommendation_type IN ('trending', 'personalized', 'similar', 'explore')),
                shown_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                clicked BOOLEAN DEFAULT FALSE,
                click_timestamp DATETIME
            )
            ''')

            # 创建索引以提高查询性能
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_user_actions_user_id ON user_github_actions(user_id)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_user_actions_repo ON user_github_actions(repo_full_name)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_user_actions_timestamp ON user_github_actions(action_timestamp)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_recommendation_user ON recommendation_history(user_id)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_recommendation_timestamp ON recommendation_history(shown_timestamp)')

            conn.commit()
            logger.info("GitHub推荐数据库初始化成功")
            
        except Exception as e:
            logger.error(f"数据库初始化失败: {e}")
            raise
        finally:
            if 'conn' in locals():
                conn.close()

    def _get_connection(self):
        """获取数据库连接"""
        try:
            conn = sqlite3.connect(
                str(self.db_path),
                timeout=30,
                check_same_thread=False
            )
            # 启用外键支持
            conn.execute("PRAGMA foreign_keys = ON")
            return conn
        except Exception as e:
            logger.error(f"获取数据库连接失败: {e}")
            raise

    def record_user_action(self, user_id: str, repo_full_name: str, action_type: str, 
                          search_query: str = None, duration_seconds: int = None) -> bool:
        """记录用户行为"""
        try:
            conn = self._get_connection()
            cursor = conn.cursor()
            
            cursor.execute('''
            INSERT INTO user_github_actions 
            (user_id, repo_full_name, action_type, search_query, duration_seconds)
            VALUES (?, ?, ?, ?, ?)
            ''', (user_id, repo_full_name, action_type, search_query, duration_seconds))
            
            conn.commit()
            logger.debug(f"记录用户行为成功: {user_id}, {repo_full_name}, {action_type}")
            return True
            
        except Exception as e:
            logger.error(f"记录用户行为失败: {e}")
            return False
        finally:
            if 'conn' in locals():
                conn.close()

    def cache_repo_features(self, repo_data: Dict[str, Any]) -> bool:
        """缓存项目特征"""
        try:
            conn = self._get_connection()
            cursor = conn.cursor()
            
            # 处理topics数组
            topics_json = json.dumps(repo_data.get('topics', [])) if repo_data.get('topics') else None
            
            cursor.execute('''
            INSERT OR REPLACE INTO cached_repo_features 
            (repo_full_name, language, stars, forks, open_issues, created_at, 
             updated_at, topics, description, quality_score)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                repo_data['full_name'],
                repo_data.get('language'),
                repo_data.get('stargazers_count', 0),
                repo_data.get('forks_count', 0),
                repo_data.get('open_issues_count', 0),
                repo_data.get('created_at'),
                repo_data.get('updated_at'),
                topics_json,
                repo_data.get('description'),
                self._calculate_quality_score(repo_data)
            ))
            
            conn.commit()
            logger.debug(f"缓存项目特征成功: {repo_data['full_name']}")
            return True
            
        except Exception as e:
            logger.error(f"缓存项目特征失败: {e}")
            return False
        finally:
            if 'conn' in locals():
                conn.close()

    def _calculate_quality_score(self, repo_data: Dict[str, Any]) -> float:
        """计算项目质量评分"""
        score = 0.0
        
        # 星标数权重
        stars = repo_data.get('stargazers_count', 0)
        score += min(stars / 1000, 10.0) * 0.4  # 最多10分，权重40%
        
        # 更新活跃度权重
        if repo_data.get('updated_at'):
            try:
                updated_at = datetime.fromisoformat(repo_data['updated_at'].replace('Z', '+00:00'))
                days_since_update = (datetime.now() - updated_at).days
                recency_score = max(0, 10 - (days_since_update / 30))  # 30天内10分，每过30天减1分
                score += recency_score * 0.3  # 权重30%
            except:
                pass
        
        # Fork数权重
        forks = repo_data.get('forks_count', 0)
        score += min(forks / 100, 5.0) * 0.2  # 最多5分，权重20%
        
        # 问题数权重（反向）
        issues = repo_data.get('open_issues_count', 0)
        issues_score = max(0, 5 - (issues / 20))  # 每20个问题减1分，最多5分
        score += issues_score * 0.1  # 权重10%
        
        return round(score, 2)

    def get_user_actions(self, user_id: str, limit: int = 100) -> List[Dict]:
        """获取用户行为历史"""
        try:
            conn = self._get_connection()
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            cursor.execute('''
            SELECT * FROM user_github_actions 
            WHERE user_id = ? 
            ORDER BY action_timestamp DESC 
            LIMIT ?
            ''', (user_id, limit))
            
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
            
        except Exception as e:
            logger.error(f"获取用户行为失败: {e}")
            return []
        finally:
            if 'conn' in locals():
                conn.close()

    def record_recommendation(self, user_id: str, repo_full_name: str, 
                            score: float, rec_type: str) -> bool:
        """记录推荐历史"""
        try:
            conn = self._get_connection()
            cursor = conn.cursor()
            
            cursor.execute('''
            INSERT INTO recommendation_history 
            (user_id, repo_full_name, recommendation_score, recommendation_type)
            VALUES (?, ?, ?, ?)
            ''', (user_id, repo_full_name, score, rec_type))
            
            conn.commit()
            return True
            
        except Exception as e:
            logger.error(f"记录推荐历史失败: {e}")
            return False
        finally:
            if 'conn' in locals():
                conn.close()

    def mark_recommendation_clicked(self, recommendation_id: int) -> bool:
        """标记推荐为已点击"""
        try:
            conn = self._get_connection()
            cursor = conn.cursor()
            
            cursor.execute('''
            UPDATE recommendation_history 
            SET clicked = TRUE, click_timestamp = CURRENT_TIMESTAMP
            WHERE id = ?
            ''', (recommendation_id,))
            
            conn.commit()
            return cursor.rowcount > 0
            
        except Exception as e:
            logger.error(f"标记推荐点击失败: {e}")
            return False
        finally:
            if 'conn' in locals():
                conn.close()

    def get_recommendation_history(self, user_id: str, limit: int = 50) -> List[Dict]:
        """获取推荐历史"""
        try:
            conn = self._get_connection()
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            cursor.execute('''
            SELECT * FROM recommendation_history 
            WHERE user_id = ? 
            ORDER BY shown_timestamp DESC 
            LIMIT ?
            ''', (user_id, limit))
            
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
            
        except Exception as e:
            logger.error(f"获取推荐历史失败: {e}")
            return []
        finally:
            if 'conn' in locals():
                conn.close()

    def get_cached_repo(self, repo_full_name: str) -> Optional[Dict]:
        """获取缓存的项目信息"""
        try:
            conn = self._get_connection()
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            cursor.execute('''
            SELECT * FROM cached_repo_features 
            WHERE repo_full_name = ?
            ''', (repo_full_name,))
            
            row = cursor.fetchone()
            if row:
                result = dict(row)
                # 解析topics JSON
                if result.get('topics'):
                    result['topics'] = json.loads(result['topics'])
                return result
            return None
            
        except Exception as e:
            logger.error(f"获取缓存项目失败: {e}")
            return None
        finally:
            if 'conn' in locals():
                conn.close()

    def cleanup_old_data(self, days_to_keep: int = 90):
        """清理过期数据"""
        try:
            conn = self._get_connection()
            cursor = conn.cursor()
            
            # 清理旧的行为记录
            cursor.execute('''
            DELETE FROM user_github_actions 
            WHERE action_timestamp < datetime('now', ?)
            ''', (f'-{days_to_keep} days',))
            
            # 清理旧的推荐历史
            cursor.execute('''
            DELETE FROM recommendation_history 
            WHERE shown_timestamp < datetime('now', ?)
            ''', (f'-{days_to_keep} days',))
            
            # 清理长时间未更新的缓存项目
            cursor.execute('''
            DELETE FROM cached_repo_features 
            WHERE last_crawled < datetime('now', ?)
            ''', (f'-{days_to_keep * 2} days',))
            
            conn.commit()
            logger.info(f"清理了 {cursor.rowcount} 条过期数据")
            
        except Exception as e:
            logger.error(f"数据清理失败: {e}")
        finally:
            if 'conn' in locals():
                conn.close()

# 全局数据库实例
github_recommendation_db = GitHubRecommendationDB()
