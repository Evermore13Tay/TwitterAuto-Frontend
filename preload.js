const { contextBridge, ipcRenderer } = require('electron');

// 在window对象上暴露API给渲染进程
try {
  contextBridge.exposeInMainWorld('electronAPI', {
    // 如果需要，可以在这里添加更多功能
    getVersion: () => process.versions.electron,
    getPlatform: () => process.platform,
    showOpenDialog: async (options) => {
      console.log('Preload: showOpenDialog called with options:', options);
      try {
        const result = await ipcRenderer.invoke('show-open-dialog', options);
        console.log('Preload: Dialog result received:', result);
        return result;
      } catch (error) {
        console.error('Preload: Error in showOpenDialog:', error);
        throw error;
      }
    }
  });
  console.log('✅ electronAPI exposed successfully');
} catch (error) {
  console.error('❌ Failed to expose electronAPI:', error);
}

// 注入环境变量，让前端知道当前是否运行在Electron中
contextBridge.exposeInMainWorld('isElectron', true);

// 注入后端API URL配置
contextBridge.exposeInMainWorld('apiConfig', {
  backendUrl: process.env.BACKEND_URL || 'http://localhost:8000'
});

// 添加一些调试信息，帮助排查问题
console.log('🚀 Preload script executed successfully');
console.log('📦 Is packaged app:', !require('electron-is-dev'));
console.log('🔗 Backend URL set to:', process.env.BACKEND_URL || 'http://localhost:8000');
console.log('🌐 electronAPI exposed:', typeof contextBridge !== 'undefined');
console.log('🗂️ isElectron exposed: true');

// 自定义console.log，在主进程也能看到渲染进程的日志
const originalConsoleLog = console.log;
console.log = (...args) => {
  originalConsoleLog('[Renderer]', ...args);
};

// 拦截未处理的Promise rejection
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

// 监听全局错误
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
}); 