import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { getGradeFromScore, getGradeColor, getScoreColor, getConsistentScoreInfo } from '../../utils/gradeUtils';

const BASE_URL = import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "/api" : "https://brainquiz0.up.railway.app");

const LeaderboardPage = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [categories, setCategories] = useState([]);

  const getUserInfo = () => {
    const storedUserId = localStorage.getItem('userId');
    const storedUserName = localStorage.getItem('userName');
    const token = localStorage.getItem('token');
    
    if (storedUserId) {
      return {
        userId: storedUserId,
        userName: storedUserName || 'User'
      };
    }
    
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
    return { userId: null, userName: 'User' };
  };

  const { userId, userName } = getUserInfo();

  useEffect(() => {
    fetchLeaderboard();
  }, [filter]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);

      // OPTIMIZED: Fetch all required data including hasil kuis in single call
      const [kuisRes, kategoriRes, hasilRes] = await Promise.all([
        api.getKuis(),
        api.getKategori(),
        api.getMyHasilKuis()
      ]);

      if (kuisRes.success && kategoriRes.success) {
        setCategories(kategoriRes.data);
        await calculateLeaderboard(kuisRes.data, kategoriRes.data, hasilRes.success ? hasilRes.data : []);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateLeaderboard = async (allKuis, allKategori, hasilKuisList) => {
    // Filter quizzes by category if needed
    const filteredKuis = filter === 'all'
      ? allKuis
      : allKuis.filter(kuis => kuis.kategori_id === parseInt(filter));

    // OPTIMIZED: Only show current user's performance using single API call data
    const userStats = {
      name: userName,
      totalScore: 0,
      completedQuizzes: 0,
      averageScore: 0,
      correctAnswers: 0,
      totalQuestions: 0,
      accuracy: 0,
      quizDetails: []
    };

    // Create a map of quiz results by kuis_id for quick lookup
    const hasilMap = new Map();
    hasilKuisList.forEach(hasil => {
      hasilMap.set(hasil.kuis_id, hasil);
    });

    // OPTIMIZED: Process results from single API call
    for (const kuis of filteredKuis) {
      try {
        // Check if user has completed this quiz
        const hasilKuis = hasilMap.get(kuis.ID);

        if (hasilKuis) {
          // Get number of questions in this quiz
          let questionCount = 1; // Default fallback
          try {
            const soalRes = await api.getSoalByKuisID(kuis.ID);
            questionCount = soalRes.success ? soalRes.data.length : 1;
          } catch (soalError) {
            console.warn(`Failed to get question count for quiz ${kuis.ID}:`, soalError.message);
          }

          const rawScore = hasilKuis.score || 0;
          const correctAnswers = hasilKuis.correct_answer || 0;

          // Get consistent score info
          const scoreInfo = getConsistentScoreInfo(rawScore, correctAnswers, questionCount);

          userStats.totalScore += scoreInfo.score;
          userStats.completedQuizzes++;
          userStats.correctAnswers += correctAnswers;
          userStats.totalQuestions += questionCount;

          // Store quiz details for analysis
          userStats.quizDetails.push({
            kuisTitle: kuis.title,
            kategoriName: allKategori.find(k => k.ID === kuis.kategori_id)?.name || 'Unknown',
            score: scoreInfo.score,
            correctAnswers: correctAnswers,
            totalQuestions: questionCount,
            accuracy: scoreInfo.percentage,
            date: hasilKuis.updated_at || hasilKuis.UpdatedAt || new Date().toISOString()
          });

          // Small delay to prevent overwhelming the server
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      } catch (error) {
        console.error(`Error processing quiz ${kuis.ID}:`, error);
        // Continue with next quiz
      }
    }

    // Calculate averages and accuracy
    if (userStats.completedQuizzes > 0) {
      userStats.averageScore = Math.round(userStats.totalScore / userStats.completedQuizzes);
      userStats.accuracy = userStats.totalQuestions > 0
        ? Math.round((userStats.correctAnswers / userStats.totalQuestions) * 100)
        : 0;
    }

    // Sort quiz details by score (best first)
    userStats.quizDetails.sort((a, b) => b.score - a.score);

    // For leaderboard, we only show current user
    const personalLeaderboard = userStats.completedQuizzes > 0 ? [
      {
        id: userId,
        name: userName,
        totalScore: userStats.totalScore,
        completedQuizzes: userStats.completedQuizzes,
        averageScore: userStats.averageScore,
        correctAnswers: userStats.correctAnswers,
        totalQuestions: userStats.totalQuestions,
        accuracy: userStats.accuracy,
        quizDetails: userStats.quizDetails
      }
    ] : [];

    setLeaderboard(personalLeaderboard);

    // Set current user stats
    if (personalLeaderboard.length > 0) {
      setUserStats({
        ...personalLeaderboard[0],
        rank: 1 // Always rank 1 since it's personal view
      });
    }
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const getRankColor = (rank) => {
    if (rank === 1) return 'text-yellow-600 bg-yellow-50';
    if (rank === 2) return 'text-gray-600 bg-gray-50';
    if (rank === 3) return 'text-orange-600 bg-orange-50';
    return 'text-slate-600 bg-slate-50';
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Memuat leaderboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8">
      {/* Header */}
      <div className="mb-8 animate-fade-in">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">
          🏆 Performance Dashboard
        </h1>
        <p className="text-xl text-slate-600 font-medium">
          Analisis mendalam performa kuis Anda
        </p>
      </div>

      {/* Filter */}
      <div className="mb-8">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl font-semibold transition-all duration-200 ${
              filter === 'all'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white/60 text-slate-700 hover:bg-white/80'
            }`}
          >
            Semua Kategori
          </button>
          {categories.map(category => (
            <button
              key={category.ID}
              onClick={() => setFilter(category.ID.toString())}
              className={`px-4 py-2 rounded-xl font-semibold transition-all duration-200 ${
                filter === category.ID.toString()
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white/60 text-slate-700 hover:bg-white/80'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* User Stats Card */}
      {userStats && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 mb-8 text-white animate-scale-in">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">Ringkasan Performa Anda</h2>
              <div className="flex items-center space-x-6">
                <div className="text-center">
                  <div className="text-3xl font-bold">{userStats.totalScore}</div>
                  <div className="text-sm opacity-80">Total Skor</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">{userStats.completedQuizzes}</div>
                  <div className="text-sm opacity-80">Kuis Selesai</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">{userStats.averageScore}</div>
                  <div className="text-sm opacity-80">Rata-rata Skor</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">{userStats.accuracy}%</div>
                  <div className="text-sm opacity-80">Akurasi</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">{userStats.correctAnswers}</div>
                  <div className="text-sm opacity-80">Jawaban Benar</div>
                </div>
              </div>
            </div>
            <div className="text-6xl opacity-20">📊</div>
          </div>
        </div>
      )}

      {/* Quiz Performance Details */}
      <div className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden animate-slide-up">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-800">
            Detail Performa Kuis
            {filter !== 'all' && (
              <span className="text-lg font-normal text-slate-600 ml-2">
                - {categories.find(c => c.ID.toString() === filter)?.name}
              </span>
            )}
          </h2>
        </div>

        <div className="divide-y divide-slate-200">
          {userStats && userStats.quizDetails && userStats.quizDetails.map((quiz, index) => (
            <div
              key={index}
              className="p-6 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${getRankColor(index + 1)}`}>
                    #{index + 1}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">
                      {quiz.kuisTitle}
                    </h3>
                    <p className="text-slate-600 text-sm">
                      {quiz.kategoriName} • {new Date(quiz.date).toLocaleDateString('id-ID')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-6">
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${getScoreColor(quiz.score)}`}>
                      {quiz.score}
                    </div>
                    <div className="text-xs text-slate-500">Skor</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {quiz.correctAnswers}/{quiz.totalQuestions}
                    </div>
                    <div className="text-xs text-slate-500">Benar</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {quiz.accuracy}%
                    </div>
                    <div className="text-xs text-slate-500">Akurasi</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-lg font-bold ${getScoreColor(quiz.score)}`}>
                      {getGradeFromScore(quiz.score)}
                    </div>
                    <div className="text-xs text-slate-500">Grade</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {(!userStats || !userStats.quizDetails || userStats.quizDetails.length === 0) && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">
              Belum Ada Data Performa
            </h3>
            <p className="text-slate-600 mb-6">
              Mulai mengerjakan kuis untuk melihat detail performa Anda!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaderboardPage;
