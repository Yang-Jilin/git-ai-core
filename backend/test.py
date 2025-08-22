# test_moonshot_cn.py
import asyncio
import os
import sys
import traceback

# 添加项目路径以便导入
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from app.core.ai_manager import MoonshotProvider

async def test_moonshot_cn():
    # 从环境变量获取API密钥
    api_key = os.getenv('MOONSHOT_API_KEY')
    if not api_key:
        print("请设置 MOONSHOT_API_KEY 环境变量")
        print("命令: set MOONSHOT_API_KEY=您的API密钥")
        return
    
    provider = MoonshotProvider()
    
    print("测试Moonshot中国版 (api.moonshot.cn)...")
    print(f"API密钥: {api_key[:10]}...{api_key[-4:]}" if len(api_key) > 14 else api_key)
    
    try:
        # 测试连接
        print("\n1. 测试连接...")
        connected = await provider.test_connection(api_key, "china")
        print(f"连接测试: {'成功' if connected else '失败'}")
        
        if connected:
            # 测试聊天
            print("\n2. 测试聊天功能...")
            result = await provider.chat(
                model="kimi-k2-0711-preview",
                messages=[{"role": "user", "content": "Hello, 这是一条测试消息"}],
                api_key=api_key,
                base_url="china"
            )
            print("聊天测试成功!")
            print(f"响应内容: {result['content']}")
            print(f"使用token: {result['usage']}")
        else:
            print("连接失败，跳过聊天测试")
            
    except Exception as e:
        print(f"\n测试失败: {e}")
        print("\n详细错误信息:")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_moonshot_cn())