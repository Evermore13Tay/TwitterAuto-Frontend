import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL, WS_CONFIG } from '../config';

function ChangeSignaturePage() {
    // 设备列表状态
    const [devices, setDevices] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    
    // 设备签名映射 (device_ip:u2_port -> signature)
    const [deviceSignatures, setDeviceSignatures] = useState({});
    
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
    const taskCompletedRef = useRef(false); // 新增: 追踪任务是否已完成
    
    // 初始化 WebSocket 连接
    useEffect(() => {
        // 只有当有任务ID且正在处理时才连接WebSocket
        if (taskId && isProcessing) {
            // 重置任务完成状态
            taskCompletedRef.current = false;
            connectWebSocket();
            
            // 组件卸载或taskId变化时清理资源
            return () => {
                cleanupWebSocket();
            };
        } else if (!isProcessing) {
            // 如果不在处理中，确保WebSocket被清理
            cleanupWebSocket();
        }
    }, [taskId, isProcessing]);
    
    // 清理 WebSocket 相关资源
    const cleanupWebSocket = () => {
        console.log('Cleaning up WebSocket resources');
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
                addStatusLog('WebSocket连接已关闭');
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
                        addStatusLog(`任务完成: ${data.message || '签名修改已完成'}`);
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
            const response = await fetch(`${API_BASE_URL}/api/change-signature/devices`);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Failed to fetch devices' }));
                throw new Error(errorData.message || 'Network response was not ok.');
            }
            
            const data = await response.json();
            setDevices(data.devices || []);
            
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
    
    // 处理签名输入
    const handleSignatureChange = (device, event) => {
        const newSignature = event.target.value;
        const deviceKey = `${device.device_ip}:${device.u2_port}`;
        
        setDeviceSignatures(prev => ({
            ...prev,
            [deviceKey]: newSignature
        }));
    };
    
    // 单个设备修改签名
    const handleSingleSignatureChange = async (device) => {
        const deviceKey = `${device.device_ip}:${device.u2_port}`;
        
        // 检查是否已输入签名
        const signature = deviceSignatures[deviceKey];
        if (!signature || !signature.trim()) {
            addStatusLog(`错误: 设备 ${device.device_ip} 没有输入签名`);
            return;
        }
        
        setIsProcessing(true);
        setStatusLogs([]);
        addStatusLog(`开始修改设备 ${device.device_ip} 的签名...`);
        
        try {
            console.log("设备信息:", device); // 调试信息
            const requestData = {
                device_data: device,
                signature: signature
            };
            
            const response = await fetch(`${API_BASE_URL}/api/change-signature/single`, {
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
                addStatusLog(`单个设备签名修改任务已创建 (ID: ${data.task_id})`);
                setTaskId(data.task_id);
            } else {
                throw new Error(data.message || '未知错误');
            }
        } catch (error) {
            console.error('修改签名错误:', error);
            addStatusLog(`错误: ${error.message}`);
            setIsProcessing(false);
        }
    };
    
    // 停止任务
    const handleStopTask = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/change-signature/stop`, {
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
    
    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-800">修改签名</h1>
            
            {/* 设备列表表格 */}
            <div className="p-6 bg-white shadow-xl rounded-lg">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-semibold text-gray-700">设备列表</h2>
                    <button 
                        onClick={fetchDevices}
                        disabled={isProcessing || isLoading}
                        className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-medium rounded-md shadow-sm disabled:opacity-50"
                    >
                        {isLoading ? '加载中...' : '刷新设备列表'}
                    </button>
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
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">用户名</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">设备IP</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">新签名</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '100px'}}>操作</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {devices.map((device, index) => {
                                    const deviceKey = `${device.device_ip}:${device.u2_port}`;
                                    const signature = deviceSignatures[deviceKey] || '';
                                    
                                    return (
                                        <tr key={index} className={index % 2 === 0 ? '' : 'bg-gray-50'}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {device.username || '未知'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {device.device_ip}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                <input
                                                    type="text"
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-sky-500 focus:border-sky-500"
                                                    value={signature}
                                                    onChange={(e) => handleSignatureChange(device, e)}
                                                    placeholder="请输入新签名"
                                                    disabled={isProcessing}
                                                />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                <button
                                                    onClick={() => handleSingleSignatureChange(device)}
                                                    disabled={!signature.trim() || isProcessing}
                                                    className="px-3 py-1 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                                    style={{width: '80px'}}
                                                >
                                                    确认修改
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            
            {/* 控制区域 */}
            <div className="p-6 bg-white shadow-xl rounded-lg">
                <h2 className="text-2xl font-semibold text-gray-700 mb-4">操作控制</h2>
                
                <div className="flex items-center space-x-4 mb-4">
                    <button
                        onClick={handleStopTask}
                        disabled={!isProcessing}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        停止
                    </button>
                </div>
                
                {/* 状态日志 */}
                <div>
                    <h3 className="text-lg font-medium text-gray-700 mb-2">状态:</h3>
                    <div
                        ref={statusLogRef}
                        className="h-48 max-h-48 overflow-y-auto p-3 bg-gray-100 border border-gray-300 rounded font-mono text-sm"
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

export default ChangeSignaturePage; 