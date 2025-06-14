import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config.js';

const TweetLibraryPage = () => {
  const [categories, setCategories] = useState([]);
  const [tweets, setTweets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [sortBy, setSortBy] = useState('created_time');
  const [sortOrder, setSortOrder] = useState('desc');
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 0 });
  
  // 弹窗状态
  const [showAddTweet, setShowAddTweet] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [editingTweet, setEditingTweet] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);

  // 加载分类
  const loadCategories = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/tweets/categories`);
      const data = await response.json();
      if (data.success) {
        setCategories(data.data);
      }
    } catch (error) {
      console.error('加载分类失败:', error);
      alert('加载分类失败');
    }
  };

  // 加载推文列表
  const loadTweets = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: '20',
        sort_by: sortBy,
        sort_order: sortOrder
      });
      
      if (selectedCategory) {
        params.append('category_id', selectedCategory.toString());
      }
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      if (showFavoritesOnly) {
        params.append('is_favorite', '1');
      }

      const response = await fetch(`${API_BASE_URL}/api/tweets/templates?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setTweets(data.data);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('加载推文失败:', error);
      alert('加载推文失败');
    } finally {
      setLoading(false);
    }
  };

  // 初始化加载
  useEffect(() => {
    loadCategories();
    loadTweets();
  }, []);

  // 筛选条件变化时重新加载
  useEffect(() => {
    loadTweets(1);
  }, [selectedCategory, searchTerm, showFavoritesOnly, sortBy, sortOrder]);

  // 切换收藏状态
  const toggleFavorite = async (tweetId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/tweets/templates/${tweetId}/favorite`, {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        loadTweets(pagination.page);
        alert('收藏状态已更新');
      }
    } catch (error) {
      console.error('更新收藏失败:', error);
      alert('更新收藏失败');
    }
  };

  // 使用推文
  const useTweet = async (tweetId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/tweets/templates/${tweetId}/use`, {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        loadTweets(pagination.page);
        alert('使用次数已更新');
      }
    } catch (error) {
      console.error('更新使用次数失败:', error);
      alert('更新使用次数失败');
    }
  };

  // 删除推文
  const deleteTweet = async (tweetId) => {
    if (!confirm('确定要删除这个推文吗？')) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/tweets/templates/${tweetId}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        loadTweets(pagination.page);
        alert('推文删除成功');
      }
    } catch (error) {
      console.error('删除推文失败:', error);
      alert('删除推文失败');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">推文作品库</h1>
          <p className="text-gray-600 mt-1">管理您的推文模板和素材</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddCategory(true)}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            管理分类
          </button>
          <button
            onClick={() => setShowAddTweet(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            添加推文
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* 左侧分类列表 */}
        <div className="w-64 flex-shrink-0">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="font-medium text-gray-900 mb-3">分类筛选</h3>
            
            {/* 全部分类 */}
            <div
              className={`p-2 rounded cursor-pointer mb-1 ${
                selectedCategory === null 
                  ? 'bg-blue-500 text-white' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => setSelectedCategory(null)}
            >
              <div className="flex items-center justify-between">
                <span>全部</span>
                <span className="text-sm">
                  {pagination.total || 0}
                </span>
              </div>
            </div>

            {/* 分类列表 */}
            {categories.map(category => (
              <div
                key={category.id}
                className={`p-2 rounded cursor-pointer mb-1 ${
                  selectedCategory === category.id 
                    ? 'bg-blue-500 text-white' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => setSelectedCategory(category.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="truncate">{category.name}</span>
                  </div>
                  <span className="text-sm">
                    {category.tweet_count || 0}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* 筛选选项 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mt-4">
            <h3 className="font-medium text-gray-900 mb-3">筛选选项</h3>
            
            <label className="flex items-center mb-3">
              <input
                type="checkbox"
                checked={showFavoritesOnly}
                onChange={(e) => setShowFavoritesOnly(e.target.checked)}
                className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">仅显示收藏</span>
            </label>

            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                排序方式
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-1 text-sm"
              >
                <option value="created_time">创建时间</option>
                <option value="updated_time">更新时间</option>
                <option value="use_count">使用次数</option>
                <option value="title">标题</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                排序顺序
              </label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-1 text-sm"
              >
                <option value="desc">降序</option>
                <option value="asc">升序</option>
              </select>
            </div>
          </div>
        </div>

        {/* 右侧推文列表 */}
        <div className="flex-1">
          {/* 搜索栏 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
            <input
              type="text"
              placeholder="搜索推文标题、内容或标签..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 推文列表 */}
          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : tweets.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                暂无推文，点击"添加推文"开始创建
              </div>
            ) : (
              tweets.map(tweet => (
                <TweetCard
                  key={tweet.id}
                  tweet={tweet}
                  onToggleFavorite={() => toggleFavorite(tweet.id)}
                  onUse={() => useTweet(tweet.id)}
                  onEdit={() => setEditingTweet(tweet)}
                  onDelete={() => deleteTweet(tweet.id)}
                />
              ))
            )}
          </div>

          {/* 分页 */}
          {pagination.pages > 1 && (
            <div className="flex justify-center items-center mt-6 space-x-2">
              <button
                onClick={() => loadTweets(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
              >
                上一页
              </button>
              
              <span className="text-sm text-gray-600">
                第 {pagination.page} 页，共 {pagination.pages} 页
              </span>
              
              <button
                onClick={() => loadTweets(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
                className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
              >
                下一页
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 添加推文弹窗 */}
      {showAddTweet && (
        <AddTweetModal
          categories={categories}
          onClose={() => setShowAddTweet(false)}
          onSuccess={() => {
            setShowAddTweet(false);
            loadTweets(pagination.page);
            loadCategories(); // 重新加载分类以更新推文数量
          }}
        />
      )}

      {/* 编辑推文弹窗 */}
      {editingTweet && (
        <EditTweetModal
          tweet={editingTweet}
          categories={categories}
          onClose={() => setEditingTweet(null)}
          onSuccess={() => {
            setEditingTweet(null);
            loadTweets(pagination.page);
          }}
        />
      )}

      {/* 添加分类弹窗 */}
      {showAddCategory && (
        <CategoryManageModal
          categories={categories}
          onClose={() => setShowAddCategory(false)}
          onSuccess={() => {
            setShowAddCategory(false);
            loadCategories();
          }}
        />
      )}
    </div>
  );
};

// 推文卡片组件
const TweetCard = ({ tweet, onToggleFavorite, onUse, onEdit, onDelete }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-medium text-gray-900 mb-2">{tweet.title}</h3>
          <p className="text-gray-600 text-sm line-clamp-3">{tweet.content}</p>
        </div>
        
        <div className="flex items-center space-x-2 ml-4">
          <button
            onClick={onToggleFavorite}
            className={`p-2 rounded ${
              tweet.is_favorite 
                ? 'text-red-500 hover:bg-red-50' 
                : 'text-gray-400 hover:bg-gray-50'
            }`}
            title={tweet.is_favorite ? '取消收藏' : '添加收藏'}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
            </svg>
          </button>
          
          <button
            onClick={onEdit}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded"
            title="编辑"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
            title="删除"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 text-sm text-gray-500">
          {tweet.category && (
            <div className="flex items-center">
              <div 
                className="w-3 h-3 rounded-full mr-1"
                style={{ backgroundColor: tweet.category.color }}
              />
              <span>{tweet.category.name}</span>
            </div>
          )}
          
          {tweet.tags.length > 0 && (
            <div className="flex items-center space-x-1">
              {tweet.tags.slice(0, 3).map((tag, index) => (
                <span key={index} className="px-2 py-1 bg-gray-100 rounded text-xs">
                  {tag}
                </span>
              ))}
              {tweet.tags.length > 3 && (
                <span className="text-xs text-gray-400">+{tweet.tags.length - 3}</span>
              )}
            </div>
          )}
          
          <span>使用 {tweet.use_count} 次</span>
          
          {tweet.images.length > 0 && (
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {tweet.images.length} 张图片
            </span>
          )}
        </div>
        
        <button
          onClick={onUse}
          className="px-4 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
        >
          使用此推文
        </button>
      </div>
    </div>
  );
};

// 添加推文弹窗
const AddTweetModal = ({ categories, onClose, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [tags, setTags] = useState('');
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      alert('请填写标题和内容');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('content', content);
      if (categoryId) {
        formData.append('category_id', categoryId);
      }
      if (tags) {
        formData.append('tags', tags);
      }
      
      // 添加图片文件
      images.forEach((image) => {
        formData.append('images', image);
      });

      const response = await fetch(`${API_BASE_URL}/api/tweets/templates`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      if (data.success) {
        alert('推文创建成功');
        onSuccess();
      } else {
        alert(data.message || '创建失败');
      }
    } catch (error) {
      console.error('创建推文失败:', error);
      alert('创建推文失败');
    } finally {
      setUploading(false);
    }
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 4) {
      alert('最多只能上传4张图片');
      return;
    }
    setImages(files);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-4">添加推文</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              推文标题 *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              推文内容 *
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <div className="text-right text-sm text-gray-500 mt-1">
              {content.length}/280
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              分类
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">请选择分类</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              标签（用逗号分隔）
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="例如：营销, 推广, 产品"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              上传图片（最多4张）
            </label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
            {images.length > 0 && (
              <div className="mt-2 text-sm text-gray-600">
                已选择 {images.length} 张图片
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {uploading ? '创建中...' : '创建推文'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 编辑推文弹窗
const EditTweetModal = ({ tweet, categories, onClose, onSuccess }) => {
  const [title, setTitle] = useState(tweet.title);
  const [content, setContent] = useState(tweet.content);
  const [categoryId, setCategoryId] = useState(tweet.category?.id || '');
  const [tags, setTags] = useState(tweet.tags ? tweet.tags.join(',') : '');
  const [updating, setUpdating] = useState(false);
  const [currentImages, setCurrentImages] = useState(tweet.images || []);
  const [newImages, setNewImages] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUpdating(true);

    try {
      const updateData = {
        title,
        content,
        category_id: categoryId || null,
        tags
      };

      const response = await fetch(`${API_BASE_URL}/api/tweets/templates/${tweet.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      });

      const data = await response.json();
      if (data.success) {
        alert('推文更新成功');
        onSuccess();
      } else {
        alert(data.message || '更新失败');
      }
    } catch (error) {
      console.error('更新推文失败:', error);
      alert('更新推文失败');
    } finally {
      setUpdating(false);
    }
  };

  // 删除现有图片
  const handleDeleteImage = async (imageId) => {
    if (!confirm('确定要删除这张图片吗？')) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/tweets/images/${imageId}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      if (data.success) {
        setCurrentImages(prev => prev.filter(img => img.id !== imageId));
        alert('图片删除成功');
      } else {
        alert(data.message || '删除失败');
      }
    } catch (error) {
      console.error('删除图片失败:', error);
      alert('删除图片失败');
    }
  };

  // 添加新图片
  const handleAddImages = async () => {
    if (newImages.length === 0) return;
    
    if (currentImages.length + newImages.length > 4) {
      alert('最多只能有4张图片');
      return;
    }

    setUploadingImages(true);
    try {
      const formData = new FormData();
      newImages.forEach((image) => {
        formData.append('images', image);
      });

      const response = await fetch(`${API_BASE_URL}/api/tweets/templates/${tweet.id}/images`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      if (data.success) {
        // 重新加载推文数据以获取新图片
        const tweetResponse = await fetch(`${API_BASE_URL}/api/tweets/templates/${tweet.id}`);
        const tweetData = await tweetResponse.json();
        if (tweetData.success) {
          setCurrentImages(tweetData.data.images);
          setNewImages([]);
          alert('图片添加成功');
        }
      } else {
        alert(data.message || '添加失败');
      }
    } catch (error) {
      console.error('添加图片失败:', error);
      alert('添加图片失败');
    } finally {
      setUploadingImages(false);
    }
  };

  const handleNewImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (currentImages.length + files.length > 4) {
      alert('最多只能有4张图片');
      return;
    }
    setNewImages(files);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-4">编辑推文</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              推文标题 *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              推文内容 *
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <div className="text-right text-sm text-gray-500 mt-1">
              {content.length}/280
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              分类
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">请选择分类</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              标签（用逗号分隔）
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="例如：营销, 推广, 产品"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 图片管理 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              图片管理（最多4张）
            </label>
            
            {/* 现有图片 */}
            {currentImages.length > 0 && (
              <div className="mb-3">
                <h4 className="text-sm text-gray-600 mb-2">当前图片：</h4>
                <div className="grid grid-cols-2 gap-2">
                  {currentImages.map((image, index) => (
                    <div key={image.id} className="relative border rounded-lg p-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600 truncate">
                          {image.original_name}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteImage(image.id)}
                          className="text-red-500 hover:text-red-700 ml-2"
                          title="删除图片"
                        >
                          ×
                        </button>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {image.width}×{image.height}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 添加新图片 */}
            {currentImages.length < 4 && (
              <div>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleNewImageChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-2"
                />
                {newImages.length > 0 && (
                  <div className="mb-2">
                    <div className="text-sm text-gray-600 mb-1">
                      待添加的图片：
                    </div>
                    <div className="space-y-1">
                      {newImages.map((file, index) => (
                        <div key={index} className="text-xs text-gray-500">
                          {file.name}
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={handleAddImages}
                      disabled={uploadingImages}
                      className="mt-2 px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 disabled:opacity-50"
                    >
                      {uploadingImages ? '上传中...' : '添加图片'}
                    </button>
                  </div>
                )}
                <div className="text-xs text-gray-500">
                  当前图片：{currentImages.length}/4
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={updating}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {updating ? '更新中...' : '更新推文'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 分类管理弹窗（简化版）
const CategoryManageModal = ({ categories, onClose, onSuccess }) => {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#2196F3');
  const [creating, setCreating] = useState(false);

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      alert('请输入分类名称');
      return;
    }

    setCreating(true);
    try {
      const categoryData = {
        name: newCategoryName,
        description: newCategoryDescription,
        color: newCategoryColor,
        sort_order: categories.length + 1
      };

      const response = await fetch(`${API_BASE_URL}/api/tweets/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(categoryData)
      });

      const data = await response.json();
      if (data.success) {
        alert('分类创建成功');
        onSuccess();
      } else {
        alert(data.message || '创建失败');
      }
    } catch (error) {
      console.error('创建分类失败:', error);
      alert('创建分类失败');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-4">分类管理</h2>
        
        {/* 现有分类列表 */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">现有分类</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {categories.map(category => (
              <div key={category.id} className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center">
                  <div 
                    className="w-4 h-4 rounded-full mr-2"
                    style={{ backgroundColor: category.color }}
                  />
                  <span>{category.name}</span>
                  <span className="ml-2 text-sm text-gray-500">({category.tweet_count})</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 添加新分类 */}
        <form onSubmit={handleCreateCategory} className="space-y-4">
          <h3 className="text-sm font-medium text-gray-700">添加新分类</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              分类名称 *
            </label>
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              分类描述
            </label>
            <input
              type="text"
              value={newCategoryDescription}
              onChange={(e) => setNewCategoryDescription(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              分类颜色
            </label>
            <input
              type="color"
              value={newCategoryColor}
              onChange={(e) => setNewCategoryColor(e.target.value)}
              className="w-full h-10 border border-gray-300 rounded-lg"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              关闭
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {creating ? '创建中...' : '创建分类'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TweetLibraryPage; 