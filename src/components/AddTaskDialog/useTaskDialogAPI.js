import { useCallback } from 'react';

export const useTaskDialogAPI = () => {
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

  // 获取设备和实例位
  const fetchDevicesAndPositions = useCallback(async (setAvailableDevices, setAvailablePositions, setAvailableGroups) => {
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
  }, []);

  // 获取推文模板
  const fetchTweetTemplates = useCallback(async (setTweetTemplates) => {
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
  }, []);

  // 根据设备IP获取在线容器的实例位
  const fetchDevicePositions = useCallback(async (deviceIp, setAvailablePositions) => {
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
              if (container.name && typeof container.name === 'string') {
                const match = container.name.match(/(\d+)$/);
                if (match) {
                  return parseInt(match[1]);
                }
              }
              
              return null;
            })
            .filter(pos => pos !== null && pos >= 1 && pos <= 10) // 过滤有效的实例位
            .sort((a, b) => a - b); // 排序

          if (positions.length > 0) {
            console.log(`设备 ${deviceIp} 的在线实例位:`, positions);
            setAvailablePositions(positions);
          } else {
            console.log(`设备 ${deviceIp} 没有在线容器，使用默认实例位`);
            setAvailablePositions([1, 2, 3, 4, 5]);
          }
        } else {
          console.log(`设备 ${deviceIp} API响应格式异常:`, data);
          setAvailablePositions([1, 2, 3, 4, 5]);
        }
      } else {
        console.log(`设备 ${deviceIp} API请求失败:`, response.status);
        setAvailablePositions([1, 2, 3, 4, 5]);
      }
    } catch (error) {
      console.error(`获取设备 ${deviceIp} 实例位失败:`, error);
      setAvailablePositions([1, 2, 3, 4, 5]);
    }
  }, []);

  // 添加自定义设备
  const addCustomDevice = useCallback(async (customDeviceIP, setAvailableDevices, setCustomDeviceIP, setIpInputError) => {
    if (!customDeviceIP.trim()) {
      setIpInputError('请输入IP地址');
      return false;
    }

    // 验证IP格式
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(customDeviceIP.trim())) {
      setIpInputError('请输入有效的IP地址格式');
      return false;
    }

    // 验证IP地址范围
    const parts = customDeviceIP.trim().split('.');
    const isValidRange = parts.every(part => {
      const num = parseInt(part);
      return num >= 0 && num <= 255;
    });

    if (!isValidRange) {
      setIpInputError('IP地址范围应在0-255之间');
      return false;
    }

    try {
      const response = await fetch('http://localhost:8000/api/box-ips/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ip: customDeviceIP.trim(),
          name: `设备_${customDeviceIP.trim()}`,
          is_active: true
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('设备添加成功:', result);
        
        // 添加到设备列表
        setAvailableDevices(prev => [...prev, customDeviceIP.trim()]);
        setCustomDeviceIP('');
        setIpInputError('');
        return true;
      } else {
        const errorData = await response.json();
        if (response.status === 400 && errorData.detail && errorData.detail.includes('already exists')) {
          setIpInputError('该IP地址已存在');
        } else {
          setIpInputError('添加设备失败: ' + (errorData.detail || '未知错误'));
        }
        return false;
      }
    } catch (error) {
      console.error('添加设备失败:', error);
      setIpInputError('添加设备失败: 网络错误');
      return false;
    }
  }, []);

  // 选择备份文件夹
  const selectBackupFolder = useCallback(async (setSelectedBackupFolder, setBackupFiles) => {
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
        alert('此功能仅在Electron桌面应用中可用。请通过 "npm run electron:dev" 启动应用。');
      }
    } catch (error) {
      console.error('打开文件夹选择对话框失败:', error);
      alert('打开文件夹选择对话框时发生错误: ' + error.message);
    }
  }, []);

  // 扫描默认备份文件夹
  const scanDefaultBackupFolder = useCallback(async (selectedBackupFolder, setBackupFiles) => {
    if (!selectedBackupFolder) return;

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
  }, []);

  // 选择纯净备份文件（自动登录和备份使用）
  const selectPureBackupFile = useCallback(async (setSelectedPureBackupFile) => {
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
        alert('此功能仅在Electron桌面应用中可用。请通过 "npm run electron:dev" 启动应用。');
      }
    } catch (error) {
      console.error('打开文件选择对话框失败:', error);
      alert('打开文件选择对话框时发生错误: ' + error.message);
    }
  }, []);

  return {
    fetchDevicesAndPositions,
    fetchTweetTemplates,
    fetchDevicePositions,
    addCustomDevice,
    selectBackupFolder,
    scanDefaultBackupFolder,
    selectPureBackupFile
  };
};