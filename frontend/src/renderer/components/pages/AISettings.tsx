import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { api } from '../../services/api'

interface AIProvider {
  name: string
  icon: string
  description: string
  models: string[]
  default_base_url: string
  requires_api_key: boolean
}

export const AISettings: React.FC = () => {
  const [selectedProvider, setSelectedProvider] = useState<string>('')
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [selectedModel, setSelectedModel] = useState('')

  const { data: providers = {} } = useQuery<Record<string, AIProvider>>({
    queryKey: ['ai-providers'],
    queryFn: () => api.getAIProviders()
  })

  const handleTestConnection = async () => {
    if (!selectedProvider || !apiKey) {
      toast.error('请选择提供商并输入API密钥')
      return
    }

    try {
      const result = await api.testAIConnection(selectedProvider, apiKey, baseUrl || undefined)
      if (result.success) {
        toast.success('连接成功！')
      } else {
        toast.error(result.error || '连接失败')
      }
    } catch (error) {
      toast.error('连接测试失败')
    }
  }

  const handleSave = () => {
    // 保存设置到localStorage
    localStorage.setItem('ai-provider', selectedProvider)
    localStorage.setItem('ai-model', selectedModel)
    localStorage.setItem('ai-api-key', apiKey)
    localStorage.setItem('ai-base-url', baseUrl)
    toast.success('设置已保存！')
  }

  const providerList = Object.entries(providers).map(([key, provider]) => ({
    key,
    ...provider
  }))

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">AI设置</h1>
        <p className="mt-2 text-gray-600">配置您的AI提供商和模型</p>
      </div>

      <div className="max-w-2xl">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">提供商配置</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                选择提供商
              </label>
              <select
                value={selectedProvider}
                onChange={(e) => {
                  setSelectedProvider(e.target.value)
                  setSelectedModel('')
                  setBaseUrl(providers[e.target.value]?.default_base_url || '')
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">选择提供商</option>
                {providerList.map((provider) => (
                  <option key={provider.key} value={provider.key}>
                    {provider.icon} {provider.name} - {provider.description}
                  </option>
                ))}
              </select>
            </div>

            {selectedProvider && providers[selectedProvider] && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    模型
                  </label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">选择模型</option>
                    {providers[selectedProvider].models.map((model: string) => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                </div>

                {providers[selectedProvider].requires_api_key && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      API密钥
                    </label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="输入您的API密钥"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    基础URL（可选）
                  </label>
                  <input
                    type="url"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder={providers[selectedProvider].default_base_url}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={handleTestConnection}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    测试连接
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    保存设置
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="mt-6 bg-blue-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">可用提供商</h3>
          <div className="space-y-2 text-sm text-blue-800">
            {providerList.map((provider) => (
              <div key={provider.key} className="flex items-center">
                <span className="mr-2">{provider.icon}</span>
                <span>{provider.name}: {provider.description}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
