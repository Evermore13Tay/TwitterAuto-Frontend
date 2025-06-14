import React, { useRef, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, TextField, Button, FormControl, 
  InputLabel, Select, MenuItem, Switch, FormControlLabel
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

import { useTaskDialogState } from './useTaskDialogState';
import { useTaskDialogAPI } from './useTaskDialogAPI';
import IntegratedOperationConfig from './IntegratedOperationConfig';
import AutoNurtureConfig from './AutoNurtureConfig';
import AutoLoginBackupConfig from './AutoLoginBackupConfig';
import DeviceSelection from './DeviceSelection';

const AddTaskDialog = ({ open, onClose, onSubmit }) => {
  const taskNameRef = useRef(null);
  
  // 使用状态管理hook
  const {
    taskName, setTaskName,
    selectedDevice, setSelectedDevice,
    selectedPositions, setSelectedPositions,
    selectedFunction, setSelectedFunction,
    saveTemplate, setSaveTemplate,
    selectedAccountGroup, setSelectedAccountGroup,
    executionTime, setExecutionTime,
    enableLiking, setEnableLiking,
    enableCommenting, setEnableCommenting,
    commentText, setCommentText,
    executionDuration, setExecutionDuration,
    customDeviceIP, setCustomDeviceIP,
    ipInputError, setIpInputError,
    integratedOperations, setIntegratedOperations,
    selectedTweetTemplate, setSelectedTweetTemplate,
    tweetTemplates, setTweetTemplates,
    selectedBackupFolder, setSelectedBackupFolder,
    backupFiles, setBackupFiles,
    rebootWaitTime, setRebootWaitTime,
    backupInterval, setBackupInterval,
    availableDevices, setAvailableDevices,
    availablePositions, setAvailablePositions,
    availableGroups, setAvailableGroups,
    batchAccounts, setBatchAccounts,
    batchInstanceSlots, setBatchInstanceSlots,
    batchWaitTime, setBatchWaitTime,
    selectedPureBackupFile, setSelectedPureBackupFile,
    languageCode, setLanguageCode,
    resetAllStates
  } = useTaskDialogState();

  // 使用API调用hook
  const {
    fetchDevicesAndPositions,
    fetchTweetTemplates,
    fetchDevicePositions,
    addCustomDevice,
    selectBackupFolder,
    scanDefaultBackupFolder,
    selectPureBackupFile
  } = useTaskDialogAPI();

  // 计算推荐等待时间
  const calculateRecommendedWaitTime = () => {
    const baseTime = 60;
    const additionalTimePerSlot = 35;
    const slotCount = selectedPositions.length;
    return baseTime + (slotCount - 1) * additionalTimePerSlot;
  };

  // 计算推荐等待时间（批量登录备份）
  const calculateRecommendedBatchWaitTime = () => {
    const baseTime = 60;
    const additionalTimePerSlot = 35;
    const slotCount = batchInstanceSlots.length;
    return baseTime + (slotCount - 1) * additionalTimePerSlot;
  };

  // 获取当前推荐等待时间
  const recommendedBatchWaitTime = calculateRecommendedBatchWaitTime();

  // 获取数据
  useEffect(() => {
    if (open) {
      fetchDevicesAndPositions(setAvailableDevices, setAvailablePositions, setAvailableGroups);
      fetchTweetTemplates(setTweetTemplates);
    }
  }, [open, fetchDevicesAndPositions, fetchTweetTemplates]);

  // 当选择自动养号功能且有默认备份目录时，自动扫描备份文件
  useEffect(() => {
    if (selectedFunction === '自动养号' && selectedBackupFolder && selectedBackupFolder !== '') {
      scanDefaultBackupFolder(selectedBackupFolder, setBackupFiles);
    }
  }, [selectedFunction, selectedBackupFolder, scanDefaultBackupFolder]);

  // 当自动养号实例位选择变化时，自动调整重启等待时间到推荐值
  useEffect(() => {
    const recommendedRebootWaitTime = calculateRecommendedWaitTime();
    if (rebootWaitTime < recommendedRebootWaitTime) {
      setRebootWaitTime(recommendedRebootWaitTime);
    }
  }, [selectedPositions.length]);

  // 当批量登录备份实例位选择变化时，自动调整等待时间到推荐值
  useEffect(() => {
    if (batchWaitTime < recommendedBatchWaitTime) {
      setBatchWaitTime(recommendedBatchWaitTime);
    }
  }, [batchInstanceSlots.length]);

  // 当Dialog打开时聚焦到任务名输入框
  useEffect(() => {
    if (open && taskNameRef.current) {
      setTimeout(() => {
        taskNameRef.current.focus();
      }, 100);
    }
  }, [open]);

  const handleClose = () => {
    resetAllStates();
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
      selectedDevices: selectedFunction === '一体化操作任务' ? [] : [selectedDevice],
      selectedPositions,
      selectedFunction,
      saveTemplate,
      selectedAccountGroup,
      executionTime,
      enableLiking,
      enableCommenting,
      commentText,
      executionDuration,
      
      // 自动养号参数
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
        targetIp: selectedDevice,
        instanceSlot: batchInstanceSlots[0], // 保留兼容性
        instanceSlots: batchInstanceSlots,
        accounts: batchAccounts,
        waitTime: batchWaitTime,
        pureBackupFile: selectedPureBackupFile
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
    fetchDevicePositions(device, setAvailablePositions);
  };

  const clearSelectedDevice = () => {
    setSelectedDevice('');
    setAvailablePositions([1, 2, 3, 4, 5]);
    setSelectedPositions([]);
    setBatchInstanceSlots([1]);
  };

  const handleAddCustomDevice = async () => {
    const success = await addCustomDevice(
      customDeviceIP, 
      setAvailableDevices, 
      setCustomDeviceIP, 
      setIpInputError
    );
    if (success) {
      console.log('设备添加成功');
    }
  };

  const handleCustomDeviceKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAddCustomDevice();
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

  const clearAllBatchPositions = () => {
    setBatchInstanceSlots([]);
  };

  const toggleBatchPosition = (position) => {
    setBatchInstanceSlots(prev => 
      prev.includes(position) 
        ? prev.filter(p => p !== position)
        : [...prev, position].sort((a, b) => a - b)
    );
  };

  // 显示配置的条件
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
          borderRadius: 2,
          maxHeight: '90vh'
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        pb: 2,
        borderBottom: '1px solid #e0e0e0'
      }}>
        <Typography variant="h6" sx={{ fontWeight: 600, color: '#333' }}>
          新建任务
        </Typography>
        <Button
          onClick={handleClose}
          sx={{ 
            minWidth: 'auto',
            p: 1,
            color: '#666',
            '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' }
          }}
        >
          <CloseIcon />
        </Button>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* 任务名称 */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1.5, color: '#333', fontWeight: 600 }}>
              任务名称
            </Typography>
            <TextField
              ref={taskNameRef}
              fullWidth
              size="small"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              placeholder="请输入任务名称"
              sx={{ bgcolor: '#fff' }}
            />
          </Box>

          {/* 设备选择 */}
          <DeviceSelection
            selectedFunction={selectedFunction}
            selectedDevice={selectedDevice}
            availableDevices={availableDevices}
            customDeviceIP={customDeviceIP}
            setCustomDeviceIP={setCustomDeviceIP}
            ipInputError={ipInputError}
            onSelectDevice={selectDevice}
            onAddCustomDevice={handleAddCustomDevice}
            onClearSelectedDevice={clearSelectedDevice}
            onCustomDeviceKeyPress={handleCustomDeviceKeyPress}
          />

          {/* 功能选择 */}
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
            <IntegratedOperationConfig
              integratedOperations={integratedOperations}
              setIntegratedOperations={setIntegratedOperations}
              selectedTweetTemplate={selectedTweetTemplate}
              setSelectedTweetTemplate={setSelectedTweetTemplate}
              tweetTemplates={tweetTemplates}
            />
          )}

          {/* 自动养号配置 */}
          {selectedFunction === '自动养号' && (
            <AutoNurtureConfig
              selectedPositions={selectedPositions}
              availablePositions={availablePositions}
              selectedBackupFolder={selectedBackupFolder}
              setSelectedBackupFolder={setSelectedBackupFolder}
              backupFiles={backupFiles}
              setBackupFiles={setBackupFiles}
              rebootWaitTime={rebootWaitTime}
              setRebootWaitTime={setRebootWaitTime}
              executionDuration={executionDuration}
              setExecutionDuration={setExecutionDuration}
              enableLiking={enableLiking}
              setEnableLiking={setEnableLiking}
              enableCommenting={enableCommenting}
              setEnableCommenting={setEnableCommenting}
              commentText={commentText}
              setCommentText={setCommentText}
              languageCode={languageCode}
              setLanguageCode={setLanguageCode}
              onTogglePosition={togglePosition}
              onClearAllPositions={clearAllPositions}
              onSelectBackupFolder={() => selectBackupFolder(setSelectedBackupFolder, setBackupFiles)}
              onScanDefaultBackupFolder={() => scanDefaultBackupFolder(selectedBackupFolder, setBackupFiles)}
            />
          )}

          {/* 自动登录和备份配置 */}
          {selectedFunction === '自动登录和备份' && (
            <AutoLoginBackupConfig
              selectedDevice={selectedDevice}
              batchInstanceSlots={batchInstanceSlots}
              availablePositions={availablePositions}
              batchAccounts={batchAccounts}
              setBatchAccounts={setBatchAccounts}
              selectedAccountGroup={selectedAccountGroup}
              setSelectedAccountGroup={setSelectedAccountGroup}
              availableGroups={availableGroups}
              selectedPureBackupFile={selectedPureBackupFile}
              batchWaitTime={batchWaitTime}
              setBatchWaitTime={setBatchWaitTime}
              onToggleBatchPosition={toggleBatchPosition}
              onClearAllBatchPositions={clearAllBatchPositions}
              onSelectPureBackupFile={() => selectPureBackupFile(setSelectedPureBackupFile)}
            />
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

          {/* 执行时长 - 只在点赞评论时显示 */}
          {showPollingConfig && (
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
                inputProps={{ min: 1, max: 1440 }}
              />
            </Box>
          )}

          {/* 点赞设置 - 只在点赞评论时显示 */}
          {showPollingConfig && (
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

          {/* 评论设置 - 只在点赞评论时显示 */}
          {showPollingConfig && (
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
            (selectedFunction === '一体化操作任务' && integratedOperations.postTweet && !selectedTweetTemplate) ||
            ((selectedFunction === '自动养号' || selectedFunction === '自动登录和备份') && selectedPositions.length === 0 && batchInstanceSlots.length === 0)
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