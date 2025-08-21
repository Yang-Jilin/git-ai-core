import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { 
  FolderIcon, 
  DocumentTextIcon, 
  TrashIcon, 
  DocumentChartBarIcon,
  PlayIcon 
} from '@heroicons/react/24/outline'
import { api } from '../../services/api'
import { FileViewer } from '../FileViewer'

interface Project {
  info: {
    name: string
    path: string
    current_branch: string
    commits_count: number
    remote_url?: string
  }
  recent_commits?: Array<{
    hash: string
    message: string
    author: string
    date: string
  }>
  branches?: Array<{
    name: string
    is_active: boolean
  }>
  file_tree?: {
    type: 'file' | 'directory'
    name: string
    children?: any[]
    size?: number
    extension?: string
  }
}

interface FileTreeNode {
  type: 'file' | 'directory'
  name: string
  children?: FileTreeNode[]
  size?: number
  extension?: string
}

export const ProjectDetail: React.FC = () => {
  const { path } = useParams<{ path: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [analysisQuery, setAnalysisQuery] = useState('')
  const [analysisResult, setAnalysisResult] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<string | null>(null)
  const [isLoadingFile, setIsLoadingFile] = useState(false)
  // 添加展开文件夹状态
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({})
  // 一键触发功能状态
  const [isGeneratingArchitecture, setIsGeneratingArchitecture] = useState(false)
  const [architectureResult, setArchitectureResult] = useState('')
  const [isStartingMCP, setIsStartingMCP] = useState(false)
  const [mcpStartResult, setMcpStartResult] = useState('')

  const decodedPath = decodeURIComponent(path || '')

  const { data: project, isLoading } = useQuery<Project>({
    queryKey: ['project', decodedPath],
    queryFn: () => api.getProjectOverview(decodedPath),
    enabled: !!decodedPath
  })

  const handleAnalyze = async () => {
    if (!analysisQuery.trim()) {
      toast.error('请输入查询内容')
      return
    }

    const provider = localStorage.getItem('ai-provider')
    const model = localStorage.getItem('ai-model')
    const apiKey = localStorage.getItem('ai-api-key')

    if (!provider || !model || !apiKey) {
      toast.error('请先配置AI设置')
      return
    }

    setIsAnalyzing(true)
    try {
      const result = await api.analyzeProject(
        decodedPath,
        analysisQuery,
        provider,
        model,
        apiKey
      )
      setAnalysisResult(result.analysis)
    } catch (error) {
      toast.error('项目分析失败')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleDeleteProject = async () => {
    setIsDeleting(true)
    try {
      const result = await api.deleteProject(decodedPath)
      
      if (result.success) {
        toast.success(result.message || '项目删除成功')
        
        queryClient.removeQueries({ queryKey: ['project', decodedPath] })
        
        navigate('/projects')
      } else {
        if (result.manual_action_needed) {
          toast.error(result.error || '删除失败，需要手动操作')
          alert(`删除失败详情：\n${result.details}\n\n请手动删除文件夹：${decodedPath}`)
        } else {
          toast.error(result.error || '删除项目失败')
        }
      }
    } catch (error: any) {
      console.error('删除项目错误:', error)
      const errorMessage = error.response?.data?.detail || error.message || '删除项目失败'
      toast.error(`删除失败: ${errorMessage}`)
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleFileClick = async (filePath: string) => {
    setIsLoadingFile(true)
    try {
      // 清理文件路径：移除项目根目录前缀
      const cleanFilePath = filePath.replace(/^[^\/]+\//, '')
      
      console.log('原始文件路径:', filePath)
      console.log('清理后文件路径:', cleanFilePath)
      
      const result = await api.getFileContent(decodedPath, cleanFilePath)
      setFileContent(result.content)
      setSelectedFile(cleanFilePath)
    } catch (error) {
      console.error('文件读取错误:', error)
      toast.error('无法读取文件内容')
    } finally {
      setIsLoadingFile(false)
    }
  }

  // 添加处理文件夹点击的函数
  const handleFolderClick = (folderPath: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderPath]: !prev[folderPath]
    }))
  }

  // 一键生成架构文档
  const handleGenerateArchitecture = async () => {
    const provider = localStorage.getItem('ai-provider')
    const model = localStorage.getItem('ai-model')
    const apiKey = localStorage.getItem('ai-api-key')

    if (!provider || !model || !apiKey) {
      toast.error('请先配置AI设置')
      return
    }

    setIsGeneratingArchitecture(true)
    try {
      const result = await api.generateArchitectureDocumentation(
        decodedPath,
        provider,
        model,
        apiKey
      )
      setArchitectureResult(result.analysis || result.message || '架构文档生成成功')
      toast.success('架构文档生成成功')
    } catch (error) {
      console.error('生成架构文档失败:', error)
      toast.error('生成架构文档失败')
    } finally {
      setIsGeneratingArchitecture(false)
    }
  }

  // 一键启动MCP服务器
  const handleStartMCPServer = async () => {
    setIsStartingMCP(true)
    try {
      const result = await api.startMCPServer('comment-generator')
      setMcpStartResult(result.message || 'MCP服务器启动成功')
      toast.success('MCP服务器启动成功')
    } catch (error) {
      console.error('启动MCP服务器失败:', error)
      toast.error('启动MCP服务器失败')
    } finally {
      setIsStartingMCP(false)
    }
  }

  // 修改renderFileTree函数
  const renderFileTree = (node: FileTreeNode, level = 0, currentPath = '') => {
    const indent = level * 20
    const fullPath = currentPath ? `${currentPath}/${node.name}` : node.name
    // 根据层级决定默认展开状态：第一级默认展开，其他层级默认不展开
    const isExpanded = level === 0 ? 
      expandedFolders[fullPath] !== false : // 第一级默认展开
      expandedFolders[fullPath] === true;  // 非第一级默认不展开

    if (node.type === 'file') {
      return (
        <div 
          key={fullPath} 
          className="flex items-center py-1 hover:bg-gray-50 cursor-pointer" 
          style={{ paddingLeft: indent }}
          onClick={() => handleFileClick(fullPath)}
        >
          <DocumentTextIcon className="h-4 w-4 text-gray-400 mr-2" />
          <span className="text-sm hover:text-blue-600">{node.name}</span>
        </div>
      );
    }

    return (
      <div key={fullPath}>
        <div 
          className="flex items-center py-1 hover:bg-gray-50 cursor-pointer" 
          style={{ paddingLeft: indent }}
          onClick={() => handleFolderClick(fullPath)}
        >
          <FolderIcon className="h-4 w-4 text-blue-500 mr-2" />
          <span className="text-sm font-medium">{node.name}</span>
          <span className="ml-2 text-xs text-gray-400">
            {isExpanded ? '▼' : '►'}
          </span>
        </div>
        {isExpanded && node.children?.map((child) => 
          renderFileTree(child, level + 1, fullPath)
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-gray-500">项目未找到</p>
        </div>
      </div>
    )
  }

  if (selectedFile && fileContent) {
    return (
      <div className="p-6">
        <div className="mb-4">
          <button
            onClick={() => {
              setSelectedFile(null)
              setFileContent(null)
            }}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            ← 返回文件列表
          </button>
        </div>
        <FileViewer
          fileName={selectedFile.split('/').pop() || ''}
          fileContent={fileContent}
          filePath={selectedFile}
          onClose={() => {
            setSelectedFile(null)
            setFileContent(null)
          }}
        />
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{project.info?.name}</h1>
          <p className="mt-1 text-gray-600">{project.info?.path}</p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isDeleting}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <TrashIcon className="h-4 w-4 mr-2" />
            {isDeleting ? '删除中...' : '删除项目'}
          </button>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">确认删除项目</h3>
            <p className="text-gray-600 mb-4">
              确定要删除 <span className="font-bold">{project.info?.name}</span> 吗？
            </p>
            <p className="text-sm text-gray-500 mb-6">
              这将同时删除：
              <br />• 数据库中的记录
              <br />• 本地文件夹
              <br />• 此操作不可撤销
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                取消
              </button>
              <button
                onClick={handleDeleteProject}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">项目信息</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">仓库:</span> {project.info?.name}
              </div>
              <div>
                <span className="font-medium">分支:</span> {project.info?.current_branch}
              </div>
              <div>
                <span className="font-medium">提交数:</span> {project.info?.commits_count}
              </div>
              <div>
                <span className="font-medium">远程:</span> {project.info?.remote_url || '无'}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">文件结构</h2>
            {isLoadingFile && (
              <div className="flex justify-center items-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            )}
            <div className="border rounded-lg p-4 max-h-96 overflow-y-auto">
              {project?.file_tree && renderFileTree(project.file_tree)}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">AI分析</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  询问关于此项目的问题
                </label>
                <textarea
                  value={analysisQuery}
                  onChange={(e) => setAnalysisQuery(e.target.value)}
                  placeholder="例如：这个项目的主要目的是什么？代码是如何组织的？"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
              
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isAnalyzing ? '分析中...' : '分析'}
              </button>

              {analysisResult && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">分析结果</h3>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">
                    {analysisResult}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* 一键触发功能 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">一键功能</h2>
            <div className="space-y-3">
              <button
                onClick={handleGenerateArchitecture}
                disabled={isGeneratingArchitecture}
                className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                <DocumentChartBarIcon className="h-4 w-4 mr-2" />
                {isGeneratingArchitecture ? '生成中...' : '生成架构文档'}
              </button>
              
              <button
                onClick={handleStartMCPServer}
                disabled={isStartingMCP}
                className="w-full flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
              >
                <PlayIcon className="h-4 w-4 mr-2" />
                {isStartingMCP ? '启动中...' : '启动MCP服务器'}
              </button>
            </div>
            
            {architectureResult && (
              <div className="mt-4 p-3 bg-green-50 rounded-lg">
                <h3 className="text-sm font-medium text-green-900 mb-1">架构文档结果</h3>
                <div className="text-sm text-green-700 whitespace-pre-wrap">
                  {architectureResult}
                </div>
              </div>
            )}
            
            {mcpStartResult && (
              <div className="mt-4 p-3 bg-purple-50 rounded-lg">
                <h3 className="text-sm font-medium text-purple-900 mb-1">MCP服务器状态</h3>
                <div className="text-sm text-purple-700 whitespace-pre-wrap">
                  {mcpStartResult}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">最近提交</h2>
            <div className="space-y-3">
              {project.recent_commits?.slice(0, 5).map((commit) => (
                <div key={commit.hash} className="border-l-4 border-blue-500 pl-3">
                  <p className="text-sm font-medium text-gray-900">{commit.message}</p>
                  <p className="text-xs text-gray-500">
                    {commit.author} • {new Date(commit.date).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">分支</h2>
            <div className="space-y-2">
              {project.branches?.map((branch) => (
                <div key={branch.name} className="flex items-center justify-between">
                  <span className={`text-sm ${branch.is_active ? 'font-bold text-blue-600' : 'text-gray-700'}`}>
                    {branch.name}
                  </span>
                  {branch.is_active && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">活跃</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
