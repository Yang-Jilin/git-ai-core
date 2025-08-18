from sqlalchemy.orm import Session
from pathlib import Path
from typing import List, Optional
import logging

from app.models.repository import Repository

logger = logging.getLogger(__name__)

class RepositoryService:
    """仓库信息服务 - 管理仓库路径索引"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def add_repository(self, local_path: str, remote_url: str = None, name: str = None) -> Repository:
        """添加仓库到数据库"""
        try:
            # 规范化路径
            normalized_path = str(Path(local_path).resolve())
            
            # 检查是否已存在
            existing = self.db.query(Repository).filter(
                Repository.local_path == normalized_path
            ).first()
            
            if existing:
                return existing
            
            # 创建新记录
            if not name:
                name = Path(local_path).name
            
            repo = Repository(
                local_path=normalized_path,
                remote_url=remote_url,
                name=name
            )
            
            self.db.add(repo)
            self.db.commit()
            self.db.refresh(repo)
            
            logger.info(f"Added repository to database: {normalized_path}")
            return repo
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to add repository: {e}")
            raise
    
    def remove_repository(self, local_path: str) -> bool:
        """从数据库移除仓库"""
        try:
            normalized_path = str(Path(local_path).resolve())
            repo = self.db.query(Repository).filter(
                Repository.local_path == normalized_path
            ).first()
            
            if repo:
                self.db.delete(repo)
                self.db.commit()
                logger.info(f"Removed repository from database: {normalized_path}")
                return True
            
            return False
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to remove repository: {e}")
            return False
    
    def get_all_repositories(self) -> List[Repository]:
        """获取所有仓库记录"""
        return self.db.query(Repository).order_by(Repository.clone_date.desc()).all()
    
    def get_repository_by_path(self, local_path: str) -> Optional[Repository]:
        """根据路径获取仓库"""
        normalized_path = str(Path(local_path).resolve())
        return self.db.query(Repository).filter(
            Repository.local_path == normalized_path
        ).first()
    
    def update_last_accessed(self, local_path: str) -> bool:
        """更新最后访问时间"""
        try:
            normalized_path = str(Path(local_path).resolve())
            repo = self.db.query(Repository).filter(
                Repository.local_path == normalized_path
            ).first()
            
            if repo:
                from sqlalchemy.sql import func
                repo.last_accessed = func.now()
                self.db.commit()
                return True
            
            return False
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to update last accessed: {e}")
            return False
    
    def cleanup_invalid_paths(self) -> int:
        """清理无效路径的记录"""
        try:
            repos = self.get_all_repositories()
            removed_count = 0
            
            for repo in repos:
                if not Path(repo.local_path).exists():
                    self.db.delete(repo)
                    removed_count += 1
                    logger.info(f"Cleaned up invalid path: {repo.local_path}")
            
            if removed_count > 0:
                self.db.commit()
            
            return removed_count
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to cleanup invalid paths: {e}")
            return 0
