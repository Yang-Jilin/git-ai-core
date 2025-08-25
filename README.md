# Git AI Core - AI驱动的Git项目智能分析助手

Git AI Core 是一个现代化的AI驱动Git项目理解与分析平台，帮助开发者通过自然语言交互快速探索、理解和分析代码项目。

## ✨ 核心特性

### 🚀 智能项目探索
- **自然语言查询**: 使用日常语言提问关于代码库的任何问题
- **智能文件分析**: AI自动识别关键文件并提取相关信息
- **实时对话**: 流畅的聊天式交互体验

### 🤖 多AI提供商支持
- **OpenAI**: GPT-4, GPT-4o, GPT-4o-mini
- **Anthropic**: Claude 3.5 Sonnet, Claude 3.7 Sonnet  
- **Google Gemini**: Gemini 2.5 Pro, Gemini 2.5 Flash
- **DeepSeek**: DeepSeek Chat, DeepSeek Reasoner
- **moonshot**: kimi系列
- **可扩展架构**: 轻松添加新的AI提供商

### 🔧 开发者工具
- **Git集成**: 完整的Git仓库管理功能
- **文件结构可视化**: 交互式树形视图浏览
- **智能代码分析**: 自动识别技术栈和架构模式
- **MCP协议支持**: 模型上下文协议扩展

### 💡 智能功能
- **项目概览生成**: 一键生成完整项目文档
- **代码注释生成**: 自动为代码添加高质量注释
- **架构分析**: 深度分析项目结构和依赖关系
- **问题诊断**: 识别潜在问题和改进建议

## 🏗️ 技术架构

```
git-ai-core/
├── backend/                 # FastAPI 后端服务
│   ├── app/
│   │   ├── api/routes/     # RESTful API 端点
│   │   ├── core/          # 核心业务逻辑
│   │   │   ├── ai_manager.py          # AI服务管理
│   │   │   ├── git_manager.py         # Git操作管理
│   │   │   ├── smart_conversation_manager.py  # 智能对话引擎
│   │   │   └── mcp_server.py          # MCP协议支持
│   │   └── main.py        # 应用入口点
│   ├── requirements.txt    # Python依赖
│   └── .env.example       # 环境配置示例
├── frontend/              # React + TypeScript 前端
│   ├── src/
│   │   ├── renderer/
│   │   │   ├── components/pages/      # 页面组件
│   │   │   │   ├── SmartChatPanel.tsx # 智能聊天界面
│   │   │   │   ├── ProjectDetail.tsx  # 项目详情
│   │   │   │   └── AISettings.tsx     # AI配置
│   │   │   ├── services/api.ts        # API客户端
│   │   │   └── App.tsx               # 主应用组件
│   │   └── main.tsx       # 应用入口
│   ├── package.json       # Node.js依赖
│   └── vite.config.ts     # 构建配置
└── docs/                  # 项目文档
```

## 🚀 快速开始

### 环境要求
- **Python**: 3.8+ 
- **Node.js**: 16+
- **Git**: 最新版本
- **内存**: 至少4GB RAM

### 后端设置

1. **安装依赖**
   ```bash
   cd backend
   python -m venv venv
   
   # Windows
   venv\Scripts\activate
   # Linux/Mac
   source venv/bin/activate
   
   pip install -r requirements.txt
   ```

2. **配置环境变量**
   ```bash
   cp .env.example .env
   ```
   
   编辑 `.env` 文件，配置AI提供商API密钥：
   ```
   OPENAI_API_KEY=your_openai_api_key
   ANTHROPIC_API_KEY=your_anthropic_api_key
   GEMINI_API_KEY=your_gemini_api_key
   DEEPSEEK_API_KEY=your_deepseek_api_key
   ```

3. **启动后端服务**
   ```bash
   python -m uvicorn app.main:app --reload --port 8000
   ```

### 前端设置

1. **安装依赖**
   ```bash
   cd frontend
   npm install
   ```

2. **启动开发服务器**
   ```bash
   npm run dev
   ```

3. **访问应用**
   打开浏览器访问: http://localhost:5173

### 一键启动（推荐）
```bash
# 从项目根目录运行
npm run dev
```

## 📖 使用指南

