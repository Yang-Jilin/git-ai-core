import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { Link } from 'react-router-dom'
import { FolderIcon, PlusIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { api } from '../../services/api'

interface Project {
  name: string
  path: string
  current_branch: string
  commits_count: number
  last_commit?: {
    date: string
  }
}

export const Projects: React.FC = () => {
  const [cloneUrl, setCloneUrl] = useState('')
  const [clonePath, setClonePath] = useState('')
  const [showCloneModal, setShowCloneModal] = useState(false)

  const queryClient = useQueryClient()

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: () => api.getProjects()
  })

  const cloneMutation = useMutation({
    mutationFn: ({ url, path }: { url: string; path?: string }) => 
      api.cloneRepository(url, path),
    onSuccess: () => {
      toast.success('仓库克隆成功！')
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setCloneUrl('')
      setClonePath('')
      setShowCloneModal(false)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || '仓库克隆失败')
    }
  })

  const handleClone = (e: React.FormEvent) => {
    e.preventDefault()
    if (!cloneUrl.trim()) {
      toast.error('请输入仓库URL')
      return
    }
    cloneMutation.mutate({ url: cloneUrl, path: clonePath || undefined })
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">项目</h1>
          <p className="mt-1 text-gray-600">管理您的Git仓库</p>
        </div>
        
        <button
          onClick={() => setShowCloneModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          克隆仓库
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <ArrowPathIcon className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-12">
          <FolderIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">暂无项目</h3>
          <p className="text-gray-500 mb-4">通过克隆仓库开始使用</p>
          <button
            onClick={() => setShowCloneModal(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            克隆仓库
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project: Project) => (
            <div key={project.path} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {project.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">{project.path}</p>
                    <div className="space-y-1 text-sm text-gray-500">
                      <p>分支: {project.current_branch}</p>
                      <p>提交数: {project.commits_count}</p>
                      <p>最后更新: {project.last_commit?.date ? new Date(project.last_commit.date).toLocaleDateString() : 'N/A'}</p>
                    </div>
                  </div>
                  <FolderIcon className="h-8 w-8 text-blue-500 flex-shrink-0" />
                </div>
                
                <div className="mt-4 flex space-x-2">
                  <Link
                    to={`/projects/${encodeURIComponent(project.path)}`}
                    className="flex-1 text-center px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                  >
                    查看详情
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 克隆模态框 */}
      {showCloneModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">克隆仓库</h2>
            
            <form onSubmit={handleClone}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  仓库URL
                </label>
                <input
                  type="url"
                  value={cloneUrl}
                  onChange={(e) => setCloneUrl(e.target.value)}
                  placeholder="https://github.com/user/repo.git"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  本地路径（可选）
                </label>
                <input
                  type="text"
                  value={clonePath}
                  onChange={(e) => setClonePath(e.target.value)}
                  placeholder="/path/to/clone"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={cloneMutation.isPending}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {cloneMutation.isPending ? '克隆中...' : '克隆'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCloneModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
