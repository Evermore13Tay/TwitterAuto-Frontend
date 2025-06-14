import React, { useState, useEffect } from 'react';
import {
  fetchDeviceList,
  fetchDeviceDetail,
  startContainer,
  stopContainer,
  restartContainer,
  getContainerLogs,
  getAndCombineContainerData,
  removeContainer
} from './utils/containerApiService';
import { DC_API_BASE_URL } from './config';

function ContainerManagePage() {
  const [targetIp, setTargetIp] = useState('10.18.96.3');
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState({});
  const [expandedContainer, setExpandedContainer] = useState(null);
  const [statusMessages, setStatusMessages] = useState('');

  useEffect(() => {
    // 组件加载时不自动获取数据，等待用户点击按钮
  }, []);

  const addStatusMessage = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setStatusMessages(prev => `${prev}\n[${timestamp}] ${message}`);
  };

  const handleFetchContainers = async () => {
    if (!targetIp) {
      setError('请输入有效的IP地址');
      return;
    }

    setLoading(true);
    setError(null);
    addStatusMessage(`开始从IP ${targetIp} 获取容器信息，使用API: ${DC_API_BASE_URL}...`);

    try {
      addStatusMessage(`正在调用getAndCombineContainerData...`);
      const result = await getAndCombineContainerData(targetIp);
      
      addStatusMessage(`获取结果: ${JSON.stringify(result).substring(0, 100)}...`);
      
      if (!result) {
        throw new Error('获取到的数据为空');
      }
      
      if (!result.msg) {
        throw new Error('获取到的数据缺少msg字段');
      }
      
      if (!Array.isArray(result.msg)) {
        throw new Error('获取到的数据的msg字段不是数组');
      }
      
      if (result && result.msg && Array.isArray(result.msg)) {
        setContainers(result.msg);
        addStatusMessage(`成功从IP ${targetIp} 获取到 ${result.msg.length} 个容器`);
        
        // 统计各种状态的容器数量
        const statusCounts = {};
        result.msg.forEach(container => {
          const status = container.State || container.state || '未知';
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        });
        
        // 显示状态统计
        addStatusMessage(`容器状态统计: ${Object.entries(statusCounts).map(([status, count]) => `${status}: ${count}`).join(', ')}`);
      } else {
        throw new Error('获取到的数据格式无效');
      }
    } catch (err) {
      console.error(`获取容器信息失败:`, err);
      setError(`获取容器信息失败: ${err.message}`);
      addStatusMessage(`获取容器信息失败: ${err.message}`);
      
      // 尝试提供更多调试信息
      if (err.status) {
        addStatusMessage(`错误状态码: ${err.status}`);
      }
      if (err.data) {
        addStatusMessage(`错误详情: ${JSON.stringify(err.data)}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStartContainer = async (container) => {
    if (!container || !container.Names) return;
    
    const containerIp = container.ip || targetIp;
    const containerName = container.Names;
    
    setLoading(true);
    addStatusMessage(`尝试启动容器: ${containerName}`);
    
    try {
      const result = await startContainer(containerIp, containerName);
      addStatusMessage(`容器 ${containerName} 启动成功: ${JSON.stringify(result)}`);
      
      // 刷新容器列表
      handleFetchContainers();
    } catch (err) {
      setError(`启动容器 ${containerName} 失败: ${err.message}`);
      addStatusMessage(`启动容器 ${containerName} 失败: ${err.message}`);
      setLoading(false);
    }
  };

  const handleStopContainer = async (container) => {
    if (!container || !container.Names) return;
    
    const containerIp = container.ip || targetIp;
    const containerName = container.Names;
    
    setLoading(true);
    addStatusMessage(`尝试停止容器: ${containerName}`);
    
    try {
      const result = await stopContainer(containerIp, containerName);
      addStatusMessage(`容器 ${containerName} 停止成功: ${JSON.stringify(result)}`);
      
      // 刷新容器列表
      handleFetchContainers();
    } catch (err) {
      setError(`停止容器 ${containerName} 失败: ${err.message}`);
      addStatusMessage(`停止容器 ${containerName} 失败: ${err.message}`);
      setLoading(false);
    }
  };

  const handleRestartContainer = async (container) => {
    if (!container || !container.Names) return;
    
    const containerIp = container.ip || targetIp;
    const containerName = container.Names;
    
    setLoading(true);
    addStatusMessage(`尝试重启容器: ${containerName}`);
    
    try {
      const result = await restartContainer(containerIp, containerName);
      addStatusMessage(`容器 ${containerName} 重启成功: ${JSON.stringify(result)}`);
      
      // 刷新容器列表
      handleFetchContainers();
    } catch (err) {
      setError(`重启容器 ${containerName} 失败: ${err.message}`);
      addStatusMessage(`重启容器 ${containerName} 失败: ${err.message}`);
      setLoading(false);
    }
  };

  const handleRemoveContainer = async (container) => {
    if (!container || !container.Names) return;
    
    const containerIp = container.ip || targetIp;
    const containerName = container.Names;
    
    if (!window.confirm(`确定要删除容器 ${containerName} 吗？此操作不可恢复！`)) {
      return;
    }
    
    setLoading(true);
    addStatusMessage(`尝试删除容器: ${containerName}`);
    
    try {
      const result = await removeContainer(containerIp, containerName);
      addStatusMessage(`容器 ${containerName} 删除成功: ${JSON.stringify(result)}`);
      
      // 刷新容器列表
      handleFetchContainers();
    } catch (err) {
      setError(`删除容器 ${containerName} 失败: ${err.message}`);
      addStatusMessage(`删除容器 ${containerName} 失败: ${err.message}`);
      setLoading(false);
    }
  };

  const handleViewLogs = async (container) => {
    if (!container || !container.Names) return;
    
    const containerIp = container.ip || targetIp;
    const containerName = container.Names;
    
    setLoading(true);
    addStatusMessage(`获取容器日志: ${containerName}`);
    
    try {
      const result = await getContainerLogs(containerIp, containerName);
      
      if (result) {
        setLogs({
          ...logs,
          [containerName]: result
        });
        
        setExpandedContainer(containerName);
        addStatusMessage(`成功获取容器 ${containerName} 的日志`);
      } else {
        throw new Error('获取到的日志数据格式无效');
      }
    } catch (err) {
      setError(`获取容器 ${containerName} 日志失败: ${err.message}`);
      addStatusMessage(`获取容器 ${containerName} 日志失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpandContainer = (containerName) => {
    if (expandedContainer === containerName) {
      setExpandedContainer(null);
    } else {
      setExpandedContainer(containerName);
    }
  };

  const getStatusClass = (status) => {
    if (!status) return 'bg-gray-200';
    
    status = status.toLowerCase();
    if (status === 'running') return 'bg-green-100 text-green-800';
    if (status === 'exited' || status === 'stopped') return 'bg-red-100 text-red-800';
    if (status === 'restarting') return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100';
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">容器直接管理</h1>
      <p className="mb-4 text-gray-600">
        此页面直接连接到设备控制API ({DC_API_BASE_URL})，不通过后端服务器中转
      </p>
      
      <div className="mb-6 p-4 border rounded">
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <label htmlFor="targetIp" className="block text-sm font-medium text-gray-700 mb-1">目标IP地址</label>
            <input
              id="targetIp"
              type="text"
              value={targetIp}
              onChange={(e) => setTargetIp(e.target.value)}
              placeholder="例如: 10.18.96.3"
              className="w-full px-3 py-2 border rounded shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleFetchContainers}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300"
            >
              {loading ? '加载中...' : '获取容器'}
            </button>
          </div>
        </div>
        
        {error && (
          <div className="p-3 bg-red-100 text-red-800 rounded mb-4">
            {error}
          </div>
        )}
        
        <div className="mt-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">状态消息:</label>
          <pre className="w-full h-40 p-3 overflow-auto bg-gray-100 text-gray-800 rounded text-sm font-mono">
            {statusMessages || '暂无消息'}
          </pre>
        </div>
      </div>
      
      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-3">容器列表 ({containers.length})</h2>
        
        {containers.length === 0 ? (
          <div className="text-center p-8 bg-gray-50 rounded">
            {loading ? '加载中...' : '暂无容器数据，请输入IP地址并点击"获取容器"按钮'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-2 text-left">名称</th>
                  <th className="px-4 py-2 text-left">状态</th>
                  <th className="px-4 py-2 text-left">IP</th>
                  <th className="px-4 py-2 text-left">端口</th>
                  <th className="px-4 py-2 text-left">操作</th>
                </tr>
              </thead>
              <tbody>
                {containers.map((container, index) => {
                  const containerName = container.Names || '未知';
                  const status = container.State || container.state || '未知';
                  const ip = container.ip || targetIp;
                  
                  // 提取端口信息
                  let ports = '';
                  if (container.ADB || container.adb || container.u2_port) {
                    ports += `ADB: ${container.ADB || container.adb || container.u2_port}, `;
                  }
                  if (container.RPC || container.rpc || container.myt_rpc_port) {
                    ports += `RPC: ${container.RPC || container.rpc || container.myt_rpc_port}`;
                  }
                  
                  return (
                    <React.Fragment key={index}>
                      <tr className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <button 
                            onClick={() => toggleExpandContainer(containerName)}
                            className="text-blue-600 hover:underline text-left font-medium"
                          >
                            {containerName}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs ${getStatusClass(status)}`}>
                            {status}
                          </span>
                        </td>
                        <td className="px-4 py-3">{ip}</td>
                        <td className="px-4 py-3">{ports || '未知'}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleStartContainer(container)}
                              disabled={loading || status.toLowerCase() === 'running'}
                              className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:bg-gray-300"
                            >
                              启动
                            </button>
                            <button
                              onClick={() => handleStopContainer(container)}
                              disabled={loading || status.toLowerCase() === 'exited' || status.toLowerCase() === 'stopped'}
                              className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:bg-gray-300"
                            >
                              停止
                            </button>
                            <button
                              onClick={() => handleRestartContainer(container)}
                              disabled={loading}
                              className="px-2 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700 disabled:bg-gray-300"
                            >
                              重启
                            </button>
                            <button
                              onClick={() => handleViewLogs(container)}
                              disabled={loading}
                              className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:bg-gray-300"
                            >
                              日志
                            </button>
                            <button
                              onClick={() => handleRemoveContainer(container)}
                              disabled={loading}
                              className="px-2 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 disabled:bg-gray-300"
                            >
                              删除
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedContainer === containerName && (
                        <tr>
                          <td colSpan="5" className="px-4 py-3 bg-gray-50">
                            <div className="p-2">
                              <h4 className="font-medium mb-2">详细信息:</h4>
                              <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto h-40">
                                {JSON.stringify(container, null, 2)}
                              </pre>
                              
                              {logs[containerName] && (
                                <div className="mt-4">
                                  <h4 className="font-medium mb-2">容器日志:</h4>
                                  <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto h-40">
                                    {typeof logs[containerName] === 'string' 
                                      ? logs[containerName] 
                                      : JSON.stringify(logs[containerName], null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default ContainerManagePage; 