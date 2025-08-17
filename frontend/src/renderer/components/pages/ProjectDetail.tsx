import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { FolderIcon, CodeBracketIcon } from '@heroicons/react/24/outline'
import { api } from '../../services/api'

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
}

interface FileTreeNode {
  type: 'file' | 'directory'
  name: string
  children?: FileTreeNode[]
  size?: number
  extension?: string
}

interface ProjectStructure {
  file_tree: FileTreeNode
}

export const ProjectDetail: React.FC = () => {
  const { path } = useParams<{ path: string }>()
  const [analysisQuery, setAnalysisQuery] = useState('')
  const [analysisResult, setAnalysisResult] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const decodedPath = decodeURIComponent(path || '')

  const { data: project, isLoading } = useQuery<Project>({
    queryKey: ['project', decodedPath],
    queryFn: () => api.getProjectOverview(decodedPath),
    enabled: !!decodedPath
  })

  const { data: structure } = useQuery<ProjectStructure>({
    queryKey: ['project-structure', decodedPath],
    queryFn: () => api.getProjectStructure(decodedPath),
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

  const renderFileTree = (node: FileTreeNode, level = 0) => {
    const indent = level * 20
    if (node.type === 'file') {
      return (
        <div key={node.name} className="flex items-center py-1" style={{ paddingLeft: indent }}>
          <CodeBracketIcon className="h-4 w-4 text-gray-400 mr-2" />
          <span className="text-sm">{node.name}</span>
        </div>
      )
    }
    
    return (
      <div key={node.name}>
        <div className="flex items-center py-1" style={{ paddingLeft: indent }}>
          <FolderIcon className="h-4 w-4 text-blue-500 mr-2" />
          <span className="text-sm font-medium">{node.name}</span>
        </div>
        {node.children?.map((child) => renderFileTree(child, level + 1))}
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">{project.info?.name}</h1>
        <p className="mt-1 text-gray-600">{project.info?.path}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* 项目信息 */}
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

          {/* 文件结构 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">文件结构</h2>
            <div className="border rounded-lg p-4 max-h-96 overflow-y-auto">
              {structure?.file_tree && renderFileTree(structure.file_tree)}
            </div>
          </div>

          {/* AI分析 */}
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
          {/* 最近提交 */}
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

          {/* 分支 */}
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
