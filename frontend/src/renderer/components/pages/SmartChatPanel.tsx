import React, { useState, useRef, useEffect, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import { 
  PaperAirplaneIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  CodeBracketIcon,
  FolderIcon,
  CheckCircleIcon,
  XCircleIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { api } from '../../services/api'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  toolCalls?: ToolCall[]
}

interface ToolCall {
  id: string
  toolName: string
  arguments: any
  result?: any
  status: 'pending' | 'success' | 'error'
  reason?: string
}

interface SmartChatPanelProps {
  projectPath: string
  fileTree: any
  onFilePreview: (filePath: string, content: string) => void
}

export const SmartChatPanel: React.FC<SmartChatPanelProps> =({
  projectPath,
  fileTree,
  onFilePreview
}) => {
  // 从sessionStorage加载对话状态
  const loadConversationState = useCallback(() => {
    try {
      const storageKey = `git-ai-chat-${projectPath}`
      const saved = sessionStorage.getItem(storageKey)
      if (saved) {
        const state = JSON.parse(saved)
        
        // 将字符串timestamp转换回Date对象
        const messagesWithDate = state.messages?.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })) || []
        
        return {
          messages: messagesWithDate,
          conversationId: state.conversationId || '',
          isInitialized: state.isInitialized || false
        }
      }
    } catch (error) {
      console.error('Failed to load conversation state:', error)
    }
    return {
      messages: [],
      conversationId: '',
      isInitialized: false
    }
  }, [projectPath])

  // 保存对话状态到sessionStorage
  const saveConversationState = useCallback((state: {
    messages: Message[]
    conversationId: string
    isInitialized: boolean
  }) => {
    try {
      const storageKey = `git-ai-chat-${projectPath}`
      sessionStorage.setItem(storageKey, JSON.stringify({
        messages: state.messages,
        conversationId: state.conversationId,
        isInitialized: state.isInitialized,
        timestamp: Date.now()
      }))
    } catch (error) {
      console.error('Failed to save conversation state:', error)
    }
  }, [projectPath])

  const [messages, setMessages] = useState<Message[]>(() => {
    const state = loadConversationState()
    return state.messages
  })
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string>(() => {
    const state = loadConversationState()
    return state.conversationId
  })
  const [isInitialized, setIsInitialized] = useState<boolean>(() => {
    const state = loadConversationState()
    return state.isInitialized
  })
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // 初始化对话
  const initializeConversation = async () => {
    try {
      setIsLoading(true)
      const response = await api.startSmartConversation(projectPath)
      setConversationId(response.conversation_id)
      
      // 添加系统欢迎消息
      const welcomeMessage: Message = {
        id: `sys-${Date.now()}`,
        role: 'system',
        content: `🤖 **智能项目分析助手已就绪**\n\n我可以帮您：\n• 分析项目架构和技术栈\n• 理解代码结构和依赖关系\n• 解释配置文件和文档\n• 提供项目概览和改进建议\n\n请告诉我您想了解什么？`,
        timestamp: new Date()
      }
      
      setMessages([welcomeMessage])
      setIsInitialized(true)
      
      // 保存状态
      saveConversationState({
        messages: [welcomeMessage],
        conversationId: response.conversation_id,
        isInitialized: true
      })
    } catch (error) {
      console.error('初始化对话失败:', error)
      toast.error('初始化对话失败')
      
      // 添加错误消息
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'system',
        content: '❌ 无法初始化智能对话，请检查网络连接和API配置',
        timestamp: new Date()
      }
      setMessages([errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  // 发送消息
  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !isInitialized) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      const response = await api.smartChat(
        conversationId,
        inputMessage,
        projectPath
      )

      // 处理工具调用
      const toolCalls: ToolCall[] = response.tool_calls?.map((call: any, index: number) => ({
        id: `tool-${Date.now()}-${index}`,
        toolName: call.tool_name,
        arguments: call.arguments,
        result: call.result,
        status: call.result?.success ? 'success' : 'error',
        reason: call.reason
      })) || []

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.response,
        timestamp: new Date(),
        toolCalls
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('发送消息失败:', error)
      toast.error('发送消息失败')
      
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'system',
        content: '❌ 发送消息失败，请检查网络连接',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // 自动调整文本区域高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [inputMessage])

  // 自动保存对话状态
  useEffect(() => {
    saveConversationState({
      messages,
      conversationId,
      isInitialized
    })
  }, [messages, conversationId, isInitialized, saveConversationState])

  // 渲染消息内容
  const renderMessageContent = (message: Message) => {
    if (message.role === 'system') {
      return (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {message.content}
          </ReactMarkdown>
        </div>
      )
    }

    return (
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {message.content}
      </ReactMarkdown>
    )
  }

  // 渲染工具调用
  const renderToolCalls = (toolCalls: ToolCall[]) => {
    return (
      <div className="mt-2 space-y-2">
        {toolCalls.map((toolCall) => (
          <div key={toolCall.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <DocumentTextIcon className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">
                  {toolCall.toolName}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                {toolCall.status === 'success' && (
                  <CheckCircleIcon className="w-4 h-4 text-green-500" />
                )}
                {toolCall.status === 'error' && (
                  <XCircleIcon className="w-4 h-4 text-red-500" />
                )}
                {toolCall.status === 'pending' && (
                  <ArrowPathIcon className="w-4 h-4 text-blue-500 animate-spin" />
                )}
              </div>
            </div>
            
            {toolCall.reason && (
              <p className="text-xs text-gray-500 mb-2">{toolCall.reason}</p>
            )}
            
            {toolCall.result && (
              <div className="text-xs text-gray-600">
                {toolCall.result.success ? (
                  <span className="text-green-600">✓ 操作成功</span>
                ) : (
                  <span className="text-red-600">✗ 操作失败</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 聊天消息区域 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !isInitialized && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <SparklesIcon className="w-12 h-12 mb-4 text-blue-500" />
            <h3 className="text-lg font-medium mb-2">智能项目分析</h3>
            <p className="text-sm text-center mb-4">
              点击开始按钮初始化智能对话，分析您的项目
            </p>
            <button
              onClick={initializeConversation}
              disabled={isLoading}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
            >
              {isLoading ? '初始化中...' : '开始对话'}
            </button>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id} className="message-container">
            <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-3xl ${message.role === 'user' ? 'bg-blue-100' : 'bg-gray-100'} rounded-lg p-4`}>
                <div className="flex items-center mb-2">
                  <div className={`w-2 h-2 rounded-full mr-2 ${
                    message.role === 'user' ? 'bg-blue-500' : 
                    message.role === 'assistant' ? 'bg-green-500' : 'bg-gray-500'
                  }`} />
                  <span className="text-xs font-medium text-gray-500">
                    {message.role === 'user' ? '您' : 
                     message.role === 'assistant' ? '助手' : '系统'}
                  </span>
                  <span className="text-xs text-gray-400 ml-2">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                
                <div className="message-content">
                  {renderMessageContent(message)}
                </div>

                {message.toolCalls && message.toolCalls.length > 0 && (
                  <div className="mt-3">
                    {renderToolCalls(message.toolCalls)}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-3xl bg-gray-100 rounded-lg p-4">
              <div className="flex items-center">
                <ArrowPathIcon className="w-4 h-4 text-blue-500 animate-spin mr-2" />
                <span className="text-sm text-gray-500">思考中...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div className="border-t border-gray-200 p-4 bg-white">
        <div className="flex items-end space-x-3">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isInitialized ? "输入您的问题..." : "请先初始化对话..."}
              disabled={!isInitialized || isLoading}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              rows={1}
              style={{ minHeight: '44px' }}
            />
          </div>
          
          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isLoading || !isInitialized}
            className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <ArrowPathIcon className="w-5 h-5 animate-spin" />
            ) : (
              <PaperAirplaneIcon className="w-5 h-5" />
            )}
          </button>
        </div>
        
        <div className="mt-2 text-xs text-gray-500">
          {isInitialized ? "按 Enter 发送，Shift + Enter 换行" : "请先点击开始对话按钮"}
        </div>
      </div>
    </div>
  )
}
