# Git AI Core - AI驱动的Git项目理解助手

Git AI Core 是一个AI驱动的Git项目理解助手，帮助开发者通过自然语言查询快速理解新项目。

## ✨ 核心功能

- **Git集成**: 克隆和管理Git仓库
- **AI驱动分析**: 支持多种AI提供商（OpenAI、Anthropic、Google Gemini、DeepSeek、Ollama）
- **自然语言查询**: 用自然语言提问关于代码库的问题
- **项目概览**: 获取全面的项目摘要
- **文件结构可视化**: 通过树形视图浏览项目结构
- **MCP支持**: 通过模型上下文协议进行扩展
- **现代化界面**: 简洁、响应式的Web界面

## 🏗️ 项目架构

```
git-ai-core/
├── backend/                 # FastAPI后端 (Python)
│   ├── app/
│   │   ├── api/routes/     # REST端点
│   │   ├── core/          # 核心业务逻辑
│   │   └── main.py        # 应用程序入口
├── frontend/              # React前端 (TypeScript)
│   ├── src/
│   │   ├── components/    # React组件
│   │   ├── services/      # API集成
│   │   └── styles/        # CSS样式
└── docs/                  # 文档
```

## 🚀 快速开始

### 前置要求

- Python 3.8+
- Node.js 16+
- Git

### 后端设置

1. 进入后端目录：
   ```bash
   cd backend
   ```

2. 创建虚拟环境：
   ```bash
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   ```

3. 安装依赖：
   ```bash
   pip install -r requirements.txt
   ```

4. 复制环境文件：
   ```bash
   cp .env.example .env
   ```

5. 在 `.env` 中配置您的API密钥

6. 启动后端：
   ```bash
   python -m uvicorn app.main:app --reload --port 8000
   ```

### 前端设置

1. 进入前端目录：
   ```bash
   cd frontend
   ```

2. 安装依赖：
   ```bash
   npm install
   ```

3. 启动开发服务器：
   ```bash
   npm run dev
   ```

4. 在浏览器中打开 http://localhost:5173

## 📋 使用指南

### 1. 克隆仓库
- 进入项目页面
- 点击"克隆仓库"
- 输入Git URL和可选的本地路径

### 2. 配置AI提供商
- 进入AI设置页面
- 选择您偏好的AI提供商
- 输入API密钥并测试连接
- 保存设置

### 3. 分析项目
- 从项目页面选择一个项目
- 询问关于代码库的问题
- 获取AI驱动的洞察

### 4. MCP扩展
- 进入MCP设置页面
- 添加自定义MCP服务器以扩展功能

## 🔧 API端点

### Git操作
- `POST /api/git/clone` - 克隆仓库
- `GET /api/git/projects` - 列出项目
- `GET /api/git/projects/{path}` - 获取项目概览

### AI操作
- `GET /api/ai/providers` - 列出可用AI提供商
- `POST /api/ai/chat` - 发送聊天消息
- `POST /api/ai/test-connection` - 测试AI提供商连接

### 项目分析
- `POST /api/projects/{path}/analyze` - 使用AI分析项目

### MCP管理
- `GET /api/mcp/servers` - 列出MCP服务器
- `POST /api/mcp/servers` - 添加MCP服务器
- `DELETE /api/mcp/servers/{name}` - 移除MCP服务器

## 🤖 支持的AI提供商

- **OpenAI**: GPT-4、GPT-4o、GPT-4o-mini
- **Anthropic**: Claude 3.5 Sonnet、Claude 3.7 Sonnet
- **Google Gemini**: Gemini 2.5 Pro、Gemini 2.5 Flash
- **DeepSeek**: DeepSeek Chat、DeepSeek Reasoner
- **Ollama**: 本地模型（Llama 3.3、Qwen 2.5 Coder等）

## 🛠️ 开发

### 后端开发
```bash
cd backend
python -m uvicorn app.main:app --reload
```

### 前端开发
```bash
cd frontend
npm run dev
```

### 生产构建
```bash
# 后端
cd backend
pip install -r requirements.txt

# 前端
cd frontend
npm run build
```

## 🤝 贡献

1. Fork 仓库
2. 创建功能分支
3. 进行更改
4. 添加测试
5. 提交Pull Request

## 📄 许可证

MIT许可证 - 详见LICENSE文件

## 🌐 访问地址

- 前端界面: http://localhost:5173
- 后端API: http://localhost:8000
- API文档: http://localhost:8000/docs
