from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import json
import os
from pathlib import Path
from app.core.comment_mcp_server import comment_mcp_server

router = APIRouter()

class MCPServerConfig(BaseModel):
    name: str = Field(..., description="Server name")
    command: str = Field(..., description="Command to run the server")
    args: Optional[List[str]] = Field(None, description="Command arguments")
    env: Optional[Dict[str, str]] = Field(None, description="Environment variables")
    description: Optional[str] = Field(None, description="Server description")

class MCPRequest(BaseModel):
    server_name: str = Field(..., description="MCP server name")
    tool_name: str = Field(..., description="Tool name")
    arguments: Dict[str, Any] = Field(..., description="Tool arguments")

class McpServer:
    def __init__(self):
        self.servers = {}
        self.config_path = None
    
    def set_config_path(self, config_path: str):
        self.config_path = config_path
    
    def load_servers(self) -> Dict[str, Any]:
        """加载MCP服务器配置"""
        if not self.config_path or not os.path.exists(self.config_path):
            return {}
        
        try:
            with open(self.config_path, 'r') as f:
                return json.load(f)
        except Exception:
            return {}
    
    def save_servers(self, servers: Dict[str, Any]) -> bool:
        """保存MCP服务器配置"""
        try:
            os.makedirs(os.path.dirname(self.config_path), exist_ok=True)
            with open(self.config_path, 'w') as f:
                json.dump(servers, f, indent=2)
            return True
        except Exception:
            return False
    
    def get_server(self, name: str) -> Optional[Dict[str, Any]]:
        """获取服务器配置"""
        servers = self.load_servers()
        return servers.get(name)
    
    def list_servers(self) -> Dict[str, Any]:
        """列出所有服务器"""
        return self.load_servers()

def get_mcp_server():
    from app.main import app
    return app.state.mcp_server


@router.get("/servers")
async def list_servers() -> Dict[str, Any]:
    """列出所有MCP服务器"""
    mcp_server = get_mcp_server()
    
    # 获取配置的服务器
    configured_servers = mcp_server.list_servers()
    
    # 获取内置服务器并合并
    builtin_servers = mcp_server.get_builtin_servers()
    for server in builtin_servers:
        configured_servers[server["name"]] = {
            "command": server["command"],
            "args": server.get("args", []),
            "env": server.get("env", {}),
            "description": server.get("description", ""),
            "builtin": True  # 标记为内置服务器
        }
    
    return configured_servers

@router.get("/servers/{server_name}")
async def get_server(server_name: str) -> Dict[str, Any]:
    """获取特定MCP服务器配置"""
    mcp_server = get_mcp_server()
    server = mcp_server.get_server(server_name)
    
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    
    return server

@router.post("/servers")
async def add_server(config: MCPServerConfig) -> Dict[str, Any]:
    """添加MCP服务器"""
    mcp_server = get_mcp_server()
    servers = mcp_server.load_servers()
    
    servers[config.name] = {
        "command": config.command,
        "args": config.args or [],
        "env": config.env or {},
        "description": config.description or ""
    }
    
    if mcp_server.save_servers(servers):
        return {"success": True, "message": "Server added successfully"}
    else:
        raise HTTPException(status_code=500, detail="Failed to save server configuration")

@router.put("/servers/{server_name}")
async def update_server(server_name: str, config: MCPServerConfig) -> Dict[str, Any]:
    """更新MCP服务器"""
    mcp_server = get_mcp_server()
    servers = mcp_server.load_servers()
    
    if server_name not in servers:
        raise HTTPException(status_code=404, detail="Server not found")
    
    servers[server_name] = {
        "command": config.command,
        "args": config.args or [],
        "env": config.env or {},
        "description": config.description or ""
    }
    
    if mcp_server.save_servers(servers):
        return {"success": True, "message": "Server updated successfully"}
    else:
        raise HTTPException(status_code=500, detail="Failed to save server configuration")

@router.delete("/servers/{server_name}")
async def remove_server(server_name: str) -> Dict[str, Any]:
    """删除MCP服务器"""
    mcp_server = get_mcp_server()
    servers = mcp_server.load_servers()
    
    if server_name not in servers:
        raise HTTPException(status_code=404, detail="Server not found")
    
    del servers[server_name]
    
    if mcp_server.save_servers(servers):
        return {"success": True, "message": "Server removed successfully"}
    else:
        raise HTTPException(status_code=500, detail="Failed to save server configuration")

@router.post("/execute")
async def execute_tool(request: MCPRequest) -> Dict[str, Any]:
    """执行MCP工具"""
    # 处理注释生成MCP服务器的请求
    if request.server_name == "comment-server":
        return await _handle_comment_server_request(request.tool_name, request.arguments)
    
    # 这里需要实现其他MCP服务器的执行逻辑
    # 目前返回模拟响应
    return {
        "success": True,
        "result": {
            "message": f"Tool {request.tool_name} executed on server {request.server_name}",
            "arguments": request.arguments
        }
    }

