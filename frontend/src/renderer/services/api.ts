import axios from 'axios'

const API_BASE_URL = 'http://localhost:8000'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
})

export const api = {
  // Git operations
  async cloneRepository(url: string, path?: string) {
    const response = await apiClient.post('/api/git/clone', { url, path })
    return response.data
  },

  async getProjects() {
    const response = await apiClient.get('/api/git/projects')
    return response.data
  },

  async getProjectOverview(path: string) {
    const response = await apiClient.get(`/api/git/projects/${encodeURIComponent(path)}`)
    return response.data
  },

  async getProjectStructure(path: string, maxDepth = 3) {
    const response = await apiClient.get(`/api/projects/${encodeURIComponent(path)}/structure?max_depth=${maxDepth}`)
    return response.data
  },

  async getFileContent(projectPath: string, filePath: string) {
    const response = await apiClient.post('/api/git/projects/file', {
      path: projectPath,
      file_path: filePath
    })
    return response.data
  },

  // 项目管理功能
  async deleteProject(projectPath: string) {
    const response = await apiClient.delete(`/api/git/projects/${encodeURIComponent(projectPath)}`)
    return response.data
  },

  async pullUpdates(projectPath: string) {
    const response = await apiClient.post(`/api/git/projects/${encodeURIComponent(projectPath)}/pull`)
    return response.data
  },

  async getProjectStatus(projectPath: string) {
    const response = await apiClient.get(`/api/git/projects/${encodeURIComponent(projectPath)}/status`)
    return response.data
  },

  // AI operations
  async getAIProviders() {
    const response = await apiClient.get('/api/ai/providers')
    return response.data
  },

  async testAIConnection(provider: string, apiKey: string, baseUrl?: string) {
    const response = await apiClient.post('/api/ai/test-connection', {
      provider,
      api_key: apiKey,
      base_url: baseUrl
    })
    return response.data
  },

  async chatWithAI(provider: string, model: string, messages: any[], apiKey: string, options = {}) {
    const response = await apiClient.post('/api/ai/chat', {
      provider,
      model,
      messages,
      api_key: apiKey,
      ...options
    })
    return response.data
  },

  async analyzeProject(projectPath: string, query: string, provider: string, model: string, apiKey: string) {
    const response = await apiClient.post(`/api/projects/${encodeURIComponent(projectPath)}/analyze`, {
      project_path: projectPath,
      query,
      provider,
      model,
      api_key: apiKey
    })
    return response.data
  },

  // MCP operations
  async getMCPServers() {
    const response = await apiClient.get('/api/mcp/servers')
    return response.data
  },

  async addMCPServer(config: any) {
    const response = await apiClient.post('/api/mcp/servers', config)
    return response.data
  },

  async removeMCPServer(name: string) {
    const response = await apiClient.delete(`/api/mcp/servers/${name}`)
    return response.data
  }
}
