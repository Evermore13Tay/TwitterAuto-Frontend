const { app, BrowserWindow, Menu, shell, ipcMain, dialog } = require('electron');
const path = require('path');

// Handle electron-is-dev import with fallback
let isDev = false;
try {
  isDev = require('electron-is-dev');
} catch (error) {
  isDev = !app.isPackaged;
  console.log('Using fallback for isDev:', isDev);
}

// 开发者工具自动打开控制 - 通过环境变量OPEN_DEVTOOLS=true来启用
const autoOpenDevTools = process.env.OPEN_DEVTOOLS === 'true';

let mainWindow;

function createWindow() {
  // 确定preload脚本路径 - 修复打包后的路径问题
  let preloadPath;
  if (isDev) {
    preloadPath = path.join(__dirname, 'preload.js');
  } else {
    // 在打包后，preload.js在app.asar中或者与electron.cjs在同一目录
    preloadPath = path.join(__dirname, 'preload.js');
  }
  
  console.log('🔧 Electron environment:', { isDev, __dirname, preloadPath });
  console.log('📦 Process info:', { 
    resourcesPath: process.resourcesPath,
    isPackaged: app.isPackaged 
  });
  
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: false, // 允许跨域请求
      preload: preloadPath
    },
    icon: path.join(__dirname, 'public/favicon.ico'),
    show: false, // 先不显示，等加载完成后再显示
    titleBarStyle: 'default'
  });

  // 加载应用
  const startUrl = isDev 
    ? 'http://localhost:5174' 
    : `file://${path.join(__dirname, 'dist/index.html')}`;
  
  mainWindow.loadURL(startUrl);

  // 窗口准备好后显示
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // 开发模式下根据环境变量决定是否自动打开开发者工具
    if (isDev && autoOpenDevTools) {
      mainWindow.webContents.openDevTools();
      console.log('应用已启动 - 开发者工具已自动打开');
    } else {
      console.log('应用已启动 - 按F12打开开发者工具');
      if (isDev) {
        console.log('提示: 设置环境变量 OPEN_DEVTOOLS=true 可自动打开开发者工具');
      }
    }
  });

  // 当窗口关闭时
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 处理外部链接
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // 设置菜单
  createMenu();
}

function createMenu() {
  const template = [
    {
      label: '文件',
      submenu: [
        {
          label: '退出',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { label: '撤销', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: '重做', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
        { type: 'separator' },
        { label: '剪切', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: '复制', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: '粘贴', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { label: '全选', accelerator: 'CmdOrCtrl+A', role: 'selectall' }
      ]
    },
    {
      label: '视图',
      submenu: [
        { label: '重新加载', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: '强制重新加载', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
        { label: '开发者工具', accelerator: 'F12', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: '实际大小', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { label: '放大', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
        { label: '缩小', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { type: 'separator' },
        { label: '全屏', accelerator: 'F11', role: 'togglefullscreen' }
      ]
    },
    {
      label: '窗口',
      submenu: [
        { label: '最小化', accelerator: 'CmdOrCtrl+M', role: 'minimize' },
        { label: '关闭', accelerator: 'CmdOrCtrl+W', role: 'close' }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于',
          click: () => {
            shell.openExternal('https://github.com/your-repo');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// 当 Electron 完成初始化并准备创建浏览器窗口时调用此方法
app.whenReady().then(createWindow);

// 当所有窗口都关闭时退出应用
app.on('window-all-closed', () => {
  // 在 macOS 上，应用和菜单栏通常会保持活跃状态，直到用户使用 Cmd + Q 显式退出
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // 在 macOS 上，当点击 dock 图标并且没有其他窗口打开时，通常会重新创建一个窗口
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC 处理器
ipcMain.handle('show-open-dialog', async (event, options) => {
  console.log('IPC handler called with options:', options);
  try {
    const result = await dialog.showOpenDialog(mainWindow, options);
    console.log('Dialog result:', result);
    return result;
  } catch (error) {
    console.error('Error showing dialog:', error);
    return { canceled: true, filePaths: [] };
  }
});

// 在这个文件中，你可以包含应用程序的其他主进程代码
// 你也可以将它们放在单独的文件中，并在这里引入它们 