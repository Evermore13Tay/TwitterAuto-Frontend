import React, { useState, useEffect, useRef, useMemo } from 'react';
import { API_BASE_URL, CONFIG } from './config';
import { fetchDevicesByIp, sendProcessedDevicesToBackend } from './utils/deviceApiService';

// 辅助图标组件 (可选，但可以增加美观度)
const IconPencil = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
);

const IconTrash = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const IconLogin = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h5a3 3 0 013 3v1" />
    </svg>
);

const IconPlus = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
);


function DeviceManagePage() {
    const [deviceUsers, setDeviceUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');

    const [isEditing, setIsEditing] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [formData, setFormData] = useState({
        device_ip: localStorage.getItem('dm_device_ip') || '',
        u2_port: localStorage.getItem('dm_u2_port') || CONFIG.DEFAULT_PORTS.U2_PORT,
        myt_rpc_port: localStorage.getItem('dm_myt_rpc_port') || CONFIG.DEFAULT_PORTS.MYT_RPC_PORT,
        username: localStorage.getItem('dm_username') || '',
        password: localStorage.getItem('dm_password') || '',
        secret_key: localStorage.getItem('dm_secret_key') || '',
        device_name: localStorage.getItem('dm_device_name') || ''
    });
    
    const [selectedDevices, setSelectedDevices] = useState([]);
    const [showLoginPanel, setShowLoginPanel] = useState(false);
    const [isLoginProcessing, setIsLoginProcessing] = useState(false);
    const [statusMessages, setStatusMessages] = useState('');
    const [loginProgress, setLoginProgress] = useState(0);
    const [completedDevicesCount, setCompletedDevicesCount] = useState(0);
    
    const [loggingInDevices, setLoggingInDevices] = useState({});
    
    const statusEndRef = useRef(null);

    const [batchLoginDetails, setBatchLoginDetails] = useState([]);

    // 分页相关状态
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(50); // 默认每页50条
    const [searchTerm, setSearchTerm] = useState(''); // 搜索过滤
    const [totalDeviceCount, setTotalDeviceCount] = useState(0); // 总设备数
    const [isBackendPagination, setIsBackendPagination] = useState(true); // 是否使用后端分页

    // 计算分页数据
    const filteredDevices = useMemo(() => {
        if (isBackendPagination) {
            // 使用后端分页时，数据已经是过滤和分页后的
            return deviceUsers;
        }
        // 前端分页逻辑（兼容模式）
        if (!searchTerm) return deviceUsers;
        
        const lowerSearchTerm = searchTerm.toLowerCase();
        return deviceUsers.filter(device => 
            device.device_name?.toLowerCase().includes(lowerSearchTerm) ||
            device.device_ip?.toLowerCase().includes(lowerSearchTerm) ||
            device.username?.toLowerCase().includes(lowerSearchTerm)
        );
    }, [deviceUsers, searchTerm, isBackendPagination]);
    
    const totalPages = useMemo(() => {
        if (isBackendPagination) {
            return Math.ceil(totalDeviceCount / pageSize);
        }
        return Math.ceil(filteredDevices.length / pageSize);
    }, [totalDeviceCount, filteredDevices.length, pageSize, isBackendPagination]);
    
    const paginatedDevices = useMemo(() => {
        if (isBackendPagination) {
            // 使用后端分页时，数据已经是分页后的
            return deviceUsers;
        }
        // 前端分页逻辑（兼容模式）
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        return filteredDevices.slice(startIndex, endIndex);
    }, [filteredDevices, currentPage, pageSize, isBackendPagination, deviceUsers]);
    
    // 当搜索词或分页参数变化时，重新获取数据
    useEffect(() => {
        if (isBackendPagination) {
            const debounceTimer = setTimeout(() => {
                fetchDeviceUsers(currentPage, pageSize, searchTerm);
            }, 300); // 防抖，避免频繁请求
            
            return () => clearTimeout(debounceTimer);
        } else {
            // 前端分页模式下，搜索词变化时重置页码
            setCurrentPage(1);
        }
    }, [searchTerm, currentPage, pageSize, isBackendPagination]);

    useEffect(() => {
        if (!isBackendPagination) {
            // 前端分页模式下，初始加载一次所有数据
            fetchDeviceUsers();
        }
    }, []);

    useEffect(() => {
        Object.keys(formData).forEach(key => {
            localStorage.setItem(`dm_${key}`, formData[key]);
        });
    }, [formData]);
    
    useEffect(() => {
        if (statusEndRef.current) {
            statusEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [statusMessages]);

    const fetchDeviceUsers = async (page = currentPage, size = pageSize, search = searchTerm) => {
        setIsLoading(true);
        setError(null);
        
        try {
            if (isBackendPagination) {
                // 使用后端分页API
                const params = new URLSearchParams({
                    page: page.toString(),
                    page_size: size.toString(),
                });
                if (search) {
                    params.append('search', search);
                }
                
                const response = await fetch(`${API_BASE_URL}/device-users/paginated?${params}`);
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ detail: '获取设备用户列表失败' }));
                    throw new Error(errorData.detail || '网络响应不正常。');
                }
                
                const data = await response.json();
                setDeviceUsers(data.items || []);
                setTotalDeviceCount(data.total || 0);
                
                // 调试：检查是否有封号账号
                const suspendedDevices = data.items.filter(d => d.is_suspended);
                console.log('Total devices:', data.items.length);
                console.log('Suspended devices:', suspendedDevices.length);
                console.log('First 3 devices:', data.items.slice(0, 3));
                console.log('Suspended devices list:', suspendedDevices);
                
                // 如果当前页超出范围，重置到第一页
                if (data.items.length === 0 && page > 1) {
                    setCurrentPage(1);
                    fetchDeviceUsers(1, size, search);
                }
            } else {
                // 回退到获取所有数据（兼容旧版本）
                const response = await fetch(`${API_BASE_URL}/device-users`);
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ detail: '获取设备用户列表失败' }));
                    throw new Error(errorData.detail || '网络响应不正常。');
                }
                const data = await response.json();
                setDeviceUsers(data || []);
                setTotalDeviceCount(data.length || 0);
                
                // 调试：检查是否有封号账号
                const suspendedDevices = data.filter(d => d.is_suspended);
                console.log('Total devices:', data.length);
                console.log('Suspended devices:', suspendedDevices.length);
                console.log('First 3 devices:', data.slice(0, 3));
                console.log('Suspended devices list:', suspendedDevices);
            }
        } catch (err) {
            setError(err.message);
            console.error("获取设备用户错误:", err);
        } finally {
            setIsLoading(false);
        }
    };

    // 新增：同步特定IP的设备信息
    const syncDevicesByIP = async (ip) => {
        try {
            setIsLoading(true);
            setError(null);
            setStatusMessages(prev => prev + `\n正在同步IP ${ip} 的设备信息...`);
            
            // 从Device Control API获取设备
            const deviceData = await fetchDevicesByIp(ip);
            
            if (deviceData && deviceData.length > 0) {
                console.log(`从IP ${ip} 成功获取到 ${deviceData.length} 个设备`);
                setStatusMessages(prev => prev + `\n从IP ${ip} 获取到 ${deviceData.length} 个设备`);
                
                // 将处理后的数据发送到后端进行数据库存储
                const result = await sendProcessedDevicesToBackend(deviceData, ip);
                
                if (result.success) {
                    console.log(`成功更新数据库: 更新了${result.updated}个设备，创建了${result.created}个设备`);
                    setStatusMessages(prev => prev + `\n成功更新数据库: 更新了${result.updated}个设备，创建了${result.created}个设备}`);
                    setSuccessMessage(`成功更新 ${result.total} 个设备!`);
                    
                    // 刷新设备列表
                    await fetchDeviceUsers();
                } else {
                    console.error(`更新数据库失败:`, result);
                    setStatusMessages(prev => prev + `\n更新数据库失败: ${result.error || '未知错误'}`);
                    setError(`更新数据库失败: ${result.error || '未知错误'}`);
                }
            } else {
                console.warn(`从IP ${ip} 未获取到任何设备`);
                setStatusMessages(prev => prev + `\n从IP ${ip} 未获取到任何设备`);
                setError(`从IP ${ip} 未获取到任何设备，请检查IP地址是否正确`);
            }
        } catch (err) {
            console.error(`获取设备信息失败 (IP: ${ip}):`, err);
            setStatusMessages(prev => prev + `\n获取设备信息失败 (IP: ${ip}): ${err.message || '未知错误'}`);
            setError(`获取设备信息失败: ${err.message || '未知错误'}`);
        } finally {
            setIsLoading(false);
        }
    };

    // 新增：批量同步所有唯一IP的设备
    const syncAllDevices = async () => {
        const uniqueIPs = new Set();
        
        // 如果使用后端分页，需要先获取所有设备来提取IP
        let allDevices = deviceUsers;
        if (isBackendPagination) {
            setIsLoading(true);
            try {
                // 获取所有设备（不分页）
                const response = await fetch(`${API_BASE_URL}/device-users`);
                if (!response.ok) {
                    throw new Error('获取设备列表失败');
                }
                allDevices = await response.json();
            } catch (err) {
                setError('获取设备列表失败: ' + err.message);
                setIsLoading(false);
                return;
            }
        }
        
        allDevices.forEach(device => {
            if (device.device_ip) {
                uniqueIPs.add(device.device_ip);
            }
        });
        
        if (uniqueIPs.size === 0) {
            setError('没有找到任何设备IP');
            setIsLoading(false);
            return;
        }
        
        setIsLoading(true);
        setError(null);
        setStatusMessages('');
        
        console.log(`开始同步 ${uniqueIPs.size} 个IP的设备信息...`);
        setStatusMessages(`开始同步 ${uniqueIPs.size} 个IP的设备信息...`);
        
        let successCount = 0;
        let failCount = 0;
        
        for (const ip of uniqueIPs) {
            try {
                console.log(`正在同步IP ${ip} 的设备信息...`);
                setStatusMessages(prev => prev + `\n正在同步IP ${ip} 的设备信息...`);
                
                const deviceData = await fetchDevicesByIp(ip);
                
                if (deviceData && deviceData.length > 0) {
                    const result = await sendProcessedDevicesToBackend(deviceData, ip);
                    
                    if (result.success) {
                        successCount++;
                        setStatusMessages(prev => prev + `\n✓ IP ${ip}: 成功更新 ${result.total} 个设备`);
                    } else {
                        failCount++;
                        setStatusMessages(prev => prev + `\n✗ IP ${ip}: 更新失败 - ${result.error || '未知错误'}`);
                    }
                } else {
                    failCount++;
                    setStatusMessages(prev => prev + `\n✗ IP ${ip}: 未获取到任何设备`);
                }
            } catch (err) {
                failCount++;
                console.error(`同步IP ${ip} 失败:`, err);
                setStatusMessages(prev => prev + `\n✗ IP ${ip}: 同步失败 - ${err.message || '未知错误'}`);
            }
        }
        
        setStatusMessages(prev => prev + `\n\n同步完成: 成功 ${successCount} 个IP, 失败 ${failCount} 个IP`);
        
        // 刷新设备列表
        await fetchDeviceUsers(currentPage, pageSize, searchTerm);
        setIsLoading(false);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const resetForm = () => {
        setFormData({
            device_ip: '',
            u2_port: CONFIG.DEFAULT_PORTS.U2_PORT,
            myt_rpc_port: CONFIG.DEFAULT_PORTS.MYT_RPC_PORT,
            username: '',
            password: '',
            secret_key: '',
            device_name: ''
        });
        setIsEditing(false);
        setCurrentUserId(null);
        setError(null); // Clear error on reset
    };
    
    const showSuccessMessage = (message) => {
        setSuccessMessage(message);
        setTimeout(() => setSuccessMessage(''), 3000);
    }

    const validateForm = () => {
        const errors = [];
        if (!formData.device_name.trim()) errors.push("设备名称不能为空");
        if (!formData.device_ip.trim()) errors.push("设备IP不能为空");
        // Regex for basic IP validation (not exhaustive but better than nothing)
        const ipRegex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        if (formData.device_ip.trim() && !ipRegex.test(formData.device_ip.trim())) errors.push("设备IP格式无效");

        if (!formData.username.trim()) errors.push("用户名不能为空");
        
        const u2Port = parseInt(formData.u2_port);
        const mytRpcPort = parseInt(formData.myt_rpc_port);
        
        if (isNaN(u2Port) || u2Port <= 0 || u2Port > 65535) errors.push("U2端口必须是1-65535之间的有效数字");
        if (isNaN(mytRpcPort) || mytRpcPort <= 0 || mytRpcPort > 65535) errors.push("MytRpc端口必须是1-65535之间的有效数字");
        
        return errors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const validationErrors = validateForm();
        if (validationErrors.length > 0) {
            setError(validationErrors.join("； "));
            return;
        }

        setError(null);
        setSuccessMessage('');

        const payload = {
            ...formData,
            device_name: formData.device_name.trim(),
            device_ip: formData.device_ip.trim(),
            username: formData.username.trim(),
            u2_port: parseInt(formData.u2_port),
            myt_rpc_port: parseInt(formData.myt_rpc_port),
        };

        const url = isEditing ? `${API_BASE_URL}/device-users/${currentUserId}` : `${API_BASE_URL}/device-users`;
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `未能${isEditing ? '更新' : '添加'}设备`);
            }
            
            showSuccessMessage(`设备${isEditing ? '更新' : '添加'}成功！`);
            resetForm();
            fetchDeviceUsers(); 
        } catch (err) {
            setError(err.message);
            console.error("提交设备用户错误:", err);
        }
    };

    const handleEdit = (user) => {
        setIsEditing(true);
        setCurrentUserId(user.id);
        setFormData({
            device_ip: user.device_ip,
            u2_port: user.u2_port.toString(),
            myt_rpc_port: user.myt_rpc_port.toString(),
            username: user.username,
            password: user.password || '', // Keep password if not changed
            secret_key: user.secret_key || '',
            device_name: user.device_name
        });
        setError(null);
        setSuccessMessage('');
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to form for editing
    };

    const handleDelete = async (userId) => {
        if (!window.confirm("您确定要删除此设备吗？此操作无法撤销。")) return;
        
        setError(null);
        setSuccessMessage('');
        
        try {
            const response = await fetch(`${API_BASE_URL}/device-users/${userId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || '删除设备失败');
            }

            showSuccessMessage('设备删除成功！');
            fetchDeviceUsers(); 
            if (currentUserId === userId) resetForm(); 
        } catch (err) {
            setError(err.message);
            console.error("删除设备用户错误:", err);
        }
    };
    
    const handleDeviceSelect = (deviceId) => {
        setSelectedDevices(prev => 
            prev.includes(deviceId) ? prev.filter(id => id !== deviceId) : [...prev, deviceId]
        );
    };
    
    const toggleSelectAll = () => {
        const currentPageDeviceIds = paginatedDevices.map(device => device.id);
        const allCurrentPageSelected = currentPageDeviceIds.every(id => selectedDevices.includes(id));
        
        if (allCurrentPageSelected) {
            // 取消选择当前页的所有设备
            setSelectedDevices(prev => prev.filter(id => !currentPageDeviceIds.includes(id)));
        } else {
            // 选择当前页的所有设备
            setSelectedDevices(prev => [...new Set([...prev, ...currentPageDeviceIds])]);
        }
    };
    
    const appendStatus = (message) => {
        setStatusMessages(prev => `${prev}${new Date().toLocaleTimeString()}: ${message}\n`);
    };
    
    const commonLoginLogic = async (usersToLogin, isBatch = false) => {
        setError(null);
        if (!showLoginPanel && !isBatch) { // Open panel for single login if not already open
            setStatusMessages('');
            setShowLoginPanel(true);
        }
        
        if (isBatch) {
            setIsLoginProcessing(true);
            setStatusMessages('');
            appendStatus('准备批量登录...');
            setLoginProgress(0);
            setCompletedDevicesCount(0);
        } else {
             // Update single device login status
            usersToLogin.forEach(user => {
                setLoggingInDevices(prev => ({ ...prev, [user.id]: true }));
            });
        }

        try {
            appendStatus(`开始登录 ${isBatch ? selectedDevices.length + ' 个设备' : usersToLogin[0].device_name}...`);
            
            // 使用logintest而不是check login
            const endpoint = `${API_BASE_URL}/${isBatch ? 'batch-login' : 'api/single-account-login'}`;
            
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ device_users: usersToLogin }),
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                const errorMsg = data.detail || `${isBatch ? '批量' : ''}登录请求失败`;
                appendStatus(`错误: ${errorMsg}`);
                if (isBatch) setError(errorMsg);
                throw new Error(errorMsg);
            }

            const data = await response.json();
            if (data.task_id) {
                appendStatus(`${isBatch ? '批量' : ''}登录任务已创建 (ID: ${data.task_id})，正在连接WebSocket...`);
                
                const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                const wsHost = window.location.hostname || 'localhost';
                const wsPort = API_BASE_URL.includes(':8000') || process.env.NODE_ENV !== 'production' ? '8000' : window.location.port;

                const ws = new WebSocket(`${wsProtocol}//${wsHost}:${wsPort}/ws/${data.task_id}`);
                
                ws.onopen = () => appendStatus(`WebSocket已连接，开始执行${isBatch ? '批量' : ''}登录操作...`);
                
                ws.onmessage = (event) => {
                    const wsData = JSON.parse(event.data);
                    const deviceIdentifier = wsData.device_name || wsData.device_ip || '未知设备';

                    if (wsData.type === 'status') {
                        appendStatus(`${deviceIdentifier}: ${wsData.message || wsData.status || ''}`);
                    } else if (wsData.type === 'device_completed') {
                        appendStatus(`${deviceIdentifier}: ${wsData.message || '处理完成。'}`);
                        if (isBatch) {
                            setCompletedDevicesCount(prev => {
                                const newCount = prev + 1;
                                setLoginProgress(Math.round((newCount / selectedDevices.length) * 100));
                                return newCount;
                            });
                        } else {
                             setLoggingInDevices(prev => ({ ...prev, [usersToLogin[0].id]: false }));
                        }
                    } else if (wsData.type === 'completed') {
                        appendStatus(`${isBatch ? '批量' : deviceIdentifier + ' '}登录全部完成.`);
                        if (isBatch) setLoginProgress(100);
                    } else if (wsData.type === 'failed') {
                        const failMsg = `${deviceIdentifier}: ${wsData.message || (isBatch ? '批量登录中发生错误' : '登录中发生错误')}`;
                        appendStatus(`错误: ${failMsg}`);
                        if (isBatch) setError(failMsg);
                         if (!isBatch) setLoggingInDevices(prev => ({ ...prev, [usersToLogin[0].id]: false }));
                    }
                };
                
                ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    const errorMsg = 'WebSocket连接失败，请检查网络连接或服务器状态。';
                    appendStatus(`错误: ${errorMsg}`);
                    if (isBatch) setError(errorMsg);
                };
                
                ws.onclose = (event) => {
                    appendStatus(`WebSocket连接已关闭 (代码: ${event.code}, 原因: ${event.reason || '未知'})`);
                    if (isBatch) setIsLoginProcessing(false);
                    else usersToLogin.forEach(user => setLoggingInDevices(prev => ({ ...prev, [user.id]: false })));
                     // If processing was ongoing and it wasn't a clean close
                    if (isLoginProcessing && (event.code !== 1000 && event.code !== 1005)) { 
                        appendStatus('任务处理可能已中断或提前结束。');
                    }
                };

                // 轮询 batch-login-status 获取 details
                if (isBatch) {
                    // 轮询直到任务完成，获取 details
                    let pollCount = 0;
                    let detailsResult = [];
                    while (pollCount < 60) {
                        await new Promise(res => setTimeout(res, 2000));
                        const statusResp = await fetch(`${API_BASE_URL}/batch-login-status/${data.task_id}`);
                        if (!statusResp.ok) continue;
                        const statusJson = await statusResp.json();
                        if (statusJson.details) detailsResult = statusJson.details;
                        if (statusJson.status === 'succeeded' || statusJson.status === 'completed' || statusJson.status === 'failed') break;
                    }
                    setBatchLoginDetails(detailsResult);
                }
            } else {
                const errorMsg = data.message || `创建${isBatch ? '批量' : ''}登录任务失败`;
                appendStatus(`错误: ${errorMsg}`);
                if (isBatch) setError(errorMsg);
            }
        } catch (err) {
            console.error(`${isBatch ? '批量' : '单个'}登录错误:`, err);
            const errorMsg = err.message || '连接服务器失败';
            appendStatus(`错误: ${errorMsg}`);
            if (isBatch) setError(errorMsg);
        } finally {
            if (isBatch) setIsLoginProcessing(false);
            else usersToLogin.forEach(user => setLoggingInDevices(prev => ({ ...prev, [user.id]: false })));
        }
    };

    const handleSingleLogin = async (user) => {
        commonLoginLogic([user], false);
    };
    
    const handleBatchLoginSubmit = async () => {
        if (selectedDevices.length === 0) {
            setError('请至少选择一个设备进行批量登录。');
            return;
        }
        const selectedDeviceUsers = deviceUsers.filter(user => selectedDevices.includes(user.id));
        // 只执行登录，不做导出备份
        commonLoginLogic(selectedDeviceUsers, true);
    };

    // 表单字段生成函数
    const createFormField = (label, type, name, value, onChange, placeholder = '', required = false, helpText = '') => (
        <div className="apple-form-group">
            <label htmlFor={name} className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                {label} {required && <span className="text-[var(--danger-color)]">*</span>}
            </label>
            <input
                id={name}
                name={name}
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder || `请输入${label.replace(':', '')}`}
                className="apple-input"
                required={required}
            />
            {helpText && <p className="mt-1 text-xs text-[var(--text-tertiary)]">{helpText}</p>}
        </div>
    );

    // 添加一个按钮，用于从指定IP获取设备
    const renderFetchDevicesButton = () => (
        <div className="mt-4">
            <button
                type="button"
                onClick={() => {
                    // 验证IP地址格式和不为空
                    if (!formData.device_ip || formData.device_ip.trim() === '') {
                        setError('请先输入有效的设备IP地址');
                        return;
                    }
                    
                    // 简单的IP地址验证
                    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
                    if (!ipPattern.test(formData.device_ip)) {
                        setError('请输入有效的IP地址格式（例如：192.168.1.100）');
                        return;
                    }
                    
                    // 清除之前的错误消息
                    setError(null);
                    
                    // 执行获取设备操作
                    syncDevicesByIP(formData.device_ip);
                }}
                disabled={!formData.device_ip || isLoading}
                className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
                同步该IP的设备信息
            </button>
            <div className="mt-2 text-sm text-gray-600">
                从Device Control API获取该IP的设备信息并更新数据库
            </div>
        </div>
    );

    return (
        <div className="space-y-8 p-4 md:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight">设备管理中心</h1>
                <button 
                    onClick={() => setShowLoginPanel(!showLoginPanel)}
                    className={`apple-button whitespace-nowrap ${showLoginPanel ? 'bg-gray-500 hover:bg-gray-600' : 'bg-[var(--primary-color)] hover:bg-[var(--primary-dark)]'}`}
                >
                    {showLoginPanel ? '关闭登录面板' : '打开批量登录面板'}
                </button>
            </div>

            {/* 添加/编辑设备表单 */}
            <div className="apple-card p-6 md:p-8 shadow-lg hover-lift">
                <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-6 pb-3 border-b border-[var(--border-color)]">
                    {isEditing ? '编辑设备信息' : '添加新设备'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
                        {createFormField('设备名称:', 'text', 'device_name', formData.device_name, handleInputChange, '例如：我的测试机', true)}
                        {createFormField('设备IP地址:', 'text', 'device_ip', formData.device_ip, handleInputChange, '例如：192.168.1.100', true)}
                        {createFormField('ADB端口(u2):', 'number', 'u2_port', formData.u2_port, handleInputChange, '默认: 7912', true, '通常为7912')}
                        {createFormField('MytRpc端口(辅助控制):', 'number', 'myt_rpc_port', formData.myt_rpc_port, handleInputChange, '默认: 18018', true, '通常为18018')}
                        {createFormField('推特账号:', 'text', 'username', formData.username, handleInputChange, '用于设备登录', true)}
                        {createFormField('推特密码:', 'password', 'password', formData.password, handleInputChange, isEditing ? '留空则不修改密码' : '设备登录密码')}
                        {createFormField('2FA密钥:', 'text', 'secret_key', formData.secret_key, handleInputChange, '两步验证密钥')}
                    </div>
                    <div className="flex items-center space-x-3 pt-4">
                        <button
                            type="submit"
                            className="apple-button flex items-center"
                        >
                           {isEditing ? <IconPencil /> : <IconPlus /> }
                           {isEditing ? '更新设备信息' : '确认添加设备'}
                        </button>
                        <button
                            type="button" onClick={resetForm}
                            className="apple-button-secondary"
                        >
                            取消
                        </button>
                    </div>
                </form>
            </div>
            
            {/* 错误/成功消息提示 */}
            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-md shadow" role="alert">
                    <div className="flex">
                        <div className="py-1"><svg className="fill-current h-6 w-6 text-red-500 mr-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zM11.414 10l2.829-2.828-1.414-1.414L10 8.586 7.172 5.757 5.758 7.172 8.586 10l-2.828 2.828 1.414 1.414L10 11.414l2.828 2.828 1.414-1.414L11.414 10z"/></svg></div>
                        <div>
                            <p className="font-bold">操作失败</p>
                            <p className="text-sm">{error}</p>
                        </div>
                    </div>
                </div>
            )}
            {successMessage && (
                <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 rounded-md shadow" role="alert">
                     <div className="flex">
                        <div className="py-1"><svg className="fill-current h-6 w-6 text-green-500 mr-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zm12.73-1.41A8 8 0 1 0 4.34 4.34a8 8 0 0 0 11.32 11.32zM6.7 9.29L9 11.6l4.3-4.3 1.4 1.42L9 14.4l-3.7-3.7 1.4-1.42z"/></svg></div>
                        <div>
                            <p className="font-bold">操作成功</p>
                            <p className="text-sm">{successMessage}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* 设备列表 */}
            <div className="apple-card p-6 md:p-8 shadow-lg hover-lift">
                <div className="flex justify-between items-center mb-6 pb-3 border-b border-[var(--border-color)]">
                    <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                        已注册设备列表 ({isBackendPagination ? totalDeviceCount : filteredDevices.length} 个设备)
                    </h2>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={syncAllDevices}
                            className="apple-button text-sm flex items-center bg-orange-500 hover:bg-orange-600"
                            title="同步所有IP的设备信息"
                            disabled={isLoading || (isBackendPagination ? totalDeviceCount === 0 : deviceUsers.length === 0)}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                            </svg>
                            同步所有设备
                        </button>
                        <button
                            onClick={() => fetchDeviceUsers(currentPage, pageSize, searchTerm)}
                            className="apple-button text-sm flex items-center"
                            title="从数据库刷新设备列表"
                            disabled={isLoading}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            {isLoading ? '加载中...' : '刷新列表'}
                        </button>
                    </div>
                </div>
                
                {/* 搜索和分页控件 */}
                <div className="mb-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <input
                            type="text"
                            placeholder="搜索设备名称、IP或用户名..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="apple-input w-full sm:w-64"
                        />
                        <select
                            value={pageSize}
                            onChange={(e) => {
                                const newSize = Number(e.target.value);
                                setPageSize(newSize);
                                setCurrentPage(1); // 改变每页大小时重置到第一页
                            }}
                            className="apple-input w-auto"
                        >
                            <option value={20}>20条/页</option>
                            <option value={50}>50条/页</option>
                            <option value={100}>100条/页</option>
                            <option value={200}>200条/页</option>
                        </select>
                        
                        {/* 分页模式切换 */}
                        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                            <input
                                type="checkbox"
                                checked={isBackendPagination}
                                onChange={(e) => {
                                    setIsBackendPagination(e.target.checked);
                                    setCurrentPage(1);
                                    // 切换模式时重新加载数据
                                    if (e.target.checked) {
                                        fetchDeviceUsers(1, pageSize, searchTerm);
                                    } else {
                                        fetchDeviceUsers();
                                    }
                                }}
                                className="apple-checkbox"
                            />
                            高性能模式
                        </label>
                    </div>
                    
                    {/* 分页信息 */}
                    <div className="text-sm text-[var(--text-secondary)]">
                        {isBackendPagination ? (
                            `显示 ${Math.min((currentPage - 1) * pageSize + 1, totalDeviceCount)}-${Math.min(currentPage * pageSize, totalDeviceCount)} 条，共 ${totalDeviceCount} 条`
                        ) : (
                            `显示 ${Math.min((currentPage - 1) * pageSize + 1, filteredDevices.length)}-${Math.min(currentPage * pageSize, filteredDevices.length)} 条，共 ${filteredDevices.length} 条`
                        )}
                    </div>
                </div>
                
                {isLoading && <div className="flex items-center justify-center space-x-2 py-10"><div className="loader"></div><p className="text-[var(--text-tertiary)]">正在努力加载设备数据...</p></div>}
                
                {!isLoading && deviceUsers.length === 0 && !error && 
                    <div className="text-center py-10">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">暂无设备</h3>
                        <p className="mt-1 text-sm text-gray-500">请在上方表单中添加您的第一个设备。</p>
                    </div>
                }

                {!isLoading && deviceUsers.length > 0 && (
                    <div className="overflow-x-auto apple-table-container rounded-lg border border-[var(--border-color)]">
                        <table className="min-w-full apple-table">
                            <thead className="bg-gray-50">
                                <tr>
                                    {showLoginPanel && (
                                        <th scope="col" className="w-16 py-3.5 px-4 text-center text-sm font-semibold text-[var(--text-primary)]">
                                            <input
                                                type="checkbox"
                                                className="apple-checkbox h-4 w-4 rounded border-gray-300 text-[var(--primary-color)] focus:ring-[var(--primary-color)]"
                                                checked={paginatedDevices.length > 0 && paginatedDevices.every(device => selectedDevices.includes(device.id))}
                                                onChange={toggleSelectAll}
                                                disabled={isLoginProcessing}
                                                title={paginatedDevices.every(device => selectedDevices.includes(device.id)) ? "取消选择当前页" : "选择当前页"}
                                            />
                                        </th>
                                    )}
                                    <th scope="col" className="py-3.5 px-4 text-left text-sm font-semibold text-[var(--text-primary)]">设备名称</th>
                                    <th scope="col" className="py-3.5 px-4 text-left text-sm font-semibold text-[var(--text-primary)]">设备IP</th>
                                    <th scope="col" className="py-3.5 px-4 text-center text-sm font-semibold text-[var(--text-primary)]">U2端口</th>
                                    <th scope="col" className="py-3.5 px-4 text-center text-sm font-semibold text-[var(--text-primary)]">MytRpc端口</th>
                                    <th scope="col" className="py-3.5 px-4 text-left text-sm font-semibold text-[var(--text-primary)]">用户名</th>
                                    <th scope="col" className="py-3.5 px-4 text-center text-sm font-semibold text-[var(--text-primary)]">账号状态</th>
                                    <th scope="col" className="py-3.5 px-4 text-center text-sm font-semibold text-[var(--text-primary)]">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {paginatedDevices.map(user => (
                                    <tr key={user.id} className="hover:bg-gray-50 transition-colors duration-150 device-item">
                                        {showLoginPanel && (
                                            <td className="py-4 px-4 text-center">
                                                <input
                                                    type="checkbox"
                                                    className="apple-checkbox h-4 w-4 rounded border-gray-300 text-[var(--primary-color)] focus:ring-[var(--primary-color)]"
                                                    checked={selectedDevices.includes(user.id)}
                                                    onChange={() => handleDeviceSelect(user.id)}
                                                    disabled={isLoginProcessing}
                                                />
                                            </td>
                                        )}
                                        <td className="whitespace-nowrap py-4 px-4 text-sm font-medium text-gray-900">{user.device_name}</td>
                                        <td className="whitespace-nowrap py-4 px-4 text-sm text-gray-500">{user.device_ip}</td>
                                        <td className="whitespace-nowrap py-4 px-4 text-center text-sm text-gray-500">{user.u2_port}</td>
                                        <td className="whitespace-nowrap py-4 px-4 text-center text-sm text-gray-500">{user.myt_rpc_port}</td>
                                        <td className="whitespace-nowrap py-4 px-4 text-sm text-gray-500">{user.username}</td>
                                        <td className="whitespace-nowrap py-4 px-4 text-center text-sm">
                                            {user.is_suspended ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                    已封号
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    正常
                                                </span>
                                            )}
                                        </td>
                                        <td className="whitespace-nowrap py-4 px-4 text-sm text-center">
                                            <div className="flex items-center justify-center space-x-2">
                                                <button
                                                    onClick={() => handleSingleLogin(user)}
                                                    disabled={loggingInDevices[user.id]}
                                                    className="apple-button-icon text-[var(--success-color)] hover:text-green-700 disabled:opacity-50 disabled:cursor-not-allowed group"
                                                    title="登录此设备"
                                                >
                                                    {loggingInDevices[user.id] ? (
                                                        <span className="flex items-center">
                                                            <svg className="animate-spin h-4 w-4 mr-1 text-[var(--success-color)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                            </svg>
                                                            登录中
                                                        </span>
                                                    ) : <><IconLogin /> <span className="hidden group-hover:inline">登入</span></> }
                                                </button>
                                                <button
                                                    onClick={() => handleEdit(user)}
                                                    className="apple-button-icon text-[var(--primary-color)] hover:text-blue-700 group"
                                                    title="修改此设备"
                                                >
                                                    <IconPencil /> <span className="hidden group-hover:inline">修改</span>
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(user.id)}
                                                    className="apple-button-icon text-[var(--danger-color)] hover:text-red-700 group"
                                                    title="删除此设备"
                                                >
                                                   <IconTrash /> <span className="hidden group-hover:inline">删除</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                
                {/* 分页按钮 */}
                {!isLoading && totalPages > 1 && (
                    <div className="mt-4 flex justify-center items-center gap-2">
                        <button
                            onClick={() => {
                                const newPage = Math.max(1, currentPage - 1);
                                setCurrentPage(newPage);
                                if (isBackendPagination) {
                                    fetchDeviceUsers(newPage, pageSize, searchTerm);
                                }
                            }}
                            disabled={currentPage === 1}
                            className="apple-button-secondary text-sm disabled:opacity-50"
                        >
                            上一页
                        </button>
                        
                        <div className="flex items-center gap-1">
                            {/* 显示页码按钮 */}
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum;
                                if (totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                    pageNum = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                } else {
                                    pageNum = currentPage - 2 + i;
                                }
                                
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => {
                                            setCurrentPage(pageNum);
                                            if (isBackendPagination) {
                                                fetchDeviceUsers(pageNum, pageSize, searchTerm);
                                            }
                                        }}
                                        className={`px-3 py-1 text-sm rounded ${
                                            currentPage === pageNum
                                                ? 'bg-[var(--primary-color)] text-white'
                                                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                                        }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                        </div>
                        
                        <button
                            onClick={() => {
                                const newPage = Math.min(totalPages, currentPage + 1);
                                setCurrentPage(newPage);
                                if (isBackendPagination) {
                                    fetchDeviceUsers(newPage, pageSize, searchTerm);
                                }
                            }}
                            disabled={currentPage === totalPages}
                            className="apple-button-secondary text-sm disabled:opacity-50"
                        >
                            下一页
                        </button>
                    </div>
                )}
            </div>

            {/* 批量登录状态面板 */}
            {showLoginPanel && (
                <div className="apple-card p-6 md:p-8 mt-8 shadow-lg hover-lift">
                    <div className="flex justify-between items-center mb-4 pb-3 border-b border-[var(--border-color)]">
                        <h2 className="text-xl font-semibold text-[var(--text-primary)]">批量设备登录</h2>
                        {isLoginProcessing && (
                            <span className="text-sm font-normal text-[var(--text-secondary)]">
                                {completedDevicesCount} / {selectedDevices.length} 已完成
                            </span>
                        )}
                    </div>
                    
                    {isLoginProcessing && (
                        <div className="mb-4">
                            <div className="relative pt-1">
                                <div className="overflow-hidden h-2.5 mb-2 text-xs flex rounded bg-blue-200">
                                    <div 
                                        style={{ width: `${loginProgress}%` }}
                                        className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-[var(--primary-color)] transition-all duration-500 ease-out"
                                    ></div>
                                </div>
                                <p className="text-xs text-right text-[var(--text-tertiary)]">{loginProgress}% 完成</p>
                            </div>
                        </div>
                    )}
                    
                    <div
                        ref={statusEndRef}
                        className="status-log-container mb-6 border border-[var(--border-color)] rounded-lg bg-gray-50 p-4 max-h-[300px] min-h-[100px] overflow-y-auto font-mono text-xs leading-relaxed hide-scrollbar"
                    >
                        {!statusMessages && !isLoginProcessing ? (
                            <p className="text-[var(--text-tertiary)] text-center py-4">
                                选择设备后，点击"开始批量登录"按钮以启动。
                            </p>
                        ) : (
                            statusMessages.split('\n').filter(log => log.trim() !== '').map((log, index) => (
                                <div key={index} className="mb-1">{log}</div>
                            ))
                        )}
                         <div ref={statusEndRef} /> {/* Scroll target */}
                    </div>
                    
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="flex gap-2">
                            <button 
                                onClick={toggleSelectAll}
                                disabled={isLoginProcessing || deviceUsers.length === 0}
                                className="apple-button-secondary text-sm"
                            >
                                {selectedDevices.length === deviceUsers.length && deviceUsers.length > 0
                                    ? '全部取消选择'
                                    : '选择全部设备'}
                            </button>
                            
                            <button 
                                onClick={() => {
                                    // 获取当前页中所有封号的设备ID
                                    const suspendedDeviceIds = paginatedDevices
                                        .filter(device => device.is_suspended)
                                        .map(device => device.id);
                                    
                                    // 如果已经选中了所有封号设备，则取消选择
                                    const allSuspendedSelected = suspendedDeviceIds.every(id => selectedDevices.includes(id));
                                    
                                    if (allSuspendedSelected && suspendedDeviceIds.length > 0) {
                                        // 取消选择所有封号设备
                                        setSelectedDevices(prev => prev.filter(id => !suspendedDeviceIds.includes(id)));
                                    } else {
                                        // 添加所有封号设备到选择
                                        setSelectedDevices(prev => [...new Set([...prev, ...suspendedDeviceIds])]);
                                    }
                                }}
                                disabled={isLoginProcessing || paginatedDevices.filter(d => d.is_suspended).length === 0}
                                className="apple-button-secondary text-sm bg-red-100 hover:bg-red-200 text-red-700"
                            >
                                {(() => {
                                    const suspendedCount = paginatedDevices.filter(d => d.is_suspended).length;
                                    const suspendedSelected = paginatedDevices
                                        .filter(d => d.is_suspended)
                                        .filter(d => selectedDevices.includes(d.id)).length;
                                    
                                    if (suspendedCount === 0) return '无封号账号';
                                    if (suspendedSelected === suspendedCount) return `取消选择封号账号 (${suspendedCount})`;
                                    return `选择封号账号 (${suspendedCount})`;
                                })()}
                            </button>
                        </div>
                        
                        <button
                            onClick={handleBatchLoginSubmit}
                            disabled={isLoginProcessing || selectedDevices.length === 0}
                            className={`apple-button text-sm w-full sm:w-auto ${isLoginProcessing ? 'opacity-75 cursor-not-allowed' : 'pulse-animation'}`}
                        >
                            {isLoginProcessing ? (
                                <span className="flex items-center justify-center">
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    登录处理中...
                                </span>
                                ) : `开始批量登录（仅登录，不导出备份） (${selectedDevices.length}个设备)`}
                        </button>
                    </div>

                    {/* 登录详情展示 */}
                    {batchLoginDetails.length > 0 && (
                        <div className="mt-6">
                            <h3 className="text-base font-semibold mb-2">批量登录结果：</h3>
                            <table className="min-w-full text-xs border border-gray-200 rounded">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="px-2 py-1 border">设备名</th>
                                        <th className="px-2 py-1 border">状态</th>
                                        <th className="px-2 py-1 border">失败原因</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {batchLoginDetails.map(d => (
                                        <tr key={d.device_id}>
                                            <td className="px-2 py-1 border">{d.device_name || d.device_id}</td>
                                            <td className="px-2 py-1 border">{d.login_status === 'success' ? '成功' : '失败'}</td>
                                            <td className="px-2 py-1 border text-red-600 whitespace-pre-line">{d.error_message || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* 添加一个按钮，用于从指定IP获取设备 */}
            {renderFetchDevicesButton()}
        </div>
    );
}

export default DeviceManagePage;