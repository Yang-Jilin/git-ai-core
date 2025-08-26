import httpx
import asyncio
import base64
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from fastapi import HTTPException

class GitHubService:
    def __init__(self, access_token: str = None):
        self.access_token = access_token
        self.base_url = "https://api.github.com"
        self.headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "Git-AI-Core"
        }
        if access_token:
            self.headers["Authorization"] = f"token {access_token}"

    async def get_weekly_trending(self) -> List[Dict]:
        """获取过去一周最火的10个项目"""
        since_date = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
        query = f"stars:>100 pushed:>{since_date}"
        
        try:
            return await self.search_repos(query, sort="stars", order="desc", per_page=10)
        except Exception as e:
            print(f"获取trending项目失败: {e}")
            return []

    async def search_repos(self, query: str, sort: str = "stars", order: str = "desc", per_page: int = 10) -> List[Dict]:
        """搜索GitHub仓库"""
        params = {
            "q": query,
            "sort": sort,
            "order": order,
            "per_page": per_page
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/search/repositories",
                    params=params,
                    headers=self.headers,
                    timeout=30.0
                )
                response.raise_for_status()
                return response.json()["items"]
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 403:
                raise HTTPException(status_code=429, detail="GitHub API速率限制，请稍后再试")
            raise HTTPException(status_code=e.response.status_code, detail=f"GitHub API错误: {e}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"搜索失败: {str(e)}")

    async def get_repo_details(self, owner: str, repo: str) -> Dict:
        """获取仓库详细信息"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/repos/{owner}/{repo}",
                    headers=self.headers,
                    timeout=30.0
                )
                response.raise_for_status()
                return response.json()
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                raise HTTPException(status_code=404, detail="仓库不存在")
            raise HTTPException(status_code=e.response.status_code, detail=f"GitHub API错误: {e}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"获取仓库详情失败: {str(e)}")

    async def get_readme(self, owner: str, repo: str) -> Optional[str]:
        """获取README内容"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/repos/{owner}/{repo}/readme",
                    headers=self.headers,
                    timeout=30.0
                )
                response.raise_for_status()
                data = response.json()
                # 解码base64内容
                if data.get("content"):
                    return base64.b64decode(data["content"]).decode('utf-8')
                return None
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                return None  # README不存在
            raise HTTPException(status_code=e.response.status_code, detail=f"GitHub API错误: {e}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"获取README失败: {str(e)}")

    async def test_connection(self) -> Dict:
        """测试GitHub连接"""
        if not self.access_token:
            return {"success": False, "error": "未提供access token"}
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/user",
                    headers=self.headers,
                    timeout=10.0
                )
                response.raise_for_status()
                user_data = response.json()
                return {
                    "success": True,
                    "user": {
                        "login": user_data.get("login"),
                        "name": user_data.get("name"),
                        "avatar_url": user_data.get("avatar_url")
                    }
                }
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401:
                return {"success": False, "error": "Access token无效"}
            return {"success": False, "error": f"GitHub API错误: {e}"}
        except Exception as e:
            return {"success": False, "error": f"连接测试失败: {str(e)}"}
