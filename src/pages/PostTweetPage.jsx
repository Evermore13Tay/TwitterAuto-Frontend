import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL, WS_CONFIG } from '../config';

function PostTweetPage() {
    // 设备列表状态
    const [devices, setDevices] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    
    // 推文内容
    const [tweetText, setTweetText] = useState('');
    
    // 图片设置
    const [enableImage, setEnableImage] = useState(false);
    const [selectedImages, setSelectedImages] = useState([]);
    const MAX_IMAGES = 4; // 最多允许4张图片
    
    // 设备选择 - 多选
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
    
    // 多设备任务跟踪
    const deviceTasksRef = useRef({}); // 用于存储每个设备的任务ID
    const activeDeviceTasksRef = useRef(0); // 当前活动的设备任务数量
    const lastReconnectTimeRef = useRef(0); // 上次重连时间戳
    const maxReconnectAttemptsRef = useRef(10); // 最大重连尝试次数
    
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
        
        // 检查是否超过最大重连次数
        if (reconnectAttemptRef.current > maxReconnectAttemptsRef.current) {
            console.log(`已达到最大重连次数(${maxReconnectAttemptsRef.current})，停止重连`);
            addStatusLog(`已达到最大重连次数(${maxReconnectAttemptsRef.current})，任务可能已失败。请手动停止并重试。`);
            return;
        }
        
        // 检查重连频率限制
        const now = Date.now();
        const elapsed = now - lastReconnectTimeRef.current;
        if (reconnectAttemptRef.current > 3 && elapsed < 5000) {
            console.log(`重连过于频繁，延迟重连`);
            reconnectTimeoutRef.current = setTimeout(() => {
                connectWebSocket();
            }, 5000);
            return;
        }
        
        // 更新上次重连时间
        lastReconnectTimeRef.current = now;
        
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
            
            // 标记WebSocket正在连接中，防止重复重连
            ws.current.isConnecting = true;
            
            // 设置WebSocket事件处理器
            ws.current.onopen = () => {
                addStatusLog('WebSocket连接已建立');
                console.log('Connected to WebSocket');
                
                // 更新最后消息时间
                lastMessageTimeRef.current = Date.now();
                
                // 连接完成，清除标记
                ws.current.isConnecting = false;
                
                // 重置重连尝试次数，因为已成功连接
                reconnectAttemptRef.current = 0;
                
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
                        // 如果消息包含设备信息，添加设备前缀
                        if (data.device_ip) {
                            // 检查是否包含图片上传/处理信息
                            const isImageMsg = data.message && (
                                data.message.includes('图片') || 
                                data.message.includes('image') || 
                                data.message.includes('相册') || 
                                data.message.includes('验证') ||
                                data.message.includes('扫描') ||
                                data.message.includes('上传')
                            );
                            
                            // 图片相关消息使用更明显的标记
                            if (isImageMsg) {
                                addStatusLog(`[${data.device_ip}] 📷 ${data.message}`);
                            } else {
                                addStatusLog(`[${data.device_ip}] ${data.message}`);
                            }
                        } else {
                            addStatusLog(data.message);
                        }
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
                    } else if (data.type === 'progress') {
                        // 添加进度更新，支持设备特定信息
                        if (data.device_ip) {
                            addStatusLog(`[${data.device_ip}] 进度: ${data.value}%`);
                        } else {
                            addStatusLog(`进度: ${data.value}%`);
                        }
                    } else if (data.type === 'completed') {
                        // 任务完成消息
                        if (data.device_ip) {
                            addStatusLog(`[${data.device_ip}] 任务完成: ${data.message || '发布推文已完成'}`);
                        } else {
                            addStatusLog(`任务完成: ${data.message || '发布推文已完成'}`);
                        }
                        
                        // 更新设备任务状态
                        if (data.device_ip && deviceTasksRef.current[data.device_ip]) {
                            addStatusLog(`设备 ${data.device_ip} 的任务已完成`);
                            delete deviceTasksRef.current[data.device_ip];
                            activeDeviceTasksRef.current--;
                        }
                        
                        // 如果没有更多活动设备任务，标记整个任务完成
                        if (activeDeviceTasksRef.current <= 0) {
                            setIsProcessing(false);
                            taskCompletedRef.current = true; // 标记任务已完成
                            setTaskId(null);
                            addStatusLog('所有设备任务已完成');
                            deviceTasksRef.current = {}; // 清空设备任务
                        }
                    } else if (data.type === 'error') {
                        // 处理错误消息
                        console.error('收到错误消息:', data);
                        
                        // 如果是特定设备的错误，带上设备信息
                        if (data.device_ip) {
                            addStatusLog(`[${data.device_ip}] 错误: ${data.message || '未知错误'}`);
                            
                            // 更新设备任务状态
                            if (deviceTasksRef.current[data.device_ip]) {
                                addStatusLog(`设备 ${data.device_ip} 的任务出错: ${data.message || '未知错误'}`);
                                delete deviceTasksRef.current[data.device_ip];
                                activeDeviceTasksRef.current--;
                                
                                // 如果没有更多活动设备任务，标记整个任务完成
                                if (activeDeviceTasksRef.current <= 0) {
                                    setIsProcessing(false);
                                    taskCompletedRef.current = true;
                                    setTaskId(null);
                                    addStatusLog('所有设备任务已完成或失败');
                                    deviceTasksRef.current = {}; // 清空设备任务
                                }
                            }
                        } else {
                            addStatusLog(`错误: ${data.message || '未知错误'}`);
                        }
                    } else {
                        // 其他未知类型的消息
                        console.log('收到WebSocket消息:', data);
                        
                        // 对于未知类型但有消息内容的消息，尝试显示
                        if (data.message) {
                            if (data.device_ip) {
                                addStatusLog(`[${data.device_ip}] ${data.message}`);
                            } else {
                                addStatusLog(`${data.message}`);
                            }
                        }
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
                
                // 处理特定错误代码
                // 1000: 正常关闭
                // 1001: 离开页面或浏览器关闭
                // 1006: 异常关闭
                // 1012: 服务重启/崩溃
                // 1013: 服务过载
                
                // 如果不是正常关闭并且任务仍在进行，尝试重新连接
                if ((event.code !== 1000 && event.code !== 1001) && taskId) {
                    // 对于特定错误代码进行特殊处理
                    let reconnectDelay = WS_CONFIG.RECONNECT_BASE_DELAY;
                    let codeDescription = '';
                    
                    // 根据不同的错误代码调整重连行为
                    switch(event.code) {
                        case 1006: // 异常关闭
                            reconnectDelay = 2000;
                            codeDescription = '连接异常关闭';
                            break;
                        case 1012: // 服务器重启
                            reconnectDelay = 5000; // 服务重启时等待更长时间
                            codeDescription = '服务器可能正在重启';
                            // 对于服务重启，我们需要再等待一段时间让服务完全启动
                            break;
                        case 1013: // 服务过载
                            reconnectDelay = 8000; // 服务过载时等待更长时间
                            codeDescription = '服务器过载';
                            break;
                        default:
                            codeDescription = '连接关闭';
                            // 使用指数退避策略进行重连
                            reconnectDelay = Math.min(
                                WS_CONFIG.RECONNECT_BASE_DELAY * (Math.pow(2, reconnectAttemptRef.current) || 1), 
                                WS_CONFIG.MAX_RECONNECT_DELAY
                            );
                    }
                    
                    // 增加重连尝试计数
                    reconnectAttemptRef.current = (reconnectAttemptRef.current || 0) + 1;
                    
                    addStatusLog(`${codeDescription}，将在 ${reconnectDelay/1000} 秒后尝试重新连接 (尝试 #${reconnectAttemptRef.current})...`);
                    
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
        if (!ws.current) {
            console.debug('无法发送ping: WebSocket未初始化');
            return false;
        }
        
        if (ws.current.readyState === WebSocket.OPEN) {
            try {
                ws.current.send(JSON.stringify({ 
                    type: 'ping', 
                    timestamp: new Date().toISOString(),
                    // 添加设备信息以便服务器可以跟踪
                    devices: Object.keys(deviceTasksRef.current),
                    taskId: taskId
                }));
                console.debug('发送ping消息');
                return true;
            } catch (error) {
                console.error('发送ping失败:', error);
                
                // 如果发送失败，尝试重新连接
                cleanupWebSocket();
                reconnectTimeoutRef.current = setTimeout(() => {
                    addStatusLog('Ping失败，尝试重新连接WebSocket...');
                    connectWebSocket();
                }, 1000);
                return false;
            }
        } else if (ws.current.readyState === WebSocket.CONNECTING) {
            // 如果WebSocket正在连接中，等待连接完成
            console.debug('WebSocket正在连接中，暂不发送ping');
            return false;
        } else {
            // 如果WebSocket不是OPEN且不是CONNECTING，尝试重新连接
            console.debug(`WebSocket状态 ${ws.current.readyState} 不是OPEN，尝试重新连接`);
            
            // 避免在已经计划重连时重复重连
            if (!reconnectTimeoutRef.current) {
                cleanupWebSocket();
                reconnectTimeoutRef.current = setTimeout(() => {
                    addStatusLog('WebSocket未连接，尝试重新连接...');
                    connectWebSocket();
                }, 1000);
            }
            return false;
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
        
        // 从本地存储加载最后使用的推文内容
        const savedTweetText = localStorage.getItem('lastTweetText') || '';
        if (savedTweetText) {
            setTweetText(savedTweetText);
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
            const response = await fetch(`${API_BASE_URL}/api/post-tweet/devices`);
            
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
    
    // 处理设备选择 - 多选
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
    
    // 处理图片选择
    const handleImageSelect = (event) => {
        const files = Array.from(event.target.files);
        
        // 检查是否超过最大图片数量限制
        if (selectedImages.length + files.length > MAX_IMAGES) {
            addStatusLog(`错误: 最多只能选择 ${MAX_IMAGES} 张图片，当前已选择 ${selectedImages.length} 张`);
            return;
        }
        
        if (files.length > 0) {
            // 检查每张图片的有效性和大小限制
            const validFiles = [];
            const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB 限制
            
            files.forEach(file => {
                // 验证文件类型
                if (!file.type.startsWith('image/')) {
                    addStatusLog(`警告: ${file.name} 不是有效的图片文件，已跳过`);
                    return;
                }
                
                // 验证文件大小
                if (file.size > MAX_FILE_SIZE) {
                    addStatusLog(`警告: ${file.name} 超过 4MB 大小限制，已跳过`);
                    return;
                }
                
                validFiles.push(file);
                addStatusLog(`已选择图片: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
            });
            
            if (validFiles.length > 0) {
                setSelectedImages(prev => [...prev, ...validFiles]);
            }
        }
    };
    
    // 清除特定图片
    const removeImage = (index) => {
        setSelectedImages(prev => {
            const newImages = [...prev];
            const removedImage = newImages[index];
            newImages.splice(index, 1);
            addStatusLog(`已移除图片: ${removedImage.name}`);
            return newImages;
        });
    };
    
    // 清除所有选择的图片
    const clearAllImages = () => {
        setSelectedImages([]);
        addStatusLog('已清除所有选择的图片');
    };
    
    // 处理推文发布
    const handlePostTweet = async () => {
        // 验证输入
        if (!tweetText.trim()) {
            addStatusLog('错误: 请输入推文内容');
            return;
        }
        
        if (selectedDevices.length === 0) {
            addStatusLog('错误: 请至少选择一个设备');
            return;
        }
        
        if (enableImage && selectedImages.length === 0) {
            addStatusLog('错误: 已启用图片但未选择图片');
            return;
        }
        
        // 保存推文内容到本地存储
        localStorage.setItem('lastTweetText', tweetText);
        
        setIsProcessing(true);
        setStatusLogs([]);
        
        // 清理之前的任务状态
        taskCompletedRef.current = false;
        deviceTasksRef.current = {};
        activeDeviceTasksRef.current = 0;
        reconnectAttemptRef.current = 0;
        
        // 显示选择的设备信息
        addStatusLog(`开始在 ${selectedDevices.length} 个设备上发布推文...`);
        selectedDevices.forEach(device => {
            addStatusLog(`- ${device.device_ip} (${device.username || '未知用户'})`);
        });
        
        // 如果含有图片，在发送前展示图片信息
        if (enableImage && selectedImages.length > 0) {
            addStatusLog(`将发送 ${selectedImages.length} 张图片：`);
            selectedImages.forEach((image, index) => {
                addStatusLog(`- 图片 ${index + 1}: ${image.name} (${(image.size / 1024 / 1024).toFixed(2)} MB)`);
            });
            addStatusLog('图片上传过程可能需要一些时间，请耐心等待...');
        }
        
        try {
            // 如果只选择了一个设备，直接使用单设备逻辑
            if (selectedDevices.length === 1) {
                const device = selectedDevices[0];
                
                const formData = new FormData();
                formData.append('device_data', JSON.stringify(device));
                formData.append('tweet_text', tweetText);
                formData.append('attach_image', enableImage.toString());
                
                // 添加多个图片
                if (enableImage && selectedImages.length > 0) {
                    // 先添加图片数量信息，确保后端可以正确识别
                    formData.append('image_count', selectedImages.length.toString());
                    
                    // 然后添加所有图片
                    selectedImages.forEach((image, index) => {
                        // 验证图片对象有效性
                        if (image && image.name && image.size > 0) {
                            formData.append(`image_${index}`, image);
                            addStatusLog(`添加图片 ${index + 1}/${selectedImages.length}: ${image.name} 到设备 ${device.device_ip} 的请求中`);
                        } else {
                            addStatusLog(`警告: 设备 ${device.device_ip} 的图片 ${index + 1} 无效，将被跳过`);
                        }
                    });
                    
                    addStatusLog(`开始为设备 ${device.device_ip} 上传 ${selectedImages.length} 张图片，请耐心等待...`);
                }
                
                addStatusLog(`发送请求到服务器: ${API_BASE_URL}/api/post-tweet/single`);
                
                const response = await fetch(`${API_BASE_URL}/api/post-tweet/single`, {
                    method: 'POST',
                    body: formData,
                });
                
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`服务器返回错误: ${response.status} ${response.statusText}\n${errorText}`);
                }
                
                const data = await response.json();
                
                if (data.success) {
                    addStatusLog(`发布推文任务已创建 (ID: ${data.task_id})`);
                    setTaskId(data.task_id);
                    
                    // 添加到设备任务列表
                    deviceTasksRef.current[device.device_ip] = data.task_id;
                    activeDeviceTasksRef.current = 1;
                } else {
                    throw new Error(data.message || '未知错误');
                }
            } else {
                // 多个设备情况，需要逐个发送请求
                let firstTaskId = null;
                let successfulTasks = 0;
                
                // 将设备分组处理，每组最多5个设备同时处理，避免服务器过载
                const deviceGroups = [];
                for (let i = 0; i < selectedDevices.length; i += 5) {
                    deviceGroups.push(selectedDevices.slice(i, i + 5));
                }
                
                addStatusLog(`设备已分为 ${deviceGroups.length} 组，每组最多 5 个设备`);
                
                // 逐组处理
                for (let groupIndex = 0; groupIndex < deviceGroups.length; groupIndex++) {
                    const deviceGroup = deviceGroups[groupIndex];
                    addStatusLog(`处理设备组 ${groupIndex + 1}/${deviceGroups.length}...`);
                    
                    // 并行处理每个组内的设备
                    const groupPromises = deviceGroup.map(async (device) => {
                        addStatusLog(`准备设备 ${device.device_ip}`);
                        
                        const formData = new FormData();
                        formData.append('device_data', JSON.stringify(device));
                        formData.append('tweet_text', tweetText);
                        formData.append('attach_image', enableImage.toString());
                        
                        // 添加多个图片
                        if (enableImage && selectedImages.length > 0) {
                            // 先添加图片数量信息
                            formData.append('image_count', selectedImages.length.toString());
                            
                            // 然后添加所有图片
                            selectedImages.forEach((image, index) => {
                                // 验证图片对象有效性
                                if (image && image.name && image.size > 0) {
                                    formData.append(`image_${index}`, image);
                                    addStatusLog(`添加图片 ${index + 1}/${selectedImages.length}: ${image.name} 到设备 ${device.device_ip} 的请求中`);
                                } else {
                                    addStatusLog(`警告: 设备 ${device.device_ip} 的图片 ${index + 1} 无效，将被跳过`);
                                }
                            });
                            
                            addStatusLog(`开始为设备 ${device.device_ip} 上传 ${selectedImages.length} 张图片，请耐心等待...`);
                        }
                        
                        try {
                            const response = await fetch(`${API_BASE_URL}/api/post-tweet/single`, {
                                method: 'POST',
                                body: formData,
                            });
                            
                            if (!response.ok) {
                                addStatusLog(`设备 ${device.device_ip} 请求失败: ${response.status} ${response.statusText}`);
                                return { success: false, device };
                            }
                            
                            const data = await response.json();
                            
                            if (data.success) {
                                addStatusLog(`设备 ${device.device_ip} 发布推文任务已创建 (ID: ${data.task_id})`);
                                
                                // 添加到设备任务列表
                                deviceTasksRef.current[device.device_ip] = data.task_id;
                                activeDeviceTasksRef.current++;
                                
                                // 如果是第一个成功的设备，保存任务ID用于WebSocket连接
                                if (firstTaskId === null) {
                                    firstTaskId = data.task_id;
                                    setTaskId(data.task_id);
                                }
                                
                                return { success: true, device, taskId: data.task_id };
                            } else {
                                addStatusLog(`设备 ${device.device_ip} 创建任务失败: ${data.message || '未知错误'}`);
                                return { success: false, device, error: data.message };
                            }
                        } catch (deviceError) {
                            console.error(`设备 ${device.device_ip} 处理错误:`, deviceError);
                            addStatusLog(`设备 ${device.device_ip} 处理错误: ${deviceError.message}`);
                            return { success: false, device, error: deviceError.message };
                        }
                    });
                    
                    // 等待当前组所有设备处理完成
                    const groupResults = await Promise.all(groupPromises);
                    
                    // 统计成功的任务数量
                    const groupSuccessCount = groupResults.filter(r => r.success).length;
                    successfulTasks += groupSuccessCount;
                    
                    addStatusLog(`设备组 ${groupIndex + 1} 处理完成: ${groupSuccessCount}/${deviceGroup.length} 个设备成功`);
                    
                    // 如果组中有成功的任务，并且还没有建立WebSocket连接，则建立连接
                    if (groupSuccessCount > 0 && firstTaskId && !ws.current) {
                        addStatusLog(`正在建立与任务 ${firstTaskId} 的WebSocket连接...`);
                        connectWebSocket(firstTaskId);
                        
                        // 给WebSocket一些时间建立连接
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                }
                
                // 所有设备组处理完毕后的总结
                if (successfulTasks > 0) {
                    addStatusLog(`所有设备的请求已发送完成，成功创建 ${successfulTasks}/${selectedDevices.length} 个任务`);
                } else {
                    addStatusLog('所有设备的请求已发送完成，但没有成功创建任何任务');
                    setIsProcessing(false);
                    taskCompletedRef.current = true;
                }
            }
        } catch (error) {
            console.error('发布推文错误:', error);
            addStatusLog(`错误: ${error.message}`);
            setIsProcessing(false);
            taskCompletedRef.current = true;
        }
    };
    
    // 停止任务
    const handleStopTask = async () => {
        try {
            // 如果有多个设备任务
            if (Object.keys(deviceTasksRef.current).length > 0) {
                // 逐个停止设备任务
                for (const deviceIp in deviceTasksRef.current) {
                    const deviceTaskId = deviceTasksRef.current[deviceIp];
                    try {
                        const response = await fetch(`${API_BASE_URL}/api/post-tweet/stop`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ task_id: deviceTaskId })
                        });
                        
                        if (response.ok) {
                            addStatusLog(`已发送停止任务请求: 设备 ${deviceIp}`);
                        } else {
                            const errorData = await response.json().catch(() => ({ message: '停止任务失败' }));
                            addStatusLog(`停止设备 ${deviceIp} 任务失败: ${errorData.message}`);
                        }
                    } catch (err) {
                        addStatusLog(`停止设备 ${deviceIp} 任务时出错: ${err.message}`);
                    }
                }
            } else if (taskId) {
                // 单个任务情况
                const response = await fetch(`${API_BASE_URL}/api/post-tweet/stop`, {
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
            }
            
            // 清理所有状态
            cleanupWebSocket();
            setTaskId(null);
            setIsProcessing(false);
            deviceTasksRef.current = {};
            activeDeviceTasksRef.current = 0;
            taskCompletedRef.current = true;
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
            <h1 className="text-3xl font-semibold text-[var(--text-primary)] mb-6">发布推文</h1>
            
            {/* 内容编辑和设备选择两栏布局 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 左侧：推文内容和图片上传区域 - 占用2/3宽度 */}
                <div className="lg:col-span-2">
                    <div className="apple-card p-6">
                        <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-6">编写推文</h2>
                        
                        <div className="space-y-6">
                            <div>
                                <label htmlFor="tweetText" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                                    推文内容
                                </label>
                                <textarea
                                    id="tweetText"
                                    value={tweetText}
                                    onChange={(e) => setTweetText(e.target.value)}
                                    disabled={isProcessing}
                                    placeholder="写下你的推文内容..."
                                    rows={4}
                                    className="apple-textarea"
                                />
                                <div className="mt-1 text-xs text-right text-[var(--text-tertiary)]">
                                    {tweetText.length}/280
                                </div>
                            </div>
                            
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="enableImage"
                                    checked={enableImage}
                                    onChange={(e) => {
                                        setEnableImage(e.target.checked);
                                        if (!e.target.checked) {
                                            setSelectedImages([]);
                                        }
                                    }}
                                    disabled={isProcessing}
                                    className="apple-checkbox mr-2"
                                />
                                <label htmlFor="enableImage" className="text-sm font-medium text-[var(--text-primary)]">
                                    添加图片（最多4张）
                                </label>
                            </div>
                            
                            {enableImage && (
                                <div className="p-4 bg-[var(--light-bg)] rounded-lg">
                                    <div className="flex flex-wrap items-center gap-4 mb-4">
                                        <input
                                            type="file"
                                            id="imageUpload"
                                            accept="image/*"
                                            onChange={handleImageSelect}
                                            disabled={isProcessing || selectedImages.length >= MAX_IMAGES}
                                            className="hidden"
                                            multiple
                                        />
                                        <label
                                            htmlFor="imageUpload"
                                            className={`apple-button-secondary inline-flex items-center cursor-pointer ${selectedImages.length >= MAX_IMAGES ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            选择图片
                                        </label>
                                        
                                        {selectedImages.length > 0 && (
                                            <button
                                                onClick={clearAllImages}
                                                disabled={isProcessing}
                                                className="text-[var(--danger-color)] hover:text-opacity-80 text-sm transition-colors"
                                            >
                                                清除所有图片
                                            </button>
                                        )}
                                        
                                        <div className="text-sm text-[var(--text-tertiary)]">
                                            已选择 {selectedImages.length}/{MAX_IMAGES} 张图片
                                        </div>
                                    </div>
                                    
                                    {selectedImages.length > 0 ? (
                                        <div className="flex flex-wrap gap-4">
                                            {selectedImages.map((image, index) => (
                                                <div key={index} className="relative bg-white p-2 rounded-lg">
                                                    <div className="w-24 h-24 relative overflow-hidden rounded-md">
                                                        <img 
                                                            src={URL.createObjectURL(image)} 
                                                            alt={`上传图片 ${index + 1}`}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={() => removeImage(index)}
                                                        disabled={isProcessing}
                                                        className="absolute -top-2 -right-2 bg-[var(--danger-color)] text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-opacity-80 transition-colors"
                                                        aria-label="移除图片"
                                                    >
                                                        ✕
                                                    </button>
                                                    <div className="text-xs mt-1 text-center truncate max-w-[96px]" title={image.name}>
                                                        {image.name}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-4">
                                            <span className="text-sm text-[var(--text-tertiary)]">未选择图片</span>
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            <div className="apple-divider"></div>
                            
                            <div className="flex space-x-4">
                                <button
                                    onClick={handlePostTweet}
                                    disabled={isProcessing || selectedDevices.length === 0 || !tweetText.trim() || (enableImage && selectedImages.length === 0)}
                                    className="apple-button"
                                >
                                    {isProcessing ? '处理中...' : '发布推文'}
                                </button>
                                
                                <button
                                    onClick={handleStopTask}
                                    disabled={!isProcessing}
                                    className="apple-button-secondary bg-red-100 text-[var(--danger-color)] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    停止
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    {/* 状态日志 */}
                    <div className="mt-6">
                        <div className="apple-card p-6">
                            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">状态日志</h2>
                            <div
                                ref={statusLogRef}
                                className="status-log-container"
                            >
                                {statusLogs.length === 0 ? (
                                    <p className="text-[var(--text-tertiary)] text-center py-4">无状态日志</p>
                                ) : (
                                    statusLogs.map((log, index) => (
                                        <div key={index} className="mb-1 leading-relaxed">{log}</div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* 右侧：设备选择区域 - 占用1/3宽度 */}
                <div className="apple-card p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-semibold text-[var(--text-primary)]">选择设备</h2>
                        <button 
                            onClick={fetchDevices}
                            disabled={isProcessing || isLoading}
                            className="apple-button-secondary text-xs px-3 py-1"
                        >
                            {isLoading ? '加载中...' : '刷新'}
                        </button>
                    </div>
                    
                    <div className="mb-4 flex items-center justify-between">
                        <div className="text-sm text-[var(--text-secondary)]">
                            已选择 <span className="text-[var(--primary-color)] font-medium">{selectedDevices.length}</span> 个设备 (共 {devices.length} 个)
                        </div>
                        <button 
                            onClick={toggleSelectAll}
                            disabled={isProcessing || devices.length === 0}
                            className="text-xs text-[var(--primary-color)] hover:underline disabled:opacity-50"
                        >
                            {selectedDevices.length === devices.length && devices.length > 0
                                ? '取消全选'
                                : '全选'}
                        </button>
                    </div>
                    
                    {isLoading ? (
                        <div className="flex justify-center items-center py-10">
                            <div className="loader"></div>
                            <p className="ml-3 text-[var(--text-tertiary)]">加载设备中...</p>
                        </div>
                    ) : devices.length === 0 ? (
                        <div className="py-10 text-center">
                            <p className="text-[var(--text-tertiary)] mb-2">没有找到设备</p>
                            <p className="text-sm text-[var(--text-secondary)]">请先在设备管理页面添加设备</p>
                        </div>
                    ) : (
                        <div className="max-h-[380px] overflow-y-auto pr-1">
                            <ul className="space-y-2">
                                {devices.map((device, index) => (
                                    <li 
                                        key={index} 
                                        className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                                            isDeviceSelected(device) 
                                            ? 'bg-[rgba(0,113,227,0.05)] border border-[rgba(0,113,227,0.2)]' 
                                            : 'bg-[var(--light-bg)]'
                                        }`}
                                    >
                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={isDeviceSelected(device)}
                                                onChange={() => handleDeviceSelect(device)}
                                                disabled={isProcessing}
                                                className="apple-checkbox mr-3"
                                                id={`device-${device.id}`}
                                            />
                                            <label htmlFor={`device-${device.id}`} className="cursor-pointer">
                                                <div className="text-sm font-medium text-[var(--text-primary)]">
                                                    {device.username || '未知用户'}
                                                </div>
                                                <div className="text-xs text-[var(--text-tertiary)]">
                                                    {device.device_ip}
                                                </div>
                                            </label>
                                        </div>
                                        <span className={`apple-badge ${
                                            isDeviceSelected(device)
                                                ? 'apple-badge-success'
                                                : ''
                                        }`}>
                                            {isDeviceSelected(device) ? '已选择' : '未选择'}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
            
            {/* 错误提示 */}
            {error && (
                <div className="apple-card p-4 bg-[rgba(255,59,48,0.05)]" role="alert">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-[var(--danger-color)]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-[var(--danger-color)]">{error}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PostTweetPage; 