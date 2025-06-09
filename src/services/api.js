const BASE_URL = import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "/api" : "https://brainquiz0.up.railway.app");

// Debug logging for development only
if (import.meta.env.DEV) {
  console.log('API Configuration (api.js):', {
    VITE_API_URL: import.meta.env.VITE_API_URL,
    BASE_URL: BASE_URL,
    isDev: import.meta.env.DEV
  });
}

// Request cache to prevent duplicate requests
const requestCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Rate limiting
const requestQueue = [];
const MAX_CONCURRENT_REQUESTS = 3;
let activeRequests = 0;

const processQueue = async () => {
  if (activeRequests >= MAX_CONCURRENT_REQUESTS || requestQueue.length === 0) {
    return;
  }

  const { resolve, reject, requestFn } = requestQueue.shift();
  activeRequests++;

  try {
    const result = await requestFn();
    resolve(result);
  } catch (error) {
    reject(error);
  } finally {
    activeRequests--;
    // Process next request after a small delay
    setTimeout(processQueue, 100);
  }
};

const queueRequest = (requestFn) => {
  return new Promise((resolve, reject) => {
    requestQueue.push({ resolve, reject, requestFn });
    processQueue();
  });
};

// Helper function to clear cache for specific endpoints
const clearCacheForEndpoint = (endpoint) => {
  const keysToDelete = [];
  for (const [key] of requestCache) {
    if (key.includes(endpoint)) {
      keysToDelete.push(key);
    }
  }
  keysToDelete.forEach(key => requestCache.delete(key));
};

const getAuthHeader = () => {
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

const handleResponse = async (response) => {
  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    throw new Error("Terjadi kesalahan pada server");
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || `Server error: ${response.status}`);
  }
  return data;
};

// Enhanced fetch with caching and rate limiting
const cachedFetch = async (url, options = {}) => {
  const cacheKey = `${url}_${JSON.stringify(options)}`;
  const now = Date.now();

  // Check cache for GET requests
  if (!options.method || options.method === 'GET') {
    const cached = requestCache.get(cacheKey);
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      return cached.data;
    }
  }

  // Use rate limiting for all requests
  const requestFn = async () => {
    const response = await fetch(url, options);
    const data = await handleResponse(response);

    // Cache successful GET responses
    if ((!options.method || options.method === 'GET') && data.success) {
      requestCache.set(cacheKey, {
        data,
        timestamp: now
      });
    }

    return data;
  };

  return queueRequest(requestFn);
};

