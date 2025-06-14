import React from 'react';
import {
  Box, Typography, TextField, Button, IconButton, Chip
} from '@mui/material';
import { Add as AddIcon, Clear as ClearIcon } from '@mui/icons-material';

const DeviceSelection = ({
  selectedFunction,
  selectedDevice,
  availableDevices,
  customDeviceIP,
  setCustomDeviceIP,
  ipInputError,
  onSelectDevice,
  onAddCustomDevice,
  onClearSelectedDevice,
  onCustomDeviceKeyPress
}) => {
  // 一体化操作任务不需要选择设备
  if (selectedFunction === '一体化操作任务') {
    return (
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
    );
  }

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1.5, color: '#333', fontWeight: 600 }}>
        设备（单选）
      </Typography>
      
      {/* 自定义设备IP输入 */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1, 
        mb: 2,
        p: 2,
        bgcolor: '#fff',
        borderRadius: 1,
        border: '1px solid #e0e0e0'
      }}>
        <TextField
          size="small"
          placeholder="输入设备IP地址（如：10.18.96.3）"
          value={customDeviceIP}
          onChange={(e) => setCustomDeviceIP(e.target.value)}
          onKeyPress={onCustomDeviceKeyPress}
          error={!!ipInputError}
          helperText={ipInputError}
          sx={{ 
            flex: 1,
            '& .MuiFormHelperText-root': {
              position: 'absolute',
              bottom: '-20px',
              fontSize: '11px'
            }
          }}
        />
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={onAddCustomDevice}
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
          添加
        </Button>
      </Box>

      {/* 设备选择 */}
      <Box sx={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: 1,
        p: 2,
        bgcolor: '#fff',
        borderRadius: 1,
        border: '1px solid #e0e0e0',
        minHeight: '60px',
        position: 'relative'
      }}>
        {selectedDevice && (
          <IconButton
            size="small"
            onClick={onClearSelectedDevice}
            sx={{ 
              position: 'absolute',
              top: 8,
              right: 8,
              color: '#666',
              p: 0.5,
              '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' }
            }}
            title="清空选择"
          >
            <ClearIcon fontSize="small" />
          </IconButton>
        )}
        
        {availableDevices.length > 0 ? (
          availableDevices.map((device) => (
            <Chip
              key={device}
              label={device}
              variant={selectedDevice === device ? "filled" : "outlined"}
              color={selectedDevice === device ? "primary" : "default"}
              onClick={() => onSelectDevice(device)}
              onDelete={selectedDevice !== device ? async () => {
                try {
                  const response = await fetch(`http://localhost:8000/api/box-ips/by-ip/${encodeURIComponent(device)}`, {
                    method: 'DELETE'
                  });
                  if (response.ok) {
                    // 从设备列表中移除
                    // 这里需要通过回调函数来更新父组件的状态
                    console.log('设备删除成功:', device);
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
  );
};

export default DeviceSelection;