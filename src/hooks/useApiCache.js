import { useState, useEffect, useCallback, useRef } from 'react';

// Global cache for API responses
const globalCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Request deduplication
const pendingRequests = new Map();

/**
 * Custom hook for caching API responses and preventing duplicate requests
 * @param {Function} apiFunction - The API function to call
 * @param {Array} dependencies - Dependencies that trigger refetch
 * @param {Object} options - Configuration options
 */
export const useApiCache = (apiFunction, dependencies = [], options = {}) => {
  const {
    cacheKey,
    cacheDuration = CACHE_DURATION,
    enabled = true,
    onSuccess,
    onError,
    retryCount = 3,
    retryDelay = 1000
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const retryCountRef = useRef(0);
  const mountedRef = useRef(true);

  // Generate cache key if not provided
  const finalCacheKey = cacheKey || `${apiFunction.name}_${JSON.stringify(dependencies)}`;

  const fetchData = useCallback(async (isRetry = false) => {
    if (!enabled) return;

    // Check cache first
    const cached = globalCache.get(finalCacheKey);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < cacheDuration && !isRetry) {
      setData(cached.data);
      setLoading(false);
      setError(null);
      return cached.data;
    }

    // Check if request is already pending
    if (pendingRequests.has(finalCacheKey)) {
      try {
        const result = await pendingRequests.get(finalCacheKey);
        if (mountedRef.current) {
          setData(result);
          setLoading(false);
          setError(null);
        }
        return result;
      } catch (err) {
        if (mountedRef.current) {
          setError(err);
          setLoading(false);
        }
        throw err;
      }
    }

    if (!mountedRef.current) return;

    setLoading(true);
    setError(null);

    // Create promise for this request
    const requestPromise = (async () => {
      try {
        const result = await apiFunction();
        
        // Cache successful response
        globalCache.set(finalCacheKey, {
          data: result,
          timestamp: now
        });

        retryCountRef.current = 0; // Reset retry count on success
        
        if (onSuccess) {
          onSuccess(result);
        }

        return result;
      } catch (err) {
        // Handle retry logic
        if (retryCountRef.current < retryCount) {
          retryCountRef.current++;
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, retryDelay * retryCountRef.current));
          
          // Retry the request
          return fetchData(true);
        }

        if (onError) {
          onError(err);
        }

        throw err;
      }
    })();

    // Store pending request
    pendingRequests.set(finalCacheKey, requestPromise);

    try {
      const result = await requestPromise;
      
      if (mountedRef.current) {
        setData(result);
        setLoading(false);
      }
      
      return result;
    } catch (err) {
      if (mountedRef.current) {
        setError(err);
        setLoading(false);
      }
      throw err;
    } finally {
      // Remove from pending requests
      pendingRequests.delete(finalCacheKey);
    }
  }, [apiFunction, finalCacheKey, cacheDuration, enabled, onSuccess, onError, retryCount, retryDelay]);

  // Fetch data when dependencies change
  useEffect(() => {
    if (enabled) {
      fetchData();
    }
  }, [fetchData, ...dependencies]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Manual refetch function
  const refetch = useCallback(() => {
    // Clear cache for this key
    globalCache.delete(finalCacheKey);
    return fetchData();
  }, [finalCacheKey, fetchData]);

  // Clear cache function
  const clearCache = useCallback(() => {
    globalCache.delete(finalCacheKey);
  }, [finalCacheKey]);

  return {
    data,
    loading,
    error,
    refetch,
    clearCache
  };
};

/**
 * Hook for batch API requests with rate limiting
 * @param {Array} apiCalls - Array of API functions to call
 * @param {Object} options - Configuration options
 */
export const useBatchApi = (apiCalls = [], options = {}) => {
  const {
    batchSize = 3,
    delay = 200,
    enabled = true
  } = options;

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  const executeBatch = useCallback(async () => {
    if (!enabled || apiCalls.length === 0) return;

    setLoading(true);
    setError(null);
    setProgress(0);
    
    const allResults = [];
    
    try {
      for (let i = 0; i < apiCalls.length; i += batchSize) {
        const batch = apiCalls.slice(i, i + batchSize);
        
        // Execute batch in parallel
        const batchPromises = batch.map(async (apiCall, index) => {
          try {
            // Add small random delay to prevent overwhelming server
            await new Promise(resolve => setTimeout(resolve, Math.random() * delay));
            return await apiCall();
          } catch (error) {
            console.warn(`Batch request ${i + index} failed:`, error);
            return null;
          }
        });

        const batchResults = await Promise.allSettled(batchPromises);
        
        // Process results
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            allResults[i + index] = result.value;
          } else {
            allResults[i + index] = null;
          }
        });

        // Update progress
        setProgress(Math.min(100, ((i + batchSize) / apiCalls.length) * 100));

        // Delay between batches
        if (i + batchSize < apiCalls.length) {
          await new Promise(resolve => setTimeout(resolve, delay * 2));
        }
      }

      setResults(allResults);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
      setProgress(100);
    }
  }, [apiCalls, batchSize, delay, enabled]);

  useEffect(() => {
    if (enabled && apiCalls.length > 0) {
      executeBatch();
    }
  }, [executeBatch]);

  return {
    results,
    loading,
    error,
    progress,
    refetch: executeBatch
  };
};

// Utility function to clear all cache
export const clearAllCache = () => {
  globalCache.clear();
  pendingRequests.clear();
};

// Utility function to get cache stats
export const getCacheStats = () => {
  return {
    cacheSize: globalCache.size,
    pendingRequests: pendingRequests.size,
    cacheKeys: Array.from(globalCache.keys())
  };
};
