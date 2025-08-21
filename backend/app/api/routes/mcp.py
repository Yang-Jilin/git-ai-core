from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import json
import os
from pathlib import Path

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

def get_mcp_manager():
    from app.main import app
    return app.state.mcp_server  # 使用同一个对象

@router.get("/servers")
async def list_servers() -> Dict[str, Any]:
    """列出所有MCP服务器（包括内置服务器）"""
    mcp_server = get_mcp_server()
    mcp_manager = get_mcp_manager()
    
    # 获取配置的服务器
    configured_servers = mcp_server.list_servers()
    
    # 获取内置服务器
    builtin_servers = mcp_manager.get_builtin_servers()
    
    # 合并结果
    result = {}
    result.update(configured_servers)
    
    # 添加内置服务器
    for server in builtin_servers:
        result[server["name"]] = server
    
    return result

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
    # 这里需要实现实际的MCP工具执行逻辑
    # 目前返回模拟响应
    return {
        "success": True,
        "result": {
            "message": f"Tool {request.tool_name} executed on server {request.server_name}",
            "arguments": request.arguments
        }
    }

@router.post("/servers/{server_name}/start")
async def start_server(server_name: str) -> Dict[str, Any]:
    """启动MCP服务器"""
    mcp_manager = get_mcp_manager()
    
    try:
        success = await mcp_manager.start_builtin_server(server_name)
        
        if success:
            return {
                "success": True,
                "message": f"服务器 {server_name} 启动成功",
                "server": server_name
            }
        else:
            raise HTTPException(status_code=404, detail=f"服务器 {server_name} 不存在或启动失败")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"启动服务器失败: {str(e)}")

@router.get("/tools/{server_name}")
async def list_tools(server_name: str) -> List[Dict[str, Any]]:
    """列出MCP服务器的所有工具"""
    # 这里需要实现实际的工具列表获取逻辑
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
