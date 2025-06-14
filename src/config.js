// API Configuration
export const API_BASE_URL = window.isElectron 
  ? window.apiConfig?.backendUrl || 'http://localhost:8000'
  : 'http://localhost:8000'; // Update IP address and ensure port is correct

// Device Control API Configuration
export const DC_API_BASE_URL = 'http://127.0.0.1:5000'; // 使用与Python脚本相同的URL

// WebSocket Configuration
export const WS_CONFIG = {
    PING_INTERVAL: 10000,      // 10 seconds
    RECONNECT_BASE_DELAY: 3000, // 3 seconds
    MAX_RECONNECT_DELAY: 30000, // 30 seconds
    MESSAGE_TIMEOUT: 45000,     // 45 seconds
    DEBUG: true                 // Enable debug logging
};

// Other configurations can be added here
export const CONFIG = {
    API_TIMEOUT: 30000, // 30 seconds
    DEFAULT_PORTS: {
        U2_PORT: 5006,
        MYT_RPC_PORT: 11060
    }
}; 