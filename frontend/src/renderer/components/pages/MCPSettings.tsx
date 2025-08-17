import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import { api } from '../../services/api'

interface MCPServer {
  name: string
  command: string
  args?: string[]
  env?: Record<string, string>
  description?: string
}

export const MCPSettings: React.FC = () => {
  const [showAddModal, setShowAddModal] = useState(false)
  const [newServer, setNewServer] = useState<MCPServer>({
    name: '',
    command: '',
    args: [],
    env: {},
    description: ''
  })

  const queryClient = useQueryClient()

  const { data: servers = {} } = useQuery<Record<string, MCPServer>>({
    queryKey: ['mcp-servers'],
    queryFn: () => api.getMCPServers()
  })

  const addMutation = useMutation({
    mutationFn: (server: MCPServer) => api.addMCPServer(server),
    onSuccess: () => {
      toast.success('MCP服务器添加成功！')
      queryClient.invalidateQueries({ queryKey: ['mcp-servers'] })
      setNewServer({ name: '', command: '', args: [], env: {}, description: '' })
      setShowAddModal(false)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'MCP服务器添加失败')
    }
  })

  const removeMutation = useMutation({
    mutationFn: (name: string) => api.removeMCPServer(name),
    onSuccess: () => {
      toast.success('MCP服务器移除成功！')
      queryClient.invalidateQueries({ queryKey: ['mcp-servers'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'MCP服务器移除失败')
    }
  })

  const handleAddServer = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newServer.name || !newServer.command) {
      toast.error('请填写名称和命令')
      return
    }
    addMutation.mutate(newServer)
  }

  const serverList = Object.entries(servers || {}).map(([serverName, config]) => ({
    name: serverName,
    command: config.command,
    args: config.args,
    env: config.env,
    description: config.description
  }))

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">MCP设置</h1>
          <p className="mt-1 text-gray-600">管理MCP服务器和工具</p>
        </div>
        
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          添加服务器
        </button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">MCP服务器</h2>
        </div>
        
        {serverList.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-gray-500">暂无MCP服务器配置</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {serverList.map((server) => (
              <div key={server.name} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">{server.name}</h3>
                    <p className="text-sm text-gray-500">{server.description || '无描述'}</p>
                    <div className="mt-2">
                      <p className="text-xs text-gray-600">
                        <span className="font-medium">命令:</span> {server.command}
                      </p>
                      {server.args && server.args.length > 0 && (
                        <p className="text-xs text-gray-600">
                          <span className="font-medium">参数:</span> {server.args.join(' ')}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => removeMutation.mutate(server.name)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 添加服务器模态框 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">添加MCP服务器</h2>
            
            <form onSubmit={handleAddServer}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    服务器名称
                  </label>
                  <input
                    type="text"
                    value={newServer.name}
                    onChange={(e) => setNewServer({ ...newServer, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    命令
                  </label>
                  <input
                    type="text"
                    value={newServer.command}
                    onChange={(e) => setNewServer({ ...newServer, command: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    参数（逗号分隔）
                  </label>
                  <input
                    type="text"
                    value={newServer.args?.join(', ') || ''}
                    onChange={(e) => setNewServer({ 
                      ...newServer, 
                      args: e.target.value.split(',').map(s => s.trim()).filter(s => s) 
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    描述
                  </label>
                  <input
                    type="text"
                    value={newServer.description || ''}
                    onChange={(e) => setNewServer({ ...newServer, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button
                  type="submit"
                  disabled={addMutation.isPending}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {addMutation.isPending ? '添加中...' : '添加服务器'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
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
