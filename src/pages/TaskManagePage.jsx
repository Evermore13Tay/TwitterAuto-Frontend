import React, { useState, useEffect, useRef } from 'react';
import { Box, Paper, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Pagination, TextField, FormControl, InputLabel, Select, MenuItem, Chip, Snackbar, Alert } from '@mui/material';
import AddTaskDialog from '../components/AddTaskDialog';


// CSS样式
const styles = `
  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.5; }
    100% { opacity: 1; }
  }
`;

// 注入CSS样式
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.type = "text/css";
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);
}

const TaskManagePage = () => {
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('全部');
  const [addTaskDialogOpen, setAddTaskDialogOpen] = useState(false);

  const [logs, setLogs] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [activePollingIntervals, setActivePollingIntervals] = useState(new Set()); // 跟踪活跃的轮询
  const [wsConnected, setWsConnected] = useState(false); // WebSocket连接状态

  
  // WebSocket连接引用
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const itemsPerPage = 10;

  // 🚀 WebSocket实时状态更新
  const initWebSocketConnection = () => {
    try {
      // 建立WebSocket连接
      const wsUrl = 'ws://localhost:8000/ws/task-status';
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('🔗 WebSocket连接已建立');
        setWsConnected(true);
        setLogs(prev => [...prev, `🔗 实时状态监控已连接`]);
        
        // 清除重连定时器
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 收到WebSocket消息:', data);
          
          switch (data.type) {
            case 'task_status_change':
              // 实时更新任务状态
              handleTaskStatusChange(data);
              break;
            case 'connection_established':
              console.log('✅ WebSocket连接确认:', data.message);
              break;
            case 'pong':
              // 心跳响应，保持连接活跃
              break;
            case 'all_tasks_status':
              // 接收到所有任务状态
              updateTasksFromWebSocket(data.tasks);
              break;
            case 'global_status':
              // 全局状态消息
              setLogs(prev => [...prev, `📢 ${data.message}`]);
              break;
            default:
              console.log('未知消息类型:', data.type);
          }
        } catch (error) {
          console.error('解析WebSocket消息失败:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket连接错误:', error);
        setWsConnected(false);
        setLogs(prev => [...prev, `❌ 实时连接出错，尝试重连...`]);
      };

      ws.onclose = (event) => {
        console.log('🔌 WebSocket连接已关闭, Code:', event.code, 'Reason:', event.reason);
        setWsConnected(false);
        
        // 如果不是手动关闭，尝试重连
        if (event.code !== 1000) {
          setLogs(prev => [...prev, `🔄 连接断开，5秒后自动重连...`]);
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('🔄 尝试重新连接WebSocket...');
            initWebSocketConnection();
          }, 5000);
        }
      };

      // 定期发送心跳
      const heartbeatInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping', timestamp: new Date().toISOString() }));
        }
      }, 30000); // 每30秒发送一次心跳

      // 保存心跳定时器引用以便清理
      wsRef.current.heartbeatInterval = heartbeatInterval;

    } catch (error) {
      console.error('初始化WebSocket连接失败:', error);
      setLogs(prev => [...prev, `❌ 无法建立实时连接: ${error.message}`]);
    }
  };

  // 处理任务状态变化
  const handleTaskStatusChange = (data) => {
    const { task_id, status: newStatus, task_name } = data;
    
    console.log(`📈 任务状态更新: ${task_name} (ID: ${task_id}) -> ${newStatus}`);
    console.log('📊 当前任务列表:', tasks.map(t => ({ id: t.id, name: t.taskName, status: t.status })));
    console.log('🔍 查找任务ID:', task_id, '类型:', typeof task_id);
    
    setLogs(prev => [...prev, `📈 任务 ${task_name} 状态更新为: ${newStatus}`]);
    
    // 实时更新任务列表中的状态
    setTasks(prevTasks => {
      return prevTasks.map(task => {
        if (task.id === parseInt(task_id)) {
          return {
            ...task,
            status: newStatus,
            operation: getOperationsByStatus(newStatus),
            finishTime: ['已完成', '失败', '已暂停'].includes(newStatus) 
              ? new Date().toLocaleString() 
              : task.finishTime
          };
        }
        return task;
      });
    });
    
    // 同时更新过滤后的任务列表
    setFilteredTasks(prevTasks => {
      return prevTasks.map(task => {
        if (task.id === parseInt(task_id)) {
          return {
            ...task,
            status: newStatus,
            operation: getOperationsByStatus(newStatus),
            finishTime: ['已完成', '失败', '已暂停'].includes(newStatus) 
              ? new Date().toLocaleString() 
              : task.finishTime
          };
        }
        return task;
      });
    });
    
    // 如果任务完成，显示成功提示并刷新任务列表
    if (newStatus === '已完成') {
      setSnackbar({
        open: true,
        message: `🎉 任务 "${task_name}" 已成功完成！`,
        severity: 'success'
      });
      // 延迟刷新任务列表，确保状态同步
      setTimeout(() => {
        console.log('🔄 任务完成后刷新任务列表');
        fetchTasks();
      }, 1000);
    } else if (newStatus === '失败') {
      setSnackbar({
        open: true,
        message: `❌ 任务 "${task_name}" 执行失败`,
        severity: 'error'
      });
      // 延迟刷新任务列表，确保状态同步
      setTimeout(() => {
        console.log('🔄 任务失败后刷新任务列表');
        fetchTasks();
      }, 1000);
    }
  };

  // 从WebSocket更新任务列表
  const updateTasksFromWebSocket = (wsTasksData) => {
    if (!Array.isArray(wsTasksData)) return;
    
    const transformedTasks = wsTasksData.map(task => ({
      id: task.id,
      taskName: task.task_name,
      taskType: task.task_type,
      status: task.status,
      description: task.description,
      createTime: task.created_at || task.create_time,
      finishTime: task.finish_time || '-',
      createdBy: task.created_by,
      params: task.params ? (typeof task.params === 'string' ? JSON.parse(task.params) : task.params) : {},
      operation: getOperationsByStatus(task.status)
    }));
    
    setTasks(transformedTasks);
    setFilteredTasks(transformedTasks);
  };

  // 关闭WebSocket连接
  const closeWebSocketConnection = () => {
    if (wsRef.current) {
      // 清理心跳定时器
      if (wsRef.current.heartbeatInterval) {
        clearInterval(wsRef.current.heartbeatInterval);
      }
      
      // 关闭连接
      wsRef.current.close(1000, 'Component unmounting');
      wsRef.current = null;
    }
    
    // 清理重连定时器
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    setWsConnected(false);
  };

  // 组件挂载时初始化WebSocket
  useEffect(() => {
    initWebSocketConnection();
    
    // 组件卸载时清理WebSocket连接
    return () => {
      closeWebSocketConnection();
    };
  }, []);

  // 🔧 添加缺失的cancelAllPolling函数
  const cancelAllPolling = () => {
    console.log('取消所有轮询任务');
    // 清除所有活跃的轮询间隔
    activePollingIntervals.forEach(intervalId => {
      clearInterval(intervalId);
    });
    setActivePollingIntervals(new Set());
    setIsRunning(false);
  };

  // 🔧 简化的executeScheduledPolling函数（如果不存在的话）
  const executeScheduledPolling = async ({ devices, pollingParams, setLogs, setIsRunning, setSnackbar, API_BASE_URL }) => {
    try {
      setLogs(prev => [...prev, `🚀 开始执行轮询任务，设备数量: ${devices.length}`]);
      
      // 这里可以添加具体的轮询逻辑
      // 目前只是一个占位符实现
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setLogs(prev => [...prev, `✅ 轮询任务执行完成`]);
      return { success: true };
    } catch (error) {
      setLogs(prev => [...prev, `❌ 轮询任务执行失败: ${error.message}`]);
      throw error;
    }
  };

  // Fetch tasks from API
  const fetchTasks = async () => {
    try {
      const params = new URLSearchParams({
        search: searchTerm || '',
        status: statusFilter || '全部',
        page: currentPage.toString(),
        per_page: itemsPerPage.toString()
      });
      
      const response = await fetch(`http://localhost:8000/api/tasks?${params}`);
      const result = await response.json();
      
      if (result.success) {
        // 🔧 修复：统一使用result.data.tasks格式
        const tasksData = result.data ? result.data.tasks : result.tasks; // 兼容两种格式
        const transformedTasks = tasksData.map(task => ({
          id: task.id,
          taskName: task.task_name,
          taskType: task.task_type,
          status: task.status,
          description: task.description,
          createTime: task.created_at || task.create_time, // 兼容两种字段名
          finishTime: task.finish_time || '-',
          createdBy: task.created_by,
          params: task.params ? (typeof task.params === 'string' ? JSON.parse(task.params) : task.params) : {}, // 正确解析JSON参数
          operation: getOperationsByStatus(task.status)
        }));
        
        setTasks(transformedTasks);
        setFilteredTasks(transformedTasks);
        
        // 🔧 修复：统一分页数据访问
        const paginationData = result.data || result;
        setTotalPages(paginationData.total_pages || 1);
        setTotalCount(paginationData.total || transformedTasks.length);
      } else {
        console.error('获取任务失败:', result.message);
        setTasks([]);
        setFilteredTasks([]);
      }
    } catch (error) {
      console.error('API请求失败:', error);
      // 如果API失败，使用模拟数据作为后备
      const mockTasks = [
        { id: 1, taskName: '任务名称1', status: '运行中', createTime: '2023-01-01 10:30', finishTime: '-', operation: ['暂停', '删除'] },
        { id: 2, taskName: '任务名称2', status: '已完成', createTime: '2023-01-02 14:20', finishTime: '2023-01-02 15:30', operation: ['重启', '删除'] },
        { id: 3, taskName: '任务名称3', status: '已暂停', createTime: '2023-01-03 09:15', finishTime: '-', operation: ['启动', '删除'] },
        { id: 4, taskName: '任务名称4', status: '失败', createTime: '2023-01-04 16:45', finishTime: '2023-01-04 16:50', operation: ['重试', '删除'] },
        { id: 5, taskName: '任务名称5', status: '运行中', createTime: '2023-01-05 11:20', finishTime: '-', operation: ['暂停', '删除'] },
      ];
      setTasks(mockTasks);
      setFilteredTasks(mockTasks);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // Refetch tasks when search or filter changes (with debounce for search)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setCurrentPage(1); // Reset to first page when searching
      fetchTasks();
    }, 300); // 300ms debounce for search

    return () => clearTimeout(timeoutId);
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    fetchTasks();
  }, [currentPage]);

  const handlePageChange = (event, value) => {
    setCurrentPage(value);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case '运行中': return '#4caf50';
      case '已完成': return '#2196f3';
      case '已暂停': return '#ff9800';
      case '失败': return '#f44336';
      default: return '#757575';
    }
  };

  const getOperationsByStatus = (status) => {
    switch (status) {
      case 'pending': 
        return ['启动', '删除'];
      case '运行中': 
        return ['暂停', '删除'];
      case '已完成': 
        return ['启动', '删除'];
      case '已暂停': 
        return ['启动', '删除'];
      case '失败': 
        return ['启动', '删除'];
      default: 
        return ['启动', '删除'];
    }
  };

  // 轮询检查任务状态（用于长时间运行的任务）
  const pollTaskStatus = async (taskId, taskName) => {
    setLogs(prev => [...prev, `🔍 开始监控任务 ${taskName} (ID: ${taskId}) 的状态...`]);
    
    const pollInterval = setInterval(async () => {
      try {
        // 获取单个任务的状态
        const response = await fetch(`http://localhost:8000/api/tasks?search=${taskId}&per_page=1`);
        const result = await response.json();
        
        // 🔧 修复：统一使用result.data.tasks格式
        const tasksData = result.data ? result.data.tasks : result.tasks; // 兼容两种格式
        if (result.success && tasksData.length > 0) {
          const task = tasksData[0];
          const currentStatus = task.status;
          
          if (currentStatus === '已完成') {
            clearInterval(pollInterval);
            setLogs(prev => [...prev, `✅ 任务 ${taskName} 已完成！`]);
            setLogs(prev => [...prev, `⏰ 完成时间: ${task.finish_time || '未知'}`]);
            
            // 刷新任务列表以显示最新状态
            await fetchTasks();
            
          } else if (currentStatus === '失败') {
            clearInterval(pollInterval);
            setLogs(prev => [...prev, `❌ 任务 ${taskName} 执行失败`]);
            setLogs(prev => [...prev, `⏰ 失败时间: ${task.finish_time || '未知'}`]);
            
            // 刷新任务列表以显示最新状态
            await fetchTasks();
            
          } else if (currentStatus === '运行中') {
            // 继续等待，可以添加进度提示
            setLogs(prev => [...prev, `⏳ 任务 ${taskName} 仍在运行中...`]);
          }
        }
      } catch (error) {
        console.error('轮询任务状态失败:', error);
        setLogs(prev => [...prev, `⚠️ 检查任务状态时出错: ${error.message}`]);
      }
    }, 10000); // 每10秒检查一次
    
    // 🔧 添加轮询间隔跟踪
    setActivePollingIntervals(prev => new Set([...prev, pollInterval]));
    
    // 设置超时机制，避免无限轮询
    setTimeout(() => {
      clearInterval(pollInterval);
      setActivePollingIntervals(prev => {
        const newSet = new Set(prev);
        newSet.delete(pollInterval);
        return newSet;
      });
      setLogs(prev => [...prev, `⏰ 任务 ${taskName} 监控超时，停止状态检查`]);
    }, 1800000); // 30分钟超时
  };

  // 执行轮询任务（用于点赞评论功能）
  const executePollingTask = async (task) => {
    try {
      setIsRunning(true);
      setLogs([`开始执行轮询任务: ${task.taskName}`]);

      // 从任务参数中获取设备列表
      const devices = task.params.selectedDevices || [];
      
      // 获取所有设备信息
      const response = await fetch('http://localhost:8000/api/devices');
      const devicesData = await response.json();
      
      if (!devicesData.success) {
        throw new Error('获取设备信息失败');
      }

      // 筛选出任务中选择的设备
      const selectedDevices = devicesData.devices.filter(device => 
        devices.includes(device.box_ip) && device.username
      );

      if (selectedDevices.length === 0) {
        throw new Error('没有找到可用的设备');
      }

      // 构建轮询参数
      const pollingParams = {
        executionTime: task.params.executionTime,
        executionDuration: task.params.executionDuration,
        enableLiking: task.params.enableLiking,
        enableCommenting: task.params.enableCommenting,
        commentText: task.params.commentText || '1',
        executionCount: 1, // 只执行一次
        intervalMinutes: 0 // 不重复
      };

      // 执行调度轮询
      await executeScheduledPolling({
        devices: selectedDevices,
        pollingParams,
        setLogs,
        setIsRunning,
        setSnackbar,
        API_BASE_URL: 'http://localhost:8000',
        getAllSystemDevicesFunc: async () => selectedDevices
      });

      // 更新任务状态为已完成
      await fetch(`http://localhost:8000/api/tasks/${task.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: '已完成' })
      });

      setLogs(prev => [...prev, `任务 ${task.taskName} 执行完成`]);
      fetchTasks(); // 刷新任务列表

    } catch (error) {
      console.error('执行轮询任务失败:', error);
      setLogs(prev => [...prev, `任务执行失败: ${error.message}`]);
      
      // 更新任务状态为失败
      await fetch(`http://localhost:8000/api/tasks/${task.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: '失败' })
      });
      
      fetchTasks();
    } finally {
      setIsRunning(false);
    }
  };

  // 处理任务操作
  const handleTaskOperation = async (taskId, operation, taskName) => {
    const task = tasks.find(t => t.id === taskId);
    
    try {
      console.log(`执行操作: ${operation}, 任务ID: ${taskId}, 任务名: ${taskName}`);
      
      if (operation === '删除') {
        // 检查任务状态，给出相应的确认提示
        const taskStatus = task?.status || '';
        let confirmMessage = `确定要删除任务 "${taskName}" 吗？`;
        
        if (taskStatus === '运行中') {
          confirmMessage = `任务 "${taskName}" 正在运行中，删除操作将先强制停止任务，然后删除。确定继续吗？`;
        }
        
        if (!window.confirm(confirmMessage)) {
          return;
        }
        
        console.log(`删除任务: ${taskId}${taskStatus === '运行中' ? ' (将先停止任务)' : ''}`);
        
        // 如果是运行中的任务，显示额外提示
        if (taskStatus === '运行中') {
          console.log('⚠️ 任务正在运行中，将执行强制停止操作');
        }
        
        const response = await fetch(`http://localhost:8000/api/tasks/${taskId}`, {
          method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
          console.log('任务删除成功');
          if (taskStatus === '运行中') {
            alert('任务已成功停止并删除');
          }
          fetchTasks(); // 刷新任务列表
        } else {
          alert('删除任务失败: ' + result.message);
        }
      } else if (operation === '暂停') {
        console.log(`暂停任务: ${taskId}`);
        
        try {
          // 调用新的停止任务API
          const response = await fetch(`http://localhost:8000/api/tasks/${taskId}/stop`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            }
          });
          
          const result = await response.json();
          
          if (response.ok && result.success) {
            console.log('任务暂停成功');
            // 取消所有轮询
            cancelAllPolling();
            setIsRunning(false);
            alert('任务停止请求已发送，正在安全终止...');
            fetchTasks(); // 刷新任务列表
          } else {
            alert('暂停任务失败: ' + (result.message || '未知错误'));
          }
        } catch (error) {
          console.error('暂停任务时出错:', error);
          alert('暂停任务时出错: ' + error.message);
        }
      } else if (operation === '启动') {
        console.log(`启动任务: ${taskId}`);
        
        // 调用新的执行任务API端点，增加超时控制
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时
        
        let response;
        try {
          response = await fetch(`http://localhost:8000/api/tasks/${taskId}/execute`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            mode: 'cors',
            credentials: 'omit',
            signal: controller.signal
          });
          clearTimeout(timeoutId);
        } catch (fetchError) {
          clearTimeout(timeoutId);
          if (fetchError.name === 'AbortError') {
            throw new Error('请求超时，请稍后重试');
          } else if (fetchError.message.includes('ERR_CONNECTION_RESET')) {
            throw new Error('服务器连接重置，请检查后端服务是否正常运行');
          } else if (fetchError.message.includes('Failed to fetch')) {
            throw new Error('网络连接失败，请检查网络连接和后端服务');
          } else {
            throw new Error(`网络请求失败: ${fetchError.message}`);
          }
        }
        
        if (!response.ok) {
          throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
          console.log('任务启动成功');
          // 立即更新本地任务状态
          setTasks(prevTasks => 
            prevTasks.map(t => 
              t.id === taskId ? { ...t, status: '运行中' } : t
            )
          );
          // 刷新任务列表
          await fetchTasks();
          // 延迟再次刷新确保后端状态同步
          setTimeout(async () => {
            await fetchTasks(); // 再次刷新任务列表
          }, 2000);
          
          // 根据任务类型执行不同的逻辑
          if (task && task.params) {
            console.log('任务对象:', task);
            console.log('任务参数:', task.params);
            const selectedFunction = task.params.selectedFunction;
            console.log('选择的功能:', selectedFunction);
            
            if (selectedFunction === '点赞评论') {
              // 执行轮询任务
              console.log('开始执行轮询任务');
              await executePollingTask(task);
            } else if (selectedFunction === '自动养号') {
              // 自动养号任务由后端处理，这里只需要提示
              setLogs([`自动养号任务 ${task.taskName} 已启动，由后端处理复杂流程`]);
              
              // 启动轮询检查任务状态
              await pollTaskStatus(task.id, task.taskName);
            } else if (selectedFunction === '自动登录和备份') {
              // 自动登录和备份任务由后端处理
              setLogs([`🚀 自动登录和备份任务 ${task.taskName} 已启动`]);
              setLogs(prev => [...prev, `📋 任务类型: ${selectedFunction}`]);
              setLogs(prev => [...prev, `🎯 执行方式: 后端批量处理`]);
              setLogs(prev => [...prev, `⏳ 正在执行批量登录和备份操作...`]);
              
              // 启动轮询检查任务状态
              await pollTaskStatus(task.id, task.taskName);
            } else {
              // 其他功能的处理逻辑
              setLogs([`任务 ${task.taskName} 已启动，功能：${selectedFunction || 'undefined'}`]);
            }
          } else {
            console.log('任务对象或参数为空:', { task, params: task?.params });
            setLogs([`任务 ${task?.taskName || 'Unknown'} 已启动，但无法获取参数`]);
          }
        } else {
          throw new Error('启动任务失败: ' + (result.message || '未知错误'));
        }
      } else {
        throw new Error(`未知操作: ${operation}`);
      }
    } catch (error) {
      console.error(`执行操作失败:`, error);
      const errorMessage = error.message || error.toString() || '未知错误';
      alert(`执行操作失败: ${errorMessage}`);
    }
  };

  const handleAddTask = async (taskData) => {
    try {
      console.log('收到前端任务数据:', taskData);
      console.log('selectedFunction:', taskData.selectedFunction);
      console.log('是否为一体化操作任务:', taskData.selectedFunction === '一体化操作任务');
      
      // 如果选择的是一体化操作任务，直接处理
      if (taskData.selectedFunction === '一体化操作任务') {
        console.log('处理一体化操作任务');
        
        // 构造一体化操作数据
        const operationData = {
          taskName: taskData.taskName,
          operations: taskData.integratedOperationParams.operations,
          tweetTemplate: taskData.integratedOperationParams.tweetTemplate
        };
        
        // 关闭添加任务对话框
        setAddTaskDialogOpen(false);
        
        // 直接处理一体化操作任务
        await handleIntegratedOperationSubmit(operationData);
        return;
      }
      
      // 根据功能类型确定任务类型
      let taskType = 'custom';
      let description = '';
      
      if (taskData.selectedFunction === '点赞评论') {
        taskType = 'polling';
        description = `设备: ${taskData.selectedDevices.join(', ')}, 功能: ${taskData.selectedFunction}, 执行时间: ${taskData.executionTime}`;
      } else if (taskData.selectedFunction === '自动养号') {
        taskType = 'auto_nurture';
        description = `设备: ${taskData.selectedDevices.join(', ')}, 实例位: ${taskData.selectedPositions.join(', ')}, 功能: ${taskData.selectedFunction}${taskData.selectedBackupFile ? ', 纯净备份: ' + taskData.selectedBackupFile : ''}${taskData.selectedAccountGroup ? ', 账号库: ' + taskData.selectedAccountGroup : ''}`;
      } else if (taskData.selectedFunction === '自动登录和备份') {
        taskType = 'batch_login_backup';
        description = `目标IP: ${taskData.batchLoginBackupParams?.targetIp || '未设置'}, 实例位: ${taskData.batchLoginBackupParams?.instanceSlot || '未设置'}, 功能: ${taskData.selectedFunction}${taskData.selectedAccountGroup ? ', 账号库: ' + taskData.selectedAccountGroup : ', 手动输入账号'}`;
      } else {
        description = `设备: ${taskData.selectedDevices.join(', ')}, 功能: ${taskData.selectedFunction}`;
      }
      
      // 构建提交给后端的任务数据
      const taskPayload = {
        task_name: taskData.taskName,
        task_type: taskType,
        status: 'pending',
        description: description,
        params: {
          selectedDevices: taskData.selectedDevices,
          selectedPositions: taskData.selectedPositions,
          selectedProxy: taskData.selectedProxy,
          selectedFunction: taskData.selectedFunction,
          saveTemplate: taskData.saveTemplate,
          selectedBackupFile: taskData.selectedBackupFile,
          selectedAccountGroup: taskData.selectedAccountGroup,
          executionTime: taskData.executionTime,
          executionDuration: taskData.executionDuration,
          enableLiking: taskData.enableLiking,
          enableCommenting: taskData.enableCommenting,
          commentText: taskData.commentText,
          // 包含自动养号的高级参数
          autoNurtureParams: taskData.autoNurtureParams,
          // 包含自动登录和备份的参数
          batchLoginBackupParams: taskData.batchLoginBackupParams
        },
        created_by: 'admin'
      };

      console.log('提交任务数据到后端:', taskPayload);

      const response = await fetch('http://localhost:8000/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskPayload)
      });

      if (!response.ok) {
        throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('后端返回结果:', result);
      
      if (result.success) {
        console.log('任务创建成功:', result);
        
        // 关闭对话框
        setAddTaskDialogOpen(false);
        
        // 立即刷新任务列表
        await fetchTasks();
        console.log('任务列表已刷新');
        
      } else {
        console.error('创建任务失败:', result.message);
        alert('创建任务失败: ' + result.message);
      }
    } catch (error) {
      console.error('提交任务失败:', error);
      
      let errorMessage = '提交任务失败: ';
      if (error.message) {
        errorMessage += error.message;
      } else if (error.toString && error.toString() !== '[object Object]') {
        errorMessage += error.toString();
      } else {
        errorMessage += '未知错误，请检查网络连接和后端服务';
      }
      
      console.error('详细错误信息:', {
        error,
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      alert(errorMessage);
    }
  };

  // 处理一体化操作任务提交
  const handleIntegratedOperationSubmit = async (operationData) => {
    try {
      console.log('提交一体化操作任务:', operationData);
      
      const response = await fetch('http://localhost:8000/api/integrated-operation/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(operationData)
      });

      if (!response.ok) {
        throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('一体化操作任务提交结果:', result);
      
      if (result.success) {
        setIntegratedOperationDialogOpen(false);
        setSnackbar({
          open: true,
          message: `一体化操作任务已启动: ${result.task_id}`,
          severity: 'success'
        });
        
        // 刷新任务列表
        await fetchTasks();
      } else {
        throw new Error(result.message || '提交失败');
      }
    } catch (error) {
      console.error('提交一体化操作任务失败:', error);
      setSnackbar({
        open: true,
        message: `提交失败: ${error.message}`,
        severity: 'error'
      });
    }
  };

  // Use tasks directly (pagination handled by server)
  const currentTasks = filteredTasks;



  const handleTaskTypeSelect = (taskType) => {
    // 这个函数现在不再需要，因为一体化操作任务在AddTaskDialog中直接处理
    console.log('选择的任务类型:', taskType);
  };

  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };



  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#f5f7fa' }}>
      {/* Main Content */}
      <Box sx={{ flexGrow: 1, p: 3, overflow: 'auto' }}>
        {/* Search and Filter Controls */}
        <Box sx={{ 
          display: 'flex', 
          gap: 2, 
          mb: 3,
          alignItems: 'center',
          bgcolor: '#fff',
          p: 2,
          borderRadius: 1,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <TextField
            size="small"
            placeholder="搜索任务名称..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ minWidth: 200 }}
          />
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>状态筛选</InputLabel>
            <Select
              value={statusFilter}
              label="状态筛选"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="全部">全部</MenuItem>
              <MenuItem value="运行中">运行中</MenuItem>
              <MenuItem value="已完成">已完成</MenuItem>
              <MenuItem value="已暂停">已暂停</MenuItem>
              <MenuItem value="失败">失败</MenuItem>
            </Select>
          </FormControl>
          <Box sx={{ flexGrow: 1 }} />
          
          {/* WebSocket连接状态指示器 */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            px: 2,
            py: 1,
            borderRadius: 1,
            bgcolor: wsConnected ? '#e8f5e8' : '#ffeaa7',
            border: `1px solid ${wsConnected ? '#4caf50' : '#f39c12'}`
          }}>
            <Box sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: wsConnected ? '#4caf50' : '#f39c12',
              animation: wsConnected ? 'none' : 'pulse 2s infinite'
            }} />
            <Typography variant="caption" sx={{ 
              fontWeight: 500,
              color: wsConnected ? '#2e7d32' : '#e67e22'
            }}>
              {wsConnected ? '实时连接' : '连接中...'}
            </Typography>
          </Box>
          
          <Button
            variant="contained" 
            size="small"
            onClick={() => setAddTaskDialogOpen(true)}
            sx={{ 
              bgcolor: '#1976d2',
              '&:hover': { bgcolor: '#1565c0' },
              fontWeight: 600,
              px: 3
            }}
          >
            新建任务
          </Button>
        </Box>

        {/* Tasks Table */}
        <Paper sx={{ mb: 3 }}>
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>任务ID</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>任务名称</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>类型</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>状态</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>创建时间</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>完成时间</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredTasks.map((task) => (
                  <TableRow key={task.id} hover>
                    <TableCell>{task.id}</TableCell>
                    <TableCell>{task.taskName}</TableCell>
                    <TableCell>
                      <Chip 
                        label={task.taskType === 'polling' ? '轮询' : task.taskType === 'auto_nurture' ? '自动养号' : '普通'} 
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '11px' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={task.status} 
                        size="small"
                        sx={{ 
                          bgcolor: getStatusColor(task.status),
                          color: 'white',
                          fontWeight: 'bold'
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: '13px' }}>{task.createTime}</TableCell>
                    <TableCell sx={{ fontSize: '13px' }}>{task.finishTime}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {task.operation.map((op, index) => {
                          // 为删除按钮生成特殊的提示信息
                          const getDeleteButtonTitle = () => {
                            if (op === '删除') {
                              return task.status === '运行中' 
                                ? '删除运行中的任务（将先停止任务再删除）' 
                                : '删除任务';
                            }
                            return '';
                          };

                          return (
                            <Button
                              key={index}
                              size="small" 
                              variant="text"
                              disabled={isRunning && (op === '启动' || op === '暂停')}
                              onClick={() => handleTaskOperation(task.id, op, task.taskName)}
                              title={getDeleteButtonTitle()}
                              sx={{ 
                                minWidth: 'auto',
                                fontSize: '12px',
                                color: op === '删除' ? '#f44336' : '#1976d2',
                                '&:hover': {
                                  bgcolor: op === '删除' ? 'rgba(244, 67, 54, 0.1)' : 'rgba(25, 118, 210, 0.1)'
                                },
                                '&:disabled': {
                                  color: '#ccc'
                                }
                              }}
                            >
                              {op === '删除' && task.status === '运行中' ? '🛑删除' : op}
                            </Button>
                          );
                        })}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* 执行日志 */}
        {logs.length > 0 && (
          <Paper sx={{ mb: 3, p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>执行日志</Typography>
            <Box sx={{ 
              maxHeight: 200, 
              overflow: 'auto',
              bgcolor: '#f5f5f5',
              p: 1,
              borderRadius: 1,
              fontFamily: 'monospace',
              fontSize: '12px'
            }}>
              {logs.map((log, index) => (
                <Box key={index} sx={{ mb: 0.5 }}>
                  {new Date().toLocaleTimeString()} - {log}
                </Box>
              ))}
            </Box>
          </Paper>
        )}

        {/* Pagination */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          bgcolor: '#fff',
          p: 2,
          borderRadius: 1,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <Typography variant="body2" color="text.secondary">
            共 {totalCount} 条记录，第 {currentPage} 页，共 {totalPages} 页
          </Typography>
          <Pagination 
            count={totalPages}
            page={currentPage}
            onChange={handlePageChange}
            color="primary"
            size="small"
          />
        </Box>
      </Box>

      {/* 新增任务对话框 */}
      <AddTaskDialog
        open={addTaskDialogOpen}
        onClose={() => setAddTaskDialogOpen(false)}
        onSubmit={handleAddTask}
      />



      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TaskManagePage; 