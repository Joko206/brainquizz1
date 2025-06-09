// Request throttling dan debouncing untuk mengurangi database load
class RequestThrottle {
  constructor() {
    this.pendingRequests = new Map();
    this.requestQueue = [];
    this.isProcessing = false;
    this.maxConcurrent = 3; // Maximum concurrent requests
    this.requestDelay = 100; // Delay between requests (ms)
  }

  // Debounce function untuk mencegah multiple requests yang sama
  debounce(func, delay = 300) {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  }

  // Throttle function untuk membatasi frequency requests
  throttle(func, limit = 1000) {
    let inThrottle;
    return (...args) => {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // Queue request untuk sequential processing
  async queueRequest(requestFn, priority = 0) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        requestFn,
        priority,
        resolve,
        reject,
        timestamp: Date.now()
      });

      // Sort by priority (higher priority first)
      this.requestQueue.sort((a, b) => b.priority - a.priority);
      
      this.processQueue();
    });
  }

  // Process request queue sequentially
  async processQueue() {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const activeTasks = [];

    while (this.requestQueue.length > 0 && activeTasks.length < this.maxConcurrent) {
      const task = this.requestQueue.shift();
      
      const promise = this.executeRequest(task);
      activeTasks.push(promise);
    }

    // Wait for current batch to complete
    await Promise.allSettled(activeTasks);
    
    this.isProcessing = false;

    // Continue processing if there are more requests
    if (this.requestQueue.length > 0) {
      setTimeout(() => this.processQueue(), this.requestDelay);
    }
  }

  // Execute individual request
  async executeRequest(task) {
    try {
      const result = await task.requestFn();
      task.resolve(result);
    } catch (error) {
      task.reject(error);
    }
  }

  // Prevent duplicate requests
  async deduplicateRequest(key, requestFn) {
    if (this.pendingRequests.has(key)) {
      console.log(`⏳ Duplicate request prevented: ${key}`);
      return this.pendingRequests.get(key);
    }

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

  // Get queue statistics
  getStats() {
    return {
      queueLength: this.requestQueue.length,
      pendingRequests: this.pendingRequests.size,
      isProcessing: this.isProcessing,
      maxConcurrent: this.maxConcurrent
    };
  }

  // Clear all pending requests
  clear() {
    this.requestQueue.length = 0;
    this.pendingRequests.clear();
    this.isProcessing = false;
  }
}

// Create global throttle instance
export const requestThrottle = new RequestThrottle();

// Utility functions for common use cases
export const debouncedFetch = requestThrottle.debounce.bind(requestThrottle);
export const throttledFetch = requestThrottle.throttle.bind(requestThrottle);

// High-level API for different request types
export const apiRequest = {
  // High priority for user actions
  immediate: (requestFn) => requestThrottle.queueRequest(requestFn, 10),
  
  // Normal priority for data fetching
  normal: (requestFn) => requestThrottle.queueRequest(requestFn, 5),
  
  // Low priority for background tasks
  background: (requestFn) => requestThrottle.queueRequest(requestFn, 1),
  
  // Deduplicated request
  dedupe: (key, requestFn) => requestThrottle.deduplicateRequest(key, requestFn)
};

// Auto-cleanup old requests
setInterval(() => {
  const now = Date.now();
  requestThrottle.requestQueue = requestThrottle.requestQueue.filter(
    task => now - task.timestamp < 30000 // Remove requests older than 30 seconds
  );
}, 10000); // Cleanup every 10 seconds
