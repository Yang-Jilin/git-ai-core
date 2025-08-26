import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { api } from '../../services/api'

interface GitHubConfig {
  access_token: string
}

export const GitHubSettings: React.FC = () => {
  const [accessToken, setAccessToken] = useState('')
  const [isTesting, setIsTesting] = useState(false)

  const queryClient = useQueryClient()

  const { data: config, isLoading: isLoadingConfig } = useQuery<GitHubConfig>({
    queryKey: ['github-config'],
    queryFn: () => api.getGitHubConfig(),
    enabled: false // 手动触发
  })

  const { data: status, refetch: refetchStatus } = useQuery({
    queryKey: ['github-status'],
    queryFn: () => api.getGitHubStatus(),
    enabled: false // 手动触发
  })

  useEffect(() => {
    // 加载配置和状态
    queryClient.fetchQuery({ queryKey: ['github-config'] })
    queryClient.fetchQuery({ queryKey: ['github-status'] })
  }, [queryClient])

  useEffect(() => {
    if (config?.access_token) {
      setAccessToken(config.access_token)
    }
  }, [config])

  const testConnectionMutation = useMutation({
    mutationFn: (token: string) => api.testGitHubConnection(token),
    onSuccess: (result) => {
      setIsTesting(false)
      if (result.success) {
        toast.success(`连接成功！用户: ${result.user?.login || '未知'}`)
      } else {
        toast.error(result.error || '连接失败')
      }
    },
    onError: (error: any) => {
      setIsTesting(false)
      toast.error(error.response?.data?.detail || '连接测试失败')
    }
  })

  const saveConfigMutation = useMutation({
    mutationFn: (token: string) => api.saveGitHubConfig(token),
    onSuccess: (result) => {
      if (result.success) {
        toast.success('配置保存成功！')
        // 重新加载状态
        queryClient.invalidateQueries({ queryKey: ['github-status'] })
        queryClient.invalidateQueries({ queryKey: ['github-config'] })
      } else {
        toast.error(result.message || '配置保存失败')
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || '配置保存失败')
    }
  })

  const handleTestConnection = async () => {
    if (!accessToken.trim()) {
      toast.error('请输入GitHub Access Token')
      return
    }

    setIsTesting(true)
    testConnectionMutation.mutate(accessToken)
  }

  const handleSave = async () => {
    if (!accessToken.trim()) {
      toast.error('请输入GitHub Access Token')
      return
    }

    saveConfigMutation.mutate(accessToken)
  }

  const handleClear = () => {
    setAccessToken('')
    toast.success('已清空Access Token')
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">GitHub设置</h1>
        <p className="mt-2 text-gray-600">配置GitHub API访问权限</p>
      </div>

      <div className="max-w-2xl">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">GitHub配置</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                GitHub Personal Access Token
              </label>
              <input
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="输入您的GitHub Personal Access Token"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                需要获取GitHub API访问权限。请前往GitHub设置创建Personal Access Token。
              </p>
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                onClick={handleTestConnection}
                disabled={isTesting || !accessToken.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {isTesting ? '测试中...' : '测试连接'}
              </button>
              <button
                onClick={handleSave}
                disabled={saveConfigMutation.isPending || !accessToken.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {saveConfigMutation.isPending ? '保存中...' : '保存设置'}
              </button>
              <button
                onClick={handleClear}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                清空
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">当前状态</h2>
          
          {isLoadingConfig ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-500">加载中...</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">配置状态:</span>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  status?.configured 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {status?.configured ? '已配置' : '未配置'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">热门项目缓存:</span>
                <span className="text-sm text-gray-600">
                  {status?.trending_count || 0} 个项目
                </span>
              </div>

              {status?.configured && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Access Token:</span>
                  <span className="text-sm text-gray-600 truncate max-w-xs">
                    {status.access_token ? '••••••••' + status.access_token.slice(-4) : '无'}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 bg-blue-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">使用说明</h3>
          <div className="space-y-2 text-sm text-blue-800">
            <p>1. 前往 <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="underline">GitHub设置页面</a> 创建Personal Access Token</p>
            <p>2. 选择适当的权限范围（建议勾选repo权限）</p>
            <p>3. 复制生成的token并粘贴到上方输入框</p>
            <p>4. 点击"测试连接"验证token有效性</p>
            <p>5. 点击"保存设置"保存配置</p>
          </div>
        </div>
      </div>
    </div>
  )
}
