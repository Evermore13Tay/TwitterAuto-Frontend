import { DC_API_BASE_URL, API_BASE_URL } from '../config';

/**
 * Fetches the initial list of devices from the Device Control API
 * @param {string} ipAddress - The IP address to fetch devices from
 * @returns {Promise<Array>} - The list of devices
 */
export async function fetchInitialDeviceList(ipAddress) {
  try {
    // Try the /dc_api/v1/list/{ip} endpoint first
    const primaryEndpoint = `${DC_API_BASE_URL}/dc_api/v1/list/${ipAddress}`;
    console.log(`Fetching initial device list from primary endpoint: ${primaryEndpoint}`);
    
    try {
      const response = await fetch(primaryEndpoint, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`Primary endpoint request successful`);
        return data;
      }
      
      console.warn(`Primary endpoint returned ${response.status}, trying alternative...`);
    } catch (primaryError) {
      console.warn(`Primary endpoint error: ${primaryError.message}, trying alternative...`);
    }
    
    // If the first endpoint fails, try an alternative endpoint format
    const alternativeEndpoint = `${DC_API_BASE_URL}/list/${ipAddress}`;
    console.log(`Trying alternative endpoint: ${alternativeEndpoint}`);
    
    const response = await fetch(alternativeEndpoint, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`Alternative endpoint request successful`);
    return data;
  } catch (error) {
    console.error(`Error fetching initial device list: ${error.message}`);
    return null;
  }
}

/**
 * Fetches detailed information for a specific device
 * @param {string} deviceIp - The IP address of the device
 * @param {string} deviceName - The name of the device
 * @returns {Promise<Object>} - Detailed device information
 */
export async function fetchDeviceDetailedInfo(deviceIp, deviceName) {
  try {
    // URL encode the device name to handle special characters
    const encodedDeviceName = encodeURIComponent(deviceName);
    
    // Try the /get_api_info/{ip}/{name} endpoint first
    const primaryEndpoint = `${DC_API_BASE_URL}/get_api_info/${deviceIp}/${encodedDeviceName}`;
    console.log(`Fetching detailed info for device '${deviceName}' from primary endpoint: ${primaryEndpoint}`);
    
    try {
      const response = await fetch(primaryEndpoint, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`Primary detailed info endpoint request successful`);
        return data;
      }
      
      console.warn(`Primary detailed endpoint returned ${response.status}, trying alternative...`);
    } catch (primaryError) {
      console.warn(`Primary detailed endpoint error: ${primaryError.message}, trying alternative...`);
    }
    
    // If the first endpoint fails, try an alternative endpoint format
    const alternativeEndpoint = `${DC_API_BASE_URL}/get/${deviceIp}/${encodedDeviceName}`;
    console.log(`Trying alternative detailed info endpoint: ${alternativeEndpoint}`);
    
    const response = await fetch(alternativeEndpoint, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`Alternative detailed info endpoint request successful`);
    return data;
  } catch (error) {
    console.error(`Error fetching detailed info for device '${deviceName}': ${error.message}`);
    return null;
  }
}

/**
 * Fetches and processes devices by IP address, implementing the same logic as the backend's get_device_by_ip.py
 * @param {string} ipAddress - The IP address to fetch devices from
 * @returns {Promise<Array>} - An array of processed device data
 */
