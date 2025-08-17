from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from app.core.ai_manager import AIManager

router = APIRouter()

class ChatRequest(BaseModel):
    provider: str = Field(..., description="AI provider name")
    model: str = Field(..., description="Model name")
    messages: List[Dict[str, str]] = Field(..., description="Chat messages")
    api_key: str = Field(..., description="API key")
    base_url: Optional[str] = Field(None, description="Custom base URL")
    temperature: Optional[float] = Field(0.7, description="Temperature for generation")
    max_tokens: Optional[int] = Field(2000, description="Maximum tokens to generate")

class TestConnectionRequest(BaseModel):
    provider: str = Field(..., description="AI provider name")
    api_key: str = Field(..., description="API key")
    base_url: Optional[str] = Field(None, description="Custom base URL")

class ProviderConfig(BaseModel):
    name: str
    icon: str
    description: str
    models: List[str]
    default_base_url: str
    requires_api_key: bool

ai_manager = AIManager()

@router.get("/providers")
async def get_providers() -> Dict[str, ProviderConfig]:
    """获取所有可用的AI供应商配置"""
    return ai_manager.get_available_providers()

@router.post("/chat")
async def chat(request: ChatRequest) -> Dict[str, Any]:
    """发送聊天消息到AI"""
    try:
        response = await ai_manager.chat(
            provider=request.provider,
            model=request.model,
            messages=request.messages,
            api_key=request.api_key,
            base_url=request.base_url,
            temperature=request.temperature,
            max_tokens=request.max_tokens
        )
        return response
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")

@router.post("/test-connection")
async def test_connection(request: TestConnectionRequest) -> Dict[str, bool]:
    """测试AI供应商连接"""
    try:
        success = await ai_manager.test_connection(
            provider=request.provider,
            api_key=request.api_key,
            base_url=request.base_url
        )
        return {"success": success}
    except Exception as e:
        return {"success": False, "error": str(e)}

@router.get("/models/{provider}")
async def get_models(provider: str) -> List[str]:
    """获取指定供应商的可用模型"""
    config = ai_manager.get_provider_config(provider)
    if not config:
        raise HTTPException(status_code=404, detail="Provider not found")
    return config.get("models", [])