### 1. 项目克隆与管理
- 在项目页面点击"克隆仓库"
- 输入Git URL (支持HTTP/SSH)
- 选择本地存储路径（可选）
- 实时查看克隆进度和状态

### 2. AI提供商配置
- 进入"AI设置"页面
- 选择首选AI提供商
- 输入API密钥并测试连接
- 支持多提供商冗余配置

### 3. 智能对话分析
- 选择要分析的项目
- 在聊天界面输入您的问题，例如：
  - "这个项目是做什么的？"
  - "使用什么技术栈？"
  - "解释一下main.py的功能"
  - "如何运行这个项目？"
- AI会自动分析相关文件并提供精准回答

### 4. 高级功能
- **文件树浏览**: 可视化查看项目结构
- **代码预览**: 直接查看文件内容
- **MCP扩展**: 添加自定义工具和资源
- **批量操作**: 支持多项目同时分析

## 🔌 API接口

### 核心端点

#### Git操作
- `POST /api/git/clone` - 克隆Git仓库
- `GET /api/git/projects` - 获取项目列表
- `GET /api/git/projects/{path}` - 获取项目详情
- `DELETE /api/git/projects/{path}` - 删除项目

#### AI服务
- `GET /api/ai/providers` - 获取支持的AI提供商
- `POST /api/ai/test-connection` - 测试AI连接
- `POST /api/ai/smart-conversation/start` - 开始智能对话
- `POST /api/ai/smart-conversation/chat` - 智能对话聊天

#### 项目分析
- `POST /api/projects/{path}/analyze` - AI项目分析
- `POST /api/projects/{path}/generate-comments` - 生成代码注释
- `POST /api/projects/{path}/analyze-architecture` - 架构分析

#### MCP管理
- `GET /api/mcp/servers` - 获取MCP服务器列表
- `POST /api/mcp/servers` - 添加MCP服务器
- `DELETE /api/mcp/servers/{name}` - 删除MCP服务器

## 🛠️ 开发指南

### 项目结构
项目采用清晰的分层架构，便于维护和扩展：

- **后端**: FastAPI + Pydantic + 异步IO
- **前端**: React + TypeScript + TailwindCSS
- **通信**: RESTful API + WebSocket（可选）
- **存储**: 内存存储 + 文件系统缓存

### 添加新的AI提供商

1. 在 `backend/app/core/ai_manager.py` 中添加提供商实现
2. 更新 `get_available_providers()` 方法
3. 添加对应的配置验证逻辑
4. 在前端设置页面添加UI支持

### 自定义工具扩展

通过MCP协议添加自定义工具：

```python
# 在 backend/app/core/mcp_server.py 中添加工具
async def handle_custom_tool(self, arguments: Dict) -> Dict:
    # 实现自定义工具逻辑
    return {"result": "success", "data": custom_data}
```

## 🌟 特色功能详解

### 智能对话引擎
- **上下文感知**: 保持对话上下文，理解后续问题
- **工具调用**: 自动选择合适工具获取信息
- **文件智能选择**: 基于问题内容自动识别关键文件
- **实时反馈**: 显示工具调用状态和结果

### 项目分析能力
- **技术栈识别**: 自动检测框架、库和依赖
- **架构可视化**: 生成项目结构图和依赖关系
- **代码质量评估**: 提供改进建议和最佳实践
- **文档生成**: 自动创建项目文档

### 用户体验优化
- **响应式设计**: 支持桌面和移动设备
- **实时预览**: 边输入边查看结果
- **快捷键支持**: 提高操作效率
- **主题切换**: 明暗主题支持

## 🚀 部署指南

### 生产环境部署
```bash
# 后端部署
cd backend
pip install -r requirements.txt
gunicorn -w 4 -k uvicorn.workers.UvicornWorker app.main:app

# 前端部署
cd frontend
npm run build
npm run preview
```

### Docker部署
```dockerfile
# 使用提供的Dockerfile
docker build -t git-ai-core .
docker run -p 8000:8000 -p 5173:5173 git-ai-core
```

### 环境变量配置
生产环境需要配置以下环境变量：
- `DATABASE_URL`: 数据库连接字符串
- `REDIS_URL`: Redis连接字符串（可选）
- `API_KEYS`: 各AI提供商的API密钥
- `LOG_LEVEL`: 日志级别

