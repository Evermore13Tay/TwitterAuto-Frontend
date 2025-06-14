// 代理服务管理
class ProxyService {
  constructor() {
    this.proxies = new Map();
    this.healthCheckInterval = null;
    this.isHealthChecking = false;
  }

  // 添加代理
  addProxy(proxy) {
    const { id, host, port, type = 'http', username, password } = proxy;
    
    if (!id || !host || !port) {
      throw new Error('代理配置缺少必要参数: id, host, port');
    }

    this.proxies.set(id, {
      id,
      host,
      port,
      type,
      username,
      password,
      status: 'unknown',
      lastCheck: null,
      responseTime: null,
      errorCount: 0,
      createdAt: new Date().toISOString()
    });

    console.log(`代理已添加: ${host}:${port}`);
    return this.proxies.get(id);
  }

  // 移除代理
  removeProxy(id) {
    if (this.proxies.has(id)) {
      const proxy = this.proxies.get(id);
      this.proxies.delete(id);
      console.log(`代理已移除: ${proxy.host}:${proxy.port}`);
      return true;
    }
    return false;
  }

  // 获取所有代理
  getAllProxies() {
    return Array.from(this.proxies.values());
  }

  // 获取特定代理
  getProxy(id) {
    return this.proxies.get(id);
  }

  // 获取可用代理
  getAvailableProxies() {
    return Array.from(this.proxies.values()).filter(proxy => proxy.status === 'online');
  }

  // 获取随机可用代理
  getRandomProxy() {
    const availableProxies = this.getAvailableProxies();
    if (availableProxies.length === 0) {
      return null;
    }
    const randomIndex = Math.floor(Math.random() * availableProxies.length);
    return availableProxies[randomIndex];
  }

  // 测试单个代理
  async testProxy(id) {
    const proxy = this.proxies.get(id);
    if (!proxy) {
      throw new Error(`代理不存在: ${id}`);
    }

    const startTime = Date.now();
    try {
      // 构建代理URL
      const proxyUrl = this.buildProxyUrl(proxy);
      
      // 测试代理连接
      const response = await this.makeProxyRequest(proxyUrl);
      const responseTime = Date.now() - startTime;

      // 更新代理状态
      proxy.status = 'online';
      proxy.lastCheck = new Date().toISOString();
      proxy.responseTime = responseTime;
      proxy.errorCount = 0;

      console.log(`代理测试成功: ${proxy.host}:${proxy.port} (${responseTime}ms)`);
      return { success: true, responseTime, proxy };

    } catch (error) {
      // 更新代理状态
      proxy.status = 'offline';
      proxy.lastCheck = new Date().toISOString();
      proxy.responseTime = null;
      proxy.errorCount += 1;

      console.error(`代理测试失败: ${proxy.host}:${proxy.port}`, error.message);
      return { success: false, error: error.message, proxy };
    }
  }

  // 构建代理URL
  buildProxyUrl(proxy) {
    const { type, host, port, username, password } = proxy;
    
    if (username && password) {
      return `${type}://${username}:${password}@${host}:${port}`;
    }
    return `${type}://${host}:${port}`;
  }

