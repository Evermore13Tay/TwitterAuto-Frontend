import React, { useState, useEffect } from 'react';

const SimpleAccountsPage = () => {
    console.log('SimpleAccountsPage component loaded');
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const API_BASE_URL = 'http://localhost:8000';

    useEffect(() => {
        loadAccounts();
    }, []);

    const loadAccounts = async () => {
        try {
            console.log('开始加载账号列表...');
            const response = await fetch(`${API_BASE_URL}/api/accounts`);
            console.log('API响应状态:', response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('API响应数据:', data);
            
            if (data.success) {
                setAccounts(data.accounts || []);
                setError(null);
            } else {
                setError('API返回错误: ' + (data.detail || '未知错误'));
            }
        } catch (error) {
            console.error('加载账号列表失败:', error);
            setError('加载失败: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '20px' }}>
                社媒账号 (简化版测试)
            </h1>

            {loading && (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                    <p>正在加载账号列表...</p>
                </div>
            )}

            {error && (
                <div style={{ 
                    backgroundColor: '#ffebee', 
                    border: '1px solid #f44336', 
                    padding: '15px', 
                    borderRadius: '4px',
                    marginBottom: '20px'
                }}>
                    <h3 style={{ color: '#d32f2f', margin: '0 0 10px 0' }}>错误</h3>
                    <p style={{ margin: 0, color: '#d32f2f' }}>{error}</p>
                </div>
            )}

            {!loading && !error && (
                <div>
                    <div style={{ 
                        backgroundColor: '#e8f5e8', 
                        border: '1px solid #4caf50', 
                        padding: '15px', 
                        borderRadius: '4px',
                        marginBottom: '20px'
                    }}>
                        <h3 style={{ color: '#2e7d32', margin: '0 0 10px 0' }}>
                            成功加载 {accounts.length} 个账号
                        </h3>
                    </div>

                    <div style={{ 
                        border: '1px solid #ddd', 
                        borderRadius: '4px',
                        overflow: 'hidden'
                    }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ backgroundColor: '#f5f5f5' }}>
                                <tr>
                                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                                        用户名
                                    </th>
                                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                                        密码
                                    </th>
                                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                                        2FA密钥
                                    </th>
                                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                                        状态
                                    </th>
                                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                                        备份状态
                                    </th>
                                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                                        创建时间
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {accounts.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" style={{ 
                                            padding: '20px', 
                                            textAlign: 'center', 
                                            color: '#666'
                                        }}>
                                            暂无账号数据
                                        </td>
                                    </tr>
                                ) : (
                                    accounts.map((account, index) => (
                                        <tr key={account.id || index} style={{ 
                                            borderBottom: '1px solid #ddd',
                                            backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9f9f9'
                                        }}>
                                            <td style={{ padding: '12px' }}>{account.username}</td>
                                            <td style={{ padding: '12px' }}>
                                                {'*'.repeat(Math.min(account.password?.length || 0, 8))}
                                            </td>
                                            <td style={{ padding: '12px' }}>
                                                {account.secret_key ? '已设置' : '未设置'}
                                            </td>
                                            <td style={{ padding: '12px' }}>
                                                <span style={{
                                                    padding: '4px 8px',
                                                    borderRadius: '12px',
                                                    fontSize: '12px',
                                                    backgroundColor: account.status === 'active' ? '#e8f5e8' : '#ffebee',
                                                    color: account.status === 'active' ? '#2e7d32' : '#d32f2f'
                                                }}>
                                                    {account.status === 'active' ? '活跃' : 
                                                     account.status === 'suspended' ? '已封号' : '不活跃'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px' }}>
                                                <span style={{
                                                    padding: '4px 8px',
                                                    borderRadius: '12px',
                                                    fontSize: '12px',
                                                    backgroundColor: account.backup_exported === 1 ? '#e3f2fd' : '#f5f5f5',
                                                    color: account.backup_exported === 1 ? '#1976d2' : '#666'
                                                }}>
                                                    {account.backup_exported === 1 ? '已导出' : '未导出'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px' }}>
                                                {new Date(account.created_time).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <button 
                        onClick={loadAccounts}
                        style={{
                            marginTop: '20px',
                            padding: '10px 20px',
                            backgroundColor: '#2196f3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        重新加载
                    </button>
                </div>
            )}
        </div>
    );
};

export default SimpleAccountsPage; 