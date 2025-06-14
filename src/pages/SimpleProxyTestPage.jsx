import React, { useState, useRef, useEffect } from 'react'

function SimpleProxyTestPage() {
    const [logs, setLogs] = useState([])
    const [deviceUsers, setDeviceUsers] = useState([])
    const [selectedDeviceIds, setSelectedDeviceIds] = useState(new Set())
    const [isSettingProxy, setIsSettingProxy] = useState(false)
    const [proxyConfig, setProxyConfig] = useState({
        s5ip: '103.176.27.55',
        s5port: '25200',
        s5user: 'testuser',
        s5pwd: 'testpwd',
        domain_mode: '0',
        language: 'en'
    })
    const consoleRef = useRef(null)

    // 添加日志到控制台
    const addLog = (message, type = 'info') => {
        const timestamp = new Date().toLocaleTimeString()
        const newLog = {
            id: Date.now(),
            timestamp,
            message,
            type
        }
        setLogs(prev => [...prev, newLog])
    }

    // 自动滚动到底部
    useEffect(() => {
        if (consoleRef.current) {
            consoleRef.current.scrollTop = consoleRef.current.scrollHeight
        }
    }, [logs])

    // 带超时的fetch函数
    const fetchWithTimeout = async (url, options = {}, timeout = 30000) => {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(id);
            return response;
        } catch (error) {
            clearTimeout(id);
            if (error.name === 'AbortError') {
                throw new Error('请求超时');
            }
            throw error;
        }
    };

    // 获取设备目标IP
    const getTargetIp = (device) => {
        return device.device_ip || device.box_ip;
    };

    // 获取设备列表
    const fetchDeviceUsers = async () => {
        try {
            addLog('正在获取设备列表...', 'info')
            const response = await fetch('http://127.0.0.1:8000/api/device_users')
            if (response.ok) {
                const data = await response.json()
                setDeviceUsers(data)
                addLog(`获取到 ${data.length} 个设备`, 'success')
                
                // 显示设备详情和状态分析
                data.forEach(device => {
                    addLog(`设备: ${device.device_name} | IP: ${device.device_ip} | 状态: ${device.status} | 实例位: ${device.device_index}`, 'info')
                })
                
                // 分析设备状态分布
                const onlineCount = data.filter(d => d.status === 'online').length
                const offlineCount = data.filter(d => d.status === 'offline').length
                const otherCount = data.length - onlineCount - offlineCount
                
                addLog(`设备状态分析: 在线=${onlineCount}, 离线=${offlineCount}, 其他=${otherCount}`, 'info')
                
                if (onlineCount === 0 && data.length > 0) {
                    addLog('⚠️ 没有检测到在线设备，检查设备状态字段', 'warning')
                    addLog('示例设备数据: ' + JSON.stringify(data[0]), 'info')
                }
            } else {
                addLog('获取设备列表失败', 'error')
            }
        } catch (error) {
            addLog(`获取设备列表出错: ${error.message}`, 'error')
        }
    }

    // 直接设置代理（简化版）
    const setProxyDirectly = async (devices, proxyConfig) => {
        addLog(`开始为 ${devices.length} 台设备直接设置代理...`, 'info')
        
        const results = { success: [], failed: [] }
        
        // 并行处理所有设备
        const promises = devices.map(async (device) => {
            const deviceName = device.device_name || 'unknown'
            const targetDeviceIp = getTargetIp(device)
            
            if (!targetDeviceIp) {
                addLog(`设备 ${deviceName} 没有有效的IP地址，跳过`, 'error')
                return { device_id: device.id, device_name: deviceName, success: false, message: '没有有效的IP地址' }
            }
            
            try {
                // 1. 设置代理
                const { s5ip, s5port, s5user, s5pwd, domain_mode } = proxyConfig;
                const url = `http://127.0.0.1:5000/s5_set/${targetDeviceIp}/${deviceName}?s5ip=${s5ip}&s5port=${s5port}&s5user=${s5user}&s5pwd=${s5pwd}&domain_mode=${domain_mode}`;
                
                addLog(`设置设备 ${deviceName} (${targetDeviceIp}) 的S5代理: ${s5ip}:${s5port}`, 'info')
                
                const response = await fetchWithTimeout(url, {}, 20000);
                if (!response.ok) {
                    throw new Error(`代理设置请求失败: ${response.status}`);
                }
                
                const data = await response.json();
                const proxySuccess = data.success !== false && data.code !== 400 && data.code !== 500;
                
                if (!proxySuccess) {
                    throw new Error(data.message || '代理设置失败');
                }
                
                addLog(`设备 ${deviceName} 代理设置成功`, 'success')
                
                // 2. 保存到数据库
                try {
                    const updateProxyUrl = `http://127.0.0.1:8000/api/update_device_proxy`;
                    const requestBody = {
                        device_id: device.id,
                        proxy_ip: proxyConfig.s5ip,
                        proxy_port: parseInt(proxyConfig.s5port),
                        language: proxyConfig.language || "en"
                    };
                    
                    const saveResponse = await fetchWithTimeout(updateProxyUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(requestBody)
                    }, 20000);
                    
                    if (saveResponse.ok) {
                        addLog(`设备 ${deviceName} 代理信息已保存到数据库`, 'success')
                    } else {
                        addLog(`设备 ${deviceName} 数据库保存失败，但继续处理`, 'warning')
                    }
                } catch (dbError) {
                    addLog(`设备 ${deviceName} 数据库操作出错: ${dbError.message}`, 'warning')
                }
                
                // 3. 设置语言
                try {
                    const languageUrl = `http://127.0.0.1:5000/set_ipLocation/${targetDeviceIp}/${deviceName}/${proxyConfig.language || 'en'}`;
                    
                    const languageResponse = await fetchWithTimeout(languageUrl, {}, 20000);
                    
                    if (languageResponse.ok) {
                        addLog(`设备 ${deviceName} 语言设置成功`, 'success')
                    } else {
                        addLog(`设备 ${deviceName} 语言设置失败`, 'warning')
                    }
                } catch (langError) {
                    addLog(`设备 ${deviceName} 语言设置出错: ${langError.message}`, 'warning')
                }
                
                addLog(`设备 ${deviceName} 代理和语言设置完成`, 'success')
                return { 
                    device_id: device.id,
                    device_name: deviceName, 
                    success: true, 
                    message: '代理和语言设置成功' 
                };
                
            } catch (error) {
                addLog(`设备 ${deviceName} 设置出错: ${error.message}`, 'error')
                return { 
                    device_id: device.id,
                    device_name: deviceName, 
                    success: false, 
                    message: `设置出错: ${error.message}` 
                };
            }
        });
        
        // 等待所有设备处理完成
        const allResults = await Promise.all(promises);
        
        // 统计结果
        allResults.forEach(result => {
            if (result.success) {
                results.success.push(result);
            } else {
                results.failed.push(result);
            }
        });
        
        const successCount = results.success.length;
        const failCount = results.failed.length;
        
        addLog(`代理设置完成: 成功 ${successCount}/${devices.length} 台设备`, successCount > 0 ? 'success' : 'error')
        
        if (failCount > 0) {
            const failedNames = results.failed.map(r => r.device_name).join(', ')
            addLog(`失败的设备: ${failedNames}`, 'error')
        }
        
        // 刷新设备列表
        await fetchDeviceUsers();
    }

    // 设置代理和语言
    const handleSetProxy = async () => {
        if (selectedDeviceIds.size === 0) {
            addLog('请先选择要设置代理的设备', 'warning')
            return
        }

        setIsSettingProxy(true)
        addLog(`开始为 ${selectedDeviceIds.size} 台设备设置代理...`, 'info')
        addLog(`代理配置: ${proxyConfig.s5ip}:${proxyConfig.s5port}`, 'info')
        addLog(`语言: ${proxyConfig.language}`, 'info')

        // 获取当前的设备状态
        const selectedDevices = deviceUsers.filter(device => selectedDeviceIds.has(device.id))
        addLog(`选中设备: ${selectedDevices.map(d => d.device_name).join(', ')}`, 'info')

        try {
            // 直接使用前端的设备数据，不依赖后端重新获取
            addLog(`直接使用前端设备数据，共 ${selectedDevices.length} 台设备`, 'info')
            
            // 简化的代理设置逻辑，不使用复杂的分批处理
            await setProxyDirectly(selectedDevices, proxyConfig)
        } catch (error) {
            addLog(`设置代理失败: ${error.message}`, 'error')
        } finally {
            setIsSettingProxy(false)
        }
    }

    // 切换设备选择
    const toggleDeviceSelection = (deviceId) => {
        const newSelected = new Set(selectedDeviceIds)
        if (newSelected.has(deviceId)) {
            newSelected.delete(deviceId)
        } else {
            newSelected.add(deviceId)
        }
        setSelectedDeviceIds(newSelected)
    }

    // 全选/全不选
    const toggleSelectAll = () => {
        if (selectedDeviceIds.size === deviceUsers.length) {
            setSelectedDeviceIds(new Set())
        } else {
            setSelectedDeviceIds(new Set(deviceUsers.map(d => d.id)))
        }
    }

    // 清空控制台
    const clearConsole = () => {
        setLogs([])
        addLog('控制台已清空', 'info')
    }

    // 获取日志样式
    const getLogStyle = (type) => {
        switch (type) {
            case 'success':
                return 'text-green-600'
            case 'warning':
                return 'text-yellow-600'
            case 'error':
                return 'text-red-600'
            default:
                return 'text-gray-700'
        }
    }

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800 mb-2">简单代理测试页面</h1>
                <p className="text-gray-600">直接设置代理和语言，无复杂分批逻辑</p>
            </div>

            {/* 控制按钮区域 */}
            <div className="mb-6 space-y-4">
                <div className="flex gap-4 flex-wrap">
                    <button
                        onClick={fetchDeviceUsers}
                        className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
                    >
                        获取设备列表
                    </button>
                    
                    <button
                        onClick={handleSetProxy}
                        className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                            isSettingProxy
                                ? 'bg-yellow-500 cursor-wait'
                                : 'bg-red-500 hover:bg-red-600'
                        } text-white`}
                        disabled={isSettingProxy || selectedDeviceIds.size === 0}
                    >
                        {isSettingProxy ? '设置中...' : `设置代理和语言 (${selectedDeviceIds.size}台)`}
                    </button>
                    
                    {deviceUsers.length > 0 && (
                        <button
                            onClick={toggleSelectAll}
                            className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-colors"
                        >
                            {selectedDeviceIds.size === deviceUsers.length ? '取消全选' : '全选设备'}
                        </button>
                    )}
                    
                    <button
                        onClick={clearConsole}
                        className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                    >
                        清空控制台
                    </button>
                </div>
            </div>

            {/* 代理配置区域 */}
            <div className="mb-6 bg-white rounded-lg shadow-sm border p-4">
                <h3 className="text-lg font-semibold mb-3">代理配置</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">代理IP</label>
                        <input
                            type="text"
                            value={proxyConfig.s5ip}
                            onChange={(e) => setProxyConfig(prev => ({ ...prev, s5ip: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="代理服务器IP"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">代理端口</label>
                        <input
                            type="text"
                            value={proxyConfig.s5port}
                            onChange={(e) => setProxyConfig(prev => ({ ...prev, s5port: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="代理端口"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">语言设置</label>
                        <select
                            value={proxyConfig.language}
                            onChange={(e) => setProxyConfig(prev => ({ ...prev, language: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="en">英语 (English)</option>
                            <option value="es">西班牙语 (Español)</option>
                            <option value="fr">法语 (Français)</option>
                            <option value="de">德语 (Deutsch)</option>
                            <option value="it">意大利语 (Italiano)</option>
                            <option value="pt">葡萄牙语 (Português)</option>
                            <option value="ja">日语 (日本語)</option>
                            <option value="ko">韩语 (한국어)</option>
                            <option value="zh">中文 (中文)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
                        <input
                            type="text"
                            value={proxyConfig.s5user}
                            onChange={(e) => setProxyConfig(prev => ({ ...prev, s5user: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="代理用户名"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
                        <input
                            type="password"
                            value={proxyConfig.s5pwd}
                            onChange={(e) => setProxyConfig(prev => ({ ...prev, s5pwd: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="代理密码"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">域名模式</label>
                        <select
                            value={proxyConfig.domain_mode}
                            onChange={(e) => setProxyConfig(prev => ({ ...prev, domain_mode: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="0">关闭</option>
                            <option value="1">开启</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* 设备列表区域 */}
            {deviceUsers.length > 0 && (
                <div className="mb-6 bg-white rounded-lg shadow-sm border p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold">设备列表 ({deviceUsers.length}台)</h3>
                        <div className="text-sm text-gray-600">
                            已选择: {selectedDeviceIds.size} / {deviceUsers.length}
                        </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-2">
                        {deviceUsers.map((device, index) => (
                            <div key={device.id} className={`flex items-center p-3 rounded-lg border ${
                                selectedDeviceIds.has(device.id) 
                                    ? 'border-blue-500 bg-blue-50' 
                                    : 'border-gray-200 bg-gray-50'
                            }`}>
                                <input
                                    type="checkbox"
                                    checked={selectedDeviceIds.has(device.id)}
                                    onChange={() => toggleDeviceSelection(device.id)}
                                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <div className="ml-3 flex-1">
                                    <div className="flex items-center gap-4">
                                        <div className="font-medium text-gray-900">{device.device_name}</div>
                                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                                            device.status === 'online' 
                                                ? 'bg-green-100 text-green-800' 
                                                : 'bg-gray-100 text-gray-800'
                                        }`}>
                                            {device.status}
                                        </div>
                                    </div>
                                    <div className="text-sm text-gray-600 mt-1">
                                        IP: {device.device_ip} | 实例位: {device.device_index || 'N/A'} | 
                                        代理: {device.proxy_ip ? `${device.proxy_ip}:${device.proxy_port}` : '未设置'}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 控制台显示区域 */}
            <div className="bg-gray-900 rounded-lg p-4 h-96 overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-white font-medium">操作控制台</h3>
                    <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                </div>
                
                <div 
                    ref={consoleRef}
                    className="bg-black rounded p-3 h-80 overflow-y-auto font-mono text-sm"
                >
                    {logs.length === 0 ? (
                        <div className="text-gray-500">等待操作开始...</div>
                    ) : (
                        logs.map(log => (
                            <div key={log.id} className="mb-1">
                                <span className="text-gray-400">[{log.timestamp}]</span>
                                <span className={`ml-2 ${getLogStyle(log.type)}`}>
                                    {log.message}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* 状态指示器 */}
            <div className="mt-4 space-y-3">
                <div className="flex items-center gap-6 flex-wrap">
                    <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${isSettingProxy ? 'bg-yellow-500 animate-pulse' : 'bg-gray-400'}`}></div>
                        <span className="text-sm text-gray-600">
                            代理设置: {isSettingProxy ? '设置中' : '空闲'}
                        </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">
                            设备总数: {deviceUsers.length}
                        </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">
                            已选设备: {selectedDeviceIds.size}
                        </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">
                            日志条数: {logs.length}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default SimpleProxyTestPage 