#!/usr/bin/env python3
"""
测试删除功能的脚本
用于验证删除仓库功能是否正常工作
"""

import requests
import os
import sys
from pathlib import Path

# 配置
BASE_URL = "http://localhost:8000"
TEST_REPO_PATH = r"C:\Users\LeiYu\Desktop\code\pythoncode\git-ai-core\test-repo"

def test_delete_functionality():
    """测试删除功能"""
    print("=== 测试删除功能 ===")
    
    # 1. 检查服务是否运行
    try:
        response = requests.get(f"{BASE_URL}/api/git/projects")
        print(f"✓ 服务运行正常，状态码: {response.status_code}")
    except Exception as e:
        print(f"✗ 服务未运行: {e}")
        return False
    
    # 2. 获取项目列表
    try:
        response = requests.get(f"{BASE_URL}/api/git/projects")
        projects = response.json()
        print(f"✓ 获取到 {len(projects)} 个项目")
        
        if not projects:
            print("⚠ 没有项目可测试删除")
            return True
            
        # 使用第一个项目测试
        test_project = projects[0]
        project_path = test_project['path']
        print(f"✓ 选择测试项目: {test_project['name']} at {project_path}")
        
    except Exception as e:
        print(f"✗ 获取项目列表失败: {e}")
        return False
    
    # 3. 测试删除项目
    try:
        print(f"正在删除项目: {project_path}")
        response = requests.delete(f"{BASE_URL}/api/git/projects/{project_path}")
        result = response.json()
        
        if result.get('success'):
            print("✓ 项目删除成功")
            print(f"  消息: {result.get('message')}")
            
            # 验证本地文件夹是否被删除
            if os.path.exists(project_path):
                print("⚠ 警告: 本地文件夹仍然存在")
            else:
                print("✓ 本地文件夹已删除")
                
        else:
            print(f"✗ 删除失败: {result.get('error')}")
            if result.get('details'):
                print(f"  详情: {result.get('details')}")
            return False
            
    except Exception as e:
        print(f"✗ 删除请求失败: {e}")
        return False
    
    # 4. 验证项目已从列表中移除
    try:
        response = requests.get(f"{BASE_URL}/api/git/projects")
        new_projects = response.json()
        if len(new_projects) < len(projects):
            print("✓ 项目已从列表中移除")
        else:
            print("⚠ 项目可能仍在列表中")
    except Exception as e:
        print(f"✗ 验证项目移除失败: {e}")
        return False
    
    return True

if __name__ == "__main__":
    print("开始测试删除功能...")
    success = test_delete_functionality()
    
    if success:
        print("\n🎉 删除功能测试通过！")
    else:
        print("\n❌ 删除功能测试失败！")
        sys.exit(1)
