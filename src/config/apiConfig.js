// API Configuration for optimized requests
export const API_CONFIG = {
  // Base URL configuration
  BASE_URL: import.meta.env.VITE_API_URL || 
    (import.meta.env.DEV ? "/api" : "https://brainquiz0.up.railway.app"),
  
  // Cache configuration
  CACHE: {
    ENABLED: import.meta.env.VITE_ENABLE_CACHE !== 'false',
    DURATION: parseInt(import.meta.env.VITE_CACHE_DURATION) || 5 * 60 * 1000, // 5 minutes
    MAX_SIZE: 100, // Maximum number of cached items
  },
  
  // Rate limiting configuration
  RATE_LIMIT: {
    MAX_CONCURRENT: parseInt(import.meta.env.VITE_MAX_CONCURRENT_REQUESTS) || 3,
    REQUEST_DELAY: parseInt(import.meta.env.VITE_REQUEST_DELAY) || 200,
    BATCH_SIZE: parseInt(import.meta.env.VITE_BATCH_SIZE) || 2,
    RETRY_COUNT: 3,
    RETRY_DELAY: 1000,
  },
  
  // Debug configuration
  DEBUG: {
    API: import.meta.env.VITE_DEBUG_API === 'true',
    CACHE: import.meta.env.VITE_DEBUG_CACHE === 'true',
    SHOW_STATS: import.meta.env.VITE_SHOW_CACHE_STATS === 'true',
  },
  
  // Request timeout configuration
  TIMEOUT: {
    DEFAULT: 30000, // 30 seconds
    UPLOAD: 60000,  // 60 seconds for file uploads
    DOWNLOAD: 120000, // 2 minutes for downloads
  },
  
  // Endpoints that should be cached
  CACHEABLE_ENDPOINTS: [
    '/kategori/get-kategori',
    '/tingkatan/get-tingkatan',
    '/pendidikan/get-pendidikan',
    '/kelas/get-kelas',
    '/kuis/get-kuis',
    '/soal/get-soal',
  ],
  
  // Endpoints that should not be cached
  NON_CACHEABLE_ENDPOINTS: [
    '/user/login',
    '/user/register',
    '/hasil-kuis/submit-jawaban',
  ],
  
  // Priority levels for requests
  PRIORITY: {
    HIGH: 1,    // Critical user actions
    MEDIUM: 2,  // Normal data fetching
    LOW: 3,     // Background updates
  },
};

// Helper function to check if endpoint should be cached
export const shouldCache = (url, method = 'GET') => {
  if (method !== 'GET') return false;
  if (!API_CONFIG.CACHE.ENABLED) return false;
  
  const endpoint = url.replace(API_CONFIG.BASE_URL, '');
  
  // Check if explicitly non-cacheable
  if (API_CONFIG.NON_CACHEABLE_ENDPOINTS.some(pattern => endpoint.includes(pattern))) {
    return false;
  }
  
  // Check if explicitly cacheable
  return API_CONFIG.CACHEABLE_ENDPOINTS.some(pattern => endpoint.includes(pattern));
};

// Helper function to get cache key
export const getCacheKey = (url, options = {}) => {
  const { method = 'GET', body } = options;
  const baseKey = `${method}_${url}`;
  
  if (body && method !== 'GET') {
    const bodyHash = btoa(JSON.stringify(body)).slice(0, 8);
    return `${baseKey}_${bodyHash}`;
  }
  
  return baseKey;
};

// Helper function to check if request should be rate limited
export const shouldRateLimit = (url) => {
  // Always rate limit to prevent server overload
  return true;
};

// Helper function to get request priority
export const getRequestPriority = (url, options = {}) => {
  const { priority } = options;
  if (priority) return priority;
  
  // Determine priority based on endpoint
  if (url.includes('/user/login') || url.includes('/user/register')) {
    return API_CONFIG.PRIORITY.HIGH;
  }
  
  if (url.includes('/hasil-kuis/submit-jawaban')) {
    return API_CONFIG.PRIORITY.HIGH;
  }
  
  if (url.includes('/get-')) {
    return API_CONFIG.PRIORITY.MEDIUM;
  }
  
  return API_CONFIG.PRIORITY.LOW;
};

// Helper function to get timeout for request
export const getRequestTimeout = (url, options = {}) => {
  const { timeout } = options;
  if (timeout) return timeout;
  
  if (url.includes('/upload') || url.includes('/file')) {
    return API_CONFIG.TIMEOUT.UPLOAD;
  }
  
  if (url.includes('/download') || url.includes('/export')) {
    return API_CONFIG.TIMEOUT.DOWNLOAD;
  }
  
  return API_CONFIG.TIMEOUT.DEFAULT;
};

// Log configuration on startup (development only)
if (import.meta.env.DEV && API_CONFIG.DEBUG.API) {
  console.log('🔧 API Configuration:', API_CONFIG);
}
