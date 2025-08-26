import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  HomeIcon, 
  FolderIcon, 
  CogIcon,
  CpuChipIcon,
  CodeBracketIcon
} from '@heroicons/react/24/outline'

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Projects', href: '/projects', icon: FolderIcon },
  { name: 'GitHub Recommendations', href: '/github-recommendations', icon: CodeBracketIcon },
  { name: 'AI Settings', href: '/ai-settings', icon: CpuChipIcon },
  { name: 'GitHub Settings', href: '/github-settings', icon: CogIcon },
  { name: 'MCP Settings', href: '/mcp-settings', icon: CogIcon },
]

export const Sidebar: React.FC = () => {
  const location = useLocation()

  return (
    <div className="w-64 bg-white shadow-lg">
      <div className="flex items-center justify-center h-16 px-4 bg-gradient-to-r from-blue-600 to-purple-600">
        <CodeBracketIcon className="h-8 w-8 text-white" />
        <span className="ml-2 text-xl font-bold text-white">Git AI Core</span>
      </div>
      
      <nav className="mt-5 px-2">
        <div className="space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`
                  group flex items-center px-2 py-2 text-sm font-medium rounded-md
                  ${isActive 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                <item.icon
                  className={`
                    mr-3 h-5 w-5 flex-shrink-0
                    ${isActive ? 'text-blue-700' : 'text-gray-400 group-hover:text-gray-500'}
                  `}
                />
                {item.name}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
