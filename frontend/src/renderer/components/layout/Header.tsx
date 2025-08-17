import React from 'react'
import { BellIcon } from '@heroicons/react/24/outline'

export const Header: React.FC = () => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between px-4 py-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Git AI Core</h1>
          <p className="text-sm text-gray-500">AI-powered Git project understanding</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <button className="p-2 text-gray-400 hover:text-gray-500">
            <BellIcon className="h-5 w-5" />
          </button>
          
          <div className="flex items-center space-x-3">
            <div className="text-sm">
              <p className="font-medium text-gray-900">Connected</p>
              <p className="text-gray-500">Backend API</p>
            </div>
            <div className="h-2 w-2 bg-green-400 rounded-full"></div>
          </div>
        </div>
      </div>
    </header>
  )
}
