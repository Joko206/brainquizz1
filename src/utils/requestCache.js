// Request caching utility untuk mengurangi database requests
class RequestCache {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.pendingRequests = new Map(); // Untuk mencegah duplicate requests
  }

  // Generate cache key
  generateKey(url, method = 'GET', body = null) {
    const bodyStr = body ? JSON.stringify(body) : '';
    return `${method}:${url}:${bodyStr}`;
  }

  // Check if data is in cache and still valid
  get(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.cacheTimeout) {
      this.cache.delete(key);
      return null;
    }

    console.log(`📦 Cache HIT: ${key}`);
    return cached.data;
  }

  // Store data in cache
  set(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    console.log(`💾 Cache SET: ${key}`);
  }

  // Clear specific cache entry
  delete(key) {
    this.cache.delete(key);
    console.log(`🗑️ Cache DELETE: ${key}`);
  }

  // Clear all cache
  clear() {
    this.cache.clear();
    this.pendingRequests.clear();
    console.log('🧹 Cache CLEARED');
  }

  // Clear cache for specific patterns
  clearPattern(pattern) {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
    console.log(`🧹 Cache CLEARED pattern: ${pattern}`);
  }

  // Prevent duplicate requests
  async deduplicate(key, requestFn) {
    // Check if request is already pending
    if (this.pendingRequests.has(key)) {
      console.log(`⏳ Request PENDING: ${key}`);
      return this.pendingRequests.get(key);
    }

    // Execute request and store promise
    const promise = requestFn();
    this.pendingRequests.set(key, promise);

    try {
      const result = await promise;
      this.pendingRequests.delete(key);
      return result;
    } catch (error) {
      this.pendingRequests.delete(key);
      throw error;
    }
  }

  // Get cache statistics
  getStats() {
    return {
      size: this.cache.size,
      pendingRequests: this.pendingRequests.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Create global cache instance
export const requestCache = new RequestCache();

// Cache configuration for different endpoints
export const cacheConfig = {
  // Master data - cache longer (10 minutes)
  masterData: {
    timeout: 10 * 60 * 1000,
    endpoints: ['/kategori/', '/tingkatan/', '/pendidikan/']
  },
  
  // User data - cache medium (5 minutes)
  userData: {
    timeout: 5 * 60 * 1000,
    endpoints: ['/user/', '/kelas/get-kelas']
  },
  
  // Dynamic data - cache short (2 minutes)
  dynamicData: {
    timeout: 2 * 60 * 1000,
    endpoints: ['/kuis/', '/soal/']
  },
  
  // No cache for mutations
  noCache: {
    methods: ['POST', 'PUT', 'DELETE', 'PATCH']
  }
};

// Helper function to determine cache timeout
export function getCacheTimeout(url, method) {
  if (cacheConfig.noCache.methods.includes(method.toUpperCase())) {
    return 0; // No cache for mutations
  }

  for (const [category, config] of Object.entries(cacheConfig)) {
    if (config.endpoints) {
      for (const endpoint of config.endpoints) {
        if (url.includes(endpoint)) {
          return config.timeout;
        }
      }
    }
  }

  return requestCache.cacheTimeout; // Default timeout
}

// Auto cleanup old cache entries
setInterval(() => {
  const now = Date.now();
  for (const [key, cached] of requestCache.cache.entries()) {
    if (now - cached.timestamp > requestCache.cacheTimeout) {
      requestCache.cache.delete(key);
    }
  }
}, 60000); // Cleanup every minute
