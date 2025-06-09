// API Configuration Constants - Railway Deployment
export const BASE_URL = import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "/api" : "https://brainquiz0.up.railway.app");

// Debug logging for development only
if (import.meta.env.DEV) {
  console.log('API Configuration:', {
    VITE_API_URL: import.meta.env.VITE_API_URL,
    BASE_URL: BASE_URL,
    isDev: import.meta.env.DEV
  });
}

// API Endpoints
export const API_ENDPOINTS = {
  // User endpoints
  USER: {
    LOGIN: '/user/login',
    REGISTER: '/user/register',
    PROFILE: '/user/profile',
    UPDATE: '/user/update',
  },
  
  // Quiz endpoints
  QUIZ: {
    GET_ALL: '/kuis/get-kuis',
    GET_BY_ID: (id) => `/kuis/get-kuis/${id}`,
    CREATE: '/kuis/create-kuis',
    UPDATE: (id) => `/kuis/update-kuis/${id}`,
    DELETE: (id) => `/kuis/delete-kuis/${id}`,
  },
  
  // Question endpoints
  SOAL: {
    GET_BY_QUIZ: (kuisId) => `/soal/get-soal/${kuisId}`,
    CREATE: '/soal/create-soal',
    UPDATE: (id) => `/soal/update-soal/${id}`,
    DELETE: (id) => `/soal/delete-soal/${id}`,
  },
  
  // Quiz Result endpoints
  HASIL_KUIS: {
    SUBMIT: '/hasil-kuis/submit-jawaban',
    GET_ALL: '/hasil-kuis/get-hasil',
    GET_BY_USER: (userId) => `/hasil-kuis/get-hasil/${userId}`,
    GET_DETAIL: (id) => `/hasil-kuis/get-detail/${id}`,
  },
  
  // Category endpoints
  KATEGORI: {
    GET_ALL: '/kategori/get-kategori',
    CREATE: '/kategori/create-kategori',
    UPDATE: (id) => `/kategori/update-kategori/${id}`,
    DELETE: (id) => `/kategori/delete-kategori/${id}`,
  },
  
  // Education Level endpoints
  PENDIDIKAN: {
    GET_ALL: '/pendidikan/get-pendidikan',
    CREATE: '/pendidikan/create-pendidikan',
    UPDATE: (id) => `/pendidikan/update-pendidikan/${id}`,
    DELETE: (id) => `/pendidikan/delete-pendidikan/${id}`,
  },
  
  // Class Level endpoints
  TINGKATAN: {
    GET_ALL: '/tingkatan/get-tingkatan',
    CREATE: '/tingkatan/create-tingkatan',
    UPDATE: (id) => `/tingkatan/update-tingkatan/${id}`,
    DELETE: (id) => `/tingkatan/delete-tingkatan/${id}`,
  },
  
  // Class endpoints
  KELAS: {
    GET_ALL: '/kelas/get-kelas',
    CREATE: '/kelas/create-kelas',
    UPDATE: (id) => `/kelas/update-kelas/${id}`,
    DELETE: (id) => `/kelas/delete-kelas/${id}`,
    JOIN: '/kelas/join-kelas',
  },
};

// HTTP Methods
export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE',
  PATCH: 'PATCH',
};

// Request Headers
export const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
};

// Request Configuration
export const getRequestConfig = (method = 'GET', body = null) => {
  const config = {
    method,
    headers: getAuthHeaders(),
    credentials: 'include',
  };
  
  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    config.body = JSON.stringify(body);
  }
  
  return config;
};
