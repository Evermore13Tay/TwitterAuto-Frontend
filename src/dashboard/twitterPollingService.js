// Twitter轮询服务
class TwitterPollingService {
  constructor() {
    this.isPolling = false;
    this.pollingInterval = null;
    this.callbacks = new Set();
  }

  // 添加回调函数
  addCallback(callback) {
    this.callbacks.add(callback);
  }

  // 移除回调函数
  removeCallback(callback) {
    this.callbacks.delete(callback);
  }

  // 通知所有回调函数
  notifyCallbacks(data) {
    this.callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Twitter轮询服务回调错误:', error);
      }
    });
  }

  // 开始轮询
  startPolling(interval = 5000) {
    if (this.isPolling) {
      console.warn('Twitter轮询服务已在运行中');
      return;
    }

    this.isPolling = true;
    console.log('开始Twitter轮询服务，间隔:', interval + 'ms');

    this.pollingInterval = setInterval(async () => {
      try {
        const data = await this.fetchTwitterData();
        this.notifyCallbacks(data);
      } catch (error) {
        console.error('Twitter轮询数据获取失败:', error);
        this.notifyCallbacks({ error: error.message });
      }
    }, interval);
  }

  // 停止轮询
  stopPolling() {
    if (!this.isPolling) {
      console.warn('Twitter轮询服务未在运行');
      return;
    }

    this.isPolling = false;
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    console.log('Twitter轮询服务已停止');
  }

  // 获取Twitter数据
  async fetchTwitterData() {
    try {
      // 模拟API调用
      const response = await fetch('/api/twitter/status');
      if (!response.ok) {
        throw new Error(`HTTP错误! 状态: ${response.status}`);
      }
      const data = await response.json();
      return {
        timestamp: new Date().toISOString(),
        accounts: data.accounts || [],
        tasks: data.tasks || [],
        devices: data.devices || [],
        statistics: data.statistics || {}
      };
    } catch (error) {
      // 如果API不可用，返回模拟数据
      console.warn('API不可用，使用模拟数据:', error.message);
      return this.getMockData();
    }
  }

  // 获取模拟数据
  getMockData() {
    return {
      timestamp: new Date().toISOString(),
      accounts: [
        { id: 1, username: 'test_user_001', status: 'online', lastActivity: '2分钟前' },
        { id: 2, username: 'test_user_002', status: 'offline', lastActivity: '10分钟前' },
        { id: 3, username: 'test_user_003', status: 'online', lastActivity: '1分钟前' }
      ],
      tasks: [
        { id: 1, name: '自动点赞任务', status: 'running', progress: 75 },
        { id: 2, name: '自动关注任务', status: 'paused', progress: 45 },
        { id: 3, name: '自动发推任务', status: 'completed', progress: 100 }
      ],
      devices: [
        { id: 1, ip: '192.168.1.10', status: 'online', containers: 5 },
        { id: 2, ip: '192.168.1.11', status: 'online', containers: 3 },
        { id: 3, ip: '192.168.1.12', status: 'offline', containers: 0 }
      ],
      statistics: {
        totalAccounts: 150,
        activeAccounts: 89,
        totalTasks: 25,
        runningTasks: 8,
        totalDevices: 12,
        onlineDevices: 10
      }
    };
  }

  // 执行任务操作
  async executeTask(taskId, action) {
    try {
      const response = await fetch(`/api/tasks/${taskId}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`任务操作失败: ${response.status}`);
      }

      const result = await response.json();
      console.log(`任务 ${taskId} ${action} 操作成功:`, result);
      return result;
    } catch (error) {
      console.error('任务操作失败:', error);
      throw error;
    }
  }

  // 更新任务配置
  async updateTaskConfig(taskId, config) {
    try {
      const response = await fetch(`/api/tasks/${taskId}/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        throw new Error(`配置更新失败: ${response.status}`);
      }

      const result = await response.json();
      console.log(`任务 ${taskId} 配置更新成功:`, result);
      return result;
    } catch (error) {
      console.error('配置更新失败:', error);
      throw error;
    }
  }

  // 获取任务日志
  async getTaskLogs(taskId, limit = 100) {
    try {
      const response = await fetch(`/api/tasks/${taskId}/logs?limit=${limit}`);
      if (!response.ok) {
        throw new Error(`日志获取失败: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('获取任务日志失败:', error);
      // 返回模拟日志
      return {
        logs: [
          { timestamp: new Date().toISOString(), level: 'info', message: '任务开始执行' },
          { timestamp: new Date().toISOString(), level: 'info', message: '正在处理账号...' },
          { timestamp: new Date().toISOString(), level: 'error', message: '遇到错误，重试中...' }
        ]
      };
    }
  }
}

// 创建单例实例
const twitterPollingService = new TwitterPollingService();

export default twitterPollingService;

// 导出类以便需要时创建新实例
export { TwitterPollingService }; 