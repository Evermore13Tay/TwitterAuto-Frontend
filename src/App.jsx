// LoginPage and DeviceManagePage are now defined in their own files 
// and will be available in the global scope when index.html loads them before App.jsx.
// If using a module system (like Vite from package.json), you'd import them:
// import LoginPage from './LoginPage'; 
// import DeviceManagePage from './DeviceManagePage';

import React from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import SocialPage from './pages/SocialPage'
import TaskManagePage from './pages/TaskManagePage'
import AccountsPage from './pages/AccountsPage'
import ProxiesPage from './pages/ProxiesPage'
import TweetLibraryPage from './pages/TweetLibraryPage'
import Dashboard from './dashboard/Dashboard'
import Sidebar from './components/Sidebar'
import './App.css'

function App() {
    const location = useLocation()

    // 侧边栏布局 - 使用flex布局，确保高度不超过100vh
    return (
        <div className="h-screen w-screen bg-gray-50 flex overflow-hidden">
            {/* 左侧边栏 */}
            <div className="w-64 flex-shrink-0">
                <Sidebar />
            </div>
            
            {/* 右侧主内容区 */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* 顶部栏 */}
                <header className="bg-white shadow-sm border-b border-gray-200 px-4 py-3 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900">
                            {getPageTitle(location.pathname)}
                        </h2>
                        <div className="flex items-center space-x-3">
                            <span className="text-sm text-gray-500">欢迎使用</span>
                            <div className="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs font-bold">管</span>
                            </div>
                        </div>
                    </div>
                </header>

                {/* 主内容 */}
                <main className="flex-1 overflow-auto bg-gray-50">
                    <Routes>
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/accounts/*" element={<AccountsPage />} />
                        <Route path="/proxies/*" element={<ProxiesPage />} />
                        <Route path="/social/*" element={<SocialPage />} />
                        <Route path="/tasks/*" element={<TaskManagePage />} />
                        <Route path="/resources/tweets/*" element={<TweetLibraryPage />} />
                    </Routes>
                </main>
            </div>
        </div>
    )
}

// 获取页面标题的辅助函数
function getPageTitle(pathname) {
    if (pathname === '/dashboard') return '首页';
    if (pathname.startsWith('/accounts')) return '账号设置';
    if (pathname.startsWith('/proxies')) return '代理管理';
    if (pathname.startsWith('/social')) return '社交功能';
    if (pathname.startsWith('/tasks')) return '任务管理';
    if (pathname.startsWith('/resources/tweets')) return '作品库';
    return '管理中心';
}

export default App 