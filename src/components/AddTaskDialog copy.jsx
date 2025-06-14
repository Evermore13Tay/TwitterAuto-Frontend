import React, { useState, useEffect, useRef } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, TextField, Button, IconButton, Chip,
  FormControl, InputLabel, Select, MenuItem, Switch,
  FormControlLabel, Grid, Divider
} from '@mui/material';
import { Close as CloseIcon, Clear as ClearIcon, FileUpload as FileUploadIcon, Settings as SettingsIcon, Add as AddIcon, Remove as RemoveIcon } from '@mui/icons-material';


const AddTaskDialog = ({ open, onClose, onSubmit }) => {
  const taskNameRef = useRef(null);
  const [taskName, setTaskName] = useState('');
  const [selectedDevice, setSelectedDevice] = useState('');
  const [selectedPositions, setSelectedPositions] = useState([]);
  const [selectedProxy, setSelectedProxy] = useState('');
  const [selectedFunction, setSelectedFunction] = useState('');
  const [saveTemplate, setSaveTemplate] = useState(false);
  const [selectedBackupFile, setSelectedBackupFile] = useState('PureTwitter.tar.gz');
  const [selectedAccountGroup, setSelectedAccountGroup] = useState('');
  const [executionTime, setExecutionTime] = useState('');
  const [enableLiking, setEnableLiking] = useState(true);
  const [enableCommenting, setEnableCommenting] = useState(false);
  const [commentText, setCommentText] = useState('1');
  const [executionDuration, setExecutionDuration] = useState(30); // 执行时长（分钟）
  
  // 代理配置相关状态
  const [proxyFormat, setProxyFormat] = useState('single'); // 'single' 或 'separate'
  const [proxyIP, setProxyIP] = useState('');
  const [proxyPort, setProxyPort] = useState('');
  const [proxyUsername, setProxyUsername] = useState('');
  const [proxyPassword, setProxyPassword] = useState('');
  const [proxyError, setProxyError] = useState('');
  
  // 语言设置
  const [languageCode, setLanguageCode] = useState('en'); // 语言代码
  
  // 自动登录和备份相关状态
  const [batchAccounts, setBatchAccounts] = useState(''); // 批量账号列表
  const [batchInstanceSlot, setBatchInstanceSlot] = useState(1); // 实例位（保留兼容性）
  const [batchInstanceSlots, setBatchInstanceSlots] = useState([1]); // 多选实例位
  const [batchWaitTime, setBatchWaitTime] = useState(60); // 等待时间（秒）

  // 设备IP相关状态
  const [customDeviceIP, setCustomDeviceIP] = useState('');
  const [ipInputError, setIpInputError] = useState('');

  // 一体化操作任务相关状态
  const [integratedOperations, setIntegratedOperations] = useState({
    postTweet: false,
    follow: false,
    changeSignature: false,
    changeAvatar: false
  });
  const [selectedTweetTemplate, setSelectedTweetTemplate] = useState('');
  const [tweetTemplates, setTweetTemplates] = useState([]);

  // 计算推荐等待时间（批量登录备份）
  const calculateRecommendedWaitTime = () => {
    const baseTime = 60;
    const additionalTimePerSlot = 35;
    const slotCount = batchInstanceSlots.length;
    return baseTime + (slotCount - 1) * additionalTimePerSlot;
  };

  // 计算推荐等待时间（自动养号）
  const calculateRecommendedRebootWaitTime = () => {
    const baseTime = 60;
    const additionalTimePerSlot = 35;
    const slotCount = selectedPositions.length;
    return baseTime + (slotCount - 1) * additionalTimePerSlot;
  };

  // 获取当前推荐等待时间
  const recommendedWaitTime = calculateRecommendedWaitTime();
  const recommendedRebootWaitTime = calculateRecommendedRebootWaitTime();

  // 当实例位选择变化时，自动调整等待时间到推荐值（如果当前时间低于推荐值）
  useEffect(() => {
    if (batchWaitTime < recommendedWaitTime) {
      setBatchWaitTime(recommendedWaitTime);
    }
  }, [batchInstanceSlots.length]);

  // 当自动养号实例位选择变化时，自动调整重启等待时间到推荐值
  useEffect(() => {
    if (rebootWaitTime < recommendedRebootWaitTime) {
      setRebootWaitTime(recommendedRebootWaitTime);
    }
  }, [selectedPositions.length]);
  
  // 自动养号备份文件夹相关状态
  const [selectedBackupFolder, setSelectedBackupFolder] = useState('D:/mytBackUp'); // 选择的备份文件夹路径，默认为 D:/mytBackUp
  const [backupFiles, setBackupFiles] = useState([]); // 识别到的备份文件列表
  
  // 自动登录和备份的纯净备份文件选择状态
  const [selectedPureBackupFile, setSelectedPureBackupFile] = useState(''); // 选择的纯净备份文件路径
  const [rebootWaitTime, setRebootWaitTime] = useState(60); // 自动养号重启等待时间（秒）
  
  const [availableDevices, setAvailableDevices] = useState([]);
  const [availablePositions, setAvailablePositions] = useState([]);
  const [availableGroups, setAvailableGroups] = useState([]);

  // 强健的 Electron 环境检测
  const isElectronEnvironment = () => {
    // 方法1: 检查 window.electronAPI (理想情况)
    if (window.electronAPI && window.electronAPI.showOpenDialog) {
      console.log('✅ Electron detection: electronAPI found');
      return true;
    }
    
    // 方法2: 检查 window.isElectron (preload 注入)
    if (window.isElectron === true) {
      console.log('✅ Electron detection: isElectron flag found');
      return true;
    }
    
    // 方法3: 检查 userAgent 中的 Electron 标识
    if (navigator.userAgent.toLowerCase().includes('electron')) {
      console.log('✅ Electron detection: userAgent contains electron');
      return true;
    }
    
    // 方法4: 检查 process 对象（如果 nodeIntegration 开启）
    if (typeof window !== 'undefined' && window.process && window.process.type === 'renderer') {
      console.log('✅ Electron detection: process.type is renderer');
      return true;
    }
    
    console.log('❌ Electron detection: Not in Electron environment');
    console.log('Debug info:', {
      electronAPI: !!window.electronAPI,
      showOpenDialog: !!(window.electronAPI && window.electronAPI.showOpenDialog),
      isElectron: window.isElectron,
      userAgent: navigator.userAgent,
      processType: window.process?.type
    });
    
    return false;
  };

  // 获取可用设备和实例位
  useEffect(() => {
    if (open) {
      fetchDevicesAndPositions();
      fetchTweetTemplates();
    }
  }, [open]);

  // 当选择自动养号功能且有默认备份目录时，自动扫描备份文件
  useEffect(() => {
    if (selectedFunction === '自动养号' && selectedBackupFolder && selectedBackupFolder !== '') {
      scanDefaultBackupFolder();
    }
  }, [selectedFunction]);

  // 当Dialog打开时聚焦到任务名输入框
  useEffect(() => {
    if (open && taskNameRef.current) {
      setTimeout(() => {
        taskNameRef.current.focus();
      }, 100); // 延迟100ms确保Dialog完全渲染
    }
  }, [open]);

  const fetchDevicesAndPositions = async () => {
    try {
      // 获取用户自定义的设备IP列表（使用新的BoxIP API）
      const boxIpsResponse = await fetch('http://localhost:8000/api/box-ips/active');
      
      if (boxIpsResponse.ok) {
        const ipList = await boxIpsResponse.json();
        setAvailableDevices(ipList || []);
      } else {
        // 降级到旧API
        const customDevicesResponse = await fetch('http://localhost:8000/api/custom-devices');
        const customDevicesData = await customDevicesResponse.json();
        
        if (customDevicesData.success) {
          setAvailableDevices(customDevicesData.devices || []);
        } else {
          setAvailableDevices([]);
        }
      }

      // 实例位现在通过选择设备时动态获取，不再静态获取
      // 初始化为默认实例位
      setAvailablePositions([1, 2, 3, 4, 5]);

      // 获取账号分组列表
      const groupsResponse = await fetch('http://localhost:8000/api/groups/');
      const groupsData = await groupsResponse.json();
      
      if (groupsData && Array.isArray(groupsData)) {
        setAvailableGroups(groupsData);
      }
    } catch (error) {
      console.error('获取数据失败:', error);
      // 使用默认数据，不包含默认IP
      setAvailableDevices([]);
      setAvailablePositions([1, 2, 3, 4, 5]);
    }
  };

  // 获取推文模板
  const fetchTweetTemplates = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/integrated-operation/tweet-templates');
      const data = await response.json();
      if (data.success) {
        setTweetTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('获取推文模板失败:', error);
      setTweetTemplates([]);
    }
  };

  const handleClose = () => {
    // 重置表单
    setTaskName('');
    setSelectedDevice('');
    setSelectedPositions([]);
    setSelectedProxy('');
    setSelectedFunction('');
    setSaveTemplate(false);
    setSelectedBackupFile('');
    setSelectedAccountGroup('');
    setExecutionTime('');
    setEnableLiking(true);
    setEnableCommenting(false);
    setCommentText('1');
    setExecutionDuration(30);
    
    // 重置代理设置
    setProxyFormat('single');
    setProxyIP('');
    setProxyPort('');
    setProxyUsername('');
    setProxyPassword('');
    setProxyError('');
    
    // 重置语言设置
    setLanguageCode('en');
    
    // 重置自动登录和备份设置
    setBatchAccounts('');
    setBatchInstanceSlot(1);
    setBatchInstanceSlots([1]);
    setBatchWaitTime(60);
    
    // 重置自动养号备份文件夹设置（使用默认路径）
    setSelectedBackupFolder('D:/mytBackUp');
    setBackupFiles([]);
    setRebootWaitTime(60); // 重置自动养号重启等待时间
    
    // 重置自定义设备IP相关状态
    setCustomDeviceIP('');
    setIpInputError('');
    
    // 重置一体化操作相关状态
    setIntegratedOperations({
      postTweet: false,
      follow: false,
      changeSignature: false,
      changeAvatar: false
    });
    setSelectedTweetTemplate('');
    
    onClose();
  };

  const handleSubmit = () => {
    // 验证必填字段
    if (!taskName.trim()) {
      alert('请输入任务名称');
      return;
    }
    if (!selectedFunction) {
      alert('请选择功能');
      return;
    }
    
    // 一体化操作任务不需要在这里选择设备，会在后续对话框中处理
    if (selectedFunction !== '一体化操作任务' && !selectedDevice) {
      alert('请选择一个设备');
      return;
    }

    // 根据功能类型进行不同的验证
    if (selectedFunction === '自动养号') {
      if (selectedPositions.length === 0) {
        alert('请选择至少一个实例位');
        return;
      }
      if (!selectedBackupFolder || backupFiles.length === 0) {
        alert('请选择包含备份文件的文件夹');
        return;
      }
    }

    if (selectedFunction === '点赞评论') {
      if (!executionTime) {
        alert('请选择执行时间');
        return;
      }
    }

    if (selectedFunction === '自动登录和备份') {
      if (batchInstanceSlots.length === 0) {
        alert('请选择至少一个实例位');
        return;
      }
      if (!batchAccounts.trim() && !selectedAccountGroup) {
        alert('请输入账号列表或选择账号库');
        return;
      }
      if (!selectedPureBackupFile.trim()) {
        alert('请选择纯净备份文件（.tar.gz）\n未选择文件可能导致后续导入失败');
        return;
      }
      // 已启用基于账号的智能代理管理，无需验证代理输入
      // 目标IP自动使用选择的设备IP，无需单独验证
    }

    if (selectedFunction === '一体化操作任务') {
      // 检查是否至少选择了一个操作
      const hasSelectedOperation = Object.values(integratedOperations).some(op => op);
      if (!hasSelectedOperation) {
        alert('请至少选择一个操作');
        return;
      }
      
      // 如果选择了发推文，必须选择推文模板
      if (integratedOperations.postTweet && !selectedTweetTemplate) {
        alert('选择发推文操作时，请选择推文模板');
        return;
      }
    }

    const taskData = {
      taskName,
      selectedDevices: selectedFunction === '一体化操作任务' ? [] : [selectedDevice], // 一体化操作任务不需要预选设备
      selectedPositions,
      selectedFunction,
      saveTemplate,
      selectedBackupFile,
      selectedAccountGroup,
      executionTime,
      enableLiking,
      enableCommenting,
      commentText,
      executionDuration,
      
      // 自动养号参数 - 修复：确保参数正确传递
      devices: selectedFunction === '自动养号' ? [selectedDevice] : [],
      positions: selectedFunction === '自动养号' ? selectedPositions : [],
      autoNurtureParams: selectedFunction === '自动养号' ? {
        backupFolder: selectedBackupFolder,
        backupFiles: backupFiles,
        languageCode: languageCode,
        enableLiking,
        enableCommenting,
        commentText: enableCommenting ? commentText : '',
        rebootWaitTime: rebootWaitTime,
        executionDuration: executionDuration
      } : null,
      
      // 自动登录和备份参数
      batchLoginBackupParams: selectedFunction === '自动登录和备份' ? {
        targetIp: selectedDevice, // 直接使用设备IP作为目标IP
        instanceSlot: batchInstanceSlot, // 保留兼容性
        instanceSlots: batchInstanceSlots, // 新的多选实例位
        accounts: batchAccounts,
        waitTime: batchWaitTime,
        pureBackupFile: selectedPureBackupFile // 添加纯净备份文件路径
      } : null,
      
      // 一体化操作任务参数
      integratedOperationParams: selectedFunction === '一体化操作任务' ? {
        operations: integratedOperations,
        tweetTemplate: selectedTweetTemplate
      } : null
    };
    
    console.log('对话框提交任务数据:', taskData);
    onSubmit(taskData);
    handleClose();
  };

  const selectDevice = (device) => {
    setSelectedDevice(device);
    // 当选择设备时，实时获取该设备的在线实例位
    fetchDevicePositions(device);
  };

  // 根据设备IP获取在线容器的实例位
  const fetchDevicePositions = async (deviceIp) => {
    if (!deviceIp) {
      setAvailablePositions([1, 2, 3, 4, 5]); // 默认实例位
      return;
    }

    try {
      // 首先尝试调用设备管理API获取在线容器
      const response = await fetch(`http://127.0.0.1:5000/get/${deviceIp}`);
      
      if (response.ok) {
        const data = await response.json();
        
        // 根据实际API响应格式调整：通常是data.msg而不是data.data
        const containers = data?.msg || data?.data || [];
        
        if (data && data.code === 200 && Array.isArray(containers)) {
          // 从容器信息中提取实例位信息
          const positions = containers
            .map(container => {
              // 容器信息格式通常包含index字段直接表示实例位
              if (container.index && typeof container.index === 'number') {
                return container.index;
              }
              
              // 如果没有index字段，尝试从名称中提取
              const name = container.Names || container.name || '';
              
              // 尝试从名称末尾提取数字
              const match = name.match(/_(\d+)$/) || name.match(/(\d+)$/);
              if (match) {
                return parseInt(match[1]);
              }
              
              return null;
            })
            .filter(pos => pos !== null && pos >= 1 && pos <= 100) // 过滤有效的实例位
            .sort((a, b) => a - b); // 排序

          // 去重
          const uniquePositions = [...new Set(positions)];
          
          if (uniquePositions.length > 0) {
            setAvailablePositions(uniquePositions);
            console.log(`设备 ${deviceIp} 的在线实例位:`, uniquePositions);
            return; // 成功获取，直接返回
          }
        }
      }
      
      // 如果直接API调用失败，尝试备选方案：通过后端API获取
      console.warn(`设备管理服务直接调用失败，尝试备选方案...`);
      
      try {
        const backendResponse = await fetch(`http://localhost:8000/api/devices/${deviceIp}/positions`);
        if (backendResponse.ok) {
          const backendData = await backendResponse.json();
          if (backendData.success && Array.isArray(backendData.positions)) {
            setAvailablePositions(backendData.positions);
            console.log(`通过后端API获取设备 ${deviceIp} 实例位:`, backendData.positions);
            return;
          }
        }
      } catch (backendError) {
        console.warn(`后端API备选方案也失败:`, backendError);
      }
      
      // 所有方案都失败，使用默认实例位
      console.warn(`设备 ${deviceIp} 实例位获取失败，使用默认实例位`);
      setAvailablePositions([1, 2, 3, 4, 5]);
      
    } catch (error) {
      // 如果是网络连接错误，给出更友好的提示
      if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
        console.warn(`设备管理服务(端口5000)未运行或设备 ${deviceIp} 不可达，使用默认实例位`);
      } else {
        console.error(`获取设备 ${deviceIp} 实例位失败:`, error);
      }
      setAvailablePositions([1, 2, 3, 4, 5]); // 出错时使用默认值
    }
  };

  const clearSelectedDevice = () => {
    setSelectedDevice('');
    // 清空设备选择时，重置为默认实例位
    setAvailablePositions([1, 2, 3, 4, 5]);
    // 清空已选择的实例位
    setSelectedPositions([]);
    setBatchInstanceSlots([1]); // 重置批量实例位选择
  };

  // 验证IP地址格式
  const validateIP = (ip) => {
    const ipRegex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
  };

  // 添加自定义设备IP
  const addCustomDevice = async () => {
    if (!customDeviceIP.trim()) {
      setIpInputError('请输入IP地址');
      return;
    }
    
    if (!validateIP(customDeviceIP.trim())) {
      setIpInputError('请输入有效的IP地址格式（例如：192.168.1.100）');
      return;
    }
    
    const ip = customDeviceIP.trim();
    if (availableDevices.includes(ip)) {
      setIpInputError('该IP地址已存在');
      return;
    }
    
    try {
      // 使用新的BoxIP API保存到数据库
      const response = await fetch('http://localhost:8000/api/box-ips/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          ip_address: ip,
          name: `自定义设备-${ip}`,
          description: '用户手动添加的设备IP'
        }),
      });
      
      if (response.ok) {
        // 添加到可用设备列表
        setAvailableDevices(prev => [...prev, ip]);
        
        // 自动选中新添加的设备并获取实例位
        setSelectedDevice(ip);
        fetchDevicePositions(ip); // 获取该设备的实例位
        
        // 清空输入框和错误信息
        setCustomDeviceIP('');
        setIpInputError('');
      } else {
        const errorData = await response.json();
        setIpInputError(errorData.detail || '添加设备失败');
      }
    } catch (error) {
      console.error('添加设备失败:', error);
      setIpInputError('网络错误，请稍后重试');
    }
  };

  // 处理Enter键添加设备
  const handleCustomDeviceKeyPress = (e) => {
    if (e.key === 'Enter') {
      addCustomDevice();
    }
  };

  const togglePosition = (position) => {
    setSelectedPositions(prev => 
      prev.includes(position) 
        ? prev.filter(p => p !== position)
        : [...prev, position]
    );
  };

  const clearAllPositions = () => {
    setSelectedPositions([]);
  };

  // 解析代理字符串的函数
  const parseProxyString = (proxyStr) => {
    if (!proxyStr.trim()) return null;
    
    // 支持多种分隔符：Tab、空格、冒号、分号、逗号
    const separators = ['\t', ' ', ':', ';', ','];
    let parts = [proxyStr];
    
    // 尝试匹配 IP----PORT----USERNAME----PASSWORD 格式
    if (proxyStr.includes('----')) {
      const customParts = proxyStr.split('----').map(p => p.trim());
      if (customParts.length === 4) {
        return {
          ip: customParts[0],
          port: customParts[1],
          username: customParts[2],
          password: customParts[3]
        };
      }
    }
    
    // 尝试各种分隔符
    for (const sep of separators) {
      if (proxyStr.includes(sep)) {
        parts = proxyStr.split(sep).map(p => p.trim()).filter(p => p);
        break;
      }
    }
    
    // 如果只有一个部分，尝试用不同的模式解析
    if (parts.length === 1) {
      const str = parts[0];
      // 尝试匹配 IP:PORT@USER:PASS 格式
      const match1 = str.match(/^(\d+\.\d+\.\d+\.\d+):(\d+)@([^:]+):(.+)$/);
      if (match1) {
        return {
          ip: match1[1],
          port: match1[2],
          username: match1[3],
          password: match1[4]
        };
      }
      
      // 尝试匹配 USER:PASS@IP:PORT 格式
      const match2 = str.match(/^([^:]+):([^@]+)@(\d+\.\d+\.\d+\.\d+):(\d+)$/);
      if (match2) {
        return {
          ip: match2[3],
          port: match2[4],
          username: match2[1],
          password: match2[2]
        };
      }
      
      // 尝试匹配 IP:PORT 格式（无认证）
      const match3 = str.match(/^(\d+\.\d+\.\d+\.\d+):(\d+)$/);
      if (match3) {
        return {
          ip: match3[1],
          port: match3[2],
          username: '',
          password: ''
        };
      }
    }
    
    // 4个部分：IP 端口 用户名 密码
    if (parts.length >= 4) {
      return {
        ip: parts[0],
        port: parts[1],
        username: parts[2],
        password: parts[3]
      };
    }
    
    // 2个部分：IP:端口
    if (parts.length === 2) {
      return {
        ip: parts[0],
        port: parts[1],
        username: '',
        password: ''
      };
    }
    
    return null;
  };

  // 验证代理配置
  const validateProxy = (proxyData) => {
    if (!proxyData) return false;
    
    // 验证IP格式
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(proxyData.ip)) {
      setProxyError('IP地址格式不正确');
      return false;
    }
    
    // 验证IP范围
    const ipParts = proxyData.ip.split('.').map(Number);
    if (ipParts.some(part => part < 0 || part > 255)) {
      setProxyError('IP地址范围不正确（0-255）');
      return false;
    }
    
    // 验证端口
    const port = parseInt(proxyData.port);
    if (isNaN(port) || port < 1 || port > 65535) {
      setProxyError('端口范围不正确（1-65535）');
      return false;
    }
    
    setProxyError('');
    return true;
  };

  // 处理代理输入变化
  const handleProxyChange = (value) => {
    setSelectedProxy(value);
    setProxyError('');
    
    if (proxyFormat === 'single') {
      const parsed = parseProxyString(value);
      if (parsed && validateProxy(parsed)) {
        setProxyIP(parsed.ip);
        setProxyPort(parsed.port);
        setProxyUsername(parsed.username);
        setProxyPassword(parsed.password);
      }
    }
  };

  // 处理分别输入模式的代理更新
  const handleSeparateProxyChange = () => {
    if (proxyFormat === 'separate') {
      const proxyData = { ip: proxyIP, port: proxyPort, username: proxyUsername, password: proxyPassword };
      if (validateProxy(proxyData)) {
        setSelectedProxy(`${proxyIP}\t${proxyPort}\t${proxyUsername}\t${proxyPassword}`);
      }
    }
  };

  // 当分别输入的字段变化时更新组合字符串
  React.useEffect(() => {
    if (proxyFormat === 'separate') {
      handleSeparateProxyChange();
    }
  }, [proxyIP, proxyPort, proxyUsername, proxyPassword, proxyFormat]);

  // 扫描默认备份目录
  const scanDefaultBackupFolder = async () => {
    try {
      console.log('扫描默认备份目录:', selectedBackupFolder);
      const response = await fetch('http://localhost:8000/api/select-backup-folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ folder_path: selectedBackupFolder }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log('默认备份目录扫描成功，找到文件:', data.backup_files?.length || 0);
        setBackupFiles(data.backup_files || []);
      } else {
        console.log('默认备份目录扫描失败或目录不存在:', data.message);
        // 不显示错误提示，因为这是自动扫描
        setBackupFiles([]);
      }
    } catch (error) {
      console.error('扫描默认备份目录失败:', error);
      // 不显示错误提示，因为这是自动扫描
      setBackupFiles([]);
    }
  };

  // 处理备份文件夹选择（自动养号使用）
  const handleSelectBackupFolder = async () => {
    try {
      // 检查是否在Electron环境中
      if (isElectronEnvironment()) {
        console.log('Using Electron native dialog');
        
        // 确保 electronAPI 和 showOpenDialog 存在
        if (!window.electronAPI || !window.electronAPI.showOpenDialog) {
          console.error('electronAPI.showOpenDialog not available');
          alert('文件选择功能尚未准备就绪，请稍后再试。如果问题持续，请重启应用。');
          return;
        }
        
        // 使用Electron的原生文件夹选择对话框
        const result = await window.electronAPI.showOpenDialog({
          properties: ['openDirectory'],
          title: '选择备份文件夹',
          buttonLabel: '选择文件夹'
        });
        
        if (!result.canceled && result.filePaths.length > 0) {
          const selectedPath = result.filePaths[0];
          // 调用后端API扫描选中目录下的.tar.gz文件
      const response = await fetch('http://localhost:8000/api/select-backup-folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
            body: JSON.stringify({ folder_path: selectedPath }),
          });
          
          const data = await response.json();
          
          if (data.success) {
            setSelectedBackupFolder(data.folder_path);
            setBackupFiles(data.backup_files || []);
          } else {
            alert(data.message || '选择文件夹失败');
          }
        }
      } else {
        alert('此功能仅在Electron桌面应用中可用。请通过 \"npm run electron:dev\" 启动应用。');
      }
    } catch (error) {
      console.error('打开文件夹选择对话框失败:', error);
      alert('打开文件夹选择对话框时发生错误: ' + error.message);
    }
  };

  // 处理纯净备份文件选择（自动登录和备份使用）
  const handleSelectPureBackupFile = async () => {
    try {
      // 检查是否在Electron环境中
      if (isElectronEnvironment()) {
        console.log('Using Electron native dialog for pure backup file selection');
        
        // 确保 electronAPI 和 showOpenDialog 存在
        if (!window.electronAPI || !window.electronAPI.showOpenDialog) {
          console.error('electronAPI.showOpenDialog not available for file selection');
          alert('文件选择功能尚未准备就绪，请稍后再试。如果问题持续，请重启应用。');
          return;
        }
        
        // 使用Electron的原生文件选择对话框
        const result = await window.electronAPI.showOpenDialog({
          properties: ['openFile'],
          title: '选择纯净备份文件',
          buttonLabel: '选择文件',
          filters: [
            { name: '备份文件', extensions: ['tar.gz', 'tar'] },
            { name: '所有文件', extensions: ['*'] }
          ]
        });
        
        if (!result.canceled && result.filePaths.length > 0) {
          const selectedPath = result.filePaths[0];
          setSelectedPureBackupFile(selectedPath);
        }
      } else {
        alert('此功能仅在Electron桌面应用中可用。请通过 \"npm run electron:dev\" 启动应用。');
      }
    } catch (error) {
      console.error('打开文件选择对话框失败:', error);
      alert('打开文件选择对话框时发生错误: ' + error.message);
    }
  };

  // 处理文件夹浏览导航 (仅用于后端API调用，不再与前端浏览对话框绑定)
  const handleNavigateServerPath = async (path) => {
    // 这个函数现在只负责向后端请求扫描指定路径的文件，不再控制前端浏览对话框
    // 它的主要作用是与 handleSelectDirectoryFromBrowser 配合，处理用户在 Electron 原生对话框中选择的路径
    try {
      const response = await fetch('http://localhost:8000/api/browse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // 在这里，你可以选择如何处理后端返回的目录和文件信息
        // 对于原生对话框，我们只是简单地让它选择路径，然后扫描
        // 如果需要，可以在这里更新状态来显示扫描到的文件列表，但不再需要维护复杂的目录结构状态
      } else {
        console.error('后端扫描目录失败:', data.message);
      }
    } catch (error) {
      console.error('调用后端扫描目录API失败:', error);
    }
  };

  // 处理选择目录（在Electron原生对话框中选择后触发）
  const handleSelectDirectoryFromBrowser = async (selectedPath) => {
    // 这个函数现在仅仅是作为 Electron 对话框选择后的回调，不再与自定义对话框的关闭绑定
    try {
      // 调用后端API扫描选中目录下的.tar.gz文件
      const response = await fetch('http://localhost:8000/api/select-backup-folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ folder_path: selectedPath }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSelectedBackupFolder(data.folder_path);
        setBackupFiles(data.backup_files || []);
      } else {
        alert(data.message || '选择文件夹失败');
      }
    } catch (error) {
      console.error('选择备份文件夹失败:', error);
      alert('选择文件夹时发生错误');
    }
  };

  // 判断是否显示特定配置项
  const showAutoNurtureConfig = selectedFunction === '自动养号';
  const showPollingConfig = selectedFunction === '点赞评论';
  const showBatchLoginBackupConfig = selectedFunction === '自动登录和备份';

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: '#f5f5f5',
          borderRadius: 2
        }
      }}
    >
      {/* 标题栏 */}
      <DialogTitle sx={{ 
        textAlign: 'center', 
        fontSize: '18px', 
        fontWeight: 'bold',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        py: 2
      }}>
        新增任务
        <IconButton 
          onClick={handleClose}
          sx={{ 
            position: 'absolute', 
            right: 8, 
            top: 8,
            color: '#666'
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 4, py: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* 任务名 */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1.5, color: '#333', fontWeight: 600 }}>
              任务名
            </Typography>
            <TextField
              fullWidth
              size="small"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              placeholder="输入任务名称"
              ref={taskNameRef}
              tabIndex="1"
              onClick={(e) => {
                // 确保点击时能正确聚焦
                e.target.focus();
              }}
              sx={{ 
                bgcolor: '#fff',
                cursor: 'text',
                '& .MuiOutlinedInput-root': {
                  cursor: 'text',
                  '&:hover fieldset': {
                    borderColor: '#1976d2',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#1976d2',
                  },
                },
                '& .MuiOutlinedInput-input': {
                  cursor: 'text',
                }
              }}
            />
          </Box>

          {/* 设备 - 一体化操作任务不需要选择设备 */}
          {selectedFunction !== '一体化操作任务' && (
          <Box>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              mb: 1.5 
            }}>
              <Typography variant="subtitle2" sx={{ color: '#333', fontWeight: 600 }}>
                设备（单选）
              </Typography>
              <Button 
                startIcon={<ClearIcon />}
                size="small" 
                onClick={clearSelectedDevice}
                disabled={!selectedDevice}
                sx={{ 
                  color: '#666',
                  fontSize: '12px',
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' }
                }}
              >
                清空选择
              </Button>
            </Box>
            
            {/* 自定义设备IP输入 */}
            <Box sx={{ 
              display: 'flex', 
              gap: 1, 
              mb: 2,
              alignItems: 'flex-start'
            }}>
              <TextField
                size="small"
                value={customDeviceIP}
                onChange={(e) => {
                  setCustomDeviceIP(e.target.value);
                  if (ipInputError) setIpInputError(''); // 清除错误信息
                }}
                onKeyPress={handleCustomDeviceKeyPress}
                placeholder="输入设备IP地址（如：10.18.96.3）"
                error={!!ipInputError}
                helperText={ipInputError}
                sx={{ 
                  flex: 1,
                  bgcolor: '#fff',
                  '& .MuiFormHelperText-root': {
                    fontSize: '11px',
                    mt: 0.5
                  }
                }}
              />
              <Button
                variant="outlined"
                size="small"
                startIcon={<AddIcon />}
                onClick={addCustomDevice}
                sx={{ 
                  minWidth: 'auto',
                  px: 2,
                  height: '40px', // 与TextField高度匹配
                  borderColor: '#ddd',
                  color: '#666',
                  fontSize: '12px',
                  '&:hover': { borderColor: '#1976d2', color: '#1976d2' }
                }}
              >
                添加
              </Button>
            </Box>
            
            {/* 可选择的设备列表 */}
            <Box sx={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: 1,
              p: 2,
              bgcolor: '#fff',
              borderRadius: 1,
              border: '1px solid #e0e0e0',
              minHeight: '60px'
            }}>
              {availableDevices.length > 0 ? (
                availableDevices.map((device) => (
                  <Chip
                    key={device}
                    label={device}
                    variant={selectedDevice === device ? "filled" : "outlined"}
                    color={selectedDevice === device ? "primary" : "default"}
                    onClick={() => selectDevice(device)}
                    onDelete={selectedDevice !== device ? async () => {
                      // 只能删除未选中的设备
                      try {
                        const response = await fetch(`http://localhost:8000/api/box-ips/by-ip/${encodeURIComponent(device)}`, {
                          method: 'DELETE',
                        });
                        
                        if (response.ok) {
                          setAvailableDevices(prev => prev.filter(d => d !== device));
                        } else {
                          const errorData = await response.json();
                          console.error('删除设备失败:', errorData.detail || '删除失败');
                        }
                      } catch (error) {
                        console.error('删除设备失败:', error);
                      }
                    } : undefined}
                    sx={{ 
                      cursor: 'pointer',
                      '&:hover': { 
                        bgcolor: selectedDevice === device ? 'primary.dark' : 'rgba(0,0,0,0.04)' 
                      }
                    }}
                  />
                ))
              ) : (
                <Typography variant="body2" sx={{ color: '#999', fontStyle: 'italic' }}>
                  请输入IP地址添加设备
                </Typography>
              )}
            </Box>
            
            <Typography variant="caption" sx={{ mt: 1, display: 'block', color: '#666' }}>
              💡 单选模式：只能选择一个设备，可以删除未选中的设备
            </Typography>
          </Box>
          )}

          {/* 一体化操作任务提示 */}
          {selectedFunction === '一体化操作任务' && (
            <Box sx={{ p: 2, bgcolor: '#e3f2fd', borderRadius: 1, border: '1px solid #90caf9' }}>
              <Typography variant="subtitle2" sx={{ color: '#1976d2', fontWeight: 600, mb: 1 }}>
                🎯 一体化操作任务
              </Typography>
              <Typography variant="body2" sx={{ color: '#1565c0', mb: 1 }}>
                ✅ 将对所有在线设备执行选中的操作
              </Typography>
              <Typography variant="caption" sx={{ color: '#1976d2' }}>
                无需在此选择设备，系统将自动获取所有在线设备并执行操作
              </Typography>
            </Box>
          )}

          {/* 功能 */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1.5, color: '#333', fontWeight: 600 }}>
              功能
            </Typography>
            <FormControl fullWidth size="small">
              <Select
                value={selectedFunction}
                onChange={(e) => setSelectedFunction(e.target.value)}
                displayEmpty
                sx={{ bgcolor: '#fff' }}
              >
                <MenuItem value="">选择功能</MenuItem>
                <MenuItem value="自动养号">自动养号</MenuItem>
                <MenuItem value="自动登录和备份">自动登录和备份</MenuItem>
                <MenuItem value="一体化操作任务">一体化操作任务</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* 一体化操作任务配置 */}
          {selectedFunction === '一体化操作任务' && (
            <>
              {/* 操作选择 */}
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1.5, color: '#333', fontWeight: 600 }}>
                  选择操作
                </Typography>
                <Box sx={{ 
                  p: 2,
                  bgcolor: '#fff',
                  borderRadius: 1,
                  border: '1px solid #e0e0e0'
                }}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={integratedOperations.postTweet}
                            onChange={(e) => setIntegratedOperations(prev => ({
                              ...prev,
                              postTweet: e.target.checked
                            }))}
                            color="primary"
                          />
                        }
                        label="发推文"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={integratedOperations.follow}
                            onChange={(e) => setIntegratedOperations(prev => ({
                              ...prev,
                              follow: e.target.checked
                            }))}
                            color="primary"
                            disabled
                          />
                        }
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            关注
                            <Chip label="即将推出" size="small" color="default" sx={{ fontSize: '10px' }} />
                          </Box>
                        }
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={integratedOperations.changeSignature}
                            onChange={(e) => setIntegratedOperations(prev => ({
                              ...prev,
                              changeSignature: e.target.checked
                            }))}
                            color="primary"
                            disabled
                          />
                        }
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            改签名
                            <Chip label="即将推出" size="small" color="default" sx={{ fontSize: '10px' }} />
                          </Box>
                        }
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={integratedOperations.changeAvatar}
                            onChange={(e) => setIntegratedOperations(prev => ({
                              ...prev,
                              changeAvatar: e.target.checked
                            }))}
                            color="primary"
                            disabled
                          />
                        }
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            改头像
                            <Chip label="即将推出" size="small" color="default" sx={{ fontSize: '10px' }} />
                          </Box>
                        }
                      />
                    </Grid>
                  </Grid>
                </Box>
              </Box>

              {/* 推文模板选择 - 只在选择发推文时显示 */}
              {integratedOperations.postTweet && (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1.5, color: '#333', fontWeight: 600 }}>
                    选择推文模板
                  </Typography>
                  <FormControl fullWidth size="small">
                    <Select
                      value={selectedTweetTemplate}
                      onChange={(e) => setSelectedTweetTemplate(e.target.value)}
                      displayEmpty
                      sx={{ bgcolor: '#fff' }}
                    >
                      <MenuItem value="">选择推文模板</MenuItem>
                      {tweetTemplates.map((template) => (
                        <MenuItem key={template.id} value={template.id}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                            <Typography variant="body2" sx={{ flex: 1 }}>
                              {template.title}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              {template.images && template.images.length > 0 && (
                                <Chip 
                                  label={`📷 ${template.images.length}张`} 
                                  size="small" 
                                  color="info" 
                                  sx={{ fontSize: '10px', height: '20px' }} 
                                />
                              )}
                              {template.is_favorite && (
                                <Chip 
                                  label="⭐收藏" 
                                  size="small" 
                                  color="warning" 
                                  sx={{ fontSize: '10px', height: '20px' }} 
                                />
                              )}
                            </Box>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  
                  {/* 显示选中模板的预览 */}
                  {selectedTweetTemplate && (
                    <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1, border: '1px solid #e0e0e0' }}>
                      {(() => {
                        const template = tweetTemplates.find(t => t.id === selectedTweetTemplate);
                        return template ? (
                          <>
                            <Typography variant="caption" sx={{ color: '#666', mb: 1, display: 'block' }}>
                              模板预览：
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#333', mb: 1 }}>
                              {template.content}
                            </Typography>
                            {template.images && template.images.length > 0 ? (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Chip 
                                  label={`📷 包含 ${template.images.length} 张图片`} 
                                  size="small" 
                                  color="success" 
                                  sx={{ fontSize: '11px' }} 
                                />
                                {template.is_favorite && (
                                  <Chip 
                                    label="⭐ 收藏模板" 
                                    size="small" 
                                    color="warning" 
                                    sx={{ fontSize: '11px' }} 
                                  />
                                )}
                              </Box>
                            ) : (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Chip 
                                  label="📝 纯文本推文" 
                                  size="small" 
                                  color="default" 
                                  sx={{ fontSize: '11px' }} 
                                />
                                {template.is_favorite && (
                                  <Chip 
                                    label="⭐ 收藏模板" 
                                    size="small" 
                                    color="warning" 
                                    sx={{ fontSize: '11px' }} 
                                  />
                                )}
                              </Box>
                            )}
                          </>
                        ) : null;
                      })()}
                    </Box>
                  )}
                </Box>
              )}
            </>
          )}

          {/* 实例位 - 只在自动养号时显示 */}
          {showAutoNurtureConfig && (
            <Box>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                mb: 1.5 
              }}>
                <Typography variant="subtitle2" sx={{ color: '#333', fontWeight: 600 }}>
                  实例位
                </Typography>
                <Button 
                  startIcon={<ClearIcon />}
                  size="small" 
                  onClick={clearAllPositions}
                  sx={{ 
                    color: '#666',
                    fontSize: '12px',
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' }
                  }}
                >
                  清空
                </Button>
              </Box>
              <Box sx={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: 1,
                p: 2,
                bgcolor: '#fff',
                borderRadius: 1,
                border: '1px solid #e0e0e0',
                minHeight: '60px'
              }}>
                {availablePositions.map((position) => (
                  <Chip
                    key={position}
                    label={position}
                    variant={selectedPositions.includes(position) ? "filled" : "outlined"}
                    color={selectedPositions.includes(position) ? "primary" : "default"}
                    onClick={() => togglePosition(position)}
                    sx={{ 
                      cursor: 'pointer',
                      '&:hover': { 
                        bgcolor: selectedPositions.includes(position) ? 'primary.dark' : 'rgba(0,0,0,0.04)' 
                      }
                    }}
                  />
                ))}
              </Box>
              <Typography variant="caption" sx={{ mt: 1, display: 'block', color: '#666' }}>
                💡 实例位列表根据选择的设备实时获取在线容器信息
              </Typography>
            </Box>
          )}

          {/* 选择备份文件夹 - 只在自动养号时显示 */}
          {showAutoNurtureConfig && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1.5, color: '#333', fontWeight: 600 }}>
                📁 备份文件夹
              </Typography>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 2,
                bgcolor: '#fff',
                p: 2,
                borderRadius: 1,
                border: '1px solid #e0e0e0'
              }}>
                <Button
                  variant="outlined"
                  startIcon={<FileUploadIcon />}
                  onClick={handleSelectBackupFolder}
                  sx={{ 
                    minWidth: 'auto',
                    px: 2,
                    py: 0.5,
                    borderColor: '#ddd',
                    color: '#666',
                    fontSize: '13px',
                    '&:hover': { borderColor: '#1976d2', color: '#1976d2' }
                  }}
                >
                  选择文件夹
                </Button>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: selectedBackupFolder ? '#333' : '#999',
                    flex: 1,
                    fontSize: '13px'
                  }}
                >
                  {selectedBackupFolder ? (
                    <span>
                      <strong>当前路径：</strong>{selectedBackupFolder}
                      {selectedBackupFolder === 'D:/mytBackUp' && (
                        <span style={{ color: '#1976d2', marginLeft: '8px' }}>（默认路径）</span>
                      )}
                    </span>
                  ) : (
                    '请选择包含备份文件的文件夹（自动识别.tar.gz文件）'
                  )}
                </Typography>
                {selectedBackupFolder && selectedBackupFolder !== 'D:/mytBackUp' && (
                  <IconButton
                    size="small"
                    onClick={() => {
                      setSelectedBackupFolder('D:/mytBackUp');
                      setBackupFiles([]);
                      // 重新扫描默认路径
                      setTimeout(() => {
                        if (selectedFunction === '自动养号') {
                          scanDefaultBackupFolder();
                        }
                      }, 100);
                    }}
                    sx={{ color: '#666', p: 0.5 }}
                    title="重置为默认路径"
                  >
                    <ClearIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
              
              {/* 显示识别到的备份文件 */}
              {backupFiles.length > 0 && (
                <Box sx={{ mt: 2, p: 2, bgcolor: '#e8f5e8', borderRadius: 1, border: '1px solid #c3e6c3' }}>
                  <Typography variant="caption" sx={{ fontSize: '12px', color: '#155724', fontWeight: 'medium', mb: 1, display: 'block' }}>
                    ✅ 识别到 {backupFiles.length} 个备份文件：
                  </Typography>
                  <Box sx={{ maxHeight: '120px', overflowY: 'auto' }}>
                    {backupFiles.slice(0, 5).map((file, index) => (
                      <Typography key={index} variant="caption" sx={{ fontSize: '11px', color: '#155724', fontFamily: 'monospace', display: 'block' }}>
                        {index + 1}. {file}
                      </Typography>
                    ))}
                    {backupFiles.length > 5 && (
                      <Typography variant="caption" sx={{ fontSize: '11px', color: '#155724', fontFamily: 'monospace', display: 'block', mt: 1 }}>
                        ... 还有 {backupFiles.length - 5} 个文件未显示
                      </Typography>
                    )}
                  </Box>
                </Box>
              )}
            </Box>
          )}

          {/* 智能代理管理提示 - 只在自动养号时显示 */}
          {showAutoNurtureConfig && (
            <Box sx={{ p: 2, bgcolor: '#e8f5e8', borderRadius: 1, border: '1px solid #c8e6c9' }}>
              <Typography variant="subtitle2" sx={{ color: '#2e7d32', fontWeight: 600, mb: 1 }}>
                🎯 智能代理管理
              </Typography>
              <Typography variant="body2" sx={{ color: '#4caf50', mb: 1 }}>
                ✅ 已启用基于账号的自动代理管理
              </Typography>
              <Typography variant="caption" sx={{ color: '#66bb6a' }}>
                系统将自动为每个账号使用其预先配置的代理，无需手动输入代理信息
              </Typography>
            </Box>
          )}

          {/* 设置语言 - 只在自动养号时显示，放在设置代理下面 */}
          {showAutoNurtureConfig && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1.5, color: '#333', fontWeight: 600 }}>
                设置语言
              </Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={languageCode}
                  onChange={(e) => setLanguageCode(e.target.value)}
                  displayEmpty
                  sx={{ bgcolor: '#fff' }}
                >
                  <MenuItem value="en">English (en)</MenuItem>
                  <MenuItem value="zh">中文 (zh)</MenuItem>
                  <MenuItem value="ja">日语 (ja)</MenuItem>
                  <MenuItem value="ko">韩语 (ko)</MenuItem>
                  <MenuItem value="es">西班牙语 (es)</MenuItem>
                  <MenuItem value="fr">法语 (fr)</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}

          {/* 自动登录和备份配置 */}
          {showBatchLoginBackupConfig && (
            <>
              {/* 智能IP管理提示 */}
              <Box sx={{ p: 2, bgcolor: '#e3f2fd', borderRadius: 1, border: '1px solid #bbdefb' }}>
                <Typography variant="subtitle2" sx={{ color: '#1976d2', fontWeight: 600, mb: 1 }}>
                  🎯 智能IP管理
                </Typography>
                <Typography variant="body2" sx={{ color: '#1976d2', mb: 1 }}>
                  ✅ 系统将自动使用选择的设备IP作为目标IP
                </Typography>
                <Typography variant="caption" sx={{ color: '#42a5f5' }}>
                  无需手动输入目标IP，设备管理和任务执行使用同一IP地址
                </Typography>
              </Box>

              {/* 实例位多选 */}
              <Box>
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  mb: 1.5 
                }}>
                  <Typography variant="subtitle2" sx={{ color: '#333', fontWeight: 600 }}>
                    🚀 实例位（多选）
                  </Typography>
                  <Button 
                    startIcon={<ClearIcon />}
                    size="small" 
                    onClick={() => setBatchInstanceSlots([])}
                    sx={{ 
                      color: '#666',
                      fontSize: '12px',
                      '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' }
                    }}
                  >
                    清空
                  </Button>
                </Box>
                <Box sx={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: 1,
                  p: 2,
                  bgcolor: '#fff',
                  borderRadius: 1,
                  border: '1px solid #e0e0e0',
                  minHeight: '60px'
                }}>
                  {availablePositions.map((slot) => (
                    <Chip
                      key={slot}
                      label={`位${slot}`}
                      variant={batchInstanceSlots.includes(slot) ? "filled" : "outlined"}
                      color={batchInstanceSlots.includes(slot) ? "primary" : "default"}
                      onClick={() => {
                        setBatchInstanceSlots(prev => 
                          prev.includes(slot) 
                            ? prev.filter(s => s !== slot)
                            : [...prev, slot].sort((a, b) => a - b)
                        );
                      }}
                      sx={{ 
                        cursor: 'pointer',
                        '&:hover': { 
                          bgcolor: batchInstanceSlots.includes(slot) ? 'primary.dark' : 'rgba(0,0,0,0.04)' 
                        }
                      }}
                    />
                  ))}
                </Box>
                {batchInstanceSlots.length > 0 && (
                  <Typography variant="caption" sx={{ mt: 1, display: 'block', color: '#28a745' }}>
                    ✅ 已选择 {batchInstanceSlots.length} 个实例位：{batchInstanceSlots.join(', ')}
                  </Typography>
                )}
                <Typography variant="caption" sx={{ mt: 1, display: 'block', color: '#666' }}>
                  💡 实例位列表根据选择的设备实时获取在线容器信息
                </Typography>
              </Box>

              {/* 智能代理管理提示 */}
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1.5, color: '#333', fontWeight: 600 }}>
                  🚀 智能代理管理
                </Typography>
                <Box sx={{ 
                  p: 3, 
                  bgcolor: '#e8f5e8', 
                  borderRadius: 2, 
                  border: '1px solid #c3e6c3',
                  textAlign: 'center'
                }}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h6" sx={{ 
                      color: '#155724', 
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 1
                    }}>
                      🤖 系统自动管理代理配置
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: '#155724', mb: 2, lineHeight: 1.6 }}>
                    ✨ 无需手动输入代理信息！<br/>
                    系统将自动为每个账号获取其关联的代理配置
                  </Typography>
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: 1, 
                    alignItems: 'center',
                    fontSize: '13px',
                    color: '#155724'
                  }}>
                    <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      📊 在"代理管理"页面统一管理代理
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      🔗 在"账号管理"页面批量分配代理
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      ⚡ 任务执行时自动应用代理配置
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* 账号来源选择 */}
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1.5, color: '#333', fontWeight: 600 }}>
                  账号来源
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
                  <Button
                    variant={selectedAccountGroup ? "outlined" : "contained"}
                    onClick={() => {
                      setSelectedAccountGroup('');
                      // 保持现有的手动输入内容
                    }}
                    sx={{ 
                      bgcolor: selectedAccountGroup ? '#fff' : '#1976d2',
                      color: selectedAccountGroup ? '#1976d2' : '#fff',
                      '&:hover': {
                        bgcolor: selectedAccountGroup ? 'rgba(25, 118, 210, 0.04)' : '#1565c0'
                      }
                    }}
                  >
                    手动输入账号
                  </Button>
                  <FormControl size="small">
                    <Select
                      value={selectedAccountGroup}
                      onChange={(e) => {
                        setSelectedAccountGroup(e.target.value);
                        if (e.target.value) {
                          // 如果选择了账号库，清空手动输入的内容
                          setBatchAccounts('');
                        }
                      }}
                      displayEmpty
                      sx={{ bgcolor: '#fff' }}
                    >
                      <MenuItem value="">选择账号库</MenuItem>
                      {availableGroups.map((group) => (
                        <MenuItem key={group.id} value={group.id}>
                          {group.name} ({group.account_count || 0}个账号)
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                {/* 手动输入账号列表 */}
                {!selectedAccountGroup && (
                  <>
                    <Typography variant="body2" sx={{ mb: 1, color: '#666', fontSize: '13px' }}>
                      账号列表（每行一个：用户名 密码 密钥）
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      rows={6}
                      value={batchAccounts}
                      onChange={(e) => setBatchAccounts(e.target.value)}
                      placeholder={`请输入账号信息，每行一个，格式示例：\nuser1 pass1 secret1\nuser2 pass2 secret2\nuser3 pass3 secret3`}
                      sx={{ 
                        bgcolor: '#fff',
                        fontFamily: 'monospace',
                        '& .MuiInputBase-input': {
                          fontFamily: 'monospace',
                          fontSize: '13px'
                        }
                      }}
                    />
                    {batchAccounts.trim() && (
                      <Typography variant="caption" sx={{ mt: 1, display: 'block', color: '#666' }}>
                        解析到 {batchAccounts.trim().split('\n').filter(line => line.trim()).length} 行账号信息
                      </Typography>
                    )}
                  </>
                )}

                {/* 账号库信息显示 */}
                {selectedAccountGroup && (
                  <Box sx={{ mt: 1, p: 2, bgcolor: '#e3f2fd', borderRadius: 1, border: '1px solid #bbdefb' }}>
                    <Typography variant="body2" sx={{ color: '#1976d2', fontWeight: 'medium' }}>
                      🗂️ 已选择账号库：{availableGroups.find(g => g.id === selectedAccountGroup)?.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#1976d2' }}>
                      包含 {availableGroups.find(g => g.id === selectedAccountGroup)?.account_count || 0} 个账号，将自动使用库中的账号进行批量操作
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* 纯净备份文件选择 */}
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1.5, color: '#333', fontWeight: 600 }}>
                  📦 纯净备份文件 <span style={{ color: '#f44336' }}>*</span>
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <TextField
                    fullWidth
                    size="small"
                    value={selectedPureBackupFile}
                    placeholder="请选择纯净备份文件（.tar.gz）"
                    disabled
                    sx={{ 
                      bgcolor: '#f9f9f9',
                      '& .MuiInputBase-input': {
                        cursor: 'default'
                      }
                    }}
                  />
                  <Button
                    variant="outlined"
                    onClick={handleSelectPureBackupFile}
                    sx={{ 
                      minWidth: '100px',
                      height: '40px'
                    }}
                  >
                    选择文件
                  </Button>
                </Box>
                {selectedPureBackupFile && (
                  <Typography variant="caption" sx={{ mt: 1, display: 'block', color: '#4caf50' }}>
                    ✅ 已选择: {selectedPureBackupFile.split(/[/\\]/).pop()}
                  </Typography>
                )}
                {!selectedPureBackupFile && (
                  <Typography variant="caption" sx={{ mt: 1, display: 'block', color: '#f44336' }}>
                    ❌ 必须选择纯净备份文件，否则会导致导入失败
                  </Typography>
                )}
              </Box>

              {/* 等待时间配置 */}
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1.5, color: '#333', fontWeight: 600 }}>
                  ⏱️ 设备启动等待时间（秒）
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <IconButton
                    size="small"
                                          onClick={() => setBatchWaitTime(Math.max(recommendedWaitTime, batchWaitTime - 5))}
                    sx={{ 
                      bgcolor: '#f5f5f5', 
                      '&:hover': { bgcolor: '#e0e0e0' },
                      minWidth: '40px',
                      height: '40px'
                    }}
                  >
                    <RemoveIcon fontSize="small" />
                  </IconButton>
                  <TextField
                    size="small"
                    type="number"
                                          value={batchWaitTime}
                      onChange={(e) => setBatchWaitTime(Math.max(recommendedWaitTime, parseInt(e.target.value) || recommendedWaitTime))}
                    placeholder={recommendedWaitTime.toString()}
                    inputProps={{ min: recommendedWaitTime, max: 500 }}
                    sx={{ 
                      bgcolor: '#fff', 
                      flex: 1,
                      '& .MuiOutlinedInput-root': {
                        textAlign: 'center'
                      }
                    }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => setBatchWaitTime(Math.min(300, batchWaitTime + 5))}
                    sx={{ 
                      bgcolor: '#f5f5f5', 
                      '&:hover': { bgcolor: '#e0e0e0' },
                      minWidth: '40px',
                      height: '40px'
                    }}
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                </Box>
                <Typography variant="caption" sx={{ mt: 1, display: 'block', color: '#666' }}>
                  💡 设备重启后的等待时间，推荐最低{recommendedWaitTime}秒（{batchInstanceSlots.length}个实例位：60+({batchInstanceSlots.length}-1)×35）
                </Typography>
              </Box>
            </>
          )}

          {/* 执行时间 - 只在点赞评论时显示 */}
          {showPollingConfig && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1.5, color: '#333', fontWeight: 600 }}>
                执行时间
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="time"
                value={executionTime}
                onChange={(e) => setExecutionTime(e.target.value)}
                sx={{ bgcolor: '#fff' }}
                InputLabelProps={{ shrink: true }}
              />
            </Box>
          )}

          {/* 执行时长 - 只在自动养号或点赞评论时显示 */}
          {(showAutoNurtureConfig || showPollingConfig) && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1.5, color: '#333', fontWeight: 600 }}>
                执行时长（分钟）
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="number"
                value={executionDuration}
                onChange={(e) => setExecutionDuration(Number(e.target.value))}
                placeholder="请输入执行时长"
                sx={{ bgcolor: '#fff' }}
                inputProps={{ min: 1, max: 1440 }} // 1分钟到24小时
              />
            </Box>
          )}

          {/* 点赞设置 - 在自动养号或点赞评论时显示 */}
          {(showAutoNurtureConfig || showPollingConfig) && (
            <Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={enableLiking}
                    onChange={(e) => setEnableLiking(e.target.checked)}
                    color="primary"
                  />
                }
                label="启动点赞"
                sx={{ 
                  color: '#333',
                  '& .MuiFormControlLabel-label': { fontSize: '14px' }
                }}
              />
            </Box>
          )}

          {/* 评论设置 - 在自动养号或点赞评论时显示 */}
          {(showAutoNurtureConfig || showPollingConfig) && (
            <Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={enableCommenting}
                    onChange={(e) => setEnableCommenting(e.target.checked)}
                    color="primary"
                  />
                }
                label="启动评论"
                sx={{ 
                  color: '#333',
                  '& .MuiFormControlLabel-label': { fontSize: '14px' }
                }}
              />
              {enableCommenting && (
                <TextField
                  fullWidth
                  size="small"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="评论内容"
                  sx={{ bgcolor: '#fff', mt: 1 }}
                />
              )}
            </Box>
          )}

          {/* 重启等待时间 - 只在自动养号时显示 */}
          {showAutoNurtureConfig && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1.5, color: '#333', fontWeight: 600 }}>
                ⏱️ 设备重启后的等待时间（秒）
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <IconButton
                    size="small"
                    onClick={() => setRebootWaitTime(Math.max(recommendedRebootWaitTime, rebootWaitTime - 5))}
                    sx={{ 
                      bgcolor: '#f5f5f5', 
                      '&:hover': { bgcolor: '#e0e0e0' },
                      minWidth: '40px',
                      height: '40px'
                    }}
                  >
                    <RemoveIcon fontSize="small" />
                  </IconButton>
                  <TextField
                    size="small"
                    type="number"
                    value={rebootWaitTime}
                    onChange={(e) => setRebootWaitTime(Math.max(recommendedRebootWaitTime, parseInt(e.target.value) || recommendedRebootWaitTime))}
                    placeholder={recommendedRebootWaitTime.toString()}
                    inputProps={{ min: recommendedRebootWaitTime, max: 300 }}
                    sx={{ 
                      bgcolor: '#fff', 
                      flex: 1,
                      '& .MuiOutlinedInput-root': {
                        textAlign: 'center'
                      }
                    }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => setRebootWaitTime(Math.min(300, rebootWaitTime + 5))}
                    sx={{ 
                      bgcolor: '#f5f5f5', 
                      '&:hover': { bgcolor: '#e0e0e0' },
                      minWidth: '40px',
                      height: '40px'
                    }}
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                </Box>
                <Typography variant="caption" sx={{ mt: 1, display: 'block', color: '#666' }}>
                  💡 设备重启后的等待时间，推荐最低{recommendedRebootWaitTime}秒（{selectedPositions.length}个实例位：60+({selectedPositions.length}-1)×35）
                </Typography>
            </Box>
          )}

          {/* 保存为模板 */}
          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={saveTemplate}
                  onChange={(e) => setSaveTemplate(e.target.checked)}
                  color="primary"
                />
              }
              label="保存为模板"
              sx={{ 
                color: '#333',
                '& .MuiFormControlLabel-label': { fontSize: '14px' }
              }}
            />
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 4, pb: 3, gap: 2 }}>
        <Button 
          onClick={handleClose}
          variant="outlined"
          sx={{ 
            px: 4, 
            py: 1,
            color: '#666',
            borderColor: '#ddd',
            '&:hover': { borderColor: '#bbb' }
          }}
        >
          取消
        </Button>
        <Button 
          onClick={handleSubmit}
          variant="contained"
          disabled={
            !taskName.trim() || 
            !selectedFunction || 
            (selectedFunction !== '一体化操作任务' && !selectedDevice) ||
            (selectedFunction === '一体化操作任务' && !Object.values(integratedOperations).some(op => op)) ||
            (selectedFunction === '一体化操作任务' && integratedOperations.postTweet && !selectedTweetTemplate)
          }
          sx={{ 
            px: 4, 
            py: 1,
            bgcolor: '#1976d2',
            '&:hover': { bgcolor: '#1565c0' },
            '&:disabled': { bgcolor: '#ccc' }
          }}
        >
          确定
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddTaskDialog; 