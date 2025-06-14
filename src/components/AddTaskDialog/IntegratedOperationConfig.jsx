import React from 'react';
import {
  Box, Typography, FormControl, Select, MenuItem, Switch,
  FormControlLabel, Grid, Chip
} from '@mui/material';

const IntegratedOperationConfig = ({
  integratedOperations,
  setIntegratedOperations,
  selectedTweetTemplate,
  setSelectedTweetTemplate,
  tweetTemplates
}) => {
  return (
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
  );
};

export default IntegratedOperationConfig; 