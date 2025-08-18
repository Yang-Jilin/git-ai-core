import os
import git
from pathlib import Path
from typing import List, Dict, Any, Optional
import asyncio
from concurrent.futures import ThreadPoolExecutor
import json
from datetime import datetime
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

class GitProject:
    """Git项目封装类"""
    
    def __init__(self, path: str):
        self.path = Path(path)
        self.repo = None
        self._load_repo()
    
    def _load_repo(self):
        """加载Git仓库"""
        try:
            self.repo = git.Repo(self.path)
        except git.InvalidGitRepositoryError:
            self.repo = None
    
    def is_valid(self) -> bool:
        """检查是否为有效的Git仓库"""
        return self.repo is not None
    
    def get_info(self) -> Dict[str, Any]:
        """获取项目基本信息"""
        if not self.is_valid():
            return {}
        
        try:
            return {
                "path": str(self.path),
                "name": self.path.name,
                "remote_url": self.repo.remotes.origin.url if self.repo.remotes else None,
                "current_branch": self.repo.active_branch.name,
                "branches": [branch.name for branch in self.repo.branches],
                "commits_count": len(list(self.repo.iter_commits())),
                "last_commit": {
                    "hash": str(self.repo.head.commit.hexsha),
                    "message": self.repo.head.commit.message.strip(),
                    "author": str(self.repo.head.commit.author),
                    "date": self.repo.head.commit.committed_datetime.isoformat()
                }
            }
        except Exception as e:
            return {"error": str(e)}
    
    def get_file_tree(self, max_depth: int = 3) -> Dict[str, Any]:
        """获取项目文件树"""
        if not self.is_valid():
            return {}
        
        def build_tree(path: Path, depth: int = 0) -> Dict[str, Any]:
            if depth >= max_depth:
                return {"type": "directory", "name": path.name}
            
            tree = {"type": "directory", "name": path.name, "children": []}
            
            try:
                for item in sorted(path.iterdir()):
                    if item.name.startswith('.') and item.name != '.git':
                        continue
                    
                    if item.is_file():
                        tree["children"].append({
                            "type": "file",
                            "name": item.name,
                            "size": item.stat().st_size,
                            "extension": item.suffix
                        })
                    elif item.is_dir() and item.name != '.git':
                        tree["children"].append(build_tree(item, depth + 1))
            except PermissionError:
                pass
            
            return tree
        
        return build_tree(self.path)
    
    def get_file_content(self, file_path: str) -> Optional[str]:
        """获取文件内容"""
        if not self.is_valid():
            return None
        
        full_path = self.path / file_path
        if not full_path.exists() or not full_path.is_file():
            return None
        
        try:
            with open(full_path, 'r', encoding='utf-8') as f:
                return f.read()
        except (UnicodeDecodeError, PermissionError):
            return None
    
    def get_recent_commits(self, limit: int = 10) -> List[Dict[str, Any]]:
        """获取最近的提交记录"""
        if not self.is_valid():
            return []
        
        commits = []
        try:
            for commit in self.repo.iter_commits(max_count=limit):
                commits.append({
                    "hash": str(commit.hexsha),
                    "message": commit.message.strip(),
                    "author": str(commit.author),
                    "date": commit.committed_datetime.isoformat(),
                    "files_changed": list(commit.stats.files.keys())
                })
        except Exception:
            pass
        
        return commits
    
    def get_branches(self) -> List[Dict[str, Any]]:
        """获取所有分支信息"""
        if not self.is_valid():
            return []
        
        branches = []
        try:
            for branch in self.repo.branches:
                branches.append({
                    "name": branch.name,
                    "is_active": branch.name == self.repo.active_branch.name,
                    "commit_hash": str(branch.commit.hexsha),
                    "commit_message": branch.commit.message.strip()
                })
        except Exception:
            pass
        
        return branches
    
    def get_diff(self, commit_hash: str = None) -> Optional[str]:
        """获取代码差异"""
        if not self.is_valid():
            return None
        
        try:
            if commit_hash:
                commit = self.repo.commit(commit_hash)
                return commit.diff(commit.parents[0]) if commit.parents else None
            else:
                # 获取工作区与最新提交的差异
                return self.repo.git.diff()
        except Exception:
            return None

