import React from 'react';

const Dashboard = () => {
  return (
    <div className="h-full flex flex-col items-center justify-center pl-3 pr-6 py-6">
      <div className="text-center max-w-md">
        {/* 图标 */}
        <div className="mb-8">
          <div className="mx-auto h-32 w-32 flex items-center justify-center rounded-full bg-gray-100">
            <span className="text-6xl">🚧</span>
          </div>
        </div>

        {/* 标题 */}
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          仪表板功能开发中
        </h1>

        {/* 描述 */}
        <p className="text-lg text-gray-600 mb-6">
          我们正在为您打造全新的数据仪表板，敬请期待！
        </p>

        {/* 状态提示 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <span className="text-blue-500 text-xl mr-3">ℹ️</span>
            <div className="text-left">
              <p className="text-sm font-medium text-blue-800">
                开发状态：进行中
              </p>
              <p className="text-sm text-blue-600 mt-1">
                预计完成时间：待定
              </p>
            </div>
          </div>
        </div>

        {/* 功能提示 */}
        <div className="mt-8 text-left">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">即将推出的功能：</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              实时系统状态监控
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              任务执行统计分析
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              设备运行状态概览
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              性能指标图表展示
            </li>
          </ul>
        </div>

        {/* 快速导航 */}
        <div className="mt-8">
          <p className="text-sm text-gray-500 mb-4">
            在此期间，您可以使用其他功能：
          </p>
          <div className="flex justify-center space-x-4">
            <button 
              onClick={() => window.location.href = '#/accounts'}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              账号管理
            </button>
            <button 
              onClick={() => window.location.href = '#/tasks'}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              任务管理
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 