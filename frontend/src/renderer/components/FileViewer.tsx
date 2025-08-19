import React from 'react'
import { DocumentTextIcon, ArrowDownTrayIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline'

interface FileViewerProps {
  fileName: string
  fileContent: string
  filePath: string
  onClose: () => void
}

export const FileViewer: React.FC<FileViewerProps> = ({
  fileName,
  fileContent,
  filePath,
  onClose
}) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(fileContent)
  }

  const handleDownload = () => {
    const blob = new Blob([fileContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
  }

  const formatFileSize = (content: string) => {
    const bytes = new Blob([content]).size
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const formatLineCount = (content: string) => {
    return content.split('\n').length
  }

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* 文件头部信息 */}
      <div className="border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <DocumentTextIcon className="h-5 w-5 text-gray-400" />
            <div>
              <h3 className="text-sm font-medium text-gray-900">{fileName}</h3>
              <p className="text-xs text-gray-500">{filePath}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">
              {formatLineCount(fileContent)} lines · {formatFileSize(fileContent)}
            </span>
            <button
              onClick={handleCopy}
              className="p-1 text-gray-400 hover:text-gray-600"
              title="复制代码"
            >
              <ClipboardDocumentIcon className="h-4 w-4" />
            </button>
            <button
              onClick={handleDownload}
              className="p-1 text-gray-400 hover:text-gray-600"
              title="下载文件"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              关闭
            </button>
          </div>
        </div>
      </div>

      {/* 文件内容 */}
      <div className="overflow-auto max-h-96">
        <pre className="bg-gray-50 p-4 text-sm">
          <code className="text-gray-800 whitespace-pre-wrap font-mono">
            {fileContent}
          </code>
        </pre>
      </div>
    </div>
  )
}
