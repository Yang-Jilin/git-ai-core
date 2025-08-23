#!/usr/bin/env python3
"""检查数据库中的仓库路径"""

import sys
from pathlib import Path

# 添加项目根目录到Python路径
sys.path.insert(0, str(Path(__file__).parent))

from app.core.database import SessionLocal
from app.services.repository_service import RepositoryService

def check_repositories():
    """检查数据库中的仓库"""
    db = SessionLocal()
    try:
        repo_service = RepositoryService(db)
        repositories = repo_service.get_all_repositories()
        
        print("数据库中的仓库列表:")
        print("-" * 80)
        for repo in repositories:
            print(f"ID: {repo.id}")
            print(f"名称: {repo.name}")
            print(f"本地路径: {repo.local_path}")
            print(f"远程URL: {repo.remote_url}")
            print(f"克隆日期: {repo.clone_date}")
            print(f"最后访问/更新时间: {repo.last_accessed}")
            print(f"路径是否存在: {Path(repo.local_path).exists()}")
            print("-" * 80)
            
    finally:
        db.close()

if __name__ == "__main__":
    check_repositories()
