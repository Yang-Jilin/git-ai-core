import React, { useRef, useEffect, useState } from "react";
import {
  DocumentTextIcon,
  ArrowDownTrayIcon,
  ClipboardDocumentIcon,
  ChatBubbleLeftRightIcon,
  EyeIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";
import Editor from "@monaco-editor/react";
import { editor } from "monaco-editor";
import MarkdownIt from "markdown-it";
// 引入github-markdown-css样式 - 修改为浅色主题
import "github-markdown-css";
// 引入highlight.js用于代码块语法高亮
import hljs from "highlight.js";
// 将不存在的github-light.css改为github.css
import "highlight.js/styles/github.css";
import { toast } from "react-hot-toast";
import { api } from "../../services/api";
import { SmartChatPanel } from "./SmartChatPanel";

type IStandaloneCodeEditor = editor.IStandaloneCodeEditor;

interface FileViewerProps {
  fileName: string;
  fileContent: string;
  filePath: string;
  projectRoot: string;
  onClose: () => void;
  onFileContentUpdate?: (newContent: string) => void;
}

export const FileViewer: React.FC<FileViewerProps> = ({
  fileName,
  fileContent,
  filePath,
  projectRoot,
  onClose,
  onFileContentUpdate,
}) => {
  const editorRef = useRef<IStandaloneCodeEditor | null>(null);
  const [markdownHtml, setMarkdownHtml] = useState("");
  const [isReloading, setIsReloading] = useState(false);
  const [isGeneratingComments, setIsGeneratingComments] = useState(false);
  const [commentStyle, setCommentStyle] = useState("detailed");
  const [showMarkdownPreview, setShowMarkdownPreview] = useState(false);
  const isMarkdown = fileName.toLowerCase().endsWith(".md");

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

      return ""; // 使用默认处理
    },
  });

  // 当文件内容变化时解析Markdown
  useEffect(() => {
    if (isMarkdown) {
      setMarkdownHtml(md.render(fileContent));
    }
  }, [fileContent, isMarkdown]);

  // 使用onMount回调获取编辑器实例
  const handleEditorMount = (editor: IStandaloneCodeEditor) => {
    editorRef.current = editor;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(fileContent);
  };

  const handleDownload = () => {
    const blob = new Blob([fileContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatFileSize = (content: string) => {
    const bytes = new Blob([content]).size;
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const formatLineCount = (content: string) => {
    return content.split("\n").length;
  };

  // 重新加载文件内容
  const reloadFileContent = async () => {
    setIsReloading(true);
    try {
      const result = await api.getFileContent(projectRoot, filePath);
      if (onFileContentUpdate) {
        onFileContentUpdate(result.content);
      }
      toast.success("文件内容已更新");
    } catch (error) {
      console.error("重新加载文件失败:", error);
      toast.error("重新加载文件失败");
    } finally {
      setIsReloading(false);
    }
  };

  // 生成注释
  const handleGenerateComments = async () => {
    if (isMarkdown) {
      toast.error("Markdown文件不支持注释生成");
      return;
    }

    setIsGeneratingComments(true);
    try {
      const result = await api.executeMCPTool(
        "comment-server",
        "generate_comments",
        {
          project_root: projectRoot,
          file_path: filePath,
          comment_style: commentStyle,
        }
      );

      if (result.success) {
        const commentedCode = result.result.commented_code;

        // 写入注释到文件
        const writeResult = await api.executeMCPTool(
          "comment-server",
          "write_comments",
          {
            project_root: projectRoot,
            file_path: filePath,
            content: commentedCode,
          }
        );

        if (writeResult.success) {
          toast.success("注释生成并写入成功");
          // 重新加载文件内容而不是刷新页面
          await reloadFileContent();
        } else {
          toast.error("写入文件失败");
        }
      } else {
        toast.error(`生成注释失败: ${result.error}`);
      }
    } catch (error) {
      toast.error("生成注释时发生错误");
      console.error("Generate comments error:", error);
    } finally {
      setIsGeneratingComments(false);
    }
  };

  // 检查是否支持注释生成
  const canGenerateComments = () => {
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    const supportedExtensions = [
      "py",
      "js",
      "jsx",
      "ts",
      "tsx",
      "java",
      "cpp",
      "c",
      "h",
      "hpp",
      "go",
      "rs",
      "php",
      "rb",
      "sh",
      "sql",
      "css",
      "scss",
      "sass",
    ];
    return supportedExtensions.includes(ext) && !isMarkdown;
  };

  // 根据文件扩展名确定语言
  const getLanguage = () => {
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    switch (ext) {
      case "ts":
      case "tsx":
        return "typescript";
      case "js":
      case "jsx":
        return "javascript";
      case "html":
        return "html";
      case "css":
        return "css";
      case "scss":
      case "sass":
        return "scss";
      case "json":
        return "json";
      case "md":
        return "markdown";
      case "py":
        return "python";
      case "java":
        return "java";
      case "c":
      case "cpp":
      case "cc":
      case "cxx":
        return "cpp";
      case "h":
      case "hpp":
        return "cpp";
      case "go":
        return "go";
      case "rs":
        return "rust";
      case "php":
        return "php";
      case "rb":
        return "ruby";
      case "sh":
        return "shell";
      case "sql":
        return "sql";
      default:
        return "plaintext";
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-xl flex flex-col max-h-[48rem] overflow-hidden border border-gray-100">
      {/* 文件头部信息 - 固定标题栏 */}
      <div className="sticky top-0 z-50 border-b border-gray-200 px-6 py-4 bg-gradient-to-r from-gray-50 to-white shadow-md backdrop-blur-sm bg-white/95">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* 返回按钮 */}
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              title="返回"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div className="p-2 bg-blue-50 rounded-lg">
              <DocumentTextIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 truncate max-w-md">
                {fileName}
              </h3>
              <p className="text-xs text-gray-500 truncate max-w-md">
                {filePath}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="px-3 py-1 bg-gray-100 rounded-full">
              <span className="text-xs text-gray-600 font-medium">
                {formatLineCount(fileContent)} 行 ·{" "}
                {formatFileSize(fileContent)}
              </span>
            </div>

            {/* 注释生成相关按钮 */}
            {canGenerateComments() && (
              <div className="flex items-center space-x-2 bg-green-50 rounded-lg px-2 py-1">
                <select
                  value={commentStyle}
                  onChange={(e) => setCommentStyle(e.target.value)}
                  className="text-xs border border-green-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-green-300"
                >
                  <option value="detailed">详细注释</option>
                  <option value="brief">简洁注释</option>
                  <option value="documentation">文档注释</option>
                </select>

                <button
                  onClick={handleGenerateComments}
                  disabled={isGeneratingComments || isReloading}
                  className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-100 rounded disabled:text-gray-400 disabled:hover:bg-transparent transition-colors duration-200"
                  title="生成注释"
                >
                  <ChatBubbleLeftRightIcon className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Markdown预览按钮 */}
            {isMarkdown && (
              <button
                onClick={() => setShowMarkdownPreview(!showMarkdownPreview)}
                disabled={isReloading}
                className={`p-1.5 rounded-lg transition-colors duration-200 ${
                  showMarkdownPreview
                    ? "bg-blue-100 text-blue-700"
                    : "text-blue-600 hover:bg-blue-50"
                } disabled:text-gray-400 disabled:hover:bg-transparent`}
                title={showMarkdownPreview ? "隐藏预览" : "显示预览"}
              >
                <EyeIcon className="h-4 w-4" />
              </button>
            )}

            <div className="flex items-center space-x-1">
              <button
                onClick={handleCopy}
                disabled={isReloading}
                className="p-1.5 text-gray-600 hover:text-gray-700 hover:bg-gray-100 rounded-lg disabled:text-gray-400 disabled:hover:bg-transparent transition-colors duration-200"
                title="复制代码"
              >
                <ClipboardDocumentIcon className="h-4 w-4" />
              </button>
              <button
                onClick={handleDownload}
                disabled={isReloading}
                className="p-1.5 text-gray-600 hover:text-gray-700 hover:bg-gray-100 rounded-lg disabled:text-gray-400 disabled:hover:bg-transparent transition-colors duration-200"
                title="下载文件"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 主要内容区域 - 左右分栏布局 */}
      <div className="flex-1 flex overflow-hidden bg-gray-50">
        {/* 左侧：文件内容展示区 */}
        <div className="flex-1 overflow-hidden relative bg-white m-2 rounded-lg shadow-sm flex flex-col">
          {isReloading && (
            <div className="absolute inset-0 bg-white bg-opacity-90 backdrop-blur-sm flex items-center justify-center z-10">
              <div className="flex flex-col items-center bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                <div className="animate-spin rounded-full h-10 w-10 border-3 border-blue-600 border-t-transparent mb-3"></div>
                <span className="text-sm text-gray-700 font-medium">
                  正在重新加载文件...
                </span>
              </div>
            </div>
          )}

          {isMarkdown ? (
            <div className="flex-1 w-full rounded-lg overflow-hidden">
              <Editor
                value={fileContent}
                language={getLanguage()}
                theme="vs-light"
                options={{
                  readOnly: true,
                  minimap: { enabled: true },
                  scrollBeyondLastLine: false,
                  fontSize: 16,
                  lineNumbers: "on",
                  scrollbar: {
                    verticalScrollbarSize: 8,
                    horizontalScrollbarSize: 8,
                  },
                  automaticLayout: true,
                  wordWrap: "on",
                  lineNumbersMinChars: 3,
                  folding: true,
                  renderWhitespace: "boundary",
                }}
                height="100%"
                width="100%"
                onMount={handleEditorMount}
              />

              {/* Markdown预览覆盖层 */}
              {showMarkdownPreview && (
                <div className="absolute inset-0 bg-white bg-opacity-98 backdrop-blur-sm z-20 overflow-auto border-l-4 border-blue-500 shadow-2xl">
                  <div className="p-6">
                    <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <EyeIcon className="h-5 w-5 text-blue-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          Markdown 预览
                        </h3>
                      </div>
                      <button
                        onClick={() => setShowMarkdownPreview(false)}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                        title="关闭预览"
                      >
                        <svg
                          className="h-6 w-6"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                    <div
                      className="markdown-body prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: markdownHtml }}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full w-full rounded-lg overflow-hidden">
              <Editor
                value={fileContent}
                language={getLanguage()}
                theme="vs-light"
                options={{
                  readOnly: true,
                  minimap: { enabled: true },
                  scrollBeyondLastLine: false,
                  fontSize: 16,
                  lineNumbers: "on",
                  scrollbar: {
                    verticalScrollbarSize: 8,
                    horizontalScrollbarSize: 8,
                  },
                  automaticLayout: true,
                  wordWrap: "on",
                  lineNumbersMinChars: 3,
                  folding: true,
                  renderWhitespace: "boundary",
                }}
                height="100%"
                width="100%"
                onMount={handleEditorMount}
              />
            </div>
          )}
        </div>

        {/* 右侧：AI对话区 */}
        <div className="w-96 flex flex-col bg-gray-50 m-2">
          <div className="bg-white rounded-lg shadow-sm h-full border border-gray-200 overflow-hidden flex flex-col">
            <SmartChatPanel
              projectPath={projectRoot}
              fileTree={{}}
              onFilePreview={(filePath, content) => {
                // 可以在这里处理文件预览逻辑
                console.log("Preview file:", filePath, content);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
