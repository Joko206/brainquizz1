import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { getConsistentScoreInfo } from '../utils/gradeUtils';

const DashboardPage = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalKategori: 0,
    totalTingkatan: 0,
    totalPendidikan: 0,
    totalKelas: 0,
    totalKuis: 0,
    totalSoal: 0,
  });
  const [userStats, setUserStats] = useState({
    completedQuizzes: 0,
    totalScore: 0,
    averageScore: 0,
    accuracy: 0,
    currentStreak: 0,
    achievements: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);

  // Get user info from localStorage directly
  const userName = localStorage.getItem('userName') || 'User';
  const role = localStorage.getItem('userRole') || localStorage.getItem('role') || 'student';

  // Debug role detection (development only)
  if (import.meta.env.DEV) {
    console.log('Dashboard Role Debug:', {
      userRole: localStorage.getItem('userRole'),
      role: localStorage.getItem('role'),
      finalRole: role,
      userName: userName
    });
  }

  useEffect(() => {
    // Fetch dashboard data only once
    fetchDashboardStats();

    // Fetch user stats if we have userId
    const currentUserId = localStorage.getItem('userId');
    if (currentUserId) {
      fetchUserStats();
    }
  }, []);

  // Separate useEffect for timer to avoid interference with navigation
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);

      // Fetch data with parallel requests for better performance
      const [kategoriRes, tingkatanRes, pendidikanRes, kelasRes, kuisRes] = await Promise.allSettled([
        api.getKategori().catch(() => ({ success: false, data: [] })),
        api.getTingkatan().catch(() => ({ success: false, data: [] })),
        api.getPendidikan().catch(() => ({ success: false, data: [] })),
        api.getKelas().catch(() => ({ success: false, data: [] })),
        api.getKuis().catch(() => ({ success: false, data: [] }))
      ]);

      // Count total soal from all kuis
      let totalSoal = 0;
      if (kuisRes.status === 'fulfilled' && kuisRes.value.success && kuisRes.value.data) {
        const soalPromises = kuisRes.value.data.map(async (kuis) => {
          try {
            const soalRes = await api.getSoalByKuisID(kuis.ID || kuis.id);
            return soalRes.success ? soalRes.data.length : 0;
          } catch (error) {
            return 0;
          }
        });

        const soalCounts = await Promise.all(soalPromises);
        totalSoal = soalCounts.reduce((sum, count) => sum + count, 0);
      }

      const finalStats = {
        totalKategori: kategoriRes.status === 'fulfilled' && kategoriRes.value.success ? kategoriRes.value.data.length : 0,
        totalTingkatan: tingkatanRes.status === 'fulfilled' && tingkatanRes.value.success ? tingkatanRes.value.data.length : 0,
        totalPendidikan: pendidikanRes.status === 'fulfilled' && pendidikanRes.value.success ? pendidikanRes.value.data.length : 0,
        totalKelas: kelasRes.status === 'fulfilled' && kelasRes.value.success ? kelasRes.value.data.length : 0,
        totalKuis: kuisRes.status === 'fulfilled' && kuisRes.value.success ? kuisRes.value.data.length : 0,
        totalSoal: totalSoal,
      };

      setStats(finalStats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      // Fallback to default values if all fails
      setStats({
        totalKategori: 0,
        totalTingkatan: 0,
        totalPendidikan: 0,
        totalKelas: 0,
        totalKuis: 0,
        totalSoal: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const currentUserId = localStorage.getItem('userId');

      if (!token || !currentUserId) {
        // Set default values for guests
        setUserStats({
          completedQuizzes: 0,
          totalScore: 0,
          averageScore: 0,
          accuracy: 0,
          currentStreak: 0,
          achievements: 0
        });
        return;
      }

      // Fetch user's quiz results from real API
      try {
        const BASE_URL = import.meta.env.VITE_API_URL ||
          (import.meta.env.DEV ? "/api" : "https://brainquiz0.up.railway.app");

        const kuisRes = await api.getKuis();
        if (!kuisRes.success) {
          throw new Error('Failed to fetch kuis');
        }

        let completedQuizzes = 0;
        let totalScore = 0;
        let totalCorrectAnswers = 0;
        let totalQuestions = 0;
        const recentResults = [];

        // Process quizzes in smaller batches to avoid server overload
        const batchSize = 3;
        for (let i = 0; i < kuisRes.data.length; i += batchSize) {
          const batch = kuisRes.data.slice(i, i + batchSize);

          const batchPromises = batch.map(async (kuis) => {
            try {
              // Add small delay to prevent overwhelming the server
              await new Promise(resolve => setTimeout(resolve, Math.random() * 300));

              const response = await fetch(`${BASE_URL}/hasil-kuis/${currentUserId}/${kuis.ID}`, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                credentials: 'include',
              });

              if (response.ok) {
                const data = await response.json();
                const result = data.data;

                const rawScore = result.score || result.Score || 0;
                const correctAnswers = result.correct_answer || result.Correct_Answer || 0;

                // Get question count
                const soalRes = await api.getSoalByKuisID(kuis.ID);
                const questionCount = soalRes.success ? soalRes.data.length : 0;

                // Normalize score to handle legacy data
                const scoreInfo = getConsistentScoreInfo(rawScore, correctAnswers, questionCount);

                completedQuizzes++;
                totalScore += scoreInfo.score; // Use normalized score
                totalCorrectAnswers += correctAnswers;
                totalQuestions += questionCount;

                recentResults.push({
                  kuisTitle: kuis.title,
                  score: scoreInfo.score,
                  grade: scoreInfo.grade,
                  date: result.updated_at || result.UpdatedAt || new Date().toISOString()
                });
              } else if (response.status === 404) {
                // Quiz not completed by user - skip silently without logging
                return null;
              } else {
                console.warn(`HTTP ${response.status} for quiz ${kuis.ID}:`, response.statusText);
                return null;
              }
            } catch (error) {
              console.warn(`Failed to get result for quiz ${kuis.ID}:`, error.message);
              return null;
            }
          });

          const batchResults = await Promise.all(batchPromises);

          // Add delay between batches
          if (i + batchSize < kuisRes.data.length) {
            await new Promise(resolve => setTimeout(resolve, 800));
          }
        }

        // Calculate stats
        const averageScore = completedQuizzes > 0 ? Math.round(totalScore / completedQuizzes) : 0;
        const accuracy = totalQuestions > 0 ? Math.round((totalCorrectAnswers / totalQuestions) * 100) : 0;

        // Sort recent results by date and take last 5
        recentResults.sort((a, b) => new Date(b.date) - new Date(a.date));
        setRecentActivity(recentResults.slice(0, 5));

        setUserStats({
          completedQuizzes,
          totalScore,
          averageScore,
          accuracy,
          currentStreak: Math.floor(Math.random() * 10) + 1, // Simulated
          achievements: Math.min(Math.floor(completedQuizzes / 2), 10) // Simulated based on completed quizzes
        });

      } catch (error) {
        // If API fails, use default values
        setUserStats({
          completedQuizzes: 0,
          totalScore: 0,
          averageScore: 0,
          accuracy: 0,
          currentStreak: 0,
          achievements: 0
        });
      }

    } catch (error) {
      console.error("Error fetching user stats:", error);
    }
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Selamat Pagi";
    if (hour < 17) return "Selamat Siang";
    if (hour < 20) return "Selamat Sore";
    return "Selamat Malam";
  };

  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'admin': return 'Administrator';
      case 'teacher': return 'Guru';
      case 'student': return 'Siswa';
      default: return 'Pengguna';
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin': return '👑';
      case 'teacher': return '👨‍🏫';
      case 'student': return '🎓';
      default: return '👤';
    }
  };

  // Handle navigation for quick actions
  const handleNavigate = (path) => {
    console.log('🔗 Dashboard navigating to:', path);
    navigate(path);
  };

  const getQuickActions = () => {
    const baseActions = [
      {
        title: "Ambil Kuis",
        description: "Mulai mengerjakan kuis yang tersedia",
        link: "/ambil-kuis",
        icon: "📝",
        color: "from-blue-500 to-blue-600",
        bgColor: "from-blue-50 to-blue-100"
      },
      {
        title: "Hasil Kuis",
        description: "Lihat hasil kuis yang telah dikerjakan",
        link: "/hasil-kuis",
        icon: "📊",
        color: "from-green-500 to-green-600",
        bgColor: "from-green-50 to-green-100"
      },
      {
        title: "Analytics",
        description: "Analisis mendalam performa belajar",
        link: "/analytics",
        icon: "📈",
        color: "from-purple-500 to-purple-600",
        bgColor: "from-purple-50 to-purple-100"
      },
      {
        title: "Achievements",
        description: "Lihat pencapaian dan milestone",
        link: "/achievements",
        icon: "🏆",
        color: "from-yellow-500 to-yellow-600",
        bgColor: "from-yellow-50 to-yellow-100"
      }
    ];

    if (role === 'admin') {
      return [
        ...baseActions,
        {
          title: "Kelola Kategori",
          description: "Tambah, edit, hapus kategori soal",
          link: "/daftar-kategori",
          icon: "🏷️",
          color: "from-red-500 to-red-600",
          bgColor: "from-red-50 to-red-100"
        },
        {
          title: "Kelola Tingkatan",
          description: "Atur tingkatan kesulitan",
          link: "/daftar-tingkatan",
          icon: "📊",
          color: "from-indigo-500 to-indigo-600",
          bgColor: "from-indigo-50 to-indigo-100"
        }
      ];
    }

    if (role === 'teacher') {
      return [
        ...baseActions,
        {
          title: "Kelola Kuis",
          description: "Buat dan kelola kuis untuk siswa",
          link: "/daftar-kuis",
          icon: "📚",
          color: "from-orange-500 to-orange-600",
          bgColor: "from-orange-50 to-orange-100"
        },
        {
          title: "Kelola Kelas",
          description: "Atur kelas dan siswa",
          link: "/daftar-kelas",
          icon: "🏫",
          color: "from-teal-500 to-teal-600",
          bgColor: "from-teal-50 to-teal-100"
        }
      ];
    }

    return baseActions;
  };

  return (
    <div className="min-h-screen p-4 lg:p-8">
      {/* Hero Section with Role Info */}
      <div className="mb-6 lg:mb-8 animate-fade-in pt-16 lg:pt-0">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 lg:mb-8">
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 mb-4">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {getGreeting()}, {userName}!
              </h1>
              <span className="text-2xl sm:text-3xl lg:text-4xl mt-2 sm:mt-0">
                {getGreeting().includes('Pagi') ? '🌅' :
                 getGreeting().includes('Siang') ? '☀️' :
                 getGreeting().includes('Sore') ? '🌇' : '🌙'}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 mb-6">
              <div className="flex items-center space-x-2 bg-white/60 backdrop-blur-sm rounded-xl px-3 py-2 shadow-lg">
                <span className="text-xl sm:text-2xl">{getRoleIcon(role)}</span>
                <span className="font-semibold text-slate-800 text-sm sm:text-base">{getRoleDisplayName(role)}</span>
              </div>

              <div className="bg-white/60 backdrop-blur-sm rounded-xl px-3 py-2 shadow-lg">
                <div className="text-xs sm:text-sm font-semibold text-slate-600">
                  {currentTime.toLocaleDateString('id-ID', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </div>
                <div className="font-mono text-sm sm:text-lg font-bold text-blue-600">
                  {currentTime.toLocaleTimeString('id-ID')}
                </div>
              </div>
            </div>

            <p className="text-sm sm:text-base lg:text-xl text-slate-600 font-medium leading-relaxed max-w-3xl">
              Selamat datang kembali di <span className="font-bold text-blue-600">BrainQuiz</span> -
              Platform pembelajaran interaktif untuk meningkatkan pengetahuan Anda
            </p>
          </div>
        </div>
      </div>

      {/* Personal Stats for Students */}
      {role === 'student' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8 animate-slide-up">
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white">
                <span className="text-xl">📝</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-600">Kuis Selesai</p>
                <p className="text-2xl font-bold text-slate-800">{userStats.completedQuizzes}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center text-white">
                <span className="text-xl">⭐</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-600">Rata-rata Skor</p>
                <div className="flex items-center space-x-2">
                  <p className="text-2xl font-bold text-slate-800">{userStats.averageScore}%</p>
                  <span className={`text-sm font-bold px-2 py-1 rounded-full ${getConsistentScoreInfo(userStats.averageScore, 0, 1).color}`}>
                    {getConsistentScoreInfo(userStats.averageScore, 0, 1).grade}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center text-white">
                <span className="text-xl">🎯</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-600">Akurasi</p>
                <p className="text-2xl font-bold text-slate-800">{userStats.accuracy}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center text-white">
                <span className="text-xl">🔥</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-600">Streak</p>
                <p className="text-2xl font-bold text-slate-800">{userStats.currentStreak}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* System Stats for Admin/Teacher */}
      {(role === 'admin' || role === 'teacher') && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 lg:gap-6 mb-6 lg:mb-8 animate-slide-up">
          {[
            { name: "Total Kategori", value: loading ? "..." : stats.totalKategori, icon: "🏷️", color: "from-blue-500 to-blue-600" },
            { name: "Total Tingkatan", value: loading ? "..." : stats.totalTingkatan, icon: "📊", color: "from-emerald-500 to-emerald-600" },
            { name: "Total Pendidikan", value: loading ? "..." : stats.totalPendidikan, icon: "🎓", color: "from-purple-500 to-purple-600" },
            { name: "Total Kelas", value: loading ? "..." : stats.totalKelas, icon: "🏫", color: "from-orange-500 to-orange-600" },
            { name: "Total Kuis", value: loading ? "..." : stats.totalKuis, icon: "📝", color: "from-pink-500 to-pink-600" },
            { name: "Total Soal", value: loading ? "..." : stats.totalSoal, icon: "❓", color: "from-indigo-500 to-indigo-600" },
          ].map((stat, index) => (
            <div
              key={stat.name}
              className="bg-white/60 backdrop-blur-sm rounded-xl lg:rounded-2xl p-3 sm:p-4 lg:p-6 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 animate-scale-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex flex-col items-center text-center">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 lg:w-14 lg:h-14 bg-gradient-to-r ${stat.color} rounded-lg lg:rounded-xl flex items-center justify-center text-sm sm:text-lg lg:text-2xl mb-2 lg:mb-4 shadow-lg`}>
                  {stat.icon}
                </div>
                <p className="text-xs sm:text-sm font-semibold text-slate-600 mb-1 lg:mb-2 text-center leading-tight">{stat.name}</p>
                <div className="text-lg sm:text-xl lg:text-3xl font-bold text-slate-800">
                  {loading ? (
                    <div className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  ) : (
                    stat.value
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8 animate-bounce-in">
        {getQuickActions().map((action, index) => (
          <button
            key={action.title}
            onClick={() => handleNavigate(action.link)}
            className={`group p-4 lg:p-6 bg-gradient-to-br ${action.bgColor} rounded-xl lg:rounded-2xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 animate-scale-in text-left w-full`}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="flex flex-col h-full">
              <div className={`w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 bg-gradient-to-r ${action.color} rounded-lg lg:rounded-xl flex items-center justify-center text-lg sm:text-xl lg:text-2xl mb-3 lg:mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                {action.icon}
              </div>

              <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors duration-300">
                {action.title}
              </h3>

              <p className="text-slate-600 text-xs sm:text-sm flex-grow leading-relaxed">
                {action.description}
              </p>

              <div className="flex items-center text-blue-600 font-semibold mt-4 group-hover:text-blue-700 transition-colors duration-300">
                <span className="text-sm">Buka</span>
                <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Recent Activity for Students */}
      {role === 'student' && recentActivity.length > 0 && (
        <div className="mb-8 animate-slide-up">
          <h2 className="text-2xl font-bold text-slate-800 mb-6">Aktivitas Terbaru</h2>
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-white/40 rounded-xl">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white">
                      <span className="text-sm">📝</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-800">{activity.kuisTitle}</h4>
                      <p className="text-sm text-slate-600">
                        {new Date(activity.date).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-lg font-bold text-slate-800">{activity.score}%</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${getConsistentScoreInfo(activity.score, 0, 1).color}`}>
                      {activity.grade}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 text-center">
              <button
                onClick={() => handleNavigate('/hasil-kuis')}
                className="btn-outline"
              >
                Lihat Semua Hasil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Call to Action */}
      <div className="text-center animate-fade-in">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl lg:rounded-2xl p-6 lg:p-8 shadow-lg text-white">
          <h3 className="text-lg sm:text-xl lg:text-2xl font-bold mb-4">
            {role === 'student'
              ? "Siap untuk Meningkatkan Kemampuan? 🚀"
              : role === 'teacher'
              ? "Mulai Mengajar dengan Lebih Efektif! 👨‍🏫"
              : "Kelola Platform dengan Mudah! 👑"
            }
          </h3>
          <p className="text-blue-100 mb-6 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
            {role === 'student'
              ? "Bergabunglah dengan ribuan pelajar lainnya dan tingkatkan pengetahuan Anda dengan metode pembelajaran yang menyenangkan dan interaktif."
              : role === 'teacher'
              ? "Buat kuis menarik, kelola kelas dengan mudah, dan pantau perkembangan siswa Anda secara real-time."
              : "Kelola seluruh sistem pembelajaran dengan tools yang powerful dan user-friendly."
            }
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            {role === 'student' ? (
              <>
                <button onClick={() => handleNavigate('/ambil-kuis')} className="bg-white text-blue-600 px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl font-semibold hover:bg-blue-50 transition-colors duration-200 text-sm sm:text-base">
                  Ambil Kuis Sekarang
                </button>
                <button onClick={() => handleNavigate('/analytics')} className="border-2 border-white text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl font-semibold hover:bg-white hover:text-blue-600 transition-colors duration-200 text-sm sm:text-base">
                  Lihat Analytics
                </button>
              </>
            ) : role === 'teacher' ? (
              <>
                <button onClick={() => handleNavigate('/daftar-kuis')} className="bg-white text-blue-600 px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl font-semibold hover:bg-blue-50 transition-colors duration-200 text-sm sm:text-base">
                  Kelola Kuis
                </button>
                <button onClick={() => handleNavigate('/daftar-kelas')} className="border-2 border-white text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl font-semibold hover:bg-white hover:text-blue-600 transition-colors duration-200 text-sm sm:text-base">
                  Kelola Kelas
                </button>
              </>
            ) : (
              <>
                <button onClick={() => handleNavigate('/daftar-kategori')} className="bg-white text-blue-600 px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl font-semibold hover:bg-blue-50 transition-colors duration-200 text-sm sm:text-base">
                  Kelola Kategori
                </button>
                <button onClick={() => handleNavigate('/daftar-tingkatan')} className="border-2 border-white text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl font-semibold hover:bg-white hover:text-blue-600 transition-colors duration-200 text-sm sm:text-base">
                  Kelola Tingkatan
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
