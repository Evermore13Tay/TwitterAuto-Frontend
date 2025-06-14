import axios from 'axios';
import { DC_API_BASE_URL } from '../config';

// 创建API客户端
const containerApi = axios.create({
  baseURL: DC_API_BASE_URL,
  timeout: 15000, // 15秒超时
  withCredentials: false, // 确保不带上凭证，解决CORS问题
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  }
});

// 请求拦截器（记录和处理请求）
containerApi.interceptors.request.use(
  config => {
    console.log(`[containerApiService] 发起请求: ${config.method.toUpperCase()} ${config.url}`);
    return config;
  },
  error => {
    console.error('[containerApiService] 请求配置错误:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器（统一错误处理）
containerApi.interceptors.response.use(
  response => {
    console.log(`[containerApiService] 请求成功: ${response.config.url}`);
    return response.data;
  },
  error => {
    console.error(`[containerApiService] 请求失败: ${error.message}`, error.response?.data);
    
    // 尝试备用端点的逻辑放在各个API函数中，这里只负责基本错误处理
    return Promise.reject({
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
);

/**
 * 获取设备列表
 * @param {string} ip - 要获取设备的IP
 * @returns {Promise<Object>} - 设备列表数据
 */
export const fetchDeviceList = async (ip) => {
  try {
    // 优先使用/get/{ip}端点，这是已知可以工作的
    try {
      console.log(`[containerApiService] 尝试从主端点获取设备列表: /get/${ip}`);
      const response = await containerApi.get(`/get/${ip}`);
      console.log(`[containerApiService] 成功从主端点获取设备列表: /get/${ip}`);
      return response;
    } catch (error) {
      console.warn(`[containerApiService] 主端点获取设备列表失败: ${error.message}，尝试备用端点`);
    }
    
    // 备用端点
    console.log(`[containerApiService] 尝试从备用端点获取设备列表: /dc_api/v1/list/${ip}`);
    const response = await containerApi.get(`/dc_api/v1/list/${ip}`);
    console.log(`[containerApiService] 成功从备用端点获取设备列表`);
    return response;
  } catch (error) {
    console.error(`[containerApiService] 获取设备列表失败:`, error);
    throw error;
  }
};

/**
 * 获取设备详情
 * @param {string} ip - 设备IP
 * @param {string} name - 设备名称
 * @returns {Promise<Object>} - 设备详情数据
 */
export const fetchDeviceDetail = async (ip, name) => {
  const encodedName = encodeURIComponent(name);
  
  try {
    // 优先使用/get_api_info/{ip}/{name}端点，这是已知可以工作的
    try {
      console.log(`[containerApiService] 尝试从主端点获取设备详情: /get_api_info/${ip}/${encodedName}`);
      const response = await containerApi.get(`/get_api_info/${ip}/${encodedName}`);
      console.log(`[containerApiService] 成功从主端点获取设备详情`);
      return response;
    } catch (error) {
      console.warn(`[containerApiService] 主端点获取设备详情失败: ${error.message}，尝试备用端点`);
    }
    
    // 备用端点
    console.log(`[containerApiService] 尝试从备用端点获取设备详情: /get/${ip}/${encodedName}`);
    const response = await containerApi.get(`/get/${ip}/${encodedName}`);
    console.log(`[containerApiService] 成功从备用端点获取设备详情`);
    return response;
  } catch (error) {
    console.error(`[containerApiService] 获取设备详情失败:`, error);
    throw error;
  }
};

/**
 * 启动容器
 * @param {string} ip - 主机IP
 * @param {string} name - 容器名称
 * @returns {Promise<Object>} - 操作结果
 */
export const startContainer = async (ip, name) => {
  const encodedName = encodeURIComponent(name);
  
  try {
    // 先尝试第一个端点
    try {
      const response = await containerApi.get(`/start/${ip}/${encodedName}`);
      console.log(`[containerApiService] 成功从主端点启动容器`);
      return response;
    } catch (error) {
      console.warn(`[containerApiService] 主端点启动容器失败: ${error.message}，尝试备用端点`);
    }
    
    // 备用端点
    const response = await containerApi.get(`/container/start/${ip}/${encodedName}`);
    console.log(`[containerApiService] 成功从备用端点启动容器`);
    return response;
  } catch (error) {
    console.error(`[containerApiService] 启动容器失败:`, error);
    throw error;
  }
};

/**
 * 停止容器
 * @param {string} ip - 主机IP
 * @param {string} name - 容器名称
 * @returns {Promise<Object>} - 操作结果
 */
export const stopContainer = async (ip, name) => {
  const encodedName = encodeURIComponent(name);
  
  try {
    // 先尝试第一个端点
    try {
      const response = await containerApi.get(`/stop/${ip}/${encodedName}`);
      console.log(`[containerApiService] 成功从主端点停止容器`);
      return response;
    } catch (error) {
      console.warn(`[containerApiService] 主端点停止容器失败: ${error.message}，尝试备用端点`);
    }
    
    // 备用端点
    const response = await containerApi.get(`/container/stop/${ip}/${encodedName}`);
    console.log(`[containerApiService] 成功从备用端点停止容器`);
    return response;
  } catch (error) {
    console.error(`[containerApiService] 停止容器失败:`, error);
    throw error;
  }
};

/**
 * 重启容器
 * @param {string} ip - 主机IP
 * @param {string} name - 容器名称
 * @returns {Promise<Object>} - 操作结果
 */
export const restartContainer = async (ip, name) => {
  const encodedName = encodeURIComponent(name);
  
  try {
    // 先尝试第一个端点
    try {
      const response = await containerApi.get(`/restart/${ip}/${encodedName}`);
      console.log(`[containerApiService] 成功从主端点重启容器`);
      return response;
    } catch (error) {
      console.warn(`[containerApiService] 主端点重启容器失败: ${error.message}，尝试备用端点`);
    }
    
    // 备用端点
    const response = await containerApi.get(`/container/restart/${ip}/${encodedName}`);
    console.log(`[containerApiService] 成功从备用端点重启容器`);
    return response;
  } catch (error) {
    console.error(`[containerApiService] 重启容器失败:`, error);
    throw error;
  }
};

/**
 * 获取容器日志
 * @param {string} ip - 主机IP
 * @param {string} name - 容器名称
 * @returns {Promise<Object>} - 容器日志
 */
export const getContainerLogs = async (ip, name) => {
  const encodedName = encodeURIComponent(name);
  
  try {
    // 先尝试第一个端点
    try {
      const response = await containerApi.get(`/logs/${ip}/${encodedName}`);
      console.log(`[containerApiService] 成功从主端点获取容器日志`);
      return response;
    } catch (error) {
      console.warn(`[containerApiService] 主端点获取容器日志失败: ${error.message}，尝试备用端点`);
    }
    
    // 备用端点
    const response = await containerApi.get(`/container/logs/${ip}/${encodedName}`);
    console.log(`[containerApiService] 成功从备用端点获取容器日志`);
    return response;
  } catch (error) {
    console.error(`[containerApiService] 获取容器日志失败:`, error);
    throw error;
  }
};

/**
 * 获取设备统计信息
 * @param {string} ip - 主机IP
 * @param {string} name - 容器名称
 * @returns {Promise<Object>} - 统计信息
 */
export const getContainerStats = async (ip, name) => {
  const encodedName = encodeURIComponent(name);
  
  try {
    // 先尝试第一个端点
    try {
      const response = await containerApi.get(`/stats/${ip}/${encodedName}`);
      console.log(`[containerApiService] 成功从主端点获取容器统计信息`);
      return response;
    } catch (error) {
      console.warn(`[containerApiService] 主端点获取容器统计信息失败: ${error.message}，尝试备用端点`);
    }
    
    // 备用端点
    const response = await containerApi.get(`/container/stats/${ip}/${encodedName}`);
    console.log(`[containerApiService] 成功从备用端点获取容器统计信息`);
    return response;
  } catch (error) {
    console.error(`[containerApiService] 获取容器统计信息失败:`, error);
    throw error;
  }
};

/**
 * 删除容器
 * @param {string} ip - 主机IP
 * @param {string} name - 容器名称
 * @returns {Promise<Object>} - 操作结果
 */
export const removeContainer = async (ip, name) => {
  const encodedName = encodeURIComponent(name);
  
  try {
    // 使用主端点
    try {
      console.log(`[containerApiService] 尝试删除容器: /remove/${ip}/${encodedName}`);
      const response = await containerApi.get(`/remove/${ip}/${encodedName}`);
      console.log(`[containerApiService] 成功从主端点删除容器`);
      return response;
    } catch (error) {
      console.warn(`[containerApiService] 主端点删除容器失败: ${error.message}，尝试备用端点`);
    }
    
    // 备用端点
    console.log(`[containerApiService] 尝试从备用端点删除容器: /container/remove/${ip}/${encodedName}`);
    const response = await containerApi.get(`/container/remove/${ip}/${encodedName}`);
    console.log(`[containerApiService] 成功从备用端点删除容器`);
    return response;
  } catch (error) {
    console.error(`[containerApiService] 删除容器失败:`, error);
    throw error;
  }
};

/**
 * 获取并整合设备信息
 * @param {string} ip - 主机IP地址
 * @returns {Promise<Array>} - 整合后的设备信息数组
 */
export const getAndCombineContainerData = async (ip) => {
  console.log(`[containerApiService] 开始获取并整合IP为 ${ip} 的所有设备信息，访问API地址: ${DC_API_BASE_URL}`);
  
  try {
    // 1. 获取初始列表
    console.log(`[containerApiService] 调用fetchDeviceList获取设备列表...`);
    const initialData = await fetchDeviceList(ip);
    
    console.log(`[containerApiService] 获取到的初始数据:`, initialData);
    
    if (!initialData) {
      console.error('[containerApiService] 初始数据为空');
      throw new Error('获取到的初始数据为空');
    }
    
    if (!initialData.msg) {
      console.error('[containerApiService] 初始数据缺少msg字段:', initialData);
      throw new Error('初始数据缺少msg字段');
    }
    
    if (!Array.isArray(initialData.msg)) {
      console.error('[containerApiService] 初始数据的msg字段不是数组:', initialData.msg);
      throw new Error('初始数据的msg字段不是数组');
    }
    
    console.log(`[containerApiService] 成功获取 ${initialData.msg.length} 个初始设备信息`);
    
    // 2. 为每个设备获取详细信息并合并
    const combinedData = await Promise.all(
      initialData.msg.map(async (device) => {
        if (!device.ip || !device.Names) {
          console.warn('[containerApiService] 设备缺少IP或名称信息，跳过获取详情', device);
          return device;
        }
        
        try {
          const deviceIp = device.ip || ip;
          const deviceName = device.Names;
          
          console.log(`[containerApiService] 获取设备 ${deviceName} 的详细信息`);
          const detailedInfo = await fetchDeviceDetail(deviceIp, deviceName);
          
          console.log(`[containerApiService] 设备 ${deviceName} 的详情:`, detailedInfo);
          
          if (detailedInfo && detailedInfo.code === 200 && detailedInfo.msg) {
            console.log(`[containerApiService] 成功获取设备 ${deviceName} 的详细信息`);
            // 合并详细信息到原始数据
            return {
              ...device,
              ...detailedInfo.msg
            };
          } else {
            console.warn(`[containerApiService] 设备 ${deviceName} 的详细信息格式无效或状态码不为200，详情:`, detailedInfo);
            return device;
          }
        } catch (error) {
          console.error(`[containerApiService] 获取设备 ${device.Names} 的详细信息失败:`, error);
          return device; // 返回原始设备信息
        }
      })
    );
    
    console.log(`[containerApiService] 成功整合 ${combinedData.length} 个设备的完整信息`);
    
    return {
      code: initialData.code,
      msg: combinedData
    };
  } catch (error) {
    console.error('[containerApiService] 获取并整合设备信息失败:', error);
    throw error;
  }
};

export default {
  fetchDeviceList,
  fetchDeviceDetail,
  startContainer,
  stopContainer,
  restartContainer,
  getContainerLogs,
  getContainerStats,
  removeContainer,
  getAndCombineContainerData
}; 