export async function fetchDevicesByIp(ipAddress) {
  // 验证IP地址
  if (!ipAddress || typeof ipAddress !== 'string' || ipAddress.trim() === '') {
    console.error('Invalid IP address provided');
    throw new Error('请提供有效的IP地址');
  }
  
  // 简单的IP地址验证
  const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipPattern.test(ipAddress)) {
    console.error(`Invalid IP address format: ${ipAddress}`);
    throw new Error('IP地址格式无效，请使用标准IP格式（例如：192.168.1.100）');
  }
  
  console.log(`Starting two-step device fetch for IP: ${ipAddress}`);
  
  // Step 1: Get the initial list of devices
  const initialData = await fetchInitialDeviceList(ipAddress);
  
  if (!initialData) {
    console.error(`Failed to fetch initial device list for IP ${ipAddress}. Aborting.`);
    throw new Error(`无法从IP ${ipAddress} 获取设备列表，请检查设备是否在线`);
  }
  
  // Extract devices from the response based on its structure
  let allDevicesFromInitialList = [];
  
  if (initialData.msg && Array.isArray(initialData.msg)) {
    allDevicesFromInitialList = initialData.msg;
  } else if (initialData.data && Array.isArray(initialData.data)) {
    allDevicesFromInitialList = initialData.data;
  } else if (Array.isArray(initialData)) {
    allDevicesFromInitialList = initialData;
  } else {
    console.error(`Initial device list for IP ${ipAddress} is not in expected format:`, initialData);
    return [];
  }
  
  console.log(`Successfully fetched ${allDevicesFromInitialList.length} devices in initial list for IP ${ipAddress}.`);
  
  if (allDevicesFromInitialList.length === 0) {
    console.log(`No devices found in the initial list for IP ${ipAddress}.`);
    return [];
  }
  
  // Step 2: Fetch detailed info for each device and merge the data
  const augmentedDevices = [];
  
  for (const deviceSummary of allDevicesFromInitialList) {
    if (typeof deviceSummary !== 'object' || deviceSummary === null) {
      console.warn(`Skipping non-object item in initial list:`, deviceSummary);
      continue;
    }
    
    // Try to get the device name from various possible keys
    let summaryDeviceName = null;
    for (const nameKey of ["Names", "names", "name"]) {
      if (deviceSummary[nameKey]) {
        summaryDeviceName = deviceSummary[nameKey];
        break;
      }
    }
    
    // Get the device IP or fall back to the main IP address
    const summaryDeviceIp = deviceSummary.ip || ipAddress;
    
    if (!summaryDeviceName) {
      console.warn(`Skipping device from initial list due to missing name:`, deviceSummary);
      continue;
    }
    
    console.log(`Processing device from initial list: Name='${summaryDeviceName}', IP='${summaryDeviceIp}'`);
    
    // Make a copy to augment, preserving original summary data
    const currentDeviceData = { ...deviceSummary };
    
    // Fetch detailed information for this device
    const detailedInfo = await fetchDeviceDetailedInfo(summaryDeviceIp, summaryDeviceName);
    
    if (detailedInfo && 
        typeof detailedInfo === 'object' && 
        detailedInfo.code === 200 && 
        typeof detailedInfo.msg === 'object') {
      console.log(`Successfully fetched detailed info for '${summaryDeviceName}'.`);
      
      // Merge detailed info into currentDeviceData. Details take precedence.
      Object.assign(currentDeviceData, detailedInfo.msg);
    } else {
      console.warn(`Failed to fetch or parse valid detailed info for '${summaryDeviceName}'. Proceeding with summary data only.`);
      // If detailed info fails, currentDeviceData remains the summary data
    }
    
    augmentedDevices.push(currentDeviceData);
    
    // Small delay between requests to avoid overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  if (augmentedDevices.length === 0) {
    console.log(`No devices were successfully augmented with details for IP ${ipAddress}.`);
    return [];
  }
  
  console.log(`Finished fetching and augmenting details for ${augmentedDevices.length} devices for IP ${ipAddress}.`);
  
  // Process the devices to extract and normalize fields
  const processedDevices = [];
  
  for (const device of augmentedDevices) {
    if (typeof device !== 'object' || device === null) {
      console.error(`Unexpected non-object item in augmented_devices list:`, device);
      continue;
    }
    
    // Get device name (try various possible keys)
    let deviceName = null;
    for (const nameKey of ["Names", "names", "name", "device_name"]) {
      if (device[nameKey]) {
        if (typeof device[nameKey] === 'string') {
          deviceName = device[nameKey];
          break;
        } else if (Array.isArray(device[nameKey]) && device[nameKey].length > 0) {
          deviceName = String(device[nameKey][0]);
          break;
        }
      }
    }
    
    // If no name found, generate a random one
    if (!deviceName) {
      deviceName = `device-${Math.random().toString(36).substring(2, 10)}`;
      console.warn(`Device name not found, generated: ${deviceName} for device data:`, device);
    }
    
    // Get status information
    let status = "unknown"; // Default status
    for (const statusKey of ["State", "state", "status"]) {
      if (device[statusKey]) {
        status = device[statusKey];
        break;
      }
    }
    
    // Get device-specific IP or fall back to the main IP address
    const deviceIpSpecific = device.ip || ipAddress;
    
    // Get index
    let deviceIndex = null;
    for (const indexKey of ["index", "device_index", "id"]) {
      if (device[indexKey] !== undefined && device[indexKey] !== null) {
        const parsedIndex = parseInt(device[indexKey], 10);
        if (!isNaN(parsedIndex)) {
          deviceIndex = parsedIndex;
          break;
        } else {
          console.warn(`Could not convert index key '${indexKey}' value '${device[indexKey]}' to int for device ${deviceName}`);
        }
      }
    }
    
    console.log(`Processing device for final list: Name='${deviceName}', Status='${status}', IP='${deviceIpSpecific}', Index='${deviceIndex}'`);
    
    // Get port information
    let adbPort = null;
    let rpcPort = null;
    
    // Try all possible ADB port keys
    for (const adbKey of ["ADB", "adb", "u2_port", "android_port", "adb_url"]) {
      if (device[adbKey]) {
        try {
          const val = device[adbKey];
          if (typeof val === 'number') {
            adbPort = val;
            break;
          } else if (typeof val === 'string') {
            const portStr = val.split(':').pop();
            const parsedPort = parseInt(portStr, 10);
            if (!isNaN(parsedPort)) {
              adbPort = parsedPort;
              console.log(`Device ${deviceName} (API value ${val}): Parsed adb_port: ${adbPort}`);
              break;
            }
          }
        } catch (e) {
          console.warn(`Could not parse ADB port from key '${adbKey}', value '${device[adbKey]}' for device ${deviceName}: ${e.message}`);
        }
      }
    }
    
    // Try all possible RPC port keys
    for (const rpcKey of ["RPC", "rpc", "rpc_port", "myt_rpc_port", "api_url"]) {
      if (device[rpcKey]) {
        try {
          const val = device[rpcKey];
          if (typeof val === 'number') {
            rpcPort = val;
            console.log(`Device ${deviceName} (API value ${val}): Parsed rpc_port (int): ${rpcPort}`);
            break;
          } else if (typeof val === 'string') {
            const portStr = val.split(':').pop();
            const parsedPort = parseInt(portStr, 10);
            if (!isNaN(parsedPort)) {
              rpcPort = parsedPort;
              console.log(`Device ${deviceName} (API value ${val}): Parsed rpc_port (str): ${rpcPort}`);
              break;
            }
          }
        } catch (e) {
          console.warn(`Could not parse RPC port from key '${rpcKey}', value '${device[rpcKey]}' for device ${deviceName}: ${e.message}`);
        }
      }
    }
    
    // Fallback for RPC port if not found
    if (!rpcPort) {
      for (const fallbackRpcKey of ["webrtc", "ctr_port"]) {
        if (device[fallbackRpcKey]) {
          try {
            const val = device[fallbackRpcKey];
            if (typeof val === 'number') {
              rpcPort = val;
              console.log(`Device ${deviceName}: Using fallback RPC port ${rpcPort} from key '${fallbackRpcKey}'`);
              break;
            } else if (typeof val === 'string') {
              const parsedPort = parseInt(val, 10);
              if (!isNaN(parsedPort)) {
                rpcPort = parsedPort;
                console.log(`Device ${deviceName}: Using fallback RPC port ${rpcPort} from key '${fallbackRpcKey}'`);
                break;
              }
            }
          } catch (e) {
            console.warn(`Could not parse fallback RPC port from key '${fallbackRpcKey}', value '${device[fallbackRpcKey]}' for device ${deviceName}: ${e.message}`);
          }
        }
      }
    }
    
    // Create a processed device object with normalized fields
    const processedDevice = {
      device_name: deviceName,
      source_ip: deviceIpSpecific,
      status: status,
      device_index: deviceIndex,
      adb_port: adbPort,
      rpc_port: rpcPort,
      raw_data: device, // Include the original data for reference if needed
      last_updated: new Date().toISOString()
    };
    
    processedDevices.push(processedDevice);
  }
  
  console.log(`Processed ${processedDevices.length} devices with normalized fields.`);
  return processedDevices;
}

