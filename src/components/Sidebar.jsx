import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = () => {
  const location = useLocation();
  const [expandedMenus, setExpandedMenus] = useState({
    socialMedia: true,
    operations: true,
    resources: true
  });

  const toggleMenu = (menuKey) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuKey]: !prev[menuKey]
    }));
  };

  const MenuItem = ({ to, icon, children, isSubItem = false }) => {
    const isActive = location.pathname === to || location.pathname.startsWith(`${to}/`);
    
    return (
      <Link
        to={to}
        className={`flex items-center px-3 py-2 text-sm rounded-lg transition-all duration-200 ${
          isSubItem ? 'ml-4 pl-2' : ''
        } ${
          isActive 
            ? 'bg-blue-500 text-white shadow-sm' 
            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
        }`}
      >
        {icon && <span className="mr-2 text-base">{icon}</span>}
        {children}
      </Link>
    );
  };

  const MenuCategory = ({ title, icon, isExpanded, onToggle, children }) => (
    <div className="mb-2">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-900 rounded-lg hover:bg-gray-100 transition-colors duration-200"
      >
        <div className="flex items-center">
          <span className="mr-2 text-base">{icon}</span>
          {title}
        </div>
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isExpanded && (
        <div className="mt-1 space-y-1">
          {children}
        </div>
      )}
    </div>
  );

  return (
    <div className="w-64 bg-white h-full shadow-lg border-r border-gray-200 flex flex-col">
      {/* Logo区域 */}
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">
          <span className="text-blue-500">Twitter</span> 自动化
        </h1>
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 p-3 space-y-1">
        {/* 首页 */}
        <MenuItem to="/dashboard" icon="📊">
          首页
        </MenuItem>

        {/* 社媒账号管理 */}
        <MenuCategory
          title="社媒账号"
          icon="👥"
          isExpanded={expandedMenus.socialMedia}
          onToggle={() => toggleMenu('socialMedia')}
        >
          <MenuItem to="/accounts" icon="⚙️" isSubItem>
            账号设置
          </MenuItem>
          <MenuItem to="/proxies" icon="🌐" isSubItem>
            代理管理
          </MenuItem>
        </MenuCategory>

        {/* 运营管理 */}
        <MenuCategory
          title="运营"
          icon="📋"
          isExpanded={expandedMenus.operations}
          onToggle={() => toggleMenu('operations')}
        >
          <MenuItem to="/tasks" icon="📋" isSubItem>
            任务管理
          </MenuItem>
        </MenuCategory>

        {/* 资源管理 */}
        <MenuCategory
          title="资源管理"
          icon="📚"
          isExpanded={expandedMenus.resources}
          onToggle={() => toggleMenu('resources')}
        >
          <MenuItem to="/resources/tweets" icon="📝" isSubItem>
            作品库
          </MenuItem>
        </MenuCategory>
      </nav>

      {/* 底部信息 */}
      <div className="p-3 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center">
          <p>版本 v1.0.0</p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar; 