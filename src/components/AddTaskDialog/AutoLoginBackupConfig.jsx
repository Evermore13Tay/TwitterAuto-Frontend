import React from 'react';
import {
  Box, Typography, TextField, Button, IconButton, Chip,
  FormControl, Select, MenuItem
} from '@mui/material';
import { Clear as ClearIcon, Add as AddIcon, Remove as RemoveIcon } from '@mui/icons-material';

const AutoLoginBackupConfig = ({
  selectedDevice,
  batchInstanceSlots,
  availablePositions,
  batchAccounts,
  setBatchAccounts,
  selectedAccountGroup,
  setSelectedAccountGroup,
  availableGroups,
  selectedPureBackupFile,
  batchWaitTime,
  setBatchWaitTime,
  onToggleBatchPosition,
  onClearAllBatchPositions,
  onSelectPureBackupFile
}) => {
  // 计算推荐等待时间
  const calculateRecommendedBatchWaitTime = () => {
    const baseTime = 60;
    const additionalTimePerSlot = 35;
    const slotCount = batchInstanceSlots.length;
    return baseTime + (slotCount - 1) * additionalTimePerSlot;
  };

  const recommendedBatchWaitTime = calculateRecommendedBatchWaitTime();

  return (
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
            onClick={onClearAllBatchPositions}
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
              onClick={() => onToggleBatchPosition(slot)}
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
            onClick={onSelectPureBackupFile}
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
            onClick={() => setBatchWaitTime(Math.max(recommendedBatchWaitTime, batchWaitTime - 5))}
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
            onChange={(e) => setBatchWaitTime(Math.max(recommendedBatchWaitTime, parseInt(e.target.value) || recommendedBatchWaitTime))}
            placeholder={recommendedBatchWaitTime.toString()}
            inputProps={{ min: recommendedBatchWaitTime, max: 500 }}
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
          💡 设备重启后的等待时间，推荐最低{recommendedBatchWaitTime}秒（{batchInstanceSlots.length}个实例位：60+({batchInstanceSlots.length}-1)×35）
        </Typography>
      </Box>
    </>
  );
};

export default AutoLoginBackupConfig;