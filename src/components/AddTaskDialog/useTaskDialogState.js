import { useState } from 'react';

export const useTaskDialogState = () => {
  // 基础状态
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
  const [executionDuration, setExecutionDuration] = useState(30);

  // 代理配置相关状态
  const [proxyFormat, setProxyFormat] = useState('single');
  const [proxyIP, setProxyIP] = useState('');
  const [proxyPort, setProxyPort] = useState('');
  const [proxyUsername, setProxyUsername] = useState('');
  const [proxyPassword, setProxyPassword] = useState('');
  const [proxyError, setProxyError] = useState('');

  // 语言设置
  const [languageCode, setLanguageCode] = useState('en');

  // 自动登录和备份相关状态
  const [batchAccounts, setBatchAccounts] = useState('');
  const [batchInstanceSlot, setBatchInstanceSlot] = useState(1);
  const [batchInstanceSlots, setBatchInstanceSlots] = useState([1]);
  const [batchWaitTime, setBatchWaitTime] = useState(60);

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

  // 自动养号备份文件夹相关状态
  const [selectedBackupFolder, setSelectedBackupFolder] = useState('D:/mytBackUp');
  const [backupFiles, setBackupFiles] = useState([]);
  const [selectedPureBackupFile, setSelectedPureBackupFile] = useState('');
  const [rebootWaitTime, setRebootWaitTime] = useState(60);
  const [backupInterval, setBackupInterval] = useState(60);

  // 数据列表状态
  const [availableDevices, setAvailableDevices] = useState([]);
  const [availablePositions, setAvailablePositions] = useState([]);
  const [availableGroups, setAvailableGroups] = useState([]);

  // 重置所有状态的函数
  const resetAllStates = () => {
    setTaskName('');
    setSelectedDevice('');
    setSelectedPositions([]);
    setSelectedProxy('');
    setSelectedFunction('');
    setSaveTemplate(false);
    setSelectedBackupFile('PureTwitter.tar.gz');
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
    
    // 重置自动养号备份文件夹设置
    setSelectedBackupFolder('D:/mytBackUp');
    setBackupFiles([]);
    setRebootWaitTime(60);
    setBackupInterval(60);
    
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
    
    // 重置纯净备份文件
    setSelectedPureBackupFile('');
  };

  return {
    // 基础状态
    taskName, setTaskName,
    selectedDevice, setSelectedDevice,
    selectedPositions, setSelectedPositions,
    selectedProxy, setSelectedProxy,
    selectedFunction, setSelectedFunction,
    saveTemplate, setSaveTemplate,
    selectedBackupFile, setSelectedBackupFile,
    selectedAccountGroup, setSelectedAccountGroup,
    executionTime, setExecutionTime,
    enableLiking, setEnableLiking,
    enableCommenting, setEnableCommenting,
    commentText, setCommentText,
    executionDuration, setExecutionDuration,

    // 代理配置状态
    proxyFormat, setProxyFormat,
    proxyIP, setProxyIP,
    proxyPort, setProxyPort,
    proxyUsername, setProxyUsername,
    proxyPassword, setProxyPassword,
    proxyError, setProxyError,

    // 语言设置
    languageCode, setLanguageCode,

    // 自动登录和备份状态
    batchAccounts, setBatchAccounts,
    batchInstanceSlot, setBatchInstanceSlot,
    batchInstanceSlots, setBatchInstanceSlots,
    batchWaitTime, setBatchWaitTime,

    // 设备IP状态
    customDeviceIP, setCustomDeviceIP,
    ipInputError, setIpInputError,

    // 一体化操作状态
    integratedOperations, setIntegratedOperations,
    selectedTweetTemplate, setSelectedTweetTemplate,
    tweetTemplates, setTweetTemplates,

    // 自动养号状态
    selectedBackupFolder, setSelectedBackupFolder,
    backupFiles, setBackupFiles,
    selectedPureBackupFile, setSelectedPureBackupFile,
    rebootWaitTime, setRebootWaitTime,
    backupInterval, setBackupInterval,

    // 数据列表状态
    availableDevices, setAvailableDevices,
    availablePositions, setAvailablePositions,
    availableGroups, setAvailableGroups,

    // 工具函数
    resetAllStates
  };
};