async def _handle_comment_server_request(tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
    """处理注释服务器请求"""
    try:
        # 获取项目根目录和文件相对路径
        project_root = arguments.get("project_root")
        file_path = arguments.get("file_path")
        
        if not project_root or not file_path:
            raise HTTPException(status_code=400, detail="Missing project_root or file_path parameter")
        
        # 拼接完整文件路径
        full_path = os.path.join(project_root, file_path)
        
        if tool_name == "generate_comments":
            comment_style = arguments.get("comment_style", "detailed")
            
            # 添加调试信息
            print(f"Generating comments for: {full_path}")
            print(f"Project root: {project_root}")
            print(f"File path: {file_path}")
            
            result = await comment_mcp_server.generate_comments(full_path, comment_style)
            return {"success": result["success"], "result": result}
            
        elif tool_name == "preview_comments":
            comment_style = arguments.get("comment_style", "detailed")
            
            # 添加调试信息
            print(f"Previewing comments for: {full_path}")
            print(f"Project root: {project_root}")
            print(f"File path: {file_path}")
            
            result = await comment_mcp_server.preview_comments(full_path, comment_style)
            return {"success": result["success"], "result": result}
            
        elif tool_name == "write_comments":
            content = arguments.get("content")
            
            if not content:
                raise HTTPException(status_code=400, detail="Missing content parameter")
            
            success = await comment_mcp_server.write_file(full_path, content)
            return {"success": success, "result": {"message": "File written successfully"}}
            
        elif tool_name == "read_file":
            content = await comment_mcp_server.read_file(full_path)
            return {"success": True, "result": {"content": content}}
            
        elif tool_name == "get_supported_languages":
            languages = comment_mcp_server.get_supported_languages()
            return {"success": True, "result": {"languages": languages}}
            
        elif tool_name == "get_comment_styles":
            styles = comment_mcp_server.get_comment_styles()
            return {"success": True, "result": {"styles": styles}}
            
        else:
            raise HTTPException(status_code=404, detail=f"Tool {tool_name} not found")
            
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/tools/{server_name}")
async def list_tools(server_name: str) -> List[Dict[str, Any]]:
    """列出MCP服务器的所有工具"""
    # 返回注释服务器的工具列表
    if server_name == "comment-server":
        return [
            {
                "name": "generate_comments",
                "description": "生成代码注释",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "project_root": {"type": "string", "description": "项目根目录路径"},
                        "file_path": {"type": "string", "description": "文件相对路径"},
                        "comment_style": {
                            "type": "string", 
                            "description": "注释风格",
                            "enum": ["detailed", "brief", "documentation"],
                            "default": "detailed"
                        }
                    },
                    "required": ["project_root", "file_path"]
                }
            },
            {
                "name": "preview_comments",
                "description": "预览注释效果",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "project_root": {"type": "string", "description": "项目根目录路径"},
                        "file_path": {"type": "string", "description": "文件相对路径"},
                        "comment_style": {
                            "type": "string", 
                            "description": "注释风格",
                            "enum": ["detailed", "brief", "documentation"],
                            "default": "detailed"
                        }
                    },
                    "required": ["project_root", "file_path"]
                }
            },
            {
                "name": "write_comments",
                "description": "写入注释到文件",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "project_root": {"type": "string", "description": "项目根目录路径"},
                        "file_path": {"type": "string", "description": "文件相对路径"},
                        "content": {"type": "string", "description": "文件内容"}
                    },
                    "required": ["project_root", "file_path", "content"]
                }
            },
            {
                "name": "read_file",
                "description": "读取文件内容",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "project_root": {"type": "string", "description": "项目根目录路径"},
                        "file_path": {"type": "string", "description": "文件相对路径"}
                    },
                    "required": ["project_root", "file_path"]
                }
            },
            {
                "name": "get_supported_languages",
                "description": "获取支持的编程语言",
                "inputSchema": {
                    "type": "object",
                    "properties": {}
                }
            },
            {
                "name": "get_comment_styles",
                "description": "获取可用的注释风格",
                "inputSchema": {
                    "type": "object",
                    "properties": {}
                }
            }
        ]
    
    # 这里需要实现其他MCP服务器的工具列表获取逻辑
    # 目前返回模拟响应
    return [
        {
            "name": "read_file",
            "description": "Read file content",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "File path"}
                },
                "required": ["path"]
            }
        },
        {
            "name": "write_file",
            "description": "Write content to file",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "File path"},
                    "content": {"type": "string", "description": "File content"}
                },
                "required": ["path", "content"]
            }
        }
    ]
