import React from 'react';
import {
  Box, Typography, TextField, Button, IconButton, Chip,
  Switch, FormControlLabel, FormControl, Select, MenuItem
} from '@mui/material';
import { Clear as ClearIcon, FileUpload as FileUploadIcon, Add as AddIcon, Remove as RemoveIcon } from '@mui/icons-material';

const AutoNurtureConfig = ({
  selectedPositions,
  availablePositions,
  selectedBackupFolder,
  setSelectedBackupFolder,
  backupFiles,
  setBackupFiles,
  rebootWaitTime,
  setRebootWaitTime,
  executionDuration,
  setExecutionDuration,
  enableLiking,
  setEnableLiking,
  enableCommenting,
  setEnableCommenting,
  commentText,
  setCommentText,
  languageCode,
  setLanguageCode,
  onTogglePosition,
  onClearAllPositions,
  onSelectBackupFolder,
  onScanDefaultBackupFolder
}) => {
  // 计算推荐重启等待时间
  const calculateRecommendedRebootWaitTime = () => {
    const baseTime = 60;
    const additionalTimePerSlot = 35;
    const slotCount = selectedPositions.length;
    return baseTime + (slotCount - 1) * additionalTimePerSlot;
  };

  const recommendedRebootWaitTime = calculateRecommendedRebootWaitTime();

  return (
    <>
      {/* 实例位选择 */}
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
            onClick={onClearAllPositions}
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
              onClick={() => onTogglePosition(position)}
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

      {/* 选择备份文件夹 */}
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
            onClick={onSelectBackupFolder}
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
                  onScanDefaultBackupFolder();
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

      {/* 智能代理管理提示 */}
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

      {/* 设置语言 */}
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

      {/* 执行时长 */}
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

      {/* 点赞设置 */}
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

      {/* 评论设置 */}
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

      {/* 重启等待时间 */}
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
    </>
  );
};

export default AutoNurtureConfig;