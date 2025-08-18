# 数据库记忆功能使用指南

## 功能概述
本项目现在具备了数据库记忆功能，可以记住所有克隆的仓库信息，即使重启应用也能恢复项目列表。

## 技术实现
- **数据库**: SQLite (文件: `backend/app/data/git_ai.db`)
- **ORM**: SQLAlchemy
- **表结构**: `repositories` 表存储仓库路径索引

## 数据库表结构
```sql
repositories (
    id: INTEGER PRIMARY KEY AUTOINCREMENT
    local_path: VARCHAR(500) - 本地存储路径（唯一）
    remote_url: VARCHAR(500) - 远程仓库URL
    name: VARCHAR(255) - 仓库名称
    clone_date: DATETIME - 克隆时间
    last_accessed: DATETIME - 最后访问时间
)
```

## 工作流程

### 1. 克隆仓库时
- 仓库被克隆到指定路径
- 自动将路径信息保存到数据库
- 下次启动时自动加载

### 2. 启动应用时
- 自动初始化数据库（如果不存在）
- 从数据库读取所有仓库路径
- 验证路径有效性（清理无效路径）
- 加载有效仓库到内存

### 3. 使用项目时
- 直接从文件系统读取最新状态
- 数据库只作为路径索引，不存储项目内容

## 使用方法

### 克隆仓库
通过前端界面正常克隆仓库，系统会自动保存到数据库。

### 查看项目列表
项目列表会自动显示所有已克隆的仓库，包括重启前的项目。

### 数据库文件位置
数据库文件位于：`backend/app/data/git_ai.db`

## 故障排除

### 数据库表不存在
运行以下命令创建表：
```bash
cd backend
python -c "from app.core.database import init_db; init_db()"
```

### 清理无效路径
系统会自动清理不存在的路径，也可以手动运行：
```bash
cd backend
python -c "
from app.core.database import SessionLocal
from app.services.repository_service import RepositoryService
db = SessionLocal()
repo_service = RepositoryService(db)
cleaned = repo_service.cleanup_invalid_paths()
print(f'Cleaned {cleaned} invalid paths')
db.close()
"
```

## 测试功能
运行测试脚本验证功能：
```bash
cd backend
python test_memory.py