export const api = {
  // Kategori
  getKategori: async () => {
    try {
      return await cachedFetch(`${BASE_URL}/kategori/get-kategori`, {
        method: "GET",
        headers: getAuthHeader(),
        credentials: 'include',
      });
    } catch (error) {
      console.error("Error fetching kategori:", error);
      throw error;
    }
  },

  addKategori: async (data) => {
    try {
      const kategoriData = {
        name: data.name,
        description: data.description,
      };

      const response = await fetch(`${BASE_URL}/kategori/add-kategori`, {
        method: "POST",
        headers: getAuthHeader(),
        credentials: 'include',
        body: JSON.stringify(kategoriData),
      });
      return handleResponse(response);
    } catch (error) {
      console.error("Error adding kategori:", error);
      throw error;
    }
  },

  updateKategori: async (id, data) => {
    try {
      const kategoriData = {
        name: data.name,
        description: data.description,
      };

      const response = await fetch(
        `${BASE_URL}/kategori/update-kategori/${id}`,
        {
          method: "PATCH",
          headers: getAuthHeader(),
          credentials: 'include',
          body: JSON.stringify(kategoriData),
        }
      );

      const result = await handleResponse(response);

      // Clear cache after successful update
      if (result.success) {
        clearCacheForEndpoint('/kategori/get-kategori');
      }

      return result;
    } catch (error) {
      console.error("Error updating kategori:", error);
      throw error;
    }
  },

  deleteKategori: async (id) => {
    try {
      const response = await fetch(
        `${BASE_URL}/kategori/delete-kategori/${id}`,
        {
          method: "DELETE",
          headers: getAuthHeader(),
          credentials: 'include',
        }
      );

      const result = await handleResponse(response);

      // Clear cache after successful delete
      if (result.success) {
        clearCacheForEndpoint('/kategori/get-kategori');
      }

      return result;
    } catch (error) {
      console.error("Error deleting kategori:", error);
      throw error;
    }
  },

  // Tingkatan
  getTingkatan: async () => {
    try {
      return await cachedFetch(`${BASE_URL}/tingkatan/get-tingkatan`, {
        method: "GET",
        headers: getAuthHeader(),
        credentials: 'include',
      });
    } catch (error) {
      console.error("Error fetching tingkatan:", error);
      throw error;
    }
  },

  addTingkatan: async (data) => {
    try {
      const response = await fetch(`${BASE_URL}/tingkatan/add-tingkatan`, {
        method: "POST",
        headers: getAuthHeader(),
        credentials: 'include',
        body: JSON.stringify(data),
      });
      return handleResponse(response);
    } catch (error) {
      console.error("Error adding tingkatan:", error);
      throw error;
    }
  },

  updateTingkatan: async (id, data) => {
    try {
      const response = await fetch(
        `${BASE_URL}/tingkatan/update-tingkatan/${id}`,
        {
          method: "PATCH",
          headers: getAuthHeader(),
          credentials: 'include',
          body: JSON.stringify(data),
        }
      );

      const result = await handleResponse(response);

      // Clear cache after successful update
      if (result.success) {
        clearCacheForEndpoint('/tingkatan/get-tingkatan');
      }

      return result;
    } catch (error) {
      console.error("Error updating tingkatan:", error);
      throw error;
    }
  },

  deleteTingkatan: async (id) => {
    try {
      const response = await fetch(
        `${BASE_URL}/tingkatan/delete-tingkatan/${id}`,
        {
          method: "DELETE",
          headers: getAuthHeader(),
          credentials: 'include',
        }
      );

      const result = await handleResponse(response);

      // Clear cache after successful delete
      if (result.success) {
        clearCacheForEndpoint('/tingkatan/get-tingkatan');
      }

      return result;
    } catch (error) {
      console.error("Error deleting tingkatan:", error);
      throw error;
    }
  },

  // Pendidikan
  getPendidikan: async () => {
    try {
      return await cachedFetch(`${BASE_URL}/pendidikan/get-pendidikan`, {
        method: "GET",
        headers: getAuthHeader(),
        credentials: 'include',
      });
    } catch (error) {
      console.error("Error fetching pendidikan:", error);
      throw error;
    }
  },

  addPendidikan: async (data) => {
    try {
      const response = await fetch(`${BASE_URL}/pendidikan/add-pendidikan`, {
        method: "POST",
        headers: getAuthHeader(),
        credentials: 'include',
        body: JSON.stringify(data),
      });
      return handleResponse(response);
    } catch (error) {
      console.error("Error adding pendidikan:", error);
      throw error;
    }
  },

  updatePendidikan: async (id, data) => {
    try {
      const response = await fetch(
        `${BASE_URL}/pendidikan/update-pendidikan/${id}`,
        {
          method: "PATCH",
          headers: getAuthHeader(),
          credentials: 'include',
          body: JSON.stringify(data),
        }
      );

      const result = await handleResponse(response);

      // Clear cache after successful update
      if (result.success) {
        clearCacheForEndpoint('/pendidikan/get-pendidikan');
      }

      return result;
    } catch (error) {
      console.error("Error updating pendidikan:", error);
      throw error;
    }
  },

  deletePendidikan: async (id) => {
    try {
      const response = await fetch(
        `${BASE_URL}/pendidikan/delete-pendidikan/${id}`,
        {
          method: "DELETE",
          headers: getAuthHeader(),
          credentials: 'include',
        }
      );

      const result = await handleResponse(response);

      // Clear cache after successful delete
      if (result.success) {
        clearCacheForEndpoint('/pendidikan/get-pendidikan');
      }

      return result;
    } catch (error) {
      console.error("Error deleting pendidikan:", error);
      throw error;
    }
  },

  // Kelas
  getKelas: async () => {
    try {
      return await cachedFetch(`${BASE_URL}/kelas/get-kelas`, {
        method: "GET",
        headers: getAuthHeader(),
        credentials: 'include',
      });
    } catch (error) {
      console.error("Error fetching kelas:", error);
      throw error;
    }
  },

  getKelasById: async (id) => {
    try {
      return await cachedFetch(`${BASE_URL}/kelas/get-kelas/${id}`, {
        method: "GET",
        headers: getAuthHeader(),
        credentials: 'include',
      });
    } catch (error) {
      console.error("Error fetching kelas by id:", error);
      throw error;
    }
  },

  addKelas: async (data) => {
    try {
      const response = await fetch(`${BASE_URL}/kelas/add-kelas`, {
        method: "POST",
        headers: getAuthHeader(),
        credentials: 'include',
        body: JSON.stringify(data),
      });
      return handleResponse(response);
    } catch (error) {
      console.error("Error adding kelas:", error);
      throw error;
    }
  },

  updateKelas: async (id, data) => {
    try {
      const response = await fetch(`${BASE_URL}/kelas/update-kelas/${id}`, {
        method: "PATCH",
        headers: getAuthHeader(),
        credentials: 'include',
        body: JSON.stringify(data),
      });

      const result = await handleResponse(response);

      // Clear cache after successful update
      if (result.success) {
        clearCacheForEndpoint('/kelas/get-kelas');
      }

      return result;
    } catch (error) {
      console.error("Error updating kelas:", error);
      throw error;
    }
  },

  deleteKelas: async (id) => {
    try {
      const response = await fetch(`${BASE_URL}/kelas/delete-kelas/${id}`, {
        method: "DELETE",
        headers: getAuthHeader(),
        credentials: 'include',
      });

      const result = await handleResponse(response);

      // Clear cache after successful delete
      if (result.success) {
        clearCacheForEndpoint('/kelas/get-kelas');
      }

      return result;
    } catch (error) {
      console.error("Error deleting kelas:", error);
      throw error;
    }
  },

  // Join Class with Code - USING CORRECT BACKEND ENDPOINTS
  getJoinedClasses: async () => {
    try {
      const response = await fetch(`${BASE_URL}/kelas/get-kelas-by-user`, {
        method: "GET",
        headers: getAuthHeader(),
        credentials: 'include',
      });
      return handleResponse(response);
    } catch (error) {
      console.error("Error fetching joined classes:", error);
      throw error;
    }
  },

  joinClassWithCode: async (joinCode) => {
    try {
      const response = await fetch(`${BASE_URL}/kelas/join-by-code`, {
        method: "POST",
        headers: getAuthHeader(),
        credentials: 'include',
        body: JSON.stringify({ join_code: joinCode }),
      });
      return handleResponse(response);
    } catch (error) {
      console.error("Error joining class with code:", error);
      throw error;
    }
  },

  leaveClass: async (kelasId) => {
    try {
      const response = await fetch(`${BASE_URL}/kelas/leave-class/${kelasId}`, {
        method: "DELETE",
        headers: getAuthHeader(),
        credentials: 'include',
      });
      return handleResponse(response);
    } catch (error) {
      console.error("Error leaving class:", error);
      throw error;
    }
  },

  // Get students in a class (API not implemented yet - return mock data)
  getStudentsByKelasId: async (kelasId) => {
    // API endpoint belum diimplementasi di backend
    // Return mock response tanpa melakukan HTTP request
    console.log(`getStudentsByKelasId(${kelasId}): API not implemented, returning mock data`);
    return {
      success: true,
      data: [], // Empty array = no students yet
      message: "API get-students belum diimplementasi di backend"
    };
  },

  // Kuis
  getKuis: async () => {
    try {
      return await cachedFetch(`${BASE_URL}/kuis/get-kuis`, {
        method: "GET",
        headers: getAuthHeader(),
        credentials: 'include',
      });
    } catch (error) {
      console.error("Error fetching kuis:", error);
      throw error;
    }
  },

  getKuisByKelasId: async (kelasId) => {
    try {
      const response = await fetch(
        `${BASE_URL}/kuis/filter-kuis?kelas_id=${kelasId}`,
        {
          method: "GET",
          headers: getAuthHeader(),
          credentials: 'include',
        }
      );
      return handleResponse(response);
    } catch (error) {
      console.error("Error fetching kuis by kelas id:", error);
      throw error;
    }
  },

  addKuis: async (data) => {
    try {
      const kuisData = {
        title: data.title,
        description: data.description,
        kategori_id: data.kategori_id,
        tingkatan_id: data.tingkatan_id,
        kelas_id: data.kelas_id,
        pendidikan_id: data.pendidikan_id,
      };

      const response = await fetch(`${BASE_URL}/kuis/add-kuis`, {
        method: "POST",
        headers: getAuthHeader(),
        credentials: 'include',
        body: JSON.stringify(kuisData),
      });
      return handleResponse(response);
    } catch (error) {
      console.error("Error adding kuis:", error);
      throw error;
    }
  },

  updateKuis: async (id, data) => {
    try {
      const kuisData = {
        title: data.title,
        description: data.description,
        kategori_id: data.kategori_id,
        tingkatan_id: data.tingkatan_id,
        kelas_id: data.kelas_id,
        pendidikan_id: data.pendidikan_id,
      };

      const response = await fetch(`${BASE_URL}/kuis/update-kuis/${id}`, {
        method: "PATCH",
        headers: getAuthHeader(),
        credentials: 'include',
        body: JSON.stringify(kuisData),
      });
      return handleResponse(response);
    } catch (error) {
      console.error("Error updating kuis:", error);
      throw error;
    }
  },

  deleteKuis: async (id) => {
    try {
      const response = await fetch(`${BASE_URL}/kuis/delete-kuis/${id}`, {
        method: "DELETE",
        headers: getAuthHeader(),
        credentials: 'include',
      });
      return handleResponse(response);
    } catch (error) {
      console.error("Error deleting kuis:", error);
      throw error;
    }
  },

  // Soal
  getSoal: async () => {
    try {
      return await cachedFetch(`${BASE_URL}/soal/get-soal`, {
        method: "GET",
        headers: getAuthHeader(),
        credentials: 'include',
      });
    } catch (error) {
      console.error("Error fetching soal:", error);
      throw error;
    }
  },

  getSoalByKuisID: async (kuisId) => {
    try {
      return await cachedFetch(`${BASE_URL}/soal/get-soal/${kuisId}`, {
        method: "GET",
        headers: getAuthHeader(),
        credentials: 'include',
      });
    } catch (error) {
      console.error("Error fetching soal by kuis ID:", error);
      throw error;
    }
  },

  addSoal: async (data) => {
    try {
      // Ensure options is properly formatted as JSON string
      let optionsJson;
      if (typeof data.options === 'string') {
        optionsJson = data.options;
      } else if (data.options && typeof data.options === 'object') {
        optionsJson = JSON.stringify(data.options);
      } else if (data.options_json) {
        optionsJson = data.options_json;
      } else {
        throw new Error('Options data is required');
      }

      const soalData = {
        question: data.question,
        options_json: optionsJson,  // This will be mapped to Options field in backend
        correct_answer: data.correct_answer,
        kuis_id: parseInt(data.kuis_id),
      };

      const response = await fetch(`${BASE_URL}/soal/add-soal`, {
        method: "POST",
        headers: getAuthHeader(),
        credentials: 'include',
        body: JSON.stringify(soalData),
      });
      return handleResponse(response);
    } catch (error) {
      console.error("Error adding soal:", error);
      throw error;
    }
  },

  updateSoal: async (id, data) => {
    try {
      // Ensure options is properly formatted as JSON string
      let optionsJson;
      if (typeof data.options === 'string') {
        optionsJson = data.options;
      } else if (data.options && typeof data.options === 'object') {
        optionsJson = JSON.stringify(data.options);
      } else if (data.options_json) {
        optionsJson = data.options_json;
      } else {
        throw new Error('Options data is required');
      }

      const soalData = {
        question: data.question,
        options_json: optionsJson,
        correct_answer: data.correct_answer,
        kuis_id: parseInt(data.kuis_id),
      };

      const response = await fetch(`${BASE_URL}/soal/update-soal/${id}`, {
        method: "PATCH",
        headers: getAuthHeader(),
        credentials: 'include',
        body: JSON.stringify(soalData),
      });
      return await handleResponse(response);
    } catch (error) {
      console.error("Error in updateSoal:", error);
      throw error;
    }
  },

  deleteSoal: async (id) => {
    try {
      const response = await fetch(`${BASE_URL}/soal/delete-soal/${id}`, {
        method: "DELETE",
        headers: getAuthHeader(),
        credentials: 'include',
      });
      return handleResponse(response);
    } catch (error) {
      console.error("Error deleting soal:", error);
      throw error;
    }
  },

  // Hasil Kuis
  submitJawaban: async (answers) => {
    try {
      // Format answers according to backend SoalAnswer model
      const formattedAnswers = answers.map((answer) => ({
        Soal_id: parseInt(answer.soal_id),      // Backend expects Soal_id
        Answer: answer.selected_answer,         // Backend expects Answer
        User_id: parseInt(answer.user_id),      // Backend expects User_id
      }));

      const response = await fetch(`${BASE_URL}/hasil-kuis/submit-jawaban`, {
        method: "POST",
        headers: getAuthHeader(),
        credentials: 'include',
        body: JSON.stringify(formattedAnswers),  // Send array directly, not wrapped in object
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Gagal mengirim jawaban");
      }
      return data;
    } catch (error) {
      console.error("Error dalam submitJawaban:", error);
      throw error;
    }
  },
};
