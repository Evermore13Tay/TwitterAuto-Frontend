import { API_BASE_URL } from '../config.js';

const tweetService = {
  // 分类相关
  async getCategories() {
    const response = await fetch(`${API_BASE_URL}/api/tweets/categories`);
    return await response.json();
  },

  async createCategory(categoryData) {
    const response = await fetch(`${API_BASE_URL}/api/tweets/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(categoryData),
    });
    return await response.json();
  },

  async updateCategory(categoryId, categoryData) {
    const response = await fetch(`${API_BASE_URL}/api/tweets/categories/${categoryId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(categoryData),
    });
    return await response.json();
  },

  async deleteCategory(categoryId) {
    const response = await fetch(`${API_BASE_URL}/api/tweets/categories/${categoryId}`, {
      method: 'DELETE',
    });
    return await response.json();
  },

  // 推文模板相关
  async getTweets(params = {}) {
    const searchParams = new URLSearchParams(params);
    const response = await fetch(`${API_BASE_URL}/api/tweets/templates?${searchParams}`);
    return await response.json();
  },

  async getTweet(tweetId) {
    const response = await fetch(`${API_BASE_URL}/api/tweets/templates/${tweetId}`);
    return await response.json();
  },

  async createTweet(formData) {
    const response = await fetch(`${API_BASE_URL}/api/tweets/templates`, {
      method: 'POST',
      body: formData, // FormData for file upload
    });
    return await response.json();
  },

  async updateTweet(tweetId, tweetData) {
    const response = await fetch(`${API_BASE_URL}/api/tweets/templates/${tweetId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tweetData),
    });
    return await response.json();
  },

  async deleteTweet(tweetId) {
    const response = await fetch(`${API_BASE_URL}/api/tweets/templates/${tweetId}`, {
      method: 'DELETE',
    });
    return await response.json();
  },

  async toggleFavorite(tweetId) {
    const response = await fetch(`${API_BASE_URL}/api/tweets/templates/${tweetId}/favorite`, {
      method: 'POST',
    });
    return await response.json();
  },

  async useTweet(tweetId) {
    const response = await fetch(`${API_BASE_URL}/api/tweets/templates/${tweetId}/use`, {
      method: 'POST',
    });
    return await response.json();
  },

  // 图片相关
  async getImageUrl(imageId) {
    return `${API_BASE_URL}/api/tweets/images/${imageId}`;
  },

  async deleteImage(imageId) {
    const response = await fetch(`${API_BASE_URL}/api/tweets/images/${imageId}`, {
      method: 'DELETE',
    });
    return await response.json();
  },
};

export default tweetService; 