/**
 * Sends processed device data to the backend for database storage
 * @param {Array} processedDevices - The array of processed device objects
 * @param {string} sourceIp - The source IP address used to fetch these devices
 * @returns {Promise<Object>} - The response from the backend API
 */
export async function sendProcessedDevicesToBackend(processedDevices, sourceIp) {
  try {
    if (!processedDevices || processedDevices.length === 0) {
      console.warn('No processed devices to send to backend');
      return { success: false, message: 'No devices to send' };
    }
    
    // This endpoint needs to be implemented in your backend API
    const response = await fetch(`${API_BASE_URL}/api/update-devices-from-frontend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        devices: processedDevices,
        source_ip: sourceIp
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error sending processed devices to backend: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Starts a container on the specified host
 * @param {string} hostIp - The IP address of the host
 * @param {string} deviceName - The name of the device/container to start
 * @returns {Promise<Object>} - Result of the operation
 */
export async function startContainer(hostIp, deviceName) {
  try {
    // URL encode the device name to handle special characters
    const encodedDeviceName = encodeURIComponent(deviceName);
    
    // Try the /start/{ip}/{name} endpoint first
    const primaryEndpoint = `${DC_API_BASE_URL}/start/${hostIp}/${encodedDeviceName}`;
    console.log(`Attempting to start container '${deviceName}' using primary endpoint: ${primaryEndpoint}`);
    
    try {
      const response = await fetch(primaryEndpoint, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`Successfully started container '${deviceName}' using primary endpoint`);
        return { success: true, data };
      }
      
      console.warn(`Primary start endpoint returned ${response.status}, trying alternative...`);
    } catch (primaryError) {
      console.warn(`Primary start endpoint error: ${primaryError.message}, trying alternative...`);
    }
    
    // If the first endpoint fails, try an alternative endpoint format
    const alternativeEndpoint = `${DC_API_BASE_URL}/container/start/${hostIp}/${encodedDeviceName}`;
    console.log(`Trying alternative start endpoint: ${alternativeEndpoint}`);
    
    const response = await fetch(alternativeEndpoint, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`Successfully started container '${deviceName}' using alternative endpoint`);
    return { success: true, data };
  } catch (error) {
    console.error(`Error starting container '${deviceName}': ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Stops a container on the specified host
 * @param {string} hostIp - The IP address of the host
 * @param {string} deviceName - The name of the device/container to stop
 * @returns {Promise<Object>} - Result of the operation
 */
export async function stopContainer(hostIp, deviceName) {
  try {
    // URL encode the device name to handle special characters
    const encodedDeviceName = encodeURIComponent(deviceName);
    
    // Try the /stop/{ip}/{name} endpoint first
    const primaryEndpoint = `${DC_API_BASE_URL}/stop/${hostIp}/${encodedDeviceName}`;
    console.log(`Attempting to stop container '${deviceName}' using primary endpoint: ${primaryEndpoint}`);
    
    try {
      const response = await fetch(primaryEndpoint, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`Successfully stopped container '${deviceName}' using primary endpoint`);
        return { success: true, data };
      }
      
      console.warn(`Primary stop endpoint returned ${response.status}, trying alternative...`);
    } catch (primaryError) {
      console.warn(`Primary stop endpoint error: ${primaryError.message}, trying alternative...`);
    }
    
    // If the first endpoint fails, try an alternative endpoint format
    const alternativeEndpoint = `${DC_API_BASE_URL}/container/stop/${hostIp}/${encodedDeviceName}`;
    console.log(`Trying alternative stop endpoint: ${alternativeEndpoint}`);
    
    const response = await fetch(alternativeEndpoint, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`Successfully stopped container '${deviceName}' using alternative endpoint`);
    return { success: true, data };
  } catch (error) {
    console.error(`Error stopping container '${deviceName}': ${error.message}`);
    return { success: false, error: error.message };
  }
} 