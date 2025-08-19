import React, { useRef, useEffect, useState } from 'react'
import { DocumentTextIcon, ArrowDownTrayIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline'
import Editor from '@monaco-editor/react'
import { editor } from 'monaco-editor'
import MarkdownIt from 'markdown-it'
// 引入github-markdown-css样式 - 修改为浅色主题
import 'github-markdown-css'
// 引入highlight.js用于代码块语法高亮
import hljs from 'highlight.js'
// 将不存在的github-light.css改为github.css
import 'highlight.js/styles/github.css'

type IStandaloneCodeEditor = editor.IStandaloneCodeEditor

interface FileViewerProps {
  fileName: string
  fileContent: string
  filePath: string
  onClose: () => void
}

export const FileViewer: React.FC<FileViewerProps> = ({ fileName, fileContent, filePath, onClose }) => {
  const editorRef = useRef<IStandaloneCodeEditor | null>(null)
  const [markdownHtml, setMarkdownHtml] = useState('')
  const isMarkdown = fileName.toLowerCase().endsWith('.md')

  // 初始化Markdown解析器
  const md = new MarkdownIt({
    html: true,
    breaks: true,
    linkify: true,
    highlight: function (str, lang) {
      if (lang && hljs.getLanguage(lang)) {
        try {
          return hljs.highlight(str, { language: lang }).value;
        } catch (__) {}
      }

      return ''; // 使用默认处理
    }
  })

  // 当文件内容变化时解析Markdown
  useEffect(() => {
    if (isMarkdown) {
      setMarkdownHtml(md.render(fileContent))
    }
  }, [fileContent, isMarkdown])

  // 使用onMount回调获取编辑器实例
  const handleEditorMount = (editor: IStandaloneCodeEditor) => {
    editorRef.current = editor
  }

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

  // 根据文件扩展名确定语言
  const getLanguage = () => {
    const ext = fileName.split('.').pop()?.toLowerCase() || ''
    switch (ext) {
      case 'ts':
      case 'tsx':
        return 'typescript'
      case 'js':
      case 'jsx':
        return 'javascript'
      case 'html':
        return 'html'
      case 'css':
        return 'css'
      case 'scss':
      case 'sass':
        return 'scss'
      case 'json':
        return 'json'
      case 'md':
        return 'markdown'
      case 'py':
        return 'python'
      case 'java':
        return 'java'
      case 'c':
      case 'cpp':
      case 'cc':
      case 'cxx':
        return 'cpp'
      case 'h':
      case 'hpp':
        return 'cpp'
      case 'go':
        return 'go'
      case 'rs':
        return 'rust'
      case 'php':
        return 'php'
      case 'rb':
        return 'ruby'
      case 'sh':
        return 'shell'
      case 'sql':
        return 'sql'
      default:
        return 'plaintext'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg flex flex-col h-full">
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

      {/* 文件内容 - 根据文件类型决定单栏或双栏布局 */}
      <div className="flex-1 overflow-hidden">
        {isMarkdown ? (
          <div className="flex h-full w-full">
            {/* 左侧Markdown源码 */}
            <div className="w-1/2 border-r border-gray-200 overflow-hidden">
              <Editor
                value={fileContent}
                language={getLanguage()}
                theme="vs-light"
                options={{
                  readOnly: true,
                  minimap: { enabled: true },
                  scrollBeyondLastLine: false,
                  fontSize: 14,
                  lineNumbers: 'on',
                  scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
                  automaticLayout: true
                }}
                height="100%"
                width="100%"
                onMount={handleEditorMount}
              />
            </div>
            {/* 右侧Markdown预览 - 添加markdown-body类 */}
            <div className="w-1/2 overflow-auto p-4 markdown-body"
                 dangerouslySetInnerHTML={{ __html: markdownHtml }} />
          </div>
        ) : (
          <Editor
            value={fileContent}
            language={getLanguage()}
            theme="vs-light"
            options={{
              readOnly: true,
              minimap: { enabled: true },
              scrollBeyondLastLine: false,
              fontSize: 14,
              lineNumbers: 'on',
              scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
              automaticLayout: true
            }}
            height="65vh"
            width="100%"
            onMount={handleEditorMount}
          />
        )}
      </div>
    </div>
  )
}
