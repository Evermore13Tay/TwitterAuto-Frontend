// API服务，用于与后端通信

// 获取API基础URL
function getBaseUrl() {
  // 从Electron预加载脚本中获取后端URL配置（如果在Electron环境中）
  if (window.apiConfig && window.apiConfig.backendUrl) {
    return window.apiConfig.backendUrl;
  }
  
  // 默认使用localhost
  return 'http://localhost:8000';
}

// 基本的fetch封装
async function fetchWithTimeout(url, options = {}, timeout = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  const response = await fetch(url, {
    ...options,
    signal: controller.signal
  });
  
  clearTimeout(id);
  return response;
}

// API封装
const api = {
  // 检查后端连接状态
  checkConnection: async (retries = 5, delay = 3000) => {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await fetchWithTimeout(`${getBaseUrl()}/`, {}, 5000);
        if (response.ok) {
          console.log('Backend connection successful.');
          return true;
        }
        console.warn(`Backend connection attempt ${attempt + 1}/${retries} returned status: ${response.status}`);
      } catch (error) {
        console.error(`Backend connection check failed (attempt ${attempt + 1}/${retries}):`, error.message);
      }
      if (attempt < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    console.error('Failed to connect to backend after multiple retries.');
    return false;
  },
  
  // 获取设备列表
  getDevices: async () => {
    try {
      const response = await fetch(`${getBaseUrl()}/api/device/all`);
      if (!response.ok) throw new Error('Failed to fetch devices');
      return await response.json();
    } catch (error) {
      console.error('Error fetching devices:', error);
      throw error;
    }
  },
  
  // 刷新设备状态
  refreshDevices: async (ips) => {
    try {
      const response = await fetch(`${getBaseUrl()}/api/device/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ips })
      });
      if (!response.ok) throw new Error('Failed to refresh devices');
      return await response.json();
    } catch (error) {
      console.error('Error refreshing devices:', error);
      throw error;
    }
  },

  // 获取容器列表
  getContainers: async () => {
    try {
      const response = await fetch(`${getBaseUrl()}/api/containers`);
      if (!response.ok) throw new Error('Failed to fetch containers');
      return await response.json();
    } catch (error) {
      console.error('Error fetching containers:', error);
      throw error;
    }
  },

  // WebSocket连接URL
  getWebSocketUrl: () => {
    const baseUrl = getBaseUrl();
    return baseUrl.replace('http://', 'ws://').replace('https://', 'wss://') + '/ws';
  }
};

export default api; 