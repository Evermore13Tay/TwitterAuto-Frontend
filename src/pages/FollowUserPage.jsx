import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL, WS_CONFIG } from '../config';

function FollowUserPage() {
    // 设备列表状态
    const [devices, setDevices] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    
    // 用户名输入
    const [usernameToFollow, setUsernameToFollow] = useState('');
    
    // 设备选择 - 改为多选
    const [selectedDevices, setSelectedDevices] = useState([]);
    
    // 状态日志
    const [statusLogs, setStatusLogs] = useState([]);
    const statusLogRef = useRef(null);
    
    // 操作状态
    const [isProcessing, setIsProcessing] = useState(false);
    const [taskId, setTaskId] = useState(null);
    
    // 防止重复加载
    const isLoadingRef = useRef(false);
    
    // WebSocket 连接
    const ws = useRef(null);
    const pingIntervalRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const reconnectAttemptRef = useRef(0);
    const lastMessageTimeRef = useRef(Date.now());
    const taskCompletedRef = useRef(false); // 追踪任务是否已完成
    
    // 初始化 WebSocket 连接
    useEffect(() => {
        // 只有当有任务ID时才连接WebSocket
        if (taskId) {
            // 重置任务完成状态
            taskCompletedRef.current = false;
            connectWebSocket();
            
            // 组件卸载或taskId变化时清理资源
            return () => {
                cleanupWebSocket();
            };
        }
    }, [taskId]);
    
    // 清理 WebSocket 相关资源
    const cleanupWebSocket = () => {
        // 清理 ping interval
        if (pingIntervalRef.current) {
            clearInterval(pingIntervalRef.current);
            pingIntervalRef.current = null;
        }
        
        // 清理重连 timeout
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
        
        // 关闭 WebSocket
        if (ws.current) {
            try {
                ws.current.close();
            } catch (e) {
                console.error("Error closing WebSocket:", e);
            }
            ws.current = null;
        }
        
        // 重置重连尝试计数
        reconnectAttemptRef.current = 0;
    };
    
    // 连接 WebSocket
    const connectWebSocket = () => {
        // 如果任务已完成，不再连接WebSocket
        if (taskCompletedRef.current) {
            console.log('任务已完成，不再连接WebSocket');
            return;
        }
        
        // 先清理之前的连接
        cleanupWebSocket();
        
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsHost = window.location.hostname || 'localhost';
        const wsPort = '8000';
        // 使用特定任务的WebSocket连接
        const wsUrl = taskId ? 
            `${wsProtocol}//${wsHost}:${wsPort}/ws/${taskId}` : 
            `${wsProtocol}//${wsHost}:${wsPort}/ws/status`;
        
        addStatusLog(`连接到WebSocket: ${wsUrl}`);
        
        try {
            // 创建新的WebSocket连接
            ws.current = new WebSocket(wsUrl);
            
            // 设置WebSocket事件处理器
            ws.current.onopen = () => {
                addStatusLog('WebSocket连接已建立');
                console.log('Connected to WebSocket');
                
                // 更新最后消息时间
                lastMessageTimeRef.current = Date.now();
                
                // 立即发送一次ping
                sendPing();
                
                // 启动定期的ping来保持连接
                pingIntervalRef.current = setInterval(() => {
                    sendPing();
                    
                    // 检查是否长时间没有收到消息
                    const now = Date.now();
                    const elapsed = now - lastMessageTimeRef.current;
                    
                    // 如果超过配置的超时时间没有收到任何消息，主动重连
                    if (elapsed > WS_CONFIG.MESSAGE_TIMEOUT) {
                        console.warn(`WebSocket长时间(${elapsed}ms)没有收到消息，主动重连`);
                        addStatusLog(`WebSocket长时间没有收到消息，主动重连...`);
                        cleanupWebSocket();
                        reconnectTimeoutRef.current = setTimeout(() => {
                            connectWebSocket();
                        }, 1000);
                    }
                }, WS_CONFIG.PING_INTERVAL); // 使用配置的ping间隔
            };
            
            ws.current.onmessage = (event) => {
                // 更新最后消息时间
                lastMessageTimeRef.current = Date.now();
                
                try {
                    const data = JSON.parse(event.data);
                    // 处理不同类型的消息
                    if (data.type === 'status_update' && data.message) {
                        addStatusLog(data.message);
                    } else if (data.type === 'status' && data.message) {
                        addStatusLog(data.message);
                    } else if (data.type === 'heartbeat') {
                        // 心跳消息，不显示在日志中，只在控制台打印
                        if (WS_CONFIG.DEBUG) console.debug('收到心跳消息', data);
                        // 收到心跳后主动回应一个ping
                        sendPing();
                    } else if (data.type === 'pong') {
                        // ping响应，不显示在日志中
                        if (WS_CONFIG.DEBUG) console.debug('收到pong响应');
                    } else if (data.type === 'timeout') {
                        // 超时消息，记录并尝试重连
                        console.log('收到WebSocket超时消息:', data);
                        addStatusLog(`WebSocket连接超时: ${data.message}`);
                        // 不需要手动重连，onclose会处理
                    } else if (data.type === 'ping_warning') {
                        // 收到ping警告，立即发送ping
                        console.log('收到ping警告:', data);
                        sendPing();
                    } else if (data.type === 'completed') {
                        // 任务完成消息
                        addStatusLog(`任务完成: ${data.message || '关注用户操作已完成'}`);
                        setIsProcessing(false);
                        taskCompletedRef.current = true; // 标记任务已完成
                        setTaskId(null);
                    } else {
                        // 其他未知类型的消息
                        console.log('收到WebSocket消息:', data);
                    }
                } catch (error) {
                    console.error('解析WebSocket消息错误:', error);
                    addStatusLog(`解析WebSocket消息错误: ${error.message}`);
                }
            };
            
            ws.current.onclose = (event) => {
                console.log('WebSocket连接已关闭, 代码:', event.code, '原因:', event.reason);
                addStatusLog(`WebSocket连接已关闭 (代码: ${event.code}${event.reason ? ', 原因: ' + event.reason : ''})`);
                
                // 清理 ping interval
                if (pingIntervalRef.current) {
                    clearInterval(pingIntervalRef.current);
                    pingIntervalRef.current = null;
                }
                
                // 如果任务已完成，不再尝试重连
                if (taskCompletedRef.current) {
                    console.log('任务已完成，不再尝试重连WebSocket');
                    return;
                }
                
                // 如果不是正常关闭并且任务仍在进行，尝试重新连接
                if (event.code !== 1000 && taskId) {
                    // 使用指数退避策略进行重连
                    const reconnectDelay = Math.min(
                        WS_CONFIG.RECONNECT_BASE_DELAY * (Math.pow(2, reconnectAttemptRef.current) || 1), 
                        WS_CONFIG.MAX_RECONNECT_DELAY
                    );
                    reconnectAttemptRef.current = (reconnectAttemptRef.current || 0) + 1;
                    
                    addStatusLog(`将在 ${reconnectDelay/1000} 秒后尝试重新连接 (尝试 #${reconnectAttemptRef.current})...`);
                    
                    reconnectTimeoutRef.current = setTimeout(() => {
                        addStatusLog('尝试重新连接WebSocket...');
                        connectWebSocket();
                    }, reconnectDelay);
                } else if (!taskId) {
                    // 如果没有活跃任务，不再尝试重连
                    cleanupWebSocket();
                } else {
                    // 正常关闭，重置重连尝试计数
                    reconnectAttemptRef.current = 0;
                }
            };
            
            ws.current.onerror = (error) => {
                console.error('WebSocket错误:', error);
                addStatusLog('WebSocket连接错误');
                // 错误处理由onclose处理重连
            };
        } catch (error) {
            console.error('创建WebSocket连接时出错:', error);
            addStatusLog(`创建WebSocket时出错: ${error.message}`);
            
            // 如果任务已完成，不再尝试重连
            if (taskCompletedRef.current) {
                console.log('任务已完成，不再尝试重连WebSocket');
                return;
            }
            
            // 如果创建失败且任务正在进行，尝试重新连接
            if (taskId) {
                const reconnectDelay = Math.min(
                    WS_CONFIG.RECONNECT_BASE_DELAY * (Math.pow(2, reconnectAttemptRef.current) || 1), 
                    WS_CONFIG.MAX_RECONNECT_DELAY
                );
                reconnectAttemptRef.current = (reconnectAttemptRef.current || 0) + 1;
                
                reconnectTimeoutRef.current = setTimeout(() => {
                    addStatusLog('尝试重新连接WebSocket...');
                    connectWebSocket();
                }, reconnectDelay);
            }
        }
    };
    
    // 发送 ping 消息
    const sendPing = () => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            try {
                ws.current.send(JSON.stringify({ 
                    type: 'ping', 
                    timestamp: new Date().toISOString() 
                }));
                console.debug('发送ping消息');
            } catch (error) {
                console.error('发送ping失败:', error);
                
                // 如果发送失败，尝试重新连接
                cleanupWebSocket();
                reconnectTimeoutRef.current = setTimeout(() => {
                    addStatusLog('Ping失败，尝试重新连接WebSocket...');
                    connectWebSocket();
                }, 1000);
            }
        } else if (ws.current && ws.current.readyState !== WebSocket.CONNECTING) {
            // 如果WebSocket不是OPEN且不是CONNECTING，尝试重新连接
            cleanupWebSocket();
            reconnectTimeoutRef.current = setTimeout(() => {
                addStatusLog('WebSocket未连接，尝试重新连接...');
                connectWebSocket();
            }, 1000);
        }
    };
    
    // 自动滚动状态日志到底部
    useEffect(() => {
        if (statusLogRef.current) {
            statusLogRef.current.scrollTop = statusLogRef.current.scrollHeight;
        }
    }, [statusLogs]);
    
    // 初始化加载设备列表
    useEffect(() => {
        // 确保只加载一次设备
        if (!isLoadingRef.current) {
            isLoadingRef.current = true;
            fetchDevices().finally(() => {
                isLoadingRef.current = false;
            });
        }
        
        // 从本地存储加载上次使用的用户名
        const savedUsername = localStorage.getItem('lastFollowedUsername') || 'taylorswift13';
        setUsernameToFollow(savedUsername);
    }, []);
    
    // 添加状态日志
    const addStatusLog = (message) => {
        setStatusLogs(prev => [...prev, message]);
    };
    
    // 获取设备列表
    const fetchDevices = async () => {
        // 如果已经在加载中，不重复请求
        if (isLoading) return;
        
        setIsLoading(true);
        setError(null);
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/follow/devices`);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Failed to fetch devices' }));
                throw new Error(errorData.message || 'Network response was not ok.');
            }
            
            const data = await response.json();
            setDevices(data.devices || []);
            
            // 重置选中的设备
            setSelectedDevices([]);
            
            // 只有当状态日志为空或者是由刷新按钮触发时才添加状态日志
            if (statusLogs.length === 0 || !isLoadingRef.current) {
                addStatusLog(`已加载 ${data.devices?.length || 0} 个设备`);
            }
        } catch (err) {
            setError(err.message);
            addStatusLog(`错误: ${err.message}`);
            console.error("Fetch devices error:", err);
        } finally {
            setIsLoading(false);
        }
    };
    
    // 处理设备选择 - 更新为多选
    const handleDeviceSelect = (device) => {
        setSelectedDevices(prev => {
            // 检查设备是否已经被选中
            const isSelected = prev.some(d => d.id === device.id);
            
            if (isSelected) {
                // 如果已选中，则移除
                const newSelected = prev.filter(d => d.id !== device.id);
                addStatusLog(`取消选择设备: ${device.device_ip} (${device.username || '未知用户'})`);
                return newSelected;
            } else {
                // 如果未选中，则添加
                addStatusLog(`选择设备: ${device.device_ip} (${device.username || '未知用户'})`);
                return [...prev, device];
            }
        });
    };
    
    // 全选/取消全选设备
    const toggleSelectAll = () => {
        if (selectedDevices.length === devices.length) {
            // 如果已全选，则取消全选
            setSelectedDevices([]);
            addStatusLog('已取消选择所有设备');
        } else {
            // 否则全选
            setSelectedDevices([...devices]);
            addStatusLog(`已选择所有 ${devices.length} 个设备`);
        }
    };
    
    // 处理关注用户操作 - 更新为支持多设备
    const handleFollowUser = async () => {
        // 验证输入
        if (!usernameToFollow.trim()) {
            addStatusLog('错误: 请输入要关注的用户名');
            return;
        }
        
        if (selectedDevices.length === 0) {
            addStatusLog('错误: 请至少选择一个设备');
            return;
        }
        
        // 保存用户名到本地存储
        localStorage.setItem('lastFollowedUsername', usernameToFollow);
        
        setIsProcessing(true);
        setStatusLogs([]);
        
        // 显示选择的设备信息
        addStatusLog(`开始在 ${selectedDevices.length} 个设备上关注用户 @${usernameToFollow}...`);
        selectedDevices.forEach(device => {
            addStatusLog(`- ${device.device_ip} (${device.username || '未知用户'})`);
        });
        
        try {
            // 如果只选择了一个设备，直接使用之前的单设备逻辑
            if (selectedDevices.length === 1) {
                const device = selectedDevices[0];
                const requestData = {
                    device_data: device,
                    username_to_follow: usernameToFollow
                };
                
                const response = await fetch(`${API_BASE_URL}/api/follow/single`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestData),
                });
                
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`服务器返回错误: ${response.status} ${response.statusText}\n${errorText}`);
                }
                
                const data = await response.json();
                
                if (data.success) {
                    addStatusLog(`关注用户任务已创建 (ID: ${data.task_id})`);
                    setTaskId(data.task_id);
                } else {
                    throw new Error(data.message || '未知错误');
                }
            } else {
                // 多个设备情况，需要逐个发送请求
                // 注意：这里我们使用串行请求而不是并行，避免服务器压力过大
                for (let i = 0; i < selectedDevices.length; i++) {
                    const device = selectedDevices[i];
                    addStatusLog(`处理设备 ${i+1}/${selectedDevices.length}: ${device.device_ip}`);
                    
                    const requestData = {
                        device_data: device,
                        username_to_follow: usernameToFollow
                    };
                    
                    const response = await fetch(`${API_BASE_URL}/api/follow/single`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(requestData),
                    });
                    
                    if (!response.ok) {
                        addStatusLog(`设备 ${device.device_ip} 请求失败: ${response.status} ${response.statusText}`);
                        continue; // 继续处理下一个设备，而不是中断整个过程
                    }
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        addStatusLog(`设备 ${device.device_ip} 关注任务已创建 (ID: ${data.task_id})`);
                        
                        // 如果是第一个设备，保存任务ID用于WebSocket连接
                        if (i === 0) {
                            setTaskId(data.task_id);
                        }
                    } else {
                        addStatusLog(`设备 ${device.device_ip} 创建任务失败: ${data.message || '未知错误'}`);
                    }
                }
                
                addStatusLog('所有设备的请求已发送完成');
            }
        } catch (error) {
            console.error('关注用户错误:', error);
            addStatusLog(`错误: ${error.message}`);
            setIsProcessing(false);
        }
    };
    
    // 停止任务
    const handleStopTask = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/follow/stop`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ task_id: taskId })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: '停止任务失败' }));
                throw new Error(errorData.message || 'Network response was not ok.');
            }
            
            addStatusLog('已发送停止任务请求');
            // 清理WebSocket连接并重置任务状态
            cleanupWebSocket();
            setTaskId(null);
            setIsProcessing(false);
        } catch (err) {
            setError(err.message);
            addStatusLog(`错误: ${err.message}`);
            console.error("Stop task error:", err);
        }
    };
    
    // 检查设备是否已选中
    const isDeviceSelected = (device) => {
        return selectedDevices.some(d => d.id === device.id);
    };
    
    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-800">关注Twitter用户</h1>
            
            {/* 设备列表表格 */}
            <div className="p-6 bg-white shadow-xl rounded-lg">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-semibold text-gray-700">设备列表</h2>
                    <div className="flex space-x-4">
                        <button 
                            onClick={toggleSelectAll}
                            disabled={isProcessing || devices.length === 0}
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-md shadow-sm disabled:opacity-50"
                        >
                            {selectedDevices.length === devices.length && devices.length > 0
                                ? '取消全选'
                                : '全选'}
                        </button>
                        <button 
                            onClick={fetchDevices}
                            disabled={isProcessing || isLoading}
                            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-medium rounded-md shadow-sm disabled:opacity-50"
                        >
                            {isLoading ? '加载中...' : '刷新设备列表'}
                        </button>
                    </div>
                </div>
                
                <div className="mb-2 text-sm text-gray-600">
                    已选择 {selectedDevices.length} 个设备 (共 {devices.length} 个)
                </div>
                
                {isLoading ? (
                    <p className="text-gray-600">加载设备中...</p>
                ) : devices.length === 0 ? (
                    <p className="text-gray-600">没有找到设备。请先在设备管理页面添加设备。</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">选择</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">用户名</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">设备IP</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {devices.map((device, index) => (
                                    <tr key={index} className={index % 2 === 0 ? '' : 'bg-gray-50'}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <input
                                                type="checkbox"
                                                checked={isDeviceSelected(device)}
                                                onChange={() => handleDeviceSelect(device)}
                                                disabled={isProcessing}
                                                className="h-5 w-5 text-sky-600 focus:ring-sky-500 border-gray-300 rounded"
                                            />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {device.username || '未知'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {device.device_ip}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                isDeviceSelected(device)
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-gray-100 text-gray-800'
                                            }`}>
                                                {isDeviceSelected(device) ? '已选择' : '未选择'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            
            {/* 用户名输入和操作区域 */}
            <div className="p-6 bg-white shadow-xl rounded-lg">
                <h2 className="text-2xl font-semibold text-gray-700 mb-4">关注用户</h2>
                
                <div className="space-y-4">
                    <div>
                        <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                            要关注的用户名 (不需要 @ 符号)
                        </label>
                        <input
                            type="text"
                            id="username"
                            value={usernameToFollow}
                            onChange={(e) => setUsernameToFollow(e.target.value)}
                            disabled={isProcessing}
                            placeholder="例如: taylorswift13"
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500"
                        />
                    </div>
                    
                    <div className="flex space-x-4">
                        <button
                            onClick={handleFollowUser}
                            disabled={isProcessing || selectedDevices.length === 0 || !usernameToFollow.trim()}
                            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-medium rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isProcessing ? '处理中...' : '关注用户'}
                        </button>
                        
                        <button
                            onClick={handleStopTask}
                            disabled={!isProcessing}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            停止
                        </button>
                    </div>
                </div>
            </div>
            
            {/* 状态日志 */}
            <div className="p-6 bg-white shadow-xl rounded-lg">
                <h2 className="text-xl font-semibold text-gray-700 mb-4">状态日志</h2>
                <div
                    ref={statusLogRef}
                    className="h-64 max-h-64 overflow-y-auto p-4 bg-gray-100 border border-gray-300 rounded font-mono text-sm"
                >
                    {statusLogs.length === 0 ? (
                        <p className="text-gray-500">无状态日志</p>
                    ) : (
                        statusLogs.map((log, index) => (
                            <div key={index} className="mb-1">{log}</div>
                        ))
                    )}
                </div>
            </div>
            
            {/* 错误提示 */}
            {error && (
                <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">
                    {error}
                </div>
            )}
        </div>
    );
}

export default FollowUserPage; 