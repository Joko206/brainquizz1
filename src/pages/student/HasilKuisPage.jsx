import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getConsistentScoreInfo } from '../../utils/gradeUtils';

// Use the same BASE_URL logic as other components
const BASE_URL = import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "/api" : "https://brainquiz0.up.railway.app");

const HasilKuisPage = () => {
  const [hasilKuisList, setHasilKuisList] = useState([]);
  const [kuisList, setKuisList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredHasil, setFilteredHasil] = useState([]);
  const navigate = useNavigate();

  // Get user info
  const getUserInfo = () => {
    const storedUserId = localStorage.getItem('userId');
    const storedUserName = localStorage.getItem('userName');
    
    if (storedUserId) {
      return {
        userId: storedUserId,
        userName: storedUserName || 'User'
      };
    }
    
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return {
          userId: payload.iss || payload.user_id || payload.id || payload.sub,
          userName: payload.name || storedUserName || 'User'
        };
      } catch (error) {
        console.error('Error decoding token:', error);
      }
    }
    
    return {
      userId: null,
      userName: storedUserName || 'User'
    };
  };

  const { userId, userName } = getUserInfo();

  useEffect(() => {
    if (userId) {
      fetchKuis();
    }
  }, [userId]);

  useEffect(() => {
    filterHasil();
  }, [hasilKuisList, searchTerm]);

  const fetchKuis = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BASE_URL}/kuis/get-kuis`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        const kuis = data.data || [];
        setKuisList(kuis);
        
        // Fetch hasil untuk setiap kuis
        await fetchHasilKuis(kuis);
      }
    } catch (error) {
      console.error('Error fetching kuis:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHasilKuis = async (kuisList) => {
    const token = localStorage.getItem('token');

    // Process quizzes in smaller batches to avoid overwhelming the server
    const batchSize = 3;
    const hasil = [];

    for (let i = 0; i < kuisList.length; i += batchSize) {
      const batch = kuisList.slice(i, i + batchSize);

      const batchPromises = batch.map(async (kuis) => {
        try {
          // Add delay between requests to prevent server overload
          await new Promise(resolve => setTimeout(resolve, Math.random() * 500));

          // First, get the number of questions for this quiz
          let questionCount = 1; // Default fallback
          try {
            const soalResponse = await fetch(`${BASE_URL}/soal/get-soal/${kuis.ID}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              credentials: 'include',
            });
            if (soalResponse.ok) {
              const soalData = await soalResponse.json();
              questionCount = soalData.data ? soalData.data.length : 1;
            }
          } catch (soalError) {
            console.warn(`Failed to get question count for quiz ${kuis.ID}:`, soalError.message);
            questionCount = 1;
          }

          // Then get the quiz result with better error handling
          try {
            const response = await fetch(`${BASE_URL}/hasil-kuis/${userId}/${kuis.ID}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              credentials: 'include',
            });

            if (response.ok) {
              const data = await response.json();
              return {
                ...data.data,
                kuis: { ...kuis, soal_count: questionCount },
                hasResult: true
              };
            } else if (response.status === 404) {
              // Quiz not completed by user - no result available
              return {
                kuis: { ...kuis, soal_count: questionCount },
                hasResult: false,
                score: 0,
                correct_answer: 0
              };
            } else {
              console.warn(`HTTP ${response.status} for quiz ${kuis.ID}:`, response.statusText);
              return {
                kuis: { ...kuis, soal_count: questionCount },
                hasResult: false,
                score: 0,
                correct_answer: 0,
                error: `HTTP ${response.status}`
              };
            }
          } catch (resultError) {
            console.warn(`Failed to get result for quiz ${kuis.ID}:`, resultError.message);
            return {
              kuis: { ...kuis, soal_count: questionCount },
              hasResult: false,
              score: 0,
              correct_answer: 0,
              error: resultError.message
            };
          }
        } catch (error) {
          console.error(`Error processing quiz ${kuis.ID}:`, error);
          return {
            kuis: { ...kuis, soal_count: 1 },
            hasResult: false,
            score: 0,
            correct_answer: 0,
            error: error.message
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      hasil.push(...batchResults);

      // Add delay between batches
      if (i + batchSize < kuisList.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    setHasilKuisList(hasil);
  };

  const filterHasil = () => {
    let filtered = hasilKuisList;

    if (searchTerm) {
      filtered = filtered.filter(hasil => 
        hasil.kuis.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        hasil.kuis.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredHasil(filtered);
  };

  // This function is no longer needed - using getConsistentScoreInfo instead

  const calculateStats = () => {
    const completedQuizzes = filteredHasil.filter(h => h.hasResult);
    const totalScore = completedQuizzes.reduce((sum, h) => sum + h.score, 0);
    const averageScore = completedQuizzes.length > 0 ? totalScore / completedQuizzes.length : 0;
    
    return {
      totalQuizzes: filteredHasil.length,
      completedQuizzes: completedQuizzes.length,
      averageScore: averageScore.toFixed(1)
    };
  };

  const stats = calculateStats();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Memuat hasil kuis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8 animate-fade-in pt-16 lg:pt-0">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">
          Hasil Kuis 📊
        </h1>
        <p className="text-base sm:text-lg lg:text-xl text-slate-600 font-medium leading-relaxed max-w-3xl">
          Lihat semua hasil kuis yang telah Anda kerjakan dan pantau perkembangan belajar Anda.
        </p>
        {/* User Info */}
        {userId && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
            <strong>User:</strong> {userName} (ID: {userId})
          </div>
        )}
      </div>

      {/* Search */}
      <div className="mb-6 sm:mb-8 animate-slide-up">
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 sm:p-6 shadow-lg">
          <div className="relative max-w-md mx-auto sm:mx-0">
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Cari hasil kuis..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/80 backdrop-blur-sm text-sm sm:text-base"
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8 animate-scale-in">
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 sm:p-6 shadow-lg">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-semibold text-slate-600">Total Kuis</p>
              <p className="text-xl sm:text-2xl font-bold text-slate-800">{stats.totalQuizzes}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 sm:p-6 shadow-lg">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-semibold text-slate-600">Selesai</p>
              <p className="text-xl sm:text-2xl font-bold text-slate-800">{stats.completedQuizzes}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 sm:p-6 shadow-lg">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-semibold text-slate-600">Rata-rata Skor</p>
              <p className="text-xl sm:text-2xl font-bold text-slate-800">{stats.averageScore}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Hasil Kuis List */}
      <div className="space-y-6 animate-bounce-in">
        {filteredHasil.map((hasil, index) => {
          // Get consistent score info for both legacy and new data
          const scoreInfo = getConsistentScoreInfo(
            hasil.score,
            hasil.correct_answer || 0,
            hasil.kuis?.soal_count || 1 // Now we have the actual question count
          );
          
          return (
            <div
              key={hasil.kuis.ID}
              className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-xl transition-all duration-300 animate-scale-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Mobile-first responsive layout */}
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between space-y-4 lg:space-y-0">
                {/* Content Section */}
                <div className="flex-1">
                  <div className="flex items-start space-x-3 sm:space-x-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg sm:text-xl font-bold text-slate-800 mb-2 break-words">{hasil.kuis.title}</h3>
                      <p className="text-sm sm:text-base text-slate-600 mb-3 sm:mb-4 break-words">{hasil.kuis.description}</p>

                      <div className="flex flex-wrap gap-2 mb-3 sm:mb-4">
                        {hasil.kuis.Kategori && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                            {hasil.kuis.Kategori.name}
                          </span>
                        )}
                        {hasil.kuis.Tingkatan && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                            {hasil.kuis.Tingkatan.name}
                          </span>
                        )}
                        {hasil.kuis.Kelas && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded-full">
                            {hasil.kuis.Kelas.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Section - Responsive */}
                <div className="lg:ml-6 lg:text-right w-full lg:w-auto lg:flex-shrink-0">
                  {hasil.hasResult ? (
                    <div className="space-y-3">
                      {/* Score Badge - Responsive */}
                      <div className={`inline-flex items-center px-3 sm:px-4 py-2 rounded-xl font-bold text-sm sm:text-base ${scoreInfo.color} w-full lg:w-auto justify-center lg:justify-start`}>
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="truncate">Skor: {scoreInfo.score}%</span>
                      </div>

                      {/* Stats - Mobile Friendly */}
                      <div className="text-xs sm:text-sm text-slate-600 space-y-1">
                        <div className="flex items-center justify-center lg:justify-end space-x-2">
                          <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Benar: {scoreInfo.correctAnswers}</span>
                        </div>
                        <div className="flex items-center justify-center lg:justify-end space-x-2">
                          <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                          <span>Grade: {scoreInfo.grade}</span>
                        </div>
                      </div>

                      {/* Button - Full width on mobile */}
                      <button
                        onClick={() => navigate(`/hasil-kuis/${hasil.kuis.ID}/detail`)}
                        className="btn-outline text-sm px-3 py-2 w-full lg:w-auto lg:px-4"
                      >
                        Lihat Detail
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Status Badge - Responsive */}
                      <div className="inline-flex items-center px-3 sm:px-4 py-2 rounded-xl font-bold bg-slate-100 text-slate-600 text-sm sm:text-base w-full lg:w-auto justify-center lg:justify-start">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="truncate">Belum Dikerjakan</span>
                      </div>

                      {/* Button - Full width on mobile */}
                      <button
                        onClick={() => navigate(`/kuis/${hasil.kuis.ID}/jawab`)}
                        className="btn-primary text-sm px-4 py-2 w-full lg:w-auto"
                      >
                        Kerjakan Sekarang
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredHasil.length === 0 && (
        <div className="text-center py-16 animate-fade-in">
          <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Belum ada hasil kuis</h3>
          <p className="text-slate-600 mb-6">
            Mulai kerjakan kuis untuk melihat hasil Anda di sini.
          </p>
          <button
            onClick={() => navigate('/ambil-kuis')}
            className="btn-primary"
          >
            Ambil Kuis Sekarang
          </button>
        </div>
      )}
    </div>
  );
};

export default HasilKuisPage;
