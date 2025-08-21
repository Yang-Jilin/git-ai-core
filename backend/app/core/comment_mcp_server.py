import os
import json
from typing import Dict, List, Any, Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
import httpx
from app.core.ai_manager import AIManager

class CommentMCPServer:
    """注释生成MCP服务器"""
    
    def __init__(self):
        self.ai_manager = AIManager()
        self.app = FastAPI(title="Comment Generation MCP Server")
        self.setup_routes()
    
    def setup_routes(self):
        """设置API路由"""
        
        @self.app.post("/generate-comments")
        async def generate_comments(request: dict) -> Dict[str, Any]:
            """为代码文件生成注释"""
            try:
                file_path = request.get("file_path")
                file_content = request.get("file_content")
                language = request.get("language", "python")
                comment_style = request.get("comment_style", "detailed")
                provider = request.get("provider", "openai")
                model = request.get("model", "gpt-4o-mini")
                api_key = request.get("api_key")
                
                if not all([file_path, file_content, api_key]):
                    raise HTTPException(status_code=400, detail="Missing required parameters")
                
                # 构建AI提示词
                prompt = f"""
你是一个专业的代码文档生成器。请为以下{language}代码生成高质量的注释。

要求：
1. 只返回注释内容，不要修改原代码
2. 使用{language}的适当注释风格
3. 为函数、类、复杂逻辑添加详细注释
4. 保持注释简洁明了
5. 注释风格：{comment_style}

代码：
{file_content}
                """.strip()

                messages = [
                    {"role": "system", "content": "你是一个专业的代码文档生成助手，专注于生成高质量的代码注释。"},
                    {"role": "user", "content": prompt}
                ]

                response = await self.ai_manager.chat(
                    provider=provider,
                    model=model,
                    messages=messages,
                    api_key=api_key,
                    temperature=0.3,
                    max_tokens=2000
                )
                
                return {
                    "success": True,
                    "comments": response["content"],
                    "file_path": file_path,
                    "language": language,
                    "usage": response.get("usage", {})
                }
                
            except Exception as e:
                return {
                    "success": False,
                    "error": str(e)
                }
        
        @self.app.post("/apply-comments")
        async def apply_comments(request: dict) -> Dict[str, Any]:
            """将注释应用到代码文件"""
            try:
                file_path = request.get("file_path")
                original_content = request.get("original_content")
                comments = request.get("comments")
                
                if not all([file_path, original_content, comments]):
                    raise HTTPException(status_code=400, detail="Missing required parameters")
                
                # 这里实现注释应用逻辑
                # 根据注释内容修改原代码
                annotated_content = self.apply_comments_to_code(original_content, comments)
                
                # 保存文件
                success = self.save_file(file_path, annotated_content)
                
                return {
                    "success": success,
                    "file_path": file_path,
                    "annotated": annotated_content
                }
                
            except Exception as e:
                return {
                    "success": False,
                    "error": str(e)
                }
    
    def apply_comments_to_code(self, original_content: str, comments: str) -> str:
        """将注释应用到代码中"""
        # 这里实现具体的注释应用逻辑
        # 可以根据注释内容智能地插入到适当位置
        lines = original_content.split('\n')
        comment_lines = comments.split('\n')
        
        # 简单的实现：在文件开头添加注释
        result = []
        result.extend(comment_lines)
        result.append("")  # 空行分隔
        result.extend(lines)
        
        return '\n'.join(result)
    
    def save_file(self, file_path: str, content: str) -> bool:
        """保存文件"""
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        except Exception:
            return False
    
    async def start_server(self, host: str = "127.0.0.1", port: int = 8001):
        """启动MCP服务器"""
        import uvicorn
        await uvicorn.run(self.app, host=host, port=port)

# MCP工具定义
MCP_TOOLS = {
    "generate_comments": {
        "name": "generate_comments",
        "description": "为代码文件生成注释",
        "inputSchema": {
            "type": "object",
            "properties": {
                "file_path": {"type": "string", "description": "文件路径"},
                "file_content": {"type": "string", "description": "文件内容"},
                "language": {"type": "string", "description": "编程语言"},
                "comment_style": {"type": "string", "description": "注释风格: detailed, brief, documentation"},
                "provider": {"type": "string", "description": "AI供应商"},
                "model": {"type": "string", "description": "AI模型"},
                "api_key": {"type": "string", "description": "API密钥"}
            },
            "required": ["file_path", "file_content", "api_key"]
        }
    },
    "apply_comments": {
        "name": "apply_comments",
        "description": "将注释应用到代码文件",
        "inputSchema": {
            "type": "object",
            "properties": {
                "file_path": {"type": "string", "description": "文件路径"},
                "original_content": {"type": "string", "description": "原始代码内容"},
                "comments": {"type": "string", "description": "注释内容"}
            },
            "required": ["file_path", "original_content", "comments"]
        }
    }
}

# 启动函数
async def start_comment_mcp_server():
    """启动注释生成MCP服务器"""
    server = CommentMCPServer()
    await server.start_server()

if __name__ == "__main__":
    import asyncio
    asyncio.run(start_comment_mcp_server())