  // 通过代理发送请求
  async makeProxyRequest(proxyUrl, testUrl = 'http://httpbin.org/ip', timeout = 10000) {
    // 这里应该实现实际的代理请求
    // 由于浏览器环境限制，这里使用模拟实现
    
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('代理请求超时'));
      }, timeout);

      // 模拟代理请求
      setTimeout(() => {
        clearTimeout(timer);
        
        // 模拟90%的成功率
        if (Math.random() > 0.1) {
          resolve({
            status: 200,
            data: { origin: '127.0.0.1' }
          });
        } else {
          reject(new Error('代理连接失败'));
        }
      }, Math.random() * 2000 + 500); // 500-2500ms的随机延迟
    });
  }

  // 批量测试所有代理
  async testAllProxies() {
    const results = [];
    const proxyIds = Array.from(this.proxies.keys());

    console.log(`开始测试 ${proxyIds.length} 个代理...`);

    for (const id of proxyIds) {
      try {
        const result = await this.testProxy(id);
        results.push(result);
      } catch (error) {
        results.push({ success: false, error: error.message, proxyId: id });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`代理测试完成: ${successCount}/${results.length} 可用`);

    return results;
  }

  // 开始健康检查
  startHealthCheck(interval = 300000) { // 默认5分钟
    if (this.isHealthChecking) {
      console.warn('健康检查已在运行中');
      return;
    }

    this.isHealthChecking = true;
    console.log(`开始代理健康检查，间隔: ${interval}ms`);

    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.testAllProxies();
      } catch (error) {
        console.error('健康检查失败:', error);
      }
    }, interval);
  }

  // 停止健康检查
  stopHealthCheck() {
    if (!this.isHealthChecking) {
      console.warn('健康检查未在运行');
      return;
    }

    this.isHealthChecking = false;
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    console.log('代理健康检查已停止');
  }

  // 获取代理统计信息
  getStatistics() {
    const allProxies = this.getAllProxies();
    const onlineProxies = allProxies.filter(p => p.status === 'online');
    const offlineProxies = allProxies.filter(p => p.status === 'offline');
    
    return {
      total: allProxies.length,
      online: onlineProxies.length,
      offline: offlineProxies.length,
      unknown: allProxies.filter(p => p.status === 'unknown').length,
      averageResponseTime: this.calculateAverageResponseTime(onlineProxies)
    };
  }

  // 计算平均响应时间
  calculateAverageResponseTime(proxies) {
    const validResponseTimes = proxies
      .filter(p => p.responseTime !== null)
      .map(p => p.responseTime);
    
    if (validResponseTimes.length === 0) {
      return null;
    }

    const sum = validResponseTimes.reduce((acc, time) => acc + time, 0);
    return Math.round(sum / validResponseTimes.length);
  }

  // 导入代理列表
  importProxies(proxyList) {
    const results = [];
    
    proxyList.forEach((proxyData, index) => {
      try {
        const proxy = this.addProxy({
          id: proxyData.id || `proxy_${Date.now()}_${index}`,
          ...proxyData
        });
        results.push({ success: true, proxy });
      } catch (error) {
        results.push({ success: false, error: error.message, data: proxyData });
      }
    });

    console.log(`代理导入完成: ${results.filter(r => r.success).length}/${results.length} 成功`);
    return results;
  }

  // 导出代理列表
  exportProxies() {
    return this.getAllProxies().map(proxy => ({
      id: proxy.id,
      host: proxy.host,
      port: proxy.port,
      type: proxy.type,
      username: proxy.username,
      // 不导出密码和状态信息
    }));
  }

  // 清理离线代理
  cleanupOfflineProxies() {
    const offlineProxies = Array.from(this.proxies.values())
      .filter(proxy => proxy.status === 'offline' && proxy.errorCount > 5);
    
    offlineProxies.forEach(proxy => {
      this.removeProxy(proxy.id);
    });

    console.log(`清理了 ${offlineProxies.length} 个离线代理`);
    return offlineProxies.length;
  }
}

// 创建单例实例
const proxyService = new ProxyService();

// 初始化一些示例代理（用于测试）
if (proxyService.getAllProxies().length === 0) {
  const sampleProxies = [
    { id: 'proxy_1', host: '127.0.0.1', port: 8080, type: 'http' },
    { id: 'proxy_2', host: '127.0.0.1', port: 8081, type: 'http' },
    { id: 'proxy_3', host: '127.0.0.1', port: 8082, type: 'socks5' }
  ];
  
  proxyService.importProxies(sampleProxies);
}

export default proxyService;

// 导出类以便需要时创建新实例
export { ProxyService }; 