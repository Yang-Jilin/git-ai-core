import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { Sidebar } from './components/layout/Sidebar'
import { Header } from './components/layout/Header'
import { Dashboard } from './components/pages/Dashboard'
import { Projects } from './components/pages/Projects'
import { AISettings } from './components/pages/AISettings'
import { MCPSettings } from './components/pages/MCPSettings'
import { ProjectDetail } from './components/pages/ProjectDetail'
import './styles/App.css'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="flex h-screen bg-gray-50">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/projects/:path" element={<ProjectDetail />} />
                <Route path="/ai-settings" element={<AISettings />} />
                <Route path="/mcp-settings" element={<MCPSettings />} />
              </Routes>
            </main>
          </div>
        </div>
        <Toaster position="top-right" />
      </Router>
    </QueryClientProvider>
  )
}

export default App
