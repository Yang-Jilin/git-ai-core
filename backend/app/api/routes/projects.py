from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import os
from pathlib import Path

router = APIRouter()

class ProjectAnalysisRequest(BaseModel):
    project_path: str = Field(..., description="Project path")
    query: str = Field(..., description="Analysis query")
    provider: str = Field(..., description="AI provider")
    model: str = Field(..., description="AI model")
    api_key: str = Field(..., description="API key")

class ProjectSummary(BaseModel):
    project_path: str = Field(..., description="Project path")
    summary_type: str = Field("overview", description="Type of summary to generate")

class GitManager:
    def get_manager(self):
        from app.main import app
        return app.state.git_manager

class AIManager:
    def get_manager(self):
        from app.main import app
        return app.state.ai_manager

@router.get("/")
async def get_all_projects() -> List[Dict[str, Any]]:
    """获取所有项目列表"""
    manager = GitManager().get_manager()
    return manager.list_projects()

@router.get("/{project_path:path}/summary")
async def get_project_summary(project_path: str) -> Dict[str, Any]:
    """获取项目摘要"""
    manager = GitManager().get_manager()
    project = manager.get_project(project_path)
    
    if not project or not project.is_valid():
        raise HTTPException(status_code=404, detail="Project not found or invalid")
    
    info = project.get_info()
    file_tree = project.get_file_tree(max_depth=2)
    recent_commits = project.get_recent_commits(5)
    
    return {
        "info": info,
        "file_tree": file_tree,
        "recent_commits": recent_commits,
        "total_files": count_files(file_tree),
        "total_directories": count_directories(file_tree)
    }

@router.post("/{project_path:path}/analyze")
async def analyze_project(request: ProjectAnalysisRequest) -> Dict[str, Any]:
    """使用AI分析项目"""
    git_manager = GitManager().get_manager()
    ai_manager = AIManager().get_manager()
    
    project = git_manager.get_project(request.project_path)
    if not project or not project.is_valid():
        raise HTTPException(status_code=404, detail="Project not found or invalid")
    
    # 获取项目基本信息
    info = project.get_info()
    file_tree = project.get_file_tree(max_depth=2)
    
    # 构建分析上下文
    context = f"""
    项目信息:
    - 名称: {info.get('name', 'Unknown')}
    - 路径: {info.get('path', 'Unknown')}
    - 分支: {info.get('current_branch', 'Unknown')}
    - 提交数: {info.get('commits_count', 0)}
    
    文件结构:
    {format_file_tree(file_tree)}
    
    用户查询: {request.query}
    """
    
    messages = [
        {"role": "system", "content": "你是一个专业的代码分析助手。请根据提供的项目信息，回答用户的问题。"},
        {"role": "user", "content": context}
    ]
    
    try:
        response = await ai_manager.chat(
            provider=request.provider,
            model=request.model,
            messages=messages,
            api_key=request.api_key
        )
        
        return {
            "analysis": response["content"],
            "project_info": info,
            "usage": response.get("usage", {})
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")

@router.get("/{project_path:path}/structure")
async def get_project_structure(
    project_path: str,
    max_depth: int = Query(3, description="Maximum depth for file tree")
) -> Dict[str, Any]:
    """获取项目结构"""
    manager = GitManager().get_manager()
    project = manager.get_project(project_path)
    
    if not project or not project.is_valid():
        raise HTTPException(status_code=404, detail="Project not found or invalid")
    
    return {
        "file_tree": project.get_file_tree(max_depth),
        "branches": project.get_branches(),
        "recent_commits": project.get_recent_commits(10)
    }

@router.get("/{project_path:path}/files")
async def get_project_files(
    project_path: str,
    extension: Optional[str] = Query(None, description="File extension filter")
) -> List[Dict[str, str]]:
    """获取项目文件列表"""
    manager = GitManager().get_manager()
    project = manager.get_project(project_path)
    
    if not project or not project.is_valid():
        raise HTTPException(status_code=404, detail="Project not found or invalid")
    
    files = []
    file_tree = project.get_file_tree(max_depth=10)
    collect_files(file_tree, files, extension)
    
    return files

@router.get("/{project_path:path}/search")
async def search_in_project(
    project_path: str,
    query: str = Query(..., description="Search query"),
    file_type: Optional[str] = Query(None, description="File type filter")
) -> List[Dict[str, str]]:
    """在项目中搜索内容"""
    manager = GitManager().get_manager()
    project = manager.get_project(project_path)
    
    if not project or not project.is_valid():
        raise HTTPException(status_code=404, detail="Project not found or invalid")
    
    # 这里可以实现实际的搜索逻辑
    # 目前返回模拟结果
    return [
        {"file": "src/main.py", "line": 10, "content": f"Found '{query}' in main.py"},
        {"file": "README.md", "line": 5, "content": f"Found '{query}' in README.md"}
    ]

# 辅助函数
def count_files(tree: Dict[str, Any]) -> int:
    """统计文件数量"""
    if tree.get("type") == "file":
        return 1
    
    count = 0
    for child in tree.get("children", []):
        count += count_files(child)
    return count

def count_directories(tree: Dict[str, Any]) -> int:
    """统计目录数量"""
    if tree.get("type") == "directory":
        count = 1
        for child in tree.get("children", []):
            count += count_directories(child)
        return count
    return 0

def format_file_tree(tree: Dict[str, Any], indent: int = 0) -> str:
    """格式化文件树为字符串"""
    if tree.get("type") == "file":
        return "  " * indent + f"- {tree['name']}\n"
    
    result = "  " * indent + f"📁 {tree['name']}/\n"
    for child in tree.get("children", []):
        result += format_file_tree(child, indent + 1)
    return result

def collect_files(tree: Dict[str, Any], files: List[Dict[str, str]], 
                  extension: Optional[str] = None, current_path: str = ""):
    """收集文件列表"""
    if tree.get("type") == "file":
        file_path = f"{current_path}/{tree['name']}" if current_path else tree['name']
        if extension is None or tree['name'].endswith(extension):
            files.append({
                "path": file_path,
                "name": tree['name'],
                "size": str(tree.get('size', 0))
            })
    elif tree.get("type") == "directory":
        dir_path = f"{current_path}/{tree['name']}" if current_path else tree['name']
        for child in tree.get("children", []):
            collect_files(child, files, extension, dir_path)
