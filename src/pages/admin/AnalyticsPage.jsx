import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { getGradeFromScore, getGradeColor, getScoreColor, getConsistentScoreInfo } from '../../utils/gradeUtils';

const BASE_URL = import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "/api" : "https://brainquiz0.up.railway.app");

const AnalyticsPage = () => {
  const [analytics, setAnalytics] = useState({
    totalQuizzes: 0,
    completedQuizzes: 0,
    averageScore: 0,
    categoryStats: [],
    recentResults: [],
    performanceTrend: []
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('all');

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
    if (userId) {
      fetchAnalytics();
    }
  }, [userId, timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // OPTIMIZED: Fetch all required data including hasil kuis in single call
      const [kuisRes, kategoriRes, hasilRes] = await Promise.all([
        api.getKuis(),
        api.getKategori(),
        api.getMyHasilKuis()
      ]);

      if (kuisRes.success && kategoriRes.success) {
        await calculateAnalytics(kuisRes.data, kategoriRes.data, hasilRes.success ? hasilRes.data : []);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAnalytics = async (allKuis, allKategori, hasilKuisList) => {
    let completedQuizzes = 0;
    let totalScore = 0;
    let categoryStats = {};
    let recentResults = [];

    // Initialize category stats
    allKategori.forEach(kategori => {
      categoryStats[kategori.ID] = {
        name: kategori.name,
        total: 0,
        completed: 0,
        totalScore: 0,
        averageScore: 0
      };
    });

    // Count total quizzes per category
    allKuis.forEach(kuis => {
      if (categoryStats[kuis.kategori_id]) {
        categoryStats[kuis.kategori_id].total++;
      }
    });

    // OPTIMIZED: Process results from single API call
    for (const hasil of hasilKuisList) {
      try {
        // Find the corresponding quiz
        const kuis = allKuis.find(k => k.ID === hasil.kuis_id);
        if (!kuis) continue;

        completedQuizzes++;
        const rawScore = hasil.score || 0;
        const correctAnswers = hasil.correct_answer || 0;

        // Get question count for this quiz
        let questionCount = 1; // Default fallback
        try {
          const soalRes = await api.getSoalByKuisID(kuis.ID);
          questionCount = soalRes.success ? soalRes.data.length : 1;
        } catch (soalError) {
          console.warn(`Failed to get question count for quiz ${kuis.ID}:`, soalError.message);
        }

        // Get consistent score info
        const scoreInfo = getConsistentScoreInfo(rawScore, correctAnswers, questionCount);

        totalScore += scoreInfo.score;

        // Add to category stats
        if (categoryStats[kuis.kategori_id]) {
          categoryStats[kuis.kategori_id].completed++;
          categoryStats[kuis.kategori_id].totalScore += scoreInfo.score;
        }

        // Add to recent results
        recentResults.push({
          kuisTitle: kuis.title,
          score: scoreInfo.score,
          correctAnswers: correctAnswers,
          date: hasil.updated_at || hasil.UpdatedAt || new Date().toISOString(),
          kategori: allKategori.find(k => k.ID === kuis.kategori_id)?.name || 'Unknown'
        });

        // Small delay to prevent overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error) {
        console.error(`Error processing quiz result ${hasil.kuis_id}:`, error);
        // Continue with next result
      }
    }

    // Calculate category averages
    Object.keys(categoryStats).forEach(categoryId => {
      const stat = categoryStats[categoryId];
      if (stat.completed > 0) {
        stat.averageScore = Math.round(stat.totalScore / stat.completed);
      }
    });

    // Sort recent results by date
    recentResults.sort((a, b) => new Date(b.date) - new Date(a.date));
    recentResults = recentResults.slice(0, 10); // Keep only 10 most recent

    setAnalytics({
      totalQuizzes: allKuis.length,
      completedQuizzes,
      averageScore: completedQuizzes > 0 ? Math.round(totalScore / completedQuizzes) : 0,
      categoryStats: Object.values(categoryStats).filter(stat => stat.total > 0),
      recentResults,
      performanceTrend: generatePerformanceTrend(recentResults)
    });
  };

  const generatePerformanceTrend = (results) => {
    // Group results by week for trend analysis
    const weeklyData = {};
    
    results.forEach(result => {
      const date = new Date(result.date);
      const weekKey = `${date.getFullYear()}-W${Math.ceil(date.getDate() / 7)}`;
      
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = { totalScore: 0, count: 0 };
      }
      
      weeklyData[weekKey].totalScore += result.score;
      weeklyData[weekKey].count++;
    });

    return Object.entries(weeklyData).map(([week, data]) => ({
      week,
      averageScore: Math.round(data.totalScore / data.count)
    })).slice(-8); // Last 8 weeks
  };

  const getCompletionPercentage = () => {
    if (analytics.totalQuizzes === 0) return 0;
    return Math.round((analytics.completedQuizzes / analytics.totalQuizzes) * 100);
  };

  // Use utility functions for consistent grade calculation

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Menganalisis data Anda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8">
      {/* Header */}
      <div className="mb-8 animate-fade-in">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">
          📊 Analytics Dashboard
        </h1>
        <p className="text-xl text-slate-600 font-medium">
          Analisis mendalam performa belajar Anda
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 animate-slide-up">
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <span className="text-white text-xl">📝</span>
            </div>
            <span className="text-2xl font-bold text-slate-800">{analytics.completedQuizzes}</span>
          </div>
          <h3 className="font-semibold text-slate-700 mb-1">Kuis Diselesaikan</h3>
          <p className="text-sm text-slate-500">dari {analytics.totalQuizzes} total kuis</p>
          <div className="mt-3 bg-slate-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${getCompletionPercentage()}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center">
              <span className="text-white text-xl">🎯</span>
            </div>
            <span className={`text-2xl font-bold ${getScoreColor(analytics.averageScore)}`}>
              {analytics.averageScore}
            </span>
          </div>
          <h3 className="font-semibold text-slate-700 mb-1">Rata-rata Skor</h3>
          <p className="text-sm text-slate-500">
            Grade: <span className={`font-bold ${getScoreColor(analytics.averageScore)}`}>
              {getGradeFromScore(analytics.averageScore)}
            </span>
          </p>
        </div>

        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
              <span className="text-white text-xl">📈</span>
            </div>
            <span className="text-2xl font-bold text-slate-800">{getCompletionPercentage()}%</span>
          </div>
          <h3 className="font-semibold text-slate-700 mb-1">Progress</h3>
          <p className="text-sm text-slate-500">tingkat penyelesaian</p>
        </div>

        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
              <span className="text-white text-xl">🏆</span>
            </div>
            <span className="text-2xl font-bold text-slate-800">{analytics.categoryStats.length}</span>
          </div>
          <h3 className="font-semibold text-slate-700 mb-1">Kategori Aktif</h3>
          <p className="text-sm text-slate-500">area pembelajaran</p>
        </div>
      </div>

      {/* Category Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg animate-scale-in">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center">
            <span className="mr-3">📊</span>
            Performa per Kategori
          </h2>
          <div className="space-y-4">
            {analytics.categoryStats.map((category, index) => (
              <div key={index} className="border-b border-slate-200 pb-4 last:border-b-0">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold text-slate-700">{category.name}</h3>
                  <span className={`font-bold ${getScoreColor(category.averageScore)}`}>
                    {category.averageScore}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-slate-500 mb-2">
                  <span>{category.completed}/{category.total} kuis</span>
                  <span>Grade: {getGradeFromScore(category.averageScore)}</span>
                </div>
                <div className="bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(category.completed / category.total) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Results */}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg animate-scale-in">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center">
            <span className="mr-3">🕒</span>
            Hasil Terbaru
          </h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {analytics.recentResults.map((result, index) => (
              <div key={index} className="bg-slate-50 rounded-xl p-4 hover:bg-slate-100 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-slate-800 text-sm">{result.kuisTitle}</h3>
                  <span className={`font-bold text-lg ${getScoreColor(result.score)}`}>
                    {result.score}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>{result.kategori}</span>
                  <span>{new Date(result.date).toLocaleDateString('id-ID')}</span>
                </div>
                <div className="mt-2 text-xs text-slate-600">
                  Benar: {result.correctAnswers} jawaban
                </div>
              </div>
            ))}
            {analytics.recentResults.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <span className="text-4xl mb-4 block">📝</span>
                <p>Belum ada hasil kuis</p>
                <p className="text-sm">Mulai mengerjakan kuis untuk melihat analytics</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Performance Trend */}
      {analytics.performanceTrend.length > 0 && (
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg mb-8 animate-bounce-in">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center">
            <span className="mr-3">📈</span>
            Trend Performa
          </h2>
          <div className="flex items-end space-x-4 h-64 overflow-x-auto">
            {analytics.performanceTrend.map((data, index) => (
              <div key={index} className="flex flex-col items-center min-w-16">
                <div
                  className="bg-gradient-to-t from-blue-500 to-indigo-600 rounded-t-lg w-8 transition-all duration-500 hover:from-blue-600 hover:to-indigo-700"
                  style={{ height: `${(data.averageScore / 100) * 200}px` }}
                ></div>
                <div className="mt-2 text-xs text-slate-600 text-center">
                  <div className="font-semibold">{data.averageScore}</div>
                  <div className="text-slate-400">{data.week}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg animate-fade-in">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center">
          <span className="mr-3">💡</span>
          Rekomendasi
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {analytics.averageScore < 70 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <div className="flex items-center mb-2">
                <span className="text-yellow-600 mr-2">⚠️</span>
                <h3 className="font-semibold text-yellow-800">Tingkatkan Skor</h3>
              </div>
              <p className="text-sm text-yellow-700">
                Rata-rata skor Anda masih bisa ditingkatkan. Coba fokus pada kategori dengan skor rendah.
              </p>
            </div>
          )}

          {getCompletionPercentage() < 50 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center mb-2">
                <span className="text-blue-600 mr-2">🎯</span>
                <h3 className="font-semibold text-blue-800">Selesaikan Lebih Banyak</h3>
              </div>
              <p className="text-sm text-blue-700">
                Anda baru menyelesaikan {getCompletionPercentage()}% kuis. Coba selesaikan lebih banyak untuk hasil yang lebih akurat.
              </p>
            </div>
          )}

          {analytics.categoryStats.some(cat => cat.completed === 0) && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <div className="flex items-center mb-2">
                <span className="text-purple-600 mr-2">🔍</span>
                <h3 className="font-semibold text-purple-800">Jelajahi Kategori Baru</h3>
              </div>
              <p className="text-sm text-purple-700">
                Ada kategori yang belum Anda coba. Jelajahi untuk memperluas pengetahuan!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
