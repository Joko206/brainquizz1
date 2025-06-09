import React from 'react';

/**
 * Component to display API loading, error, and empty states
 */
export const LoadingSpinner = ({ size = 'md', message = 'Memuat data...' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className={`${sizeClasses[size]} border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4`}></div>
      <p className="text-slate-600 font-medium">{message}</p>
    </div>
  );
};

export const ErrorMessage = ({ 
  error, 
  onRetry, 
  title = 'Terjadi Kesalahan',
  showRetry = true 
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-red-50 rounded-xl border border-red-200">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-red-800 mb-2">{title}</h3>
      <p className="text-red-600 text-center mb-4 max-w-md">
        {error?.message || 'Tidak dapat memuat data. Silakan coba lagi.'}
      </p>
      {showRetry && onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors duration-200"
        >
          Coba Lagi
        </button>
      )}
    </div>
  );
};

export const EmptyState = ({ 
  title = 'Tidak ada data',
  message = 'Belum ada data untuk ditampilkan.',
  icon = '📭',
  action,
  actionLabel = 'Refresh'
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <div className="text-6xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-slate-800 mb-2">{title}</h3>
      <p className="text-slate-600 mb-6 max-w-md">{message}</p>
      {action && (
        <button
          onClick={action}
          className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors duration-200"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export const NetworkStatus = ({ isOnline = true }) => {
  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-red-500 text-white text-center py-2 z-50">
      <div className="flex items-center justify-center space-x-2">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-12.728 12.728m0-12.728l12.728 12.728" />
        </svg>
        <span>Tidak ada koneksi internet</span>
      </div>
    </div>
  );
};

/**
 * Higher-order component for handling API states
 */
export const withApiState = (WrappedComponent) => {
  return function WithApiStateComponent(props) {
    const { loading, error, data, onRetry, ...otherProps } = props;

    if (loading) {
      return <LoadingSpinner message="Memuat data..." />;
    }

    if (error) {
      return (
        <ErrorMessage 
          error={error} 
          onRetry={onRetry}
          title="Gagal Memuat Data"
        />
      );
    }

    if (!data || (Array.isArray(data) && data.length === 0)) {
      return (
        <EmptyState 
          title="Tidak Ada Data"
          message="Belum ada data untuk ditampilkan."
          action={onRetry}
          actionLabel="Muat Ulang"
        />
      );
    }

    return <WrappedComponent data={data} {...otherProps} />;
  };
};

/**
 * Component for showing request rate limiting status
 */
export const RateLimitStatus = ({ 
  currentRequests = 0, 
  maxRequests = 3, 
  queueLength = 0 
}) => {
  if (currentRequests === 0 && queueLength === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-40">
      <div className="flex items-center space-x-2 text-sm">
        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
        <span>
          Memproses: {currentRequests}/{maxRequests}
          {queueLength > 0 && ` (Antrian: ${queueLength})`}
        </span>
      </div>
    </div>
  );
};

/**
 * Hook for monitoring network status
 */
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
};

/**
 * Component for displaying cache statistics (development only)
 */
export const CacheStats = ({ stats }) => {
  if (!import.meta.env.DEV || !stats) return null;

  return (
    <div className="fixed bottom-4 left-4 bg-gray-800 text-white px-3 py-2 rounded text-xs z-40">
      <div>Cache: {stats.cacheSize} items</div>
      <div>Pending: {stats.pendingRequests}</div>
    </div>
  );
};
