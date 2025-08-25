import os
from typing import Dict, Any, List, Optional
from pathlib import Path
import json
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.repository import Repository

class ProjectMCPServer:
    """项目文件读取MCP服务器 - 支持动态项目路径"""
    
    def __init__(self):
        self.supported_extensions = {
            '.py', '.js', '.jsx', '.ts', '.tsx', '.java', '.cpp', '.c', '.h', 
            '.hpp', '.go', '.rs', '.php', '.rb', '.sh', '.bash', '.sql', 
            '.html', '.htm', '.css', '.scss', '.sass', '.json', '.yml', '.yaml',
            '.xml', '.md', '.txt', '.config', '.conf', '.ini', '.toml',
            '.lock', '.gitignore', '.dockerfile', '.env', '.example'
        }
    
    def _validate_project_path(self, project_path: str) -> str:
        """验证项目路径并返回绝对路径"""
        if not project_path:
            raise Exception("项目路径不能为空")
        
        abs_path = os.path.abspath(project_path)
        
        # 检查路径是否存在
        if not os.path.exists(abs_path):
            raise Exception(f"项目路径不存在: {project_path}")
        
        # 检查是否是目录
        if not os.path.isdir(abs_path):
            raise Exception(f"项目路径不是目录: {project_path}")
        
        return abs_path
    
    def _validate_file_path(self, project_path: str, relative_path: str) -> str:
        """验证文件路径安全性"""
        abs_project_path = self._validate_project_path(project_path)
        full_path = os.path.join(abs_project_path, relative_path)
        abs_full_path = os.path.abspath(full_path)
        
        # 安全检查：确保文件路径在项目目录内
        if not abs_full_path.startswith(abs_project_path):
            raise Exception("文件路径不在项目目录内")
        
        return abs_full_path
    
    async def read_project_file(self, project_path: str, relative_path: str) -> Dict[str, Any]:
        """读取项目文件内容"""
        try:
            abs_file_path = self._validate_file_path(project_path, relative_path)
            
            if not os.path.exists(abs_file_path):
                raise Exception(f"文件不存在: {relative_path}")
            
            if not os.path.isfile(abs_file_path):
                raise Exception(f"路径不是文件: {relative_path}")
            
            # 检查文件扩展名
            file_ext = Path(abs_file_path).suffix.lower()
            if file_ext not in self.supported_extensions:
                raise Exception(f"不支持的文件类型: {file_ext}")
            
            # 读取文件内容
            with open(abs_file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            return {
                "success": True,
                "content": content,
                "file_path": relative_path,
                "absolute_path": abs_file_path,
                "file_size": len(content),
                "file_type": file_ext,
                "project_path": project_path
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "file_path": relative_path,
                "project_path": project_path
            }
    
    async def list_project_files(self, project_path: str, directory: str = "", max_depth: int = 2) -> Dict[str, Any]:
        """列出项目文件结构"""
        try:
            abs_project_path = self._validate_project_path(project_path)
            base_path = os.path.join(abs_project_path, directory)
            abs_base_path = os.path.abspath(base_path)
            
            # 安全检查：确保基础路径在项目目录内
            if not abs_base_path.startswith(abs_project_path):
                raise Exception("目录路径不在项目目录内")
            
            if not os.path.exists(abs_base_path):
                raise Exception(f"目录不存在: {directory}")
            
            if not os.path.isdir(abs_base_path):
                raise Exception(f"路径不是目录: {directory}")
            
            result = []
            total_files = 0
            total_dirs = 0
            
            def scan_directory(current_dir: str, current_depth: int, current_relative: str = ""):
                nonlocal total_files, total_dirs
                
                if current_depth > max_depth:
                    return
                
                try:
                    items = os.listdir(current_dir)
                    for item in items:
                        item_path = os.path.join(current_dir, item)
                        relative_path = os.path.join(current_relative, item) if current_relative else item
                        
                        if os.path.isfile(item_path):
                            file_ext = Path(item_path).suffix.lower()
                            if file_ext in self.supported_extensions:
                                result.append({
                                    "type": "file",
                                    "name": item,
                                    "path": relative_path,
                                    "size": os.path.getsize(item_path),
                                    "extension": file_ext
                                })
                                total_files += 1
                        
                        elif os.path.isdir(item_path):
                            # 忽略一些常见的不需要扫描的目录
                            if item in {'.git', '__pycache__', 'node_modules', 'dist', 'build', '.vscode', '.idea', '.venv', 'venv', 'env'}:
                                continue
                                
                            dir_info = {
                                "type": "directory",
                                "name": item,
                                "path": relative_path,
                                "children": []
                            }
                            result.append(dir_info)
                            total_dirs += 1
                            
                            # 递归扫描子目录
                            scan_directory(item_path, current_depth + 1, relative_path)
                            
                except PermissionError:
                    # 忽略权限错误
                    pass
                except Exception as e:
                    # 记录错误但继续扫描
                    print(f"扫描目录错误 {current_dir}: {e}")
            
            scan_directory(abs_base_path, 0, directory)
            
            return {
                "success": True,
                "files": result,
                "total_files": total_files,
                "total_directories": total_dirs,
                "directory": directory,
                "project_path": project_path,
                "absolute_project_path": abs_project_path
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "directory": directory,
                "project_path": project_path
            }
    
    async def get_file_metadata(self, project_path: str, relative_path: str) -> Dict[str, Any]:
        """获取文件元数据"""
        try:
            abs_file_path = self._validate_file_path(project_path, relative_path)
            
            if not os.path.exists(abs_file_path):
                raise Exception(f"文件不存在: {relative_path}")
            
            if not os.path.isfile(abs_file_path):
                raise Exception(f"路径不是文件: {relative_path}")
            
            stats = os.stat(abs_file_path)
            file_ext = Path(abs_file_path).suffix.lower()
            
            return {
                "success": True,
                "file_path": relative_path,
                "file_name": os.path.basename(relative_path),
                "absolute_path": abs_file_path,
                "file_size": stats.st_size,
                "file_type": file_ext,
                "created_time": stats.st_ctime,
                "modified_time": stats.st_mtime,
                "is_readable": os.access(abs_file_path, os.R_OK),
                "project_path": project_path
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "file_path": relative_path,
                "project_path": project_path
            }
    
    def get_supported_extensions(self) -> List[str]:
        """获取支持的文件扩展名列表"""
        return sorted(list(self.supported_extensions))
    
    def get_server_info(self) -> Dict[str, Any]:
        """获取服务器信息"""
        return {
            "name": "project-file-server",
            "version": "1.0.0",
            "description": "项目文件读取MCP服务器，提供文件读取和目录列表功能",
            "supported_extensions": self.get_supported_extensions(),
            "requires_project_path": True
        }

# 创建全局实例
project_mcp_server = ProjectMCPServer()
