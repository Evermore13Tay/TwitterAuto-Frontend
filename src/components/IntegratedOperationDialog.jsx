import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config.js';

const IntegratedOperationDialog = ({ isOpen, onClose, onSubmit }) => {
  const [selectedOperations, setSelectedOperations] = useState([]);
  const [tweetTemplates, setTweetTemplates] = useState([]);
  const [selectedTweetTemplate, setSelectedTweetTemplate] = useState(null);
  const [onlineDevices, setOnlineDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // 可用的操作选项
  const availableOperations = [
    { id: 'post_tweet', label: '发推文', icon: '📝', enabled: true },
    { id: 'follow', label: '关注', icon: '👥', enabled: false },
    { id: 'change_signature', label: '改签名', icon: '✍️', enabled: false },
    { id: 'change_avatar', label: '改头像', icon: '🖼️', enabled: false }
  ];

  // 调试信息
  console.log('IntegratedOperationDialog 渲染状态:', {
    isOpen: isOpen,
    isOpenType: typeof isOpen,
    selectedOperations: selectedOperations,
    availableOperationsCount: availableOperations.length
  });

  // 加载在线设备
  const loadOnlineDevices = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/integrated-operation/online-devices`);
      const data = await response.json();
      if (data.success) {
        setOnlineDevices(data.devices);
        console.log('加载在线设备成功:', data.devices.length);
      }
    } catch (error) {
      console.error('加载在线设备失败:', error);
    }
  };

  // 加载推文模板
  const loadTweetTemplates = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      
      const response = await fetch(`${API_BASE_URL}/api/integrated-operation/tweet-templates?${params}`);
      const data = await response.json();
      if (data.success) {
        setTweetTemplates(data.templates);
        console.log('加载推文模板成功:', data.templates.length);
      }
    } catch (error) {
      console.error('加载推文模板失败:', error);
    }
  };

  // 初始化加载
  useEffect(() => {
    if (isOpen) {
      console.log('对话框打开，开始加载数据...');
      loadOnlineDevices();
      loadTweetTemplates();
    }
  }, [isOpen]);

  // 搜索变化时重新加载
  useEffect(() => {
    if (isOpen && selectedOperations.includes('post_tweet')) {
      loadTweetTemplates();
    }
  }, [searchTerm, isOpen, selectedOperations]);

  // 处理操作选择
  const handleOperationToggle = (operationId) => {
    console.log('切换操作:', operationId);
    setSelectedOperations(prev => {
      const newSelection = prev.includes(operationId)
        ? prev.filter(id => id !== operationId)
        : [...prev, operationId];
      console.log('新的选择:', newSelection);
      return newSelection;
    });
  };

  // 处理推文模板选择
  const handleTweetTemplateSelect = (template) => {
    console.log('选择推文模板:', template);
    setSelectedTweetTemplate(template);
  };

  // 提交表单
  const handleSubmit = async () => {
    if (selectedOperations.length === 0) {
      alert('请至少选择一个操作');
      return;
    }

    if (selectedOperations.includes('post_tweet') && !selectedTweetTemplate) {
      alert('选择发推文时必须选择推文模板');
      return;
    }

    setLoading(true);
    try {
      const requestData = {
        operations: selectedOperations,
        tweet_template_id: selectedTweetTemplate?.id || null
      };

      await onSubmit(requestData);
      
      // 重置表单
      setSelectedOperations([]);
      setSelectedTweetTemplate(null);
      setSearchTerm('');
      
    } catch (error) {
      console.error('提交失败:', error);
      alert('提交失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    console.log('对话框未打开，不渲染');
    return null;
  }

  console.log('开始渲染对话框...');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">一体化操作任务</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* 调试信息 */}
        <div className="p-4 bg-yellow-50 border-b border-yellow-200">
          <div className="text-sm text-yellow-800">
            <strong>调试信息:</strong> 已选择操作: {selectedOperations.join(', ') || '无'} | 
            在线设备: {onlineDevices.length} 个 | 
            推文模板: {tweetTemplates.length} 个 |
            对话框状态: {isOpen ? '已打开' : '未打开'} |
            渲染时间: {new Date().toLocaleTimeString()}
          </div>
          <div className="text-xs text-yellow-700 mt-1">
            可用操作: {availableOperations.map(op => `${op.label}(${op.enabled ? '启用' : '禁用'})`).join(', ')}
          </div>
        </div>

        <div className="flex h-[calc(90vh-200px)]">
          {/* 左侧：操作选择 */}
          <div className="w-1/3 p-6 border-r border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">选择操作</h3>
            
            <div className="space-y-3">
              {availableOperations.map(operation => (
                <div
                  key={operation.id}
                  className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                    operation.enabled
                      ? selectedOperations.includes(operation.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                      : 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-50'
                  }`}
                  onClick={() => {
                    console.log('点击操作:', operation.id, '启用状态:', operation.enabled);
                    if (operation.enabled) {
                      handleOperationToggle(operation.id);
                    }
                  }}
                >
                  <div className="flex items-center flex-1">
                    <span className="text-2xl mr-3">{operation.icon}</span>
                    <div>
                      <div className="font-medium text-gray-900">{operation.label}</div>
                      {!operation.enabled && (
                        <div className="text-sm text-gray-500">即将推出</div>
                      )}
                    </div>
                  </div>
                  {operation.enabled && (
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      selectedOperations.includes(operation.id)
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300'
                    }`}>
                      {selectedOperations.includes(operation.id) && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* 设备信息 */}
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-700 mb-2">目标设备</h4>
              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                <div>在线设备: {onlineDevices.length} 个</div>
                <div className="mt-1 text-xs">
                  将对所有在线设备执行选中的操作
                </div>
              </div>
            </div>
          </div>

          {/* 右侧：推文模板选择 */}
          <div className="flex-1 flex flex-col">
            {selectedOperations.includes('post_tweet') ? (
              <>
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">选择推文模板</h3>
                  
                  {/* 搜索框 */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="搜索推文模板..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>

                {/* 推文模板列表 */}
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="space-y-3">
                    {tweetTemplates.map(template => (
                      <div
                        key={template.id}
                        className={`p-4 rounded-lg border cursor-pointer transition-all ${
                          selectedTweetTemplate?.id === template.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleTweetTemplateSelect(template)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 mb-1">{template.title}</h4>
                            <p className="text-sm text-gray-600 line-clamp-2 mb-2">{template.content}</p>
                            
                            {/* 图片预览 */}
                            {template.images && template.images.length > 0 && (
                              <div className="flex space-x-2 mb-2">
                                {template.images.slice(0, 3).map((image, index) => (
                                  <div key={image.id} className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                                    <span className="text-xs text-gray-500">图{index + 1}</span>
                                  </div>
                                ))}
                                {template.images.length > 3 && (
                                  <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                                    <span className="text-xs text-gray-400">+{template.images.length - 3}</span>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span>使用次数: {template.use_count}</span>
                              {template.is_favorite === 1 && (
                                <span className="text-yellow-500">⭐ 收藏</span>
                              )}
                            </div>
                          </div>
                          
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ml-4 ${
                            selectedTweetTemplate?.id === template.id
                              ? 'border-blue-500 bg-blue-500'
                              : 'border-gray-300'
                          }`}>
                            {selectedTweetTemplate?.id === template.id && (
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {tweetTemplates.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-4xl mb-2">📝</div>
                      <div>没有找到推文模板</div>
                      <div className="text-sm mt-1">请先在作品库中创建推文模板</div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <div className="text-4xl mb-2">⚙️</div>
                  <div>请选择要执行的操作</div>
                  <div className="text-sm mt-1">选择左侧的操作后，相关配置将在此显示</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {selectedOperations.length > 0 && (
              <span>已选择 {selectedOperations.length} 个操作，将在 {onlineDevices.length} 个设备上执行</span>
            )}
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || selectedOperations.length === 0}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '执行中...' : '开始执行'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegratedOperationDialog;
