import React, { useState, useEffect } from 'react';

const AccountsPage = () => {
  const [accounts, setAccounts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [proxies, setProxies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('all');
  
  // 分页状态
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 10,
    total: 0,
    total_pages: 0
  });
  
  // 对话框状态
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBatchGroupDialog, setShowBatchGroupDialog] = useState(false);
  const [showBatchProxyDialog, setShowBatchProxyDialog] = useState(false);
  const [batchGroupId, setBatchGroupId] = useState('');
  const [batchProxyId, setBatchProxyId] = useState('');
  
  // 表单数据
  const [currentAccount, setCurrentAccount] = useState({
    username: '',
    password: '',
    secret_key: '',
    group_id: '',
    notes: ''
  });
  const [batchText, setBatchText] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  
  // 统计数据
  const [stats, setStats] = useState({
    total_count: 0,
    active_count: 0,
    inactive_count: 0,
    suspended_count: 0
  });

  // 消息提示
  const [message, setMessage] = useState({ type: '', text: '' });

  const API_BASE_URL = 'http://localhost:8000';

  // 显示消息
  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  // 加载账号数据
  const loadAccounts = async (page = pagination.page, groupFilter = selectedGroup) => {
    try {
      setLoading(true);
      // 构建API URL，包含分组筛选参数
      let url = `${API_BASE_URL}/api/accounts?page=${page}&per_page=${pagination.per_page}`;
      if (groupFilter && groupFilter !== 'all') {
        url += `&group_id=${groupFilter}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setAccounts(data.accounts || []);
        setPagination({
          page: data.page,
          per_page: data.per_page,
          total: data.total,
          total_pages: data.total_pages
        });
      } else {
        console.error(`账号API响应错误:`, data);
        showMessage(`加载账号失败: ${typeof data.detail === 'string' ? data.detail : '未知错误'}`, 'error');
        setAccounts([]);
      }
    } catch (error) {
      console.error('加载账号失败:', error);
      showMessage('无法连接到后端服务，请检查服务器状态', 'error');
      setAccounts([]);
    } finally {
      setLoading(false);
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
        console.error(`分组API响应错误: ${response.status} - ${response.statusText}`);
        showMessage(`加载分组失败: ${response.status} - 请检查后端服务是否启动`, 'error');
        setGroups([]);
      }
    } catch (error) {
      console.error('加载分组失败:', error);
      showMessage('无法连接到后端服务，请检查服务器状态', 'error');
      setGroups([]);
    }
  };

  // 加载统计数据
  const loadStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/accounts/stats`);
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      } else {
        console.error(`统计API响应错误:`, data);
        setStats({
          total_count: 0,
          active_count: 0,
          inactive_count: 0,
          suspended_count: 0
        });
      }
    } catch (error) {
      console.error('加载统计数据失败:', error);
      setStats({
        total_count: 0,
        active_count: 0,
        inactive_count: 0,
        suspended_count: 0
      });
    }
  };

  // 加载代理数据
  const loadProxies = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/proxies?page=1&page_size=1000&status=active`);
      if (response.ok) {
        const data = await response.json();
        setProxies(data.data || []);
      } else {
        console.error(`代理API响应错误: ${response.status}`);
        setProxies([]);
      }
    } catch (error) {
      console.error('加载代理数据失败:', error);
      setProxies([]);
    }
  };

  useEffect(() => {
    loadAccounts();
    loadGroups();
    loadStats();
    loadProxies();
  }, []);

  // 分页控制函数
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.total_pages) {
      loadAccounts(newPage, selectedGroup);
    }
  };

  const handlePreviousPage = () => {
    handlePageChange(pagination.page - 1);
  };

  const handleNextPage = () => {
    handlePageChange(pagination.page + 1);
  };

  // 创建账号
  const handleCreateAccount = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentAccount)
      });
      const data = await response.json();
      if (data.success) {
        loadAccounts(1, selectedGroup); // 创建新账号后回到第一页
        loadStats();
        loadGroups(); // 重新加载分组数据以更新账号数量统计
        setShowAddDialog(false);
        resetForm();
        showMessage('账号创建成功');
      } else {
        showMessage(typeof data.detail === 'string' ? data.detail : '账号创建失败', 'error');
      }
    } catch (error) {
      console.error('创建账号失败:', error);
      showMessage('创建账号失败', 'error');
    }
  };

  // 批量创建账号
  const handleBatchCreate = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/accounts/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accounts_text: batchText,
          group_id: currentAccount.group_id
        })
      });
      const data = await response.json();
      if (data.success) {
        const { created_count, skipped_count, error_count } = data.summary;
        showMessage(`批量导入完成：成功 ${created_count}，跳过 ${skipped_count}，错误 ${error_count}`);
        loadAccounts(1, selectedGroup); // 批量导入后回到第一页
        loadStats();
        loadGroups(); // 重新加载分组数据以更新账号数量统计
        setShowBatchDialog(false);
        setBatchText('');
      } else {
        showMessage(typeof data.detail === 'string' ? data.detail : '批量导入失败', 'error');
      }
    } catch (error) {
      console.error('批量创建失败:', error);
      showMessage('批量创建失败', 'error');
    }
  };

  // 创建分组
  const handleCreateGroup = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGroupName })
      });
      if (response.ok) {
        loadGroups();
        setShowGroupDialog(false);
        setNewGroupName('');
        showMessage('分组创建成功');
      } else {
        const data = await response.json();
        showMessage(typeof data.detail === 'string' ? data.detail : '创建分组失败', 'error');
      }
    } catch (error) {
      console.error('创建分组失败:', error);
      showMessage('无法连接到后端服务，请检查服务器状态', 'error');
    }
  };

    // 批量修改分组
  const handleBatchUpdateGroup = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/accounts/batch-group`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          account_ids: selectedAccounts,
          group_id: batchGroupId || null
        })
        });
        const data = await response.json();
        if (data.success) {
        loadAccounts(pagination.page, selectedGroup);
        loadStats();
        loadGroups(); // 重新加载分组数据以更新账号数量统计
        setSelectedAccounts([]);
        setShowBatchGroupDialog(false);
        setBatchGroupId('');
        showMessage(`成功修改 ${data.updated_count || selectedAccounts.length} 个账号的分组`);
      } else {
        showMessage(typeof data.detail === 'string' ? data.detail : '修改分组失败', 'error');
      }
    } catch (error) {
      console.error('修改分组失败:', error);
      showMessage('修改分组失败', 'error');
    }
  };

  // 批量分配代理
  const handleBatchUpdateProxy = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/accounts/batch/proxy`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_ids: selectedAccounts,
          proxy_id: batchProxyId ? parseInt(batchProxyId) : null
        })
      });
      const data = await response.json();
      if (data.success) {
        loadAccounts(pagination.page, selectedGroup);
        setSelectedAccounts([]);
        setShowBatchProxyDialog(false);
        setBatchProxyId('');
        showMessage(data.message);
      } else {
        // 处理FastAPI的详细错误信息
        let errorMessage = '批量分配代理失败';
        if (data.detail) {
          if (typeof data.detail === 'string') {
            errorMessage = data.detail;
          } else if (Array.isArray(data.detail)) {
            errorMessage = data.detail.map(err => err.msg || err).join(', ');
          } else {
            errorMessage = JSON.stringify(data.detail);
          }
        }
        showMessage(errorMessage, 'error');
      }
    } catch (error) {
      console.error('批量分配代理失败:', error);
      showMessage('批量分配代理失败', 'error');
    }
  };

    // 删除选中账号
  const handleDeleteAccounts = async () => {
    try {
      console.log('发送删除请求:', selectedAccounts);
        const response = await fetch(`${API_BASE_URL}/api/accounts/batch`, {
          method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_ids: selectedAccounts })
        });
        const data = await response.json();
      console.log('删除响应:', response.status, data);
        if (data.success) {
        // 删除后检查当前页是否还有数据，如果没有则回到上一页
        const currentPageStart = (pagination.page - 1) * pagination.per_page;
        const remainingItems = pagination.total - selectedAccounts.length;
        const newPage = remainingItems <= currentPageStart && pagination.page > 1 
          ? pagination.page - 1 
          : pagination.page;
        loadAccounts(newPage, selectedGroup);
        loadStats();
        loadGroups(); // 重新加载分组数据以更新账号数量统计
        setSelectedAccounts([]);
        setShowDeleteDialog(false);
        showMessage(`成功删除 ${data.deleted_count || selectedAccounts.length} 个账号`);
        } else {
        // 处理FastAPI的详细错误信息
        let errorMessage = '删除账号失败';
        if (data.detail) {
          if (typeof data.detail === 'string') {
            errorMessage = data.detail;
          } else if (Array.isArray(data.detail)) {
            errorMessage = data.detail.map(err => err.msg || err).join(', ');
          } else {
            errorMessage = JSON.stringify(data.detail);
          }
        }
        showMessage(errorMessage, 'error');
      }
    } catch (error) {
      console.error('删除账号失败:', error);
      showMessage('删除账号失败', 'error');
    }
  };

  const resetForm = () => {
    setCurrentAccount({
      username: '',
      password: '',
      secret_key: '',
      group_id: '',
      notes: ''
    });
  };

  // 获取当前显示的账号列表（现在由后端分组筛选）
  const filteredAccounts = accounts;

  // 获取分组名称
  const getGroupName = (groupId) => {
    if (!groupId) return '未分组';
    const group = groups.find(g => g.id === groupId);
    return group ? group.name : '未分组';
  };

  return (
    <div className="p-6 h-full bg-gray-50">
      {/* 消息提示 */}
      {message.text && (
        <div className={`mb-4 p-4 rounded-lg ${
          message.type === 'error' ? 'bg-red-100 text-red-700 border border-red-300' : 
          'bg-green-100 text-green-700 border border-green-300'
        }`}>
          {message.text}
        </div>
      )}

      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">社媒账号</h1>
        <p className="text-gray-600">管理您的社交媒体账号和分组</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-blue-600 text-xl">📊</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">总账号数</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_count}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <span className="text-green-600 text-xl">✅</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">活跃账号</p>
              <p className="text-2xl font-bold text-green-600">{stats.active_count}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <span className="text-yellow-600 text-xl">⚠️</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">不活跃账号</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.inactive_count}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <span className="text-red-600 text-xl">🚫</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">已封号</p>
              <p className="text-2xl font-bold text-red-600">{stats.suspended_count}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 操作栏 */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* 分组选择 */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">分组:</label>
            <select 
              value={selectedGroup} 
              onChange={(e) => {
                const newGroup = e.target.value;
                setSelectedGroup(newGroup);
                // 切换分组时重置到第1页，并传递新的分组参数
                loadAccounts(1, newGroup);
              }}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">全部账号 ({stats.total_count})</option>
              {groups.map(group => (
                <option key={group.id} value={group.id}>
                  {group.name} ({group.account_count || 0})
                </option>
              ))}
            </select>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddDialog(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              ➕ 添加账号
            </button>
            
            <button
              onClick={() => setShowBatchDialog(true)}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              📁 批量导入
            </button>
            
            <button
              onClick={() => setShowGroupDialog(true)}
              className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              📂 新建分组
            </button>

            {selectedAccounts.length > 0 && (
              <>
                <button
                  onClick={() => setShowBatchGroupDialog(true)}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  📁 修改分组 ({selectedAccounts.length})
                </button>
                <button
                  onClick={() => setShowBatchProxyDialog(true)}
                  className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  🌐 分配代理 ({selectedAccounts.length})
                </button>
                <button
                  onClick={() => setShowDeleteDialog(true)}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  🗑️ 删除选中 ({selectedAccounts.length})
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 账号列表 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedAccounts(filteredAccounts.map(acc => acc.id));
                      } else {
                        setSelectedAccounts([]);
                      }
                    }}
                    checked={filteredAccounts.length > 0 && selectedAccounts.length === filteredAccounts.length}
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">用户名</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">密码</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">2FA密钥</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">分组</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">代理</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">备份状态</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">创建时间</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="10" className="px-6 py-4 text-center text-gray-500">
                    加载中...
                  </td>
                </tr>
              ) : filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-6 py-4 text-center text-gray-500">
                    {selectedGroup === 'all' ? '暂无账号数据' : '该分组下暂无账号'}
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((account) => (
                  <tr key={account.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={selectedAccounts.includes(account.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedAccounts([...selectedAccounts, account.id]);
                          } else {
                            setSelectedAccounts(selectedAccounts.filter(id => id !== account.id));
                          }
                        }}
                      />
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{account.username}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{'*'.repeat(Math.min(account.password?.length || 0, 8))}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {account.secret_key ? (
                        <span className="text-green-600">✓ 已设置</span>
                      ) : (
                        <span className="text-gray-400">✗ 未设置</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-md text-xs">
                        {getGroupName(account.group_id)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {account.proxy_info ? (
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {account.proxy_info.ip}:{account.proxy_info.port}
                          </div>
                          <div className="text-xs text-gray-500">
                            {account.proxy_info.name || account.proxy_info.country || ''}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">未分配</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        account.status === 'active' ? 'bg-green-100 text-green-800' :
                        account.status === 'suspended' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {account.status === 'active' ? '活跃' : 
                         account.status === 'suspended' ? '已封号' : '不活跃'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        account.backup_exported === 1 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {account.backup_exported === 1 ? '已导出' : '未导出'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(account.created_time).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      <button
                        onClick={() => {
                          setSelectedAccounts([account.id]);
                          setShowDeleteDialog(true);
                        }}
                        className="text-red-600 hover:text-red-900 transition-colors"
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

        {/* 分页控件 */}
        {pagination.total > 0 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-700">
                  显示第 <span className="font-medium">{((pagination.page - 1) * pagination.per_page) + 1}</span> 到{' '}
                  <span className="font-medium">{Math.min(pagination.page * pagination.per_page, pagination.total)}</span> 条，
                  共 <span className="font-medium">{pagination.total}</span> 条记录
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePreviousPage}
                  disabled={pagination.page <= 1}
                  className={`relative inline-flex items-center px-2 py-2 rounded-l-md border text-sm font-medium ${
                    pagination.page <= 1
                      ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
                      : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  上一页
                </button>
                
                {/* 页码显示 */}
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
                    let pageNum;
                    if (pagination.total_pages <= 5) {
                      pageNum = i + 1;
                    } else if (pagination.page <= 3) {
                      pageNum = i + 1;
                    } else if (pagination.page >= pagination.total_pages - 2) {
                      pageNum = pagination.total_pages - 4 + i;
                    } else {
                      pageNum = pagination.page - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          pagination.page === pageNum
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={handleNextPage}
                  disabled={pagination.page >= pagination.total_pages}
                  className={`relative inline-flex items-center px-2 py-2 rounded-r-md border text-sm font-medium ${
                    pagination.page >= pagination.total_pages
                      ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
                      : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  下一页
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 添加账号对话框 */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">添加新账号</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
                <input
                  type="text"
                  value={currentAccount.username}
                  onChange={(e) => setCurrentAccount({...currentAccount, username: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入用户名"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
                <input
                  type="password"
                  value={currentAccount.password}
                  onChange={(e) => setCurrentAccount({...currentAccount, password: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入密码"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">2FA密钥 (可选)</label>
                <input
                  type="text"
                  value={currentAccount.secret_key}
                  onChange={(e) => setCurrentAccount({...currentAccount, secret_key: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入2FA密钥"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">分组</label>
                <select
                  value={currentAccount.group_id}
                  onChange={(e) => setCurrentAccount({...currentAccount, group_id: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">选择分组</option>
                  {groups.map(group => (
                    <option key={group.id} value={group.id}>{group.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowAddDialog(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCreateAccount}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 批量导入对话框 */}
      {showBatchDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h3 className="text-lg font-medium text-gray-900 mb-4">批量导入账号</h3>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                请输入账号信息，每行一个账号，支持两种格式：<br/>
                格式1：用户名 密码 2FA密钥(可选) - 空格分隔<br/>
                格式2：用户名--密码--2FA密钥(可选) - 双横线分隔
              </p>
              <div className="mb-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">选择分组</label>
                <select
                  value={currentAccount.group_id}
                  onChange={(e) => setCurrentAccount({...currentAccount, group_id: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">选择分组</option>
                  {groups.map(group => (
                    <option key={group.id} value={group.id}>{group.name}</option>
                  ))}
                </select>
              </div>
              <textarea
                value={batchText}
                onChange={(e) => setBatchText(e.target.value)}
                rows={10}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="PKertzmann5650 z18D338QrriGfNs THBCFOQDPZ5VAFJM&#10;ruth_keefe88802--yW4UZI3njs_drrH--5OOBFCYSFIG3UYOB"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowBatchDialog(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleBatchCreate}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                disabled={!batchText.trim()}
              >
                导入
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 新建分组对话框 */}
      {showGroupDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
             onClick={(e) => e.target === e.currentTarget && setShowGroupDialog(false)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">新建分组</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">分组名称</label>
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="请输入分组名称"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowGroupDialog(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCreateGroup}
                className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors"
                disabled={!newGroupName.trim()}
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 批量修改分组对话框 */}
      {showBatchGroupDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">批量修改分组</h3>
            <p className="text-gray-600 mb-4">
              将选中的 {selectedAccounts.length} 个账号移动到新分组
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">选择分组</label>
              <select 
                value={batchGroupId} 
                onChange={(e) => setBatchGroupId(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">选择分组</option>
                {groups.map(group => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowBatchGroupDialog(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleBatchUpdateGroup}
                className="px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 transition-colors"
                disabled={!batchGroupId}
              >
                确认修改
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 批量分配代理对话框 */}
      {showBatchProxyDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">批量分配代理</h3>
            <p className="text-gray-600 mb-4">
              为选中的 {selectedAccounts.length} 个账号分配代理
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">选择代理</label>
              <select 
                value={batchProxyId} 
                onChange={(e) => setBatchProxyId(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="">取消代理分配</option>
                {proxies.map(proxy => (
                  <option key={proxy.id} value={proxy.id}>
                    {proxy.ip}:{proxy.port}
                    {proxy.name && ` (${proxy.name})`}
                    {proxy.country && ` - ${proxy.country}`}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                选择"取消代理分配"可以移除所选账号的代理配置
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowBatchProxyDialog(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleBatchUpdateProxy}
                className="px-4 py-2 bg-cyan-500 text-white rounded-md hover:bg-cyan-600 transition-colors"
              >
                确认分配
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认对话框 */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">确认删除</h3>
            <p className="text-gray-600 mb-4">
              确定要删除选中的 {selectedAccounts.length} 个账号吗？此操作不可撤销。
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteDialog(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleDeleteAccounts}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountsPage; 