import { BASE_URL, getAuthHeaders, getRequestConfig } from '../constants/api.js';

// Generic API call function
const apiCall = async (endpoint, options = {}) => {
  const url = `${BASE_URL}${endpoint}`;
  
  const defaultOptions = {
    headers: getAuthHeaders(),
    credentials: 'include',
  };

  const mergedOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  try {
    // Debug logging for development
    if (import.meta.env.DEV) {
      console.log('API Call Debug:', {
        url,
        method: mergedOptions.method || 'GET',
        hasAuth: !!mergedOptions.headers?.Authorization
      });
    }

    const response = await fetch(url, mergedOptions);

    // Check if response has content
    const contentType = response.headers.get('content-type');
    let data = null;

    if (contentType && contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('Failed to parse JSON response:', jsonError);
        data = { message: 'Invalid JSON response from server' };
      }
    } else {
      // If not JSON, try to get text
      const text = await response.text();
      data = { message: text || 'No response from server' };
    }

    if (!response.ok) {
      if (import.meta.env.DEV) {
        console.error('API Error:', {
          status: response.status,
          statusText: response.statusText,
          url: url,
          data: data
        });
      }

      throw new Error(data?.message || `HTTP error! status: ${response.status} - ${response.statusText}`);
    }

    return data;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('API call failed:', error);
    }

    // Handle network errors with more specific messages
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Tidak dapat terhubung ke server. Periksa koneksi internet Anda atau coba lagi nanti.');
    }

    throw error;
  }
};

// Quiz API
export const quizAPI = {
  // Get all quizzes
  getAll: () => apiCall('/kuis/get-kuis'),
  
  // Get quiz by ID
  getById: (id) => apiCall(`/kuis/get-kuis/${id}`),
  
  // Create new quiz
  create: (quizData) => apiCall('/kuis/create-kuis', {
    method: 'POST',
    body: JSON.stringify(quizData),
  }),
  
  // Update quiz
  update: (id, quizData) => apiCall(`/kuis/update-kuis/${id}`, {
    method: 'PUT',
    body: JSON.stringify(quizData),
  }),
  
  // Delete quiz
  delete: (id) => apiCall(`/kuis/delete-kuis/${id}`, {
    method: 'DELETE',
  }),
};

// Question API
export const questionAPI = {
  // Get questions by quiz ID
  getByQuizId: (quizId) => apiCall(`/soal/get-soal/${quizId}`),
  
  // Create new question
  create: (questionData) => apiCall('/soal/create-soal', {
    method: 'POST',
    body: JSON.stringify(questionData),
  }),
  
  // Update question
  update: (id, questionData) => apiCall(`/soal/update-soal/${id}`, {
    method: 'PUT',
    body: JSON.stringify(questionData),
  }),
  
  // Delete question
  delete: (id) => apiCall(`/soal/delete-soal/${id}`, {
    method: 'DELETE',
  }),
};

// Quiz Result API
export const quizResultAPI = {
  // Submit quiz answers
  submit: (answers) => apiCall('/hasil-kuis/submit-jawaban', {
    method: 'POST',
    body: JSON.stringify(answers),
  }),
  
  // Get all results
  getAll: () => apiCall('/hasil-kuis/get-hasil'),
  
  // Get results by user ID
  getByUserId: (userId) => apiCall(`/hasil-kuis/get-hasil/${userId}`),
  
  // Get result detail
  getDetail: (id) => apiCall(`/hasil-kuis/get-detail/${id}`),
};

// User API
export const userAPI = {
  // Login
  login: (credentials) => apiCall('/user/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }),
  
  // Register
  register: (userData) => apiCall('/user/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  }),
  
  // Get profile
  getProfile: () => apiCall('/user/profile'),
  
  // Update profile
  updateProfile: (userData) => apiCall('/user/update', {
    method: 'PUT',
    body: JSON.stringify(userData),
  }),
};

export default {
  quiz: quizAPI,
  question: questionAPI,
  result: quizResultAPI,
  user: userAPI,
};