class GitManager:
    """Git管理器"""
    
    def __init__(self):
        self.projects = {}
        self.executor = ThreadPoolExecutor(max_workers=4)
    
    def add_project(self, path: str) -> bool:
        """添加项目到管理器"""
        project = GitProject(path)
        if project.is_valid():
            self.projects[str(Path(path).resolve())] = project
            return True
        return False
    
    def remove_project(self, path: str) -> bool:
        """从管理器中移除项目"""
        resolved_path = str(Path(path).resolve())
        if resolved_path in self.projects:
            del self.projects[resolved_path]
            return True
        return False
    
    def get_project(self, path: str) -> Optional[GitProject]:
        """获取项目"""
        resolved_path = str(Path(path).resolve())
        return self.projects.get(resolved_path)
    
    def list_projects(self) -> List[Dict[str, Any]]:
        """列出所有项目"""
        projects = []
        for path, project in self.projects.items():
            if project.is_valid():
                projects.append(project.get_info())
        return projects
    
    async def clone_repository(self, url: str, path: Optional[str] = None) -> Dict[str, Any]:
        """克隆Git仓库"""
        try:
            # 提取仓库名称
            repo_name = url.split('/')[-1].replace('.git', '')
            
            if path is None:
                # 使用默认路径
                target_path = Path(settings.default_clone_path) / repo_name
            else:
                # 自定义路径下创建repo_name子目录
                target_path = Path(path).resolve().absolute() / repo_name
            
            logger.debug(f"Cloning to path: {target_path}, exists: {target_path.exists()}")
            
            if target_path.exists() and any(target_path.iterdir()):
                return {"error": "Directory already exists and is not empty"}
            
            # 异步克隆
            loop = asyncio.get_event_loop()
            repo = await loop.run_in_executor(
                self.executor,
                git.Repo.clone_from,
                url,
                str(target_path)
            )
            
            # 添加到管理器
            self.add_project(str(target_path))
            
            # 保存到数据库
            try:
                from app.core.database import SessionLocal
                from app.services.repository_service import RepositoryService
                
                db = SessionLocal()
                repo_service = RepositoryService(db)
                repo_service.add_repository(
                    local_path=str(target_path),
                    remote_url=repo.remotes.origin.url,
                    name=repo_name
                )
                db.close()
            except Exception as db_error:
                logger.warning(f"Failed to save repository to database: {db_error}")
            
            return {
                "success": True,
                "path": str(target_path),
                "remote_url": repo.remotes.origin.url
            }
            
        except Exception as e:
            return {"error": str(e)}
    
    async def search_projects(self, query: str) -> List[Dict[str, Any]]:
        """搜索项目"""
        results = []
        for path, project in self.projects.items():
            if project.is_valid():
                info = project.get_info()
                if query.lower() in info.get('name', '').lower():
                    results.append(info)
        return results
    
    def get_project_overview(self, path: str) -> Dict[str, Any]:
        """获取项目概览"""
        project = self.get_project(path)
        if not project or not project.is_valid():
            return {"error": "Project not found or invalid"}
        
        return {
            "info": project.get_info(),
            "file_tree": project.get_file_tree(),
            "recent_commits": project.get_recent_commits(5),
            "branches": project.get_branches()
        }

    def load_repositories_from_database(self) -> int:
        """从数据库加载仓库路径"""
        try:
            from app.core.database import SessionLocal
            from app.services.repository_service import RepositoryService
            
            db = SessionLocal()
            repo_service = RepositoryService(db)
            
            # 清理无效路径
            cleaned = repo_service.cleanup_invalid_paths()
            if cleaned > 0:
                logger.info(f"Cleaned up {cleaned} invalid repository paths")
            
            # 加载有效路径
            repositories = repo_service.get_all_repositories()
            loaded_count = 0
            
            for repo in repositories:
                if self.add_project(repo.local_path):
                    loaded_count += 1
                    logger.info(f"Loaded repository from database: {repo.local_path}")
            
            db.close()
            return loaded_count
            
        except Exception as e:
            logger.error(f"Failed to load repositories from database: {e}")
            return 0
