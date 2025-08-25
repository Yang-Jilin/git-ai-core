import React, { useState, useRef, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { DocumentTextIcon, ArrowPathIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline'
import { api } from '../../services/api'

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
}

interface SmartChatPanelProps {
  projectPath: string
  fileTree: any
  onFilePreview: (filePath: string, content: string) => void
}

export const SmartChatPanel: React.FC<SmartChatPanelProps> = ({
  projectPath,
  fileTree,
  onFilePreview
}) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [conversationId, setConversationId] = useState<string>('')

  // 滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // 初始化对话
  const initializeConversation = async () => {
    try {
      const response = await api.startSmartConversation(projectPath)
      setConversationId(response.conversation_id)
      
      setMessages([{
        id: '1',
        role: 'system',
        content: '智能分析对话已就绪，我可以帮您分析项目架构、代码结构、技术栈等问题。请告诉我您想了解什么？',
        timestamp: new Date()
      }])
    } catch (error) {
      toast.error('初始化对话失败')
    }
  }

  // 发送消息
  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
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

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.response,
        timestamp: new Date(),
        toolCalls: response.tool_calls?.map((call: any) => ({
          id: call.id,
          toolName: call.tool_name,
          arguments: call.arguments,
          status: 'success',
          result: call.result
        }))
      }

      setMessages(prev => [...prev, assistantMessage])

      // 如果有文件读取操作，触发文件预览
      if (response.tool_calls) {
        response.tool_calls.forEach((call: any) => {
          if (call.tool_name === 'read_project_file' && call.result?.content) {
            onFilePreview(call.arguments.file_path, call.result.content)
          }
        })
      }

    } catch (error) {
      toast.error('发送消息失败')
      setMessages(prev => prev.filter(msg => msg.id !== userMessage.id))
    } finally {
      setIsLoading(false)
    }
  }

  // 渲染工具调用记录
  const renderToolCalls = (toolCalls: ToolCall[]) => {
    return (
      <div className="mt-2 space-y-2">
        {toolCalls.map((call) => (
          <div key={call.id} className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <div className="flex items-center text-sm text-blue-700 mb-1">
              <DocumentTextIcon className="h-4 w-4 mr-1" />
              <span className="font-medium">工具调用: {call.toolName}</span>
            </div>
            {call.arguments && (
              <div className="text-xs text-blue-600 mb-1">
                参数: {JSON.stringify(call.arguments)}
              </div>
            )}
            {call.result && (
              <div className="text-xs text-green-600">
                结果: {typeof call.result === 'string' ? call.result : '调用成功'}
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  // 渲染消息内容
  const renderMessageContent = (message: Message) => {
    if (message.role === 'system') {
      return (
        <div className="bg-gray-100 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center text-sm text-gray-600 mb-2">
            <ChatBubbleLeftRightIcon className="h-4 w-4 mr-1" />
            <span>系统提示</span>
          </div>
          <div className="text-sm text-gray-800">{message.content}</div>
        </div>
      )
    }

    return (
      <div className={`p-3 rounded-lg ${
        message.role === 'user' 
          ? 'bg-blue-100 border border-blue-200 ml-8' 
          : 'bg-white border border-gray-200 mr-8'
      }`}>
        <div className="text-sm mb-2">
          {message.content}
        </div>
        {message.toolCalls && message.toolCalls.length > 0 && renderToolCalls(message.toolCalls)}
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <ChatBubbleLeftRightIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">智能项目分析</h3>
            <p className="text-gray-500 mb-4">
              我可以帮您深入分析项目架构、代码结构和技术栈
            </p>
            <button
              onClick={initializeConversation}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              开始对话
            </button>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {renderMessageContent(message)}
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center text-sm text-gray-600">
                    <ArrowPathIcon className="h-4 w-4 animate-spin mr-2" />
                    思考中...
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* 输入框 */}
      {messages.length > 0 && (
        <div className="border-t border-gray-200 p-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="输入您的问题..."
              disabled={isLoading}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !inputMessage.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              发送
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
