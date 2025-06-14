import React, { useState } from 'react';
import axios from 'axios';

function ApiTestPage() {
  const [targetIp, setTargetIp] = useState('10.18.96.3');
  const [apiBaseUrl, setApiBaseUrl] = useState('http://127.0.0.1:5000');
  const [endpoint, setEndpoint] = useState('/get/');
  const [results, setResults] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleApiTest = async () => {
    // 验证必要参数
    if (!apiBaseUrl.trim()) {
      setError('API基础URL不能为空');
      return;
    }

    if (!targetIp.trim()) {
      setError('目标IP不能为空');
      return;
    }

    // 尝试验证URL格式
    try {
      new URL(apiBaseUrl);
    } catch (e) {
      setError('API基础URL格式无效，请输入完整URL（例如: http://127.0.0.1:5000）');
      return;
    }

    // 开始API测试
    setLoading(true);
    setError(null);
    setResults('');

    try {
      const url = `${apiBaseUrl}${endpoint}${targetIp}`;
      console.log(`Testing API: ${url}`);
      
      const response = await axios.get(url, {
        timeout: 15000,
        withCredentials: false,
        headers: { 'Accept': 'application/json' }
      });
      
      const data = response.data;
      console.log('API response:', data);
      
      setResults(JSON.stringify(data, null, 2));
    } catch (err) {
      console.error('API test failed:', err);
      setError(`API调用失败: ${err.message}`);
      
      if (err.response) {
        setResults(JSON.stringify({
          status: err.response.status,
          data: err.response.data,
          headers: err.response.headers
        }, null, 2));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">API测试工具</h1>
      <p className="mb-4 text-gray-600">
        使用此工具直接测试设备控制API，不依赖于containerApiService
      </p>
      
      <div className="mb-6 p-4 border rounded">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">API基础URL</label>
          <input
            type="text"
            value={apiBaseUrl}
            onChange={(e) => setApiBaseUrl(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            placeholder="例如: http://127.0.0.1:5000"
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">API端点</label>
          <select
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            className="w-full px-3 py-2 border rounded"
          >
            <option value="/get/">GET /get/{'{ip}'}</option>
            <option value="/dc_api/v1/list/">GET /dc_api/v1/list/{'{ip}'}</option>
          </select>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">目标IP</label>
          <input
            type="text"
            value={targetIp}
            onChange={(e) => setTargetIp(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            placeholder="例如: 10.18.96.3"
          />
        </div>
        
        <div>
          <button
            onClick={handleApiTest}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300"
          >
            {loading ? '测试中...' : '测试API'}
          </button>
        </div>
      </div>
      
      {error && (
        <div className="p-3 bg-red-100 text-red-800 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="mt-4">
        <h2 className="text-xl font-semibold mb-2">API响应</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-auto h-96 text-sm">
          {results || '暂无数据'}
        </pre>
      </div>
    </div>
  );
}

export default ApiTestPage; 