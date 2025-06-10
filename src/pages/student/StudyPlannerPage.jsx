import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { getConsistentScoreInfo } from '../../utils/gradeUtils';

const BASE_URL = import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "/api" : "https://brainquiz0.up.railway.app");

const StudyPlannerPage = () => {
  const [studyPlan, setStudyPlan] = useState({
    dailyGoal: 2,
    weeklyGoal: 10,
    currentStreak: 0,
    longestStreak: 0,
    todayProgress: 0,
    weekProgress: 0,
    totalCompleted: 0,
    averageScore: 0,
    needsReview: 0,
    perfectScores: 0
  });
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [plannedQuizzes, setPlannedQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);

  const getUserInfo = () => {
    const storedUserId = localStorage.getItem('userId');
    const token = localStorage.getItem('token');
    
    if (storedUserId) return storedUserId;
    
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.iss || payload.user_id || payload.id || payload.sub;
      } catch (error) {
        console.error('Error decoding token:', error);
      }
    }
    return null;
  };

  const userId = getUserInfo();

  useEffect(() => {
    // Load saved goals from localStorage
    const savedGoals = localStorage.getItem(`studyGoals_${userId}`);
    if (savedGoals) {
      const goals = JSON.parse(savedGoals);
      setStudyPlan(prev => ({
        ...prev,
        dailyGoal: goals.dailyGoal || 2,
        weeklyGoal: goals.weeklyGoal || 10
      }));
    }

    if (userId) {
      fetchStudyData();
    }
  }, [userId]);

  const fetchStudyData = async () => {
    try {
      setLoading(true);

      // OPTIMIZED: Fetch categories, quizzes, and hasil kuis in parallel
      const [kategoriRes, kuisRes, hasilRes] = await Promise.all([
        api.getKategori(),
        api.getKuis(),
        api.getMyHasilKuis()
      ]);

      if (kategoriRes.success && kuisRes.success) {
        setCategories(kategoriRes.data);
        await calculateStudyProgress(kuisRes.data, hasilRes.success ? hasilRes.data : []);
        generateStudyPlan(kuisRes.data, kategoriRes.data, hasilRes.success ? hasilRes.data : []);
      }
    } catch (error) {
      console.error('Error fetching study data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStudyProgress = async (allKuis, hasilKuisList) => {
    const today = new Date();
    const thisWeekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());

    let todayCompleted = 0;
    let weekCompleted = 0;
    let completedDates = [];
    let totalQuizzesCompleted = 0;
    let totalScore = 0;
    let needsReview = 0;
    let perfectScores = 0;

    // OPTIMIZED: Process results from single API call
    for (const hasil of hasilKuisList) {
      try {
        // Parse completion date from CreatedAt
        const completionDate = new Date(hasil.CreatedAt || hasil.created_at || new Date());
        completedDates.push(completionDate);
        totalQuizzesCompleted++;

        // Calculate score statistics
        const score = hasil.score || 0;
        totalScore += score;

        if (score === 100) {
          perfectScores++;
        }

        if (score < 80) {
          needsReview++;
        }

        // Check if completed today
        if (completionDate.toDateString() === today.toDateString()) {
          todayCompleted++;
        }

        // Check if completed this week
        if (completionDate >= thisWeekStart) {
          weekCompleted++;
        }

        // Small delay to prevent overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error) {
        console.error(`Error processing quiz result ${hasil.kuis_id}:`, error);
        // Continue with next result
      }
    }

    // Calculate streak based on completion dates
    const { currentStreak, longestStreak } = calculateStreaks(completedDates);
    const averageScore = totalQuizzesCompleted > 0 ? Math.round(totalScore / totalQuizzesCompleted) : 0;

    setStudyPlan(prev => ({
      ...prev,
      todayProgress: todayCompleted,
      weekProgress: weekCompleted,
      currentStreak: currentStreak,
      longestStreak: longestStreak,
      totalCompleted: totalQuizzesCompleted,
      averageScore: averageScore,
      needsReview: needsReview,
      perfectScores: perfectScores
    }));
  };

  const calculateStreaks = (completedDates) => {
    if (completedDates.length === 0) {
      return { currentStreak: 0, longestStreak: 0 };
    }

    // Sort dates in descending order (newest first)
    const sortedDates = completedDates
      .map(date => new Date(date.getFullYear(), date.getMonth(), date.getDate()))
      .sort((a, b) => b - a);

    // Remove duplicates (same day completions)
    const uniqueDates = [...new Set(sortedDates.map(d => d.getTime()))].map(t => new Date(t));

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate current streak
    for (let i = 0; i < uniqueDates.length; i++) {
      const date = uniqueDates[i];
      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() - i);

      if (date.getTime() === expectedDate.getTime()) {
        currentStreak++;
      } else {
        break;
      }
    }

    // Calculate longest streak
    for (let i = 0; i < uniqueDates.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const currentDate = uniqueDates[i];
        const previousDate = uniqueDates[i - 1];
        const dayDiff = (previousDate - currentDate) / (1000 * 60 * 60 * 24);

        if (dayDiff === 1) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    return { currentStreak, longestStreak };
  };

  const generateStudyPlan = async (allKuis, allKategori, hasilKuisList) => {
    // OPTIMIZED: Create completion status from single API call data
    const quizCompletionStatus = {};
    hasilKuisList.forEach(hasil => {
      quizCompletionStatus[hasil.kuis_id] = hasil;
    });

    // Filter quizzes based on selected category
    const filteredKuis = selectedCategory === 'all'
      ? allKuis
      : allKuis.filter(kuis => kuis.kategori_id === parseInt(selectedCategory));

    // Separate completed and uncompleted quizzes
    const uncompletedQuizzes = filteredKuis.filter(kuis => !quizCompletionStatus[kuis.ID]);
    const completedQuizzes = filteredKuis.filter(kuis => quizCompletionStatus[kuis.ID]);

    // Prioritize uncompleted quizzes, then add some completed ones for review
    const prioritizedQuizzes = [
      ...uncompletedQuizzes,
      ...completedQuizzes.filter(kuis => {
        const result = quizCompletionStatus[kuis.ID];
        return result && result.score < 80; // Add low-scoring quizzes for review
      })
    ];

    const daysOfWeek = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const plannedQuizzes = [];
    const today = new Date().getDay();

    daysOfWeek.forEach((day, index) => {
      let dayQuizzes = [];

      if (index === today) {
        // Today: Recommend 2-3 quizzes based on daily goal
        const recommendedCount = Math.min(studyPlan.dailyGoal, prioritizedQuizzes.length);
        dayQuizzes = prioritizedQuizzes.slice(0, recommendedCount);
      } else if (index > today) {
        // Future days: Plan ahead with uncompleted quizzes
        const startIndex = (index - today) * 2;
        const endIndex = startIndex + 2;
        dayQuizzes = prioritizedQuizzes.slice(startIndex, endIndex);
      } else {
        // Past days: Show what was actually completed
        dayQuizzes = completedQuizzes
          .filter(kuis => {
            const result = quizCompletionStatus[kuis.ID];
            if (!result) return false;
            const completionDate = new Date(result.CreatedAt);
            return completionDate.getDay() === index;
          })
          .slice(0, 3);
      }

      const mappedQuizzes = dayQuizzes.map(kuis => {
        const completion = quizCompletionStatus[kuis.ID];
        return {
          ...kuis,
          kategoriName: allKategori.find(k => k.ID === kuis.kategori_id)?.name || 'Unknown',
          completed: !!completion,
          score: completion ? completion.score : null,
          needsReview: completion && completion.score < 80
        };
      });

      plannedQuizzes.push({
        day,
        dayIndex: index,
        isToday: index === today,
        isPast: index < today,
        isFuture: index > today,
        quizzes: mappedQuizzes
      });
    });

    setPlannedQuizzes(plannedQuizzes);
  };

  // OPTIMIZED: This function is no longer needed as we get data from single API call
  const getQuizCompletionStatus = async (allKuis, token) => {
    // This function is kept for backward compatibility but not used
    // Data is now processed from hasilKuisList in generateStudyPlan
    return {};
  };

  const updateGoal = (type, value) => {
    const newValue = Math.max(1, Math.min(20, value)); // Limit between 1-20

    setStudyPlan(prev => {
      const newPlan = {
        ...prev,
        [type]: newValue
      };

      // Save goals to localStorage
      localStorage.setItem(`studyGoals_${userId}`, JSON.stringify({
        dailyGoal: type === 'dailyGoal' ? newValue : prev.dailyGoal,
        weeklyGoal: type === 'weeklyGoal' ? newValue : prev.weeklyGoal
      }));

      return newPlan;
    });
  };

  const getProgressPercentage = (current, goal) => {
    return Math.min(100, Math.round((current / goal) * 100));
  };

  const getStreakIcon = (streak) => {
    if (streak >= 30) return '🔥';
    if (streak >= 14) return '⚡';
    if (streak >= 7) return '🌟';
    if (streak >= 3) return '💪';
    return '🎯';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Menyiapkan rencana belajar Anda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8">
      {/* Header */}
      <div className="mb-8 animate-fade-in">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">
          📅 Study Planner
        </h1>
        <p className="text-xl text-slate-600 font-medium">
          Rencanakan dan pantau progress belajar Anda dengan data real-time
        </p>

        {/* Quick Actions */}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={() => window.location.href = '/ambil-kuis'}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1"
          >
            🎯 Mulai Kuis Sekarang
          </button>
          <button
            onClick={() => window.location.href = '/hasil-kuis'}
            className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1"
          >
            📊 Lihat Hasil
          </button>
          <button
            onClick={() => window.location.href = '/achievements'}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1"
          >
            🏆 Achievements
          </button>
        </div>
      </div>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg animate-scale-in">
          <div className="text-center">
            <div className="text-3xl mb-2">📊</div>
            <div className="text-2xl font-bold text-blue-600">{studyPlan.totalCompleted}</div>
            <p className="text-sm font-semibold text-slate-600">Total Kuis Selesai</p>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg animate-scale-in">
          <div className="text-center">
            <div className="text-3xl mb-2">⭐</div>
            <div className="text-2xl font-bold text-green-600">{studyPlan.averageScore}%</div>
            <p className="text-sm font-semibold text-slate-600">Rata-rata Skor</p>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg animate-scale-in">
          <div className="text-center">
            <div className="text-3xl mb-2">💎</div>
            <div className="text-2xl font-bold text-purple-600">{studyPlan.perfectScores}</div>
            <p className="text-sm font-semibold text-slate-600">Skor Sempurna</p>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg animate-scale-in">
          <div className="text-center">
            <div className="text-3xl mb-2">📚</div>
            <div className="text-2xl font-bold text-orange-600">{studyPlan.needsReview}</div>
            <p className="text-sm font-semibold text-slate-600">Perlu Review</p>
          </div>
        </div>
      </div>

      {/* Goals & Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Daily & Weekly Goals */}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg animate-scale-in">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center">
            <span className="mr-3">🎯</span>
            Target Belajar
          </h2>
          
          <div className="space-y-6">
            {/* Daily Goal */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-semibold text-slate-700">Target Harian</label>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => updateGoal('dailyGoal', studyPlan.dailyGoal - 1)}
                    className="w-8 h-8 bg-slate-200 rounded-lg flex items-center justify-center hover:bg-slate-300 transition-colors"
                  >
                    -
                  </button>
                  <span className="w-12 text-center font-bold text-lg">{studyPlan.dailyGoal}</span>
                  <button
                    onClick={() => updateGoal('dailyGoal', studyPlan.dailyGoal + 1)}
                    className="w-8 h-8 bg-slate-200 rounded-lg flex items-center justify-center hover:bg-slate-300 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="bg-slate-200 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${getProgressPercentage(studyPlan.todayProgress, studyPlan.dailyGoal)}%` }}
                ></div>
              </div>
              <p className="text-sm text-slate-600 mt-2">
                {studyPlan.todayProgress} / {studyPlan.dailyGoal} kuis hari ini
              </p>
            </div>

            {/* Weekly Goal */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-semibold text-slate-700">Target Mingguan</label>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => updateGoal('weeklyGoal', studyPlan.weeklyGoal - 1)}
                    className="w-8 h-8 bg-slate-200 rounded-lg flex items-center justify-center hover:bg-slate-300 transition-colors"
                  >
                    -
                  </button>
                  <span className="w-12 text-center font-bold text-lg">{studyPlan.weeklyGoal}</span>
                  <button
                    onClick={() => updateGoal('weeklyGoal', studyPlan.weeklyGoal + 1)}
                    className="w-8 h-8 bg-slate-200 rounded-lg flex items-center justify-center hover:bg-slate-300 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="bg-slate-200 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-green-500 to-emerald-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${getProgressPercentage(studyPlan.weekProgress, studyPlan.weeklyGoal)}%` }}
                ></div>
              </div>
              <p className="text-sm text-slate-600 mt-2">
                {studyPlan.weekProgress} / {studyPlan.weeklyGoal} kuis minggu ini
              </p>
            </div>
          </div>
        </div>

        {/* Streak Stats */}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg animate-scale-in">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center">
            <span className="mr-3">🔥</span>
            Streak Belajar
          </h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-red-50 rounded-xl border border-orange-200">
              <div className="text-3xl mb-2">{getStreakIcon(studyPlan.currentStreak)}</div>
              <div className="text-2xl font-bold text-orange-600">{studyPlan.currentStreak}</div>
              <div className="text-sm text-orange-700 font-medium">Streak Saat Ini</div>
            </div>
            
            <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-200">
              <div className="text-3xl mb-2">🏆</div>
              <div className="text-2xl font-bold text-purple-600">{studyPlan.longestStreak}</div>
              <div className="text-sm text-purple-700 font-medium">Streak Terpanjang</div>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-blue-800">Motivasi Hari Ini</h3>
                <p className="text-sm text-blue-700">
                  {studyPlan.currentStreak >= 7 
                    ? "Luar biasa! Konsistensi Anda sangat menginspirasi!" 
                    : studyPlan.currentStreak >= 3
                    ? "Bagus! Terus pertahankan momentum belajar!"
                    : "Ayo mulai membangun kebiasaan belajar yang konsisten!"
                  }
                </p>
              </div>
              <div className="text-2xl">{getStreakIcon(studyPlan.currentStreak)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="mb-8">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-xl font-semibold transition-all duration-200 ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white/60 text-slate-700 hover:bg-white/80'
            }`}
          >
            Semua Kategori
          </button>
          {categories.map(category => (
            <button
              key={category.ID}
              onClick={() => setSelectedCategory(category.ID.toString())}
              className={`px-4 py-2 rounded-xl font-semibold transition-all duration-200 ${
                selectedCategory === category.ID.toString()
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white/60 text-slate-700 hover:bg-white/80'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Weekly Planner */}
      <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg animate-bounce-in">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center">
          <span className="mr-3">📅</span>
          Rencana Mingguan
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
          {plannedQuizzes.map((dayPlan, index) => (
            <div
              key={dayPlan.day}
              className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                dayPlan.isToday
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-200 bg-white/40 hover:bg-white/60'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className={`font-bold ${dayPlan.isToday ? 'text-blue-800' : 'text-slate-800'}`}>
                  {dayPlan.day}
                </h3>
                {dayPlan.isToday && (
                  <span className="px-2 py-1 bg-blue-500 text-white text-xs rounded-full">
                    Hari Ini
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {dayPlan.quizzes.map((quiz) => (
                  <div
                    key={quiz.ID}
                    className={`p-3 rounded-lg text-sm transition-all duration-200 cursor-pointer ${
                      quiz.completed
                        ? quiz.needsReview
                          ? 'bg-yellow-100 border border-yellow-300 text-yellow-800 hover:bg-yellow-200'
                          : 'bg-green-100 border border-green-300 text-green-800 hover:bg-green-200'
                        : dayPlan.isToday
                        ? 'bg-blue-100 border border-blue-300 text-blue-800 hover:bg-blue-200'
                        : dayPlan.isFuture
                        ? 'bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                        : 'bg-slate-100 border border-slate-300 text-slate-700 hover:bg-slate-200'
                    }`}
                    onClick={() => {
                      if (dayPlan.isToday || quiz.completed) {
                        window.location.href = `/kuis/${quiz.ID}/jawab`;
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold truncate">{quiz.title}</h4>
                        <div className="flex items-center justify-between">
                          <p className="text-xs opacity-75">{quiz.kategoriName}</p>
                          {quiz.completed && quiz.score !== null && (
                            <span className={`text-xs font-bold ${
                              quiz.score >= 90 ? 'text-green-600' :
                              quiz.score >= 70 ? 'text-blue-600' :
                              'text-orange-600'
                            }`}>
                              {quiz.score}%
                            </span>
                          )}
                        </div>
                        {quiz.needsReview && (
                          <p className="text-xs text-yellow-700 font-medium mt-1">
                            📚 Perlu review
                          </p>
                        )}
                      </div>
                      <div className="ml-2 flex flex-col items-center">
                        {quiz.completed ? (
                          quiz.needsReview ? (
                            <span className="text-yellow-600">⚠️</span>
                          ) : (
                            <span className="text-green-600">✅</span>
                          )
                        ) : dayPlan.isToday ? (
                          <span className="text-blue-600">🎯</span>
                        ) : dayPlan.isFuture ? (
                          <span className="text-indigo-600">📅</span>
                        ) : (
                          <span className="text-slate-400">○</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {dayPlan.quizzes.length === 0 && (
                  <div className="text-center py-4 text-slate-500">
                    <span className="text-2xl block mb-2">😴</span>
                    <span className="text-xs">Hari istirahat</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Smart Recommendations */}
        <div className="mt-6 space-y-4">
          {/* Performance-based recommendations */}
          {studyPlan.averageScore < 70 && studyPlan.totalCompleted > 0 && (
            <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl border border-orange-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-orange-800">💪 Rekomendasi Peningkatan</h3>
                  <p className="text-sm text-orange-700">
                    Rata-rata skor Anda {studyPlan.averageScore}%. Fokus pada review materi dan latihan lebih banyak untuk meningkatkan pemahaman.
                  </p>
                </div>
                <div className="text-2xl">📈</div>
              </div>
            </div>
          )}

          {studyPlan.needsReview > 0 && (
            <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-yellow-800">📚 Review Diperlukan</h3>
                  <p className="text-sm text-yellow-700">
                    Anda memiliki {studyPlan.needsReview} kuis dengan skor di bawah 80%. Pertimbangkan untuk mengulang kuis tersebut.
                  </p>
                </div>
                <div className="text-2xl">⚠️</div>
              </div>
            </div>
          )}

          {studyPlan.currentStreak === 0 && studyPlan.totalCompleted > 0 && (
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-blue-800">🔥 Mulai Streak Baru</h3>
                  <p className="text-sm text-blue-700">
                    Mulai streak belajar baru hari ini! Konsistensi adalah kunci untuk meningkatkan pemahaman.
                  </p>
                </div>
                <div className="text-2xl">🎯</div>
              </div>
            </div>
          )}

          {studyPlan.averageScore >= 90 && studyPlan.totalCompleted >= 5 && (
            <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-green-800">🌟 Performa Excellent!</h3>
                  <p className="text-sm text-green-700">
                    Luar biasa! Rata-rata skor Anda {studyPlan.averageScore}%. Terus pertahankan performa yang konsisten!
                  </p>
                </div>
                <div className="text-2xl">🏆</div>
              </div>
            </div>
          )}

          {/* Default tip */}
          <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-indigo-800">💡 Tips Belajar Efektif</h3>
                <p className="text-sm text-indigo-700">
                  {studyPlan.currentStreak >= 7
                    ? "Streak yang luar biasa! Variasikan topik belajar untuk menjaga motivasi tetap tinggi."
                    : studyPlan.currentStreak >= 3
                    ? "Konsistensi yang bagus! Coba tingkatkan target harian untuk tantangan lebih besar."
                    : "Konsistensi lebih penting daripada intensitas. Belajar sedikit setiap hari lebih efektif."
                  }
                </p>
              </div>
              <div className="text-2xl">
                {studyPlan.currentStreak >= 7 ? "🚀" : studyPlan.currentStreak >= 3 ? "⭐" : "💡"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudyPlannerPage;
