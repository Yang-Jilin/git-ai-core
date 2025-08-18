from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import os
from pathlib import Path

router = APIRouter()

class CloneRequest(BaseModel):
    url: str = Field(..., description="Git repository URL")
    path: Optional[str] = Field(None, description="Local path to clone to")

class ProjectPath(BaseModel):
    path: str = Field(..., description="Project path")

class FileRequest(BaseModel):
    path: str = Field(..., description="Project path")
    file_path: str = Field(..., description="File path within project")

class GitManager:
    def __init__(self):
        self.projects = {}

    def get_manager(self):
        from app.main import app
        return app.state.git_manager

@router.post("/clone")
async def clone_repository(request: CloneRequest) -> Dict[str, Any]:
    """克隆Git仓库"""
    manager = GitManager().get_manager()
    result = await manager.clone_repository(request.url, request.path)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result

@router.get("/projects")
async def list_projects() -> List[Dict[str, Any]]:
    """列出所有Git项目"""
    manager = GitManager().get_manager()
    return manager.list_projects()

@router.get("/projects/search")
async def search_projects(query: str = Query(..., description="Search query")) -> List[Dict[str, Any]]:
    """搜索Git项目"""
    manager = GitManager().get_manager()
    return await manager.search_projects(query)

@router.get("/projects/{project_path:path}")
async def get_project_overview(project_path: str) -> Dict[str, Any]:
    """获取项目概览"""
    manager = GitManager().get_manager()
    overview = manager.get_project_overview(project_path)
    
    if "error" in overview:
        raise HTTPException(status_code=404, detail=overview["error"])
    
    return overview

@router.post("/projects/add")
async def add_project(request: ProjectPath) -> Dict[str, Any]:
    """添加现有项目"""
    manager = GitManager().get_manager()
    
    if not os.path.exists(request.path):
        raise HTTPException(status_code=404, detail="Project path does not exist")
    
    success = manager.add_project(request.path)
    if success:
        return {"success": True, "message": "Project added successfully"}
    else:
        raise HTTPException(status_code=400, detail="Invalid Git repository")

@router.get("/projects/{project_path:path}/tree")
async def get_file_tree(
    project_path: str,
    max_depth: int = Query(3, description="Maximum depth for file tree")
) -> Dict[str, Any]:
    """获取项目文件树"""
    manager = GitManager().get_manager()
    project = manager.get_project(project_path)
    
    if not project or not project.is_valid():
        raise HTTPException(status_code=404, detail="Project not found or invalid")
    
    return project.get_file_tree(max_depth)

@router.post("/projects/file")
async def get_file_content(request: FileRequest) -> Dict[str, Any]:
    """获取文件内容"""
    manager = GitManager().get_manager()
    project = manager.get_project(request.path)
    
    if not project or not project.is_valid():
        raise HTTPException(status_code=404, detail="Project not found or invalid")
    
    content = project.get_file_content(request.file_path)
    if content is None:
        raise HTTPException(status_code=404, detail="File not found or cannot be read")
    
    return {"content": content, "file_path": request.file_path}

@router.get("/projects/{project_path:path}/commits")
async def get_recent_commits(
    project_path: str,
    limit: int = Query(10, description="Number of commits to return")
) -> List[Dict[str, Any]]:
    """获取最近的提交记录"""
    manager = GitManager().get_manager()
    project = manager.get_project(project_path)
    
    if not project or not project.is_valid():
        raise HTTPException(status_code=404, detail="Project not found or invalid")
    
    return project.get_recent_commits(limit)

@router.get("/projects/{project_path:path}/branches")
async def get_branches(project_path: str) -> List[Dict[str, Any]]:
    """获取所有分支"""
    manager = GitManager().get_manager()
    project = manager.get_project(project_path)
    
    if not project or not project.is_valid():
        raise HTTPException(status_code=404, detail="Project not found or invalid")
    
    return project.get_branches()

@router.get("/projects/{project_path:path}/diff")
async def get_diff(
    project_path: str,
    commit_hash: Optional[str] = Query(None, description="Commit hash for diff")
) -> Dict[str, Any]:
    """获取代码差异"""
    manager = GitManager().get_manager()
    project = manager.get_project(project_path)
    
    if not project or not project.is_valid():
        raise HTTPException(status_code=404, detail="Project not found or invalid")
    
    diff = project.get_diff(commit_hash)
    if diff is None:
        raise HTTPException(status_code=404, detail="Diff not available")
    
    return {"diff": diff}

@router.delete("/projects/{project_path:path}")
async def delete_project(project_path: str) -> Dict[str, Any]:
    """删除项目（包括数据库记录和本地文件）"""
    manager = GitManager().get_manager()
    result = await manager.delete_project(project_path)
    
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    
    return result

@router.post("/projects/{project_path:path}/pull")
async def pull_updates(project_path: str) -> Dict[str, Any]:
    """从远程仓库拉取最新更新"""
    manager = GitManager().get_manager()
    result = await manager.pull_updates(project_path)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result

@router.get("/projects/{project_path:path}/status")
async def get_project_status(project_path: str) -> Dict[str, Any]:
    """获取项目状态（是否有更新等）"""
    manager = GitManager().get_manager()
    status = manager.get_project_status(project_path)
    
    if "error" in status:
        raise HTTPException(status_code=404, detail=status["error"])
    
    return status
