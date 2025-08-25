import asyncio
from typing import Dict, Any, List, Optional
import json
from app.core.ai_manager import AIManager
from app.core.mcp_server import McpServer

class SmartConversationManager:
    """智能对话管理器 - 处理AI工具调用和项目分析"""
    
    def __init__(self):
        self.ai_manager = AIManager()
        self.mcp_server = McpServer()
        self.conversations = {}
    
    async def analyze_user_query(self, project_path: str, user_query: str) -> List[Dict[str, Any]]:
        """分析用户查询，决定需要读取哪些文件"""
        # 构建AI提示词来分析需要读取的文件
        prompt = f"""你是一个专业的代码分析助手。用户想要了解以下关于项目的问题：

用户问题: {user_query}
项目路径: {project_path}

请分析这个问题，决定需要读取哪些文件来获取足够的信息来回答。考虑以下因素：
1. 项目配置文件（package.json, requirements.txt, etc.）
2. 主要的源代码文件
3. 文档文件
4. 配置文件

请返回一个JSON数组，包含需要读取的文件路径和读取原因，格式如下：
[
  {{
    "file_path": "相对路径",
    "reason": "为什么需要读取这个文件"
  }}
]

只返回最重要的2-3个文件，不要太多。"""
        
        messages = [
            {"role": "system", "content": "你是一个专业的代码分析助手，擅长分析项目结构和决定需要读取哪些文件来回答问题。"},
            {"role": "user", "content": prompt}
        ]
        
        # 从配置文件获取AI配置
        ai_config = self._get_ai_config()
        
        # 使用AI分析需要读取的文件
        response = await self.ai_manager.chat(
            provider=ai_config["provider"],
            model=ai_config["model"],
            messages=messages,
            api_key=ai_config["api_key"],
            base_url=ai_config.get("base_url"),
            temperature=0.3,
            max_tokens=500
        )
        
        try:
            # 解析AI返回的JSON
            file_requests = json.loads(response["content"])
            return file_requests
        except json.JSONDecodeError:
            # 如果AI没有返回有效的JSON，返回默认的文件列表
            return [
                {"file_path": "README.md", "reason": "了解项目概述和功能"},
                {"file_path": "package.json", "reason": "了解项目依赖和配置"}
            ]
    
    def _get_ai_config(self) -> Dict[str, Any]:
        """获取AI配置"""
        try:
            # 从配置文件读取AI配置
            import json
            import os
            
            # 查找正确的配置文件路径
            current_dir = os.path.dirname(__file__)
            config_paths = [
                os.path.join(os.path.dirname(current_dir), 'api', 'AI-Config.json'),  # app/api/AI-Config.json
                os.path.join(os.path.dirname(current_dir), 'AI-Config.json'),         # app/AI-Config.json
                os.path.join(os.path.dirname(os.path.dirname(current_dir)), 'AI-Config.json'),  # backend/AI-Config.json
            ]
            
            config = None
            config_path = None
            
            for path in config_paths:
                if os.path.exists(path):
                    config_path = path
                    with open(path, 'r', encoding='utf-8') as f:
                        config = json.load(f)
                    break
            
            if config:
                return {
                    "provider": config.get("ai_provider", "openai"),
                    "model": config.get("ai_model", "gpt-4o-mini"),
                    "api_key": config.get("ai_api_key", ""),
                    "base_url": config.get("ai_base_url")
                }
            
            # 如果配置文件不存在，尝试从环境变量获取
            return {
                "provider": os.getenv("AI_PROVIDER", "openai"),
                "model": os.getenv("AI_MODEL", "gpt-4o-mini"),
                "api_key": os.getenv("AI_API_KEY", ""),
                "base_url": os.getenv("AI_BASE_URL")
            }
            
        except Exception as e:
            # 如果所有配置都失败，返回默认值
            print(f"读取AI配置失败: {str(e)}")
            return {
                "provider": "openai",
                "model": "gpt-4o-mini",
                "api_key": "",
                "base_url": None
            }
    
    async def execute_tool_call(self, server_name: str, tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """执行MCP工具调用"""
        # 这里需要实现实际的MCP工具调用逻辑
        # 暂时使用模拟响应
        if tool_name == "read_project_file":
            from app.core.project_mcp_server import project_mcp_server
            return await project_mcp_server.read_project_file(
                arguments["project_path"], 
                arguments["file_path"]
            )
        elif tool_name == "list_project_files":
            from app.core.project_mcp_server import project_mcp_server
            return await project_mcp_server.list_project_files(
                arguments["project_path"],
                arguments.get("directory", ""),
                arguments.get("max_depth", 2)
            )
        else:
            return {"success": False, "error": f"Tool {tool_name} not supported"}
    
    async def generate_response(self, project_path: str, user_query: str, file_contents: Dict[str, str]) -> str:
        """基于文件内容生成回答"""
        # 构建文件内容摘要
        file_summary = "\n".join([
            f"文件: {file_path}\n内容:\n{content[:1000]}...\n{'-'*50}"
            for file_path, content in file_contents.items()
        ])
        
        prompt = f"""你是一个专业的代码分析助手。请基于以下文件内容直接回答用户的问题，专注于解决用户的具体需求。

用户问题: {user_query}
项目路径: {project_path}

相关文件内容:
{file_summary}

请直接针对用户的问题提供解决方案或答案，不需要进行全面的项目分析。保持回答简洁、直接、实用。

请使用中文回答，语言自然易懂。"""
        
        messages = [
            {"role": "system", "content": "你是一个专业的代码分析助手，擅长基于代码文件内容提供深入的项目分析。"},
            {"role": "user", "content": prompt}
        ]
        
        # 从配置文件获取AI配置
        ai_config = self._get_ai_config()
        
        response = await self.ai_manager.chat(
            provider=ai_config["provider"],
            model=ai_config["model"],
            messages=messages,
            api_key=ai_config["api_key"],
            base_url=ai_config.get("base_url"),
            temperature=0.7,
            max_tokens=1500
        )
        
        return response["content"]
    
    async def process_smart_chat(self, conversation_id: str, project_path: str, user_query: str) -> Dict[str, Any]:
        """处理智能对话请求"""
        try:
            # 1. 分析用户查询，决定需要读取的文件
            file_requests = await self.analyze_user_query(project_path, user_query)
            
            # 2. 执行工具调用读取文件
            tool_calls = []
            file_contents = {}
            
            for file_request in file_requests:
                file_path = file_request["file_path"]
                
                # 执行文件读取工具
                tool_result = await self.execute_tool_call(
                    "project-file-server",
                    "read_project_file",
                    {
                        "project_path": project_path,
                        "file_path": file_path
                    }
                )
                
                tool_call = {
                    "tool_name": "read_project_file",
                    "arguments": {
                        "project_path": project_path,
                        "file_path": file_path
                    },
                    "result": tool_result,
                    "reason": file_request["reason"]
                }
                
                tool_calls.append(tool_call)
                
                # 保存文件内容用于生成回答
                if tool_result.get("success") and tool_result.get("content"):
                    file_contents[file_path] = tool_result["content"]
            
            # 3. 基于文件内容生成回答
            if file_contents:
                response_content = await self.generate_response(project_path, user_query, file_contents)
            else:
                response_content = "无法读取相关文件内容，请检查文件路径或权限。"
            
            return {
                "response": response_content,
                "tool_calls": tool_calls,
                "conversation_id": conversation_id
            }
            
        except Exception as e:
            return {
                "response": f"处理请求时发生错误: {str(e)}",
                "tool_calls": [],
                "conversation_id": conversation_id,
                "error": str(e)
            }

# 创建全局实例
smart_conversation_manager = SmartConversationManager()
