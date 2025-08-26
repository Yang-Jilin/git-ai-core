from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
import asyncio
from datetime import datetime, timedelta
from app.services.github_service import GitHubService
from app.core.github_config import GitHubConfig
from app.core.github_recommendation_db import github_recommendation_db

router = APIRouter()
github_config = GitHubConfig()

# 启动时缓存的热门项目
trending_cache = []

class GitHubTestRequest(BaseModel):
    access_token: str

class GitHubSaveRequest(BaseModel):
    access_token: str

class SearchRequest(BaseModel):
    query: str
    language: Optional[str] = None
    sort: Optional[str] = "stars"
    order: Optional[str] = "desc"
    per_page: Optional[int] = 10

class EnhancedSearchRequest(BaseModel):
    query: str
    language: Optional[str] = None
    sort: Optional[str] = None  # "stars-asc", "stars-desc"
    updated_after: Optional[str] = None  # "7d", "30d", "90d"
    per_page: Optional[int] = 20

class RecordActionRequest(BaseModel):
    repo_full_name: str
    action_type: str
    search_query: Optional[str] = None
    duration_seconds: Optional[int] = None

@router.on_event("startup")
async def startup_event():
    """启动时获取热门项目"""
    global trending_cache
    access_token = github_config.get_access_token()
    if access_token and access_token.strip():
        service = GitHubService(access_token)
        try:
            trending_cache = await service.get_weekly_trending()
            print(f"成功加载 {len(trending_cache)} 个热门GitHub项目")
        except Exception as e:
            print(f"启动时获取热门项目失败: {e}")
            trending_cache = []
    else:
        print("未配置GitHub access token，跳过热门项目加载")

@router.get("/github/trending")
async def get_trending_repos():
    """获取缓存的热门项目"""
    return {"repositories": trending_cache}

@router.post("/github/search")
async def search_repos(request: SearchRequest):
    """搜索GitHub仓库"""
    access_token = github_config.get_access_token()
    if not access_token or not access_token.strip():
        raise HTTPException(status_code=400, detail="请先配置GitHub access token")
    
    service = GitHubService(access_token)
    try:
        query = request.query
        if request.language and request.language.strip():
            query += f" language:{request.language.strip()}"
        
        repos = await service.search_repos(
            query, 
            request.sort, 
            request.order, 
            request.per_page
        )
        return {"repositories": repos}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"搜索失败: {str(e)}")

@router.get("/github/repo/{owner}/{repo}")
async def get_repo_details(owner: str, repo: str):
    """获取仓库详情"""
    access_token = github_config.get_access_token()
    if not access_token or not access_token.strip():
        raise HTTPException(status_code=400, detail="请先配置GitHub access token")
    
    service = GitHubService(access_token)
    try:
        details = await service.get_repo_details(owner, repo)
        readme = await service.get_readme(owner, repo)
        details["readme"] = readme
        return details
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取仓库详情失败: {str(e)}")

@router.post("/github/test-connection")
async def test_github_connection(request: GitHubTestRequest):
    """测试GitHub连接"""
    if not request.access_token or not request.access_token.strip():
        return {"success": False, "error": "请提供有效的access token"}
    
    service = GitHubService(request.access_token)
    result = await service.test_connection()
    return result

@router.post("/github/save-config")
async def save_github_config(request: GitHubSaveRequest):
    """保存GitHub配置"""
    if not request.access_token or not request.access_token.strip():
        return {"success": False, "message": "请提供有效的access token"}
    
    try:
        success = github_config.save_config(request.access_token)
        if success:
            # 重新加载热门项目
            global trending_cache
            service = GitHubService(request.access_token)
            trending_cache = await service.get_weekly_trending()
            return {"success": True, "message": "配置保存成功"}
        else:
            return {"success": False, "message": "配置保存失败"}
    except Exception as e:
        return {"success": False, "message": f"配置保存失败: {str(e)}"}

@router.get("/github/config")
async def get_github_config():
    """获取GitHub配置"""
    return {"access_token": github_config.get_access_token()}

@router.get("/github/status")
async def get_github_status():
    """获取GitHub服务状态"""
    access_token = github_config.get_access_token()
    has_token = bool(access_token and access_token.strip())
    return {
        "configured": has_token,
        "trending_count": len(trending_cache),
        "access_token": access_token if has_token else None
    }

@router.post("/github/enhanced-search")
async def enhanced_search_repos(request: EnhancedSearchRequest):
    """增强搜索GitHub仓库（支持高级筛选）"""
    access_token = github_config.get_access_token()
    if not access_token or not access_token.strip():
        raise HTTPException(status_code=400, detail="请先配置GitHub access token")
    
    service = GitHubService(access_token)
    try:
        # 处理更新时间参数
        updated_after = None
        if request.updated_after:
            if request.updated_after == "7d":
                updated_after = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
            elif request.updated_after == "30d":
                updated_after = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
            elif request.updated_after == "90d":
                updated_after = (datetime.now() - timedelta(days=90)).strftime("%Y-%m-%d")
            else:
                updated_after = request.updated_after  # 允许自定义日期
        
        repos = await service.enhanced_search_repos(
            query=request.query,
            language=request.language,
            updated_after=updated_after,
            sort=request.sort,
            per_page=request.per_page or 20
        )
        return {"repositories": repos}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"增强搜索失败: {str(e)}")

@router.get("/github/recommendations")
async def get_personalized_recommendations(user_id: str = "default", limit: int = 10):
    """获取个性化推荐"""
    access_token = github_config.get_access_token()
    if not access_token or not access_token.strip():
        raise HTTPException(status_code=400, detail="请先配置GitHub access token")
    
    service = GitHubService(access_token)
    try:
        recommendations = await service.get_personalized_recommendations(user_id, limit)
        return {"repositories": recommendations}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取推荐失败: {str(e)}")

@router.post("/github/record-action")
async def record_user_action(request: RecordActionRequest):
    """记录用户行为"""
    try:
        success = github_recommendation_db.record_user_action(
            "default", 
            request.repo_full_name, 
            request.action_type, 
            request.search_query, 
            request.duration_seconds
        )
        return {"success": success}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"记录行为失败: {str(e)}")
