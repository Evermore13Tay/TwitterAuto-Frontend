import React, { useState, useEffect } from 'react';

const ProxiesPage = () => {
  const [proxies, setProxies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProxies, setSelectedProxies] = useState([]);
  
  // 分页状态
  const [pagination, setPagination] = useState({
    page: 1,
    page_size: 20,
    total: 0
  });
  
  // 对话框状态
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBatchAssignDialog, setShowBatchAssignDialog] = useState(false);
  
  // 表单数据
  const [currentProxy, setCurrentProxy] = useState({
    ip: '',
    port: '',
    username: '',
    password: '',
    proxy_type: 'http',
    country: '',
    name: '',
    status: 'active'
  });
  
  // 筛选状态
  const [filters, setFilters] = useState({
    status: '',
    country: '',
    search: ''
  });
  
  // 统计数据
  const [stats, setStats] = useState({
    total_proxies: 0,
    active_proxies: 0,
    used_proxies: 0,
    unused_proxies: 0,
    country_distribution: []
  });
  
  // 账号相关
  const [accounts, setAccounts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [selectedProxyForAssign, setSelectedProxyForAssign] = useState('');

  // 消息提示
  const [message, setMessage] = useState({ type: '', text: '' });

  const API_BASE_URL = 'http://localhost:8000';

  // 显示消息
  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  // 加载代理数据
  const loadProxies = async (page = pagination.page) => {
    try {
      setLoading(true);
      let url = `${API_BASE_URL}/api/proxies?page=${page}&page_size=${pagination.page_size}`;
      
      // 添加筛选参数
      if (filters.status) url += `&status=${filters.status}`;
      if (filters.country) url += `&country=${filters.country}`;
      if (filters.search) url += `&search=${encodeURIComponent(filters.search)}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (response.ok) {
        setProxies(data.data || []);
        setPagination(prev => ({
          ...prev,
          page: page,
          total: data.total
        }));
      } else {
        showMessage('加载代理列表失败', 'error');
        setProxies([]);
      }
    } catch (error) {
      console.error('加载代理失败:', error);
      showMessage('无法连接到后端服务', 'error');
      setProxies([]);
    } finally {
      setLoading(false);
    }
  };

  // 加载统计数据
  const loadStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/proxies/stats/summary`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  };

  // 加载分组数据
  const loadGroups = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/groups`);
      if (response.ok) {
        const data = await response.json();
        setGroups(data || []);
      } else {
        console.error('加载分组失败:', response.status);
      }
    } catch (error) {
      console.error('加载分组失败:', error);
    }
  };

  // 加载账号数据（用于批量分配）- 修改为支持分组筛选
  const loadAccounts = async (groupFilter = selectedGroup) => {
    try {
      // 根据分组筛选账号数据
      let allAccounts = [];
      let page = 1;
      const pageSize = 100;
      
      while (true) {
        let url = `${API_BASE_URL}/api/accounts?page=${page}&per_page=${pageSize}`;
        if (groupFilter && groupFilter !== 'all') {
          url += `&group_id=${groupFilter}`;
        }
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success && data.accounts && data.accounts.length > 0) {
          allAccounts = [...allAccounts, ...data.accounts];
          
          // 如果返回的数据少于每页大小，说明已经是最后一页
          if (data.accounts.length < pageSize) {
            break;
          }
          page++;
        } else {
          break;
        }
      }
      
      setAccounts(allAccounts);
    } catch (error) {
      console.error('加载账号失败:', error);
    }
  };

  useEffect(() => {
    loadProxies();
    loadStats();
    loadGroups();
    loadAccounts();
  }, []);

  useEffect(() => {
    loadProxies(1); // 筛选条件改变时重新加载第一页
  }, [filters]);

  // 创建代理
  const handleCreateProxy = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/proxies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentProxy)
      });
      
      if (response.ok) {
        loadProxies(1);
        loadStats();
        setShowAddDialog(false);
        resetForm();
        showMessage('代理创建成功');
      } else {
        const data = await response.json();
        showMessage(data.detail || '代理创建失败', 'error');
      }
    } catch (error) {
      console.error('创建代理失败:', error);
      showMessage('创建代理失败', 'error');
    }
  };

  // 更新代理
  const handleUpdateProxy = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/proxies/${currentProxy.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentProxy)
      });
      
      if (response.ok) {
        loadProxies();
        loadStats();
        setShowEditDialog(false);
        resetForm();
        showMessage('代理更新成功');
      } else {
        const data = await response.json();
        showMessage(data.detail || '代理更新失败', 'error');
      }
    } catch (error) {
      console.error('更新代理失败:', error);
      showMessage('更新代理失败', 'error');
    }
  };

  // 删除代理
  const handleDeleteProxies = async () => {
    try {
      for (const proxyId of selectedProxies) {
        await fetch(`${API_BASE_URL}/api/proxies/${proxyId}`, {
          method: 'DELETE'
        });
      }
      
      loadProxies();
      loadStats();
      setSelectedProxies([]);
      setShowDeleteDialog(false);
      showMessage(`成功删除 ${selectedProxies.length} 个代理`);
    } catch (error) {
      console.error('删除代理失败:', error);
      showMessage('删除代理失败', 'error');
    }
  };

  // 批量分配代理 - 修复API路径
  const handleBatchAssignProxy = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/accounts/batch/proxy`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_ids: selectedAccounts,
          proxy_id: selectedProxyForAssign || null
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setShowBatchAssignDialog(false);
        setSelectedAccounts([]);
        setSelectedProxyForAssign('');
        showMessage(data.message);
        loadStats(); // 重新加载统计数据
      } else {
        showMessage(data.detail || '批量分配失败', 'error');
      }
    } catch (error) {
      console.error('批量分配代理失败:', error);
      showMessage('批量分配代理失败', 'error');
    }
  };

  // 重置表单
  const resetForm = () => {
    setCurrentProxy({
      ip: '',
      port: '',
      username: '',
      password: '',
      proxy_type: 'http',
      country: '',
      name: '',
      status: 'active'
    });
  };

  // 编辑代理
  const editProxy = (proxy) => {
    setCurrentProxy({ ...proxy });
    setShowEditDialog(true);
  };

  // 分页处理
  const handlePageChange = (newPage) => {
    const totalPages = Math.ceil(pagination.total / pagination.page_size);
    if (newPage >= 1 && newPage <= totalPages) {
      loadProxies(newPage);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">代理管理</h1>
        <p className="text-gray-600">管理代理服务器和批量分配代理给账号</p>
      </div>

      {/* 消息提示 */}
      {message.text && (
        <div className={`mb-4 p-4 rounded-md ${
          message.type === 'error' 
            ? 'bg-red-100 border border-red-400 text-red-700' 
            : 'bg-green-100 border border-green-400 text-green-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">总</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">总代理数</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.total_proxies}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">活</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">活跃代理</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.active_proxies}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">用</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">使用中</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.used_proxies}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">闲</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">空闲代理</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.unused_proxies}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 操作栏 */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* 搜索和筛选 */}
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
              <input
                type="text"
                placeholder="搜索IP、名称或用户名..."
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
              
              <select
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              >
                <option value="">所有状态</option>
                <option value="active">活跃</option>
                <option value="inactive">禁用</option>
              </select>
              
              <select
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filters.country}
                onChange={(e) => setFilters(prev => ({ ...prev, country: e.target.value }))}
              >
                <option value="">所有国家</option>
                {stats.country_distribution.map(item => (
                  <option key={item.country} value={item.country}>
                    {item.country} ({item.count})
                  </option>
                ))}
              </select>
            </div>

            {/* 操作按钮 */}
            <div className="flex space-x-3">
              <button
                onClick={() => setShowAddDialog(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition duration-200"
              >
                添加代理
              </button>
              
              <button
                onClick={() => setShowBatchAssignDialog(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition duration-200"
              >
                批量分配
              </button>
              
              {selectedProxies.length > 0 && (
                <button
                  onClick={() => setShowDeleteDialog(true)}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition duration-200"
                >
                  删除选中 ({selectedProxies.length})
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 代理列表 */}
      <div className="bg-white shadow rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedProxies.length === proxies.length && proxies.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedProxies(proxies.map(p => p.id));
                      } else {
                        setSelectedProxies([]);
                      }
                    }}
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  代理信息
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  认证信息
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  类型/地区
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  </td>
                </tr>
              ) : proxies.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                    暂无代理数据
                  </td>
                </tr>
              ) : (
                proxies.map((proxy) => (
                  <tr key={proxy.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedProxies.includes(proxy.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedProxies([...selectedProxies, proxy.id]);
                          } else {
                            setSelectedProxies(selectedProxies.filter(id => id !== proxy.id));
                          }
                        }}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {proxy.ip}:{proxy.port}
                        </div>
                        {proxy.name && (
                          <div className="text-sm text-gray-500">{proxy.name}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {proxy.username ? `${proxy.username}:${proxy.password}` : '无认证'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm text-gray-900">{proxy.proxy_type.toUpperCase()}</div>
                        {proxy.country && (
                          <div className="text-sm text-gray-500">{proxy.country}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        proxy.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {proxy.status === 'active' ? '活跃' : '禁用'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => editProxy(proxy)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => {
                          setSelectedProxies([proxy.id]);
                          setShowDeleteDialog(true);
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        {pagination.total > pagination.page_size && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                上一页
              </button>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= Math.ceil(pagination.total / pagination.page_size)}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                下一页
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  显示第 <span className="font-medium">{(pagination.page - 1) * pagination.page_size + 1}</span> 到{' '}
                  <span className="font-medium">
                    {Math.min(pagination.page * pagination.page_size, pagination.total)}
                  </span>{' '}
                  条，共 <span className="font-medium">{pagination.total}</span> 条
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    上一页
                  </button>
                  <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                    第 {pagination.page} 页，共 {Math.ceil(pagination.total / pagination.page_size)} 页
                  </span>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= Math.ceil(pagination.total / pagination.page_size)}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    下一页
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 添加代理对话框 */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">添加代理</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">IP地址</label>
                    <input
                      type="text"
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={currentProxy.ip}
                      onChange={(e) => setCurrentProxy(prev => ({ ...prev, ip: e.target.value }))}
                      placeholder="例: 192.168.1.1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">端口</label>
                    <input
                      type="number"
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={currentProxy.port}
                      onChange={(e) => setCurrentProxy(prev => ({ ...prev, port: e.target.value }))}
                      placeholder="例: 8080"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">用户名</label>
                    <input
                      type="text"
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={currentProxy.username}
                      onChange={(e) => setCurrentProxy(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="可选"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">密码</label>
                    <input
                      type="text"
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={currentProxy.password}
                      onChange={(e) => setCurrentProxy(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="可选"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">类型</label>
                    <select
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={currentProxy.proxy_type}
                      onChange={(e) => setCurrentProxy(prev => ({ ...prev, proxy_type: e.target.value }))}
                    >
                      <option value="http">HTTP</option>
                      <option value="https">HTTPS</option>
                      <option value="socks5">SOCKS5</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">国家/地区</label>
                    <input
                      type="text"
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={currentProxy.country}
                      onChange={(e) => setCurrentProxy(prev => ({ ...prev, country: e.target.value }))}
                      placeholder="例: US, CN"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">名称/备注</label>
                  <input
                    type="text"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={currentProxy.name}
                    onChange={(e) => setCurrentProxy(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="可选"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddDialog(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 border border-gray-300 rounded-md hover:bg-gray-300"
                >
                  取消
                </button>
                <button
                  onClick={handleCreateProxy}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                >
                  创建
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 编辑代理对话框 */}
      {showEditDialog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">编辑代理</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">IP地址</label>
                    <input
                      type="text"
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={currentProxy.ip}
                      onChange={(e) => setCurrentProxy(prev => ({ ...prev, ip: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">端口</label>
                    <input
                      type="number"
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={currentProxy.port}
                      onChange={(e) => setCurrentProxy(prev => ({ ...prev, port: e.target.value }))}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">用户名</label>
                    <input
                      type="text"
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={currentProxy.username}
                      onChange={(e) => setCurrentProxy(prev => ({ ...prev, username: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">密码</label>
                    <input
                      type="text"
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={currentProxy.password}
                      onChange={(e) => setCurrentProxy(prev => ({ ...prev, password: e.target.value }))}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">类型</label>
                    <select
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={currentProxy.proxy_type}
                      onChange={(e) => setCurrentProxy(prev => ({ ...prev, proxy_type: e.target.value }))}
                    >
                      <option value="http">HTTP</option>
                      <option value="https">HTTPS</option>
                      <option value="socks5">SOCKS5</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">国家/地区</label>
                    <input
                      type="text"
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={currentProxy.country}
                      onChange={(e) => setCurrentProxy(prev => ({ ...prev, country: e.target.value }))}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">名称/备注</label>
                  <input
                    type="text"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={currentProxy.name}
                    onChange={(e) => setCurrentProxy(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">状态</label>
                  <select
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={currentProxy.status}
                    onChange={(e) => setCurrentProxy(prev => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="active">活跃</option>
                    <option value="inactive">禁用</option>
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowEditDialog(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 border border-gray-300 rounded-md hover:bg-gray-300"
                >
                  取消
                </button>
                <button
                  onClick={handleUpdateProxy}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                >
                  更新
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认对话框 */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <h3 className="text-lg font-medium text-gray-900">确认删除</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  确定要删除选中的 {selectedProxies.length} 个代理吗？此操作不可撤销。
                </p>
              </div>
              <div className="flex justify-center space-x-3 mt-4">
                <button
                  onClick={() => setShowDeleteDialog(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 border border-gray-300 rounded-md hover:bg-gray-300"
                >
                  取消
                </button>
                <button
                  onClick={handleDeleteProxies}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
                >
                  删除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 批量分配代理对话框 */}
      {showBatchAssignDialog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-4/5 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">批量分配代理</h3>
              
              {/* 添加分组选择器 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">选择分组</label>
                <select 
                  value={selectedGroup} 
                  onChange={(e) => {
                    const newGroup = e.target.value;
                    setSelectedGroup(newGroup);
                    setSelectedAccounts([]); // 清空已选账号
                    loadAccounts(newGroup); // 重新加载账号
                  }}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">全部账号</option>
                  {groups.map(group => (
                    <option key={group.id} value={group.id}>
                      {group.name} ({group.account_count || 0})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 左侧：选择账号 */}
                <div>
                  <h4 className="text-md font-medium text-gray-700 mb-3">
                    选择账号 
                    {selectedGroup !== 'all' && groups.find(g => g.id.toString() === selectedGroup) && 
                      <span className="text-sm text-gray-500">
                        （当前分组：{groups.find(g => g.id.toString() === selectedGroup)?.name}）
                      </span>
                    }
                  </h4>
                  <div className="border border-gray-300 rounded-md p-3 max-h-64 overflow-y-auto">
                    <div className="mb-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedAccounts.length === accounts.length && accounts.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedAccounts(accounts.map(a => a.id));
                            } else {
                              setSelectedAccounts([]);
                            }
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm font-medium">全选 ({accounts.length} 个账号)</span>
                      </label>
                    </div>
                    <div className="space-y-1">
                      {accounts.map(account => (
                        <label key={account.id} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedAccounts.includes(account.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedAccounts([...selectedAccounts, account.id]);
                              } else {
                                setSelectedAccounts(selectedAccounts.filter(id => id !== account.id));
                              }
                            }}
                            className="mr-2"
                          />
                          <span className="text-sm">
                            {account.username}
                            {account.proxy_info && (
                              <span className="text-gray-500 ml-2">
                                (当前: {account.proxy_info.ip}:{account.proxy_info.port})
                              </span>
                            )}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    已选择 {selectedAccounts.length} 个账号
                  </p>
                </div>

                {/* 右侧：选择代理 */}
                <div>
                  <h4 className="text-md font-medium text-gray-700 mb-3">选择代理</h4>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="proxy-assign"
                        value=""
                        checked={selectedProxyForAssign === ''}
                        onChange={(e) => setSelectedProxyForAssign('')}
                        className="mr-2"
                      />
                      <span className="text-sm text-red-600">取消代理分配</span>
                    </label>
                    
                    <div className="border border-gray-300 rounded-md p-3 max-h-64 overflow-y-auto">
                      <div className="space-y-2">
                        {proxies.filter(p => p.status === 'active').map(proxy => (
                          <label key={proxy.id} className="flex items-center">
                            <input
                              type="radio"
                              name="proxy-assign"
                              value={proxy.id}
                              checked={selectedProxyForAssign === proxy.id}
                              onChange={(e) => setSelectedProxyForAssign(Number(e.target.value))}
                              className="mr-2"
                            />
                            <div className="text-sm">
                              <div className="font-medium">
                                {proxy.ip}:{proxy.port}
                                {proxy.name && <span className="text-gray-500"> ({proxy.name})</span>}
                              </div>
                              <div className="text-gray-500">
                                {proxy.proxy_type.toUpperCase()}
                                {proxy.country && ` • ${proxy.country}`}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowBatchAssignDialog(false);
                    setSelectedAccounts([]);
                    setSelectedProxyForAssign('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 border border-gray-300 rounded-md hover:bg-gray-300"
                >
                  取消
                </button>
                <button
                  onClick={handleBatchAssignProxy}
                  disabled={selectedAccounts.length === 0}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  批量分配 ({selectedAccounts.length} 个账号)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProxiesPage; 