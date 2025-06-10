import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { getConsistentScoreInfo } from '../../utils/gradeUtils';



const AchievementsPage = () => {
  const [achievements, setAchievements] = useState([]);
  const [userStats, setUserStats] = useState({
    totalScore: 0,
    completedQuizzes: 0,
    averageScore: 0,
    correctAnswers: 0,
    totalQuestions: 0,
    accuracy: 0,
    categoriesCompleted: 0,
    perfectScores: 0,
    streak: 0
  });
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
    if (userId) {
      fetchAchievements();
    }
  }, [userId]);

  const fetchAchievements = async () => {
    try {
      setLoading(true);

      // OPTIMIZED: Get all data using optimized endpoints
      const [kuisRes, kategoriRes, hasilRes] = await Promise.all([
        api.getKuis(),
        api.getKategori(),
        api.getMyHasilKuis()
      ]);

      if (kuisRes.success && kategoriRes.success) {
        await calculateUserStats(kuisRes.data, kategoriRes.data, hasilRes.success ? hasilRes.data : []);
      }
    } catch (error) {
      console.error('Error fetching achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateUserStats = async (allKuis, allKategori, hasilKuisList) => {
    const stats = {
      totalScore: 0,
      completedQuizzes: 0,
      averageScore: 0,
      correctAnswers: 0,
      totalQuestions: 0,
      accuracy: 0,
      categoriesCompleted: new Set(),
      perfectScores: 0,
      streak: 0,
      lastQuizDate: null,
      quizDates: []
    };

    // OPTIMIZED: Process results from single API call
    for (const hasil of hasilKuisList) {
      try {
        // Get question count for this quiz
        let questionCount = 1; // Default fallback
        try {
          const soalRes = await api.getSoalByKuisID(hasil.kuis_id);
          questionCount = soalRes.success ? soalRes.data.length : 1;
        } catch (soalError) {
          console.warn(`Failed to get question count for quiz ${hasil.kuis_id}:`, soalError.message);
        }

        const rawScore = hasil.score || 0;
        const correctAnswers = hasil.correct_answer || 0;
        const quizDate = hasil.created_at || hasil.CreatedAt || new Date().toISOString();

        // Get consistent score info
        const scoreInfo = getConsistentScoreInfo(rawScore, correctAnswers, questionCount);

        stats.totalScore += scoreInfo.score;
        stats.completedQuizzes++;
        stats.correctAnswers += correctAnswers;
        stats.totalQuestions += questionCount;

        // Get category from quiz data
        const kuis = allKuis.find(k => k.ID === hasil.kuis_id);
        if (kuis) {
          stats.categoriesCompleted.add(kuis.kategori_id);
        }

        stats.quizDates.push(new Date(quizDate));

        if (scoreInfo.score === 100) {
          stats.perfectScores++;
        }

        // Small delay to prevent overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error) {
        console.error(`Error processing quiz result ${hasil.kuis_id}:`, error);
        // Continue with next result
      }
    }

    if (stats.completedQuizzes > 0) {
      stats.averageScore = Math.round(stats.totalScore / stats.completedQuizzes);
      stats.accuracy = stats.totalQuestions > 0
        ? Math.round((stats.correctAnswers / stats.totalQuestions) * 100)
        : 0;
    }

    stats.categoriesCompleted = stats.categoriesCompleted.size;

    // Calculate streak (consecutive days with quiz activity)
    stats.streak = calculateStreak(stats.quizDates);

    setUserStats(stats);
    generateAchievements(stats, allKategori.length);
  };

  // Calculate consecutive days streak
  const calculateStreak = (quizDates) => {
    if (!quizDates || quizDates.length === 0) return 0;

    // Sort dates in descending order (newest first)
    const sortedDates = quizDates
      .map(date => new Date(date.toDateString())) // Normalize to date only (no time)
      .sort((a, b) => b - a);

    // Remove duplicates (same day)
    const uniqueDates = [...new Set(sortedDates.map(date => date.getTime()))]
      .map(time => new Date(time));

    if (uniqueDates.length === 0) return 0;

    let streak = 1;
    const today = new Date(new Date().toDateString());

    // Check if the most recent quiz was today or yesterday
    const mostRecent = uniqueDates[0];
    const daysDiff = Math.floor((today - mostRecent) / (1000 * 60 * 60 * 24));

    // If last quiz was more than 1 day ago, streak is broken
    if (daysDiff > 1) return 0;

    // If last quiz was today, start counting from today
    // If last quiz was yesterday, start counting from yesterday
    let currentDate = new Date(mostRecent);

    // Count consecutive days
    for (let i = 1; i < uniqueDates.length; i++) {
      const prevDate = new Date(currentDate);
      prevDate.setDate(prevDate.getDate() - 1);

      if (uniqueDates[i].getTime() === prevDate.getTime()) {
        streak++;
        currentDate = uniqueDates[i];
      } else {
        break;
      }
    }

    return streak;
  };

  // Check if user completed 5 quizzes in one day
  const checkSpeedDemon = (quizDates) => {
    if (!quizDates || quizDates.length < 5) return false;

    const dateGroups = {};
    quizDates.forEach(date => {
      const dateStr = date.toDateString();
      dateGroups[dateStr] = (dateGroups[dateStr] || 0) + 1;
    });

    return Object.values(dateGroups).some(count => count >= 5);
  };

  // Check if user completed quiz at night (after 8 PM or before 6 AM)
  const checkNightOwl = (quizDates) => {
    if (!quizDates || quizDates.length === 0) return false;

    return quizDates.some(date => {
      const hour = date.getHours();
      return hour >= 20 || hour < 6; // 8 PM to 6 AM
    });
  };

  const generateAchievements = (stats, totalCategories) => {
    const achievementList = [
      // 🎯 BEGINNER ACHIEVEMENTS
      {
        id: 'first_quiz',
        title: 'Langkah Pertama',
        description: 'Selesaikan kuis pertama Anda! Perjalanan dimulai dari sini.',
        icon: '🎯',
        unlocked: stats.completedQuizzes >= 1,
        progress: Math.min(stats.completedQuizzes, 1),
        target: 1,
        category: 'Beginner',
        points: 10
      },
      {
        id: 'early_bird',
        title: 'Burung Pagi',
        description: 'Selesaikan 3 kuis pertama Anda. Semangat belajar!',
        icon: '🐦',
        unlocked: stats.completedQuizzes >= 3,
        progress: Math.min(stats.completedQuizzes, 3),
        target: 3,
        category: 'Beginner',
        points: 20
      },
      {
        id: 'getting_started',
        title: 'Mulai Bergerak',
        description: 'Jawab 10 soal dengan benar. Anda sudah mulai menguasai!',
        icon: '🚀',
        unlocked: stats.correctAnswers >= 10,
        progress: Math.min(stats.correctAnswers, 10),
        target: 10,
        category: 'Beginner',
        points: 15
      },

      // 📈 PROGRESS ACHIEVEMENTS
      {
        id: 'quiz_explorer',
        title: 'Penjelajah Kuis',
        description: 'Selesaikan 5 kuis. Anda semakin aktif belajar!',
        icon: '🗺️',
        unlocked: stats.completedQuizzes >= 5,
        progress: Math.min(stats.completedQuizzes, 5),
        target: 5,
        category: 'Progress',
        points: 25
      },
      {
        id: 'quiz_enthusiast',
        title: 'Penggemar Kuis',
        description: 'Selesaikan 10 kuis. Dedikasi Anda luar biasa!',
        icon: '🎪',
        unlocked: stats.completedQuizzes >= 10,
        progress: Math.min(stats.completedQuizzes, 10),
        target: 10,
        category: 'Progress',
        points: 50
      },
      {
        id: 'quiz_addict',
        title: 'Pecandu Kuis',
        description: 'Selesaikan 20 kuis. Anda benar-benar menyukai belajar!',
        icon: '🎮',
        unlocked: stats.completedQuizzes >= 20,
        progress: Math.min(stats.completedQuizzes, 20),
        target: 20,
        category: 'Progress',
        points: 100
      },
      {
        id: 'quiz_legend',
        title: 'Legenda Kuis',
        description: 'Selesaikan 50 kuis. Anda adalah inspirasi bagi semua!',
        icon: '👑',
        unlocked: stats.completedQuizzes >= 50,
        progress: Math.min(stats.completedQuizzes, 50),
        target: 50,
        category: 'Progress',
        points: 250
      },

      // ⭐ EXCELLENCE ACHIEVEMENTS
      {
        id: 'first_perfect',
        title: 'Sempurna Pertama',
        description: 'Dapatkan skor 100% dalam satu kuis. Luar biasa!',
        icon: '💎',
        unlocked: stats.perfectScores >= 1,
        progress: Math.min(stats.perfectScores, 1),
        target: 1,
        category: 'Excellence',
        points: 100
      },
      {
        id: 'perfectionist',
        title: 'Perfeksionis',
        description: 'Dapatkan 3 skor sempurna. Konsistensi yang menakjubkan!',
        icon: '💯',
        unlocked: stats.perfectScores >= 3,
        progress: Math.min(stats.perfectScores, 3),
        target: 3,
        category: 'Excellence',
        points: 200
      },
      {
        id: 'perfect_master',
        title: 'Master Sempurna',
        description: 'Dapatkan 5 skor sempurna. Anda benar-benar ahli!',
        icon: '🏆',
        unlocked: stats.perfectScores >= 5,
        progress: Math.min(stats.perfectScores, 5),
        target: 5,
        category: 'Excellence',
        points: 300
      },
      {
        id: 'high_scorer',
        title: 'Pencetak Skor Tinggi',
        description: 'Dapatkan rata-rata skor 80+. Prestasi yang konsisten!',
        icon: '⭐',
        unlocked: stats.averageScore >= 80,
        progress: Math.min(stats.averageScore, 80),
        target: 80,
        category: 'Excellence',
        points: 75
      },
      {
        id: 'elite_scorer',
        title: 'Pencetak Skor Elite',
        description: 'Dapatkan rata-rata skor 90+. Anda di level elite!',
        icon: '🌟',
        unlocked: stats.averageScore >= 90,
        progress: Math.min(stats.averageScore, 90),
        target: 90,
        category: 'Excellence',
        points: 150
      },

      // 🎯 PRECISION ACHIEVEMENTS
      {
        id: 'sharp_shooter',
        title: 'Penembak Jitu',
        description: 'Capai akurasi 70%. Ketepatan yang mengesankan!',
        icon: '🎯',
        unlocked: stats.accuracy >= 70,
        progress: Math.min(stats.accuracy, 70),
        target: 70,
        category: 'Precision',
        points: 60
      },
      {
        id: 'sniper',
        title: 'Sniper',
        description: 'Capai akurasi 85%. Presisi yang luar biasa!',
        icon: '🔫',
        unlocked: stats.accuracy >= 85,
        progress: Math.min(stats.accuracy, 85),
        target: 85,
        category: 'Precision',
        points: 120
      },
      {
        id: 'answer_machine',
        title: 'Mesin Jawaban',
        description: 'Jawab 50 soal dengan benar. Anda seperti mesin!',
        icon: '🤖',
        unlocked: stats.correctAnswers >= 50,
        progress: Math.min(stats.correctAnswers, 50),
        target: 50,
        category: 'Precision',
        points: 80
      },
      {
        id: 'knowledge_bank',
        title: 'Bank Pengetahuan',
        description: 'Jawab 100 soal dengan benar. Pengetahuan Anda berlimpah!',
        icon: '🏦',
        unlocked: stats.correctAnswers >= 100,
        progress: Math.min(stats.correctAnswers, 100),
        target: 100,
        category: 'Precision',
        points: 150
      },

      // 🌍 EXPLORATION ACHIEVEMENTS
      {
        id: 'category_explorer',
        title: 'Penjelajah Kategori',
        description: 'Selesaikan kuis dari 2 kategori berbeda. Wawasan yang luas!',
        icon: '🌟',
        unlocked: stats.categoriesCompleted >= 2,
        progress: Math.min(stats.categoriesCompleted, 2),
        target: 2,
        category: 'Exploration',
        points: 35
      },
      {
        id: 'category_master',
        title: 'Master Kategori',
        description: 'Selesaikan kuis dari 3 kategori berbeda. Anda multitalenta!',
        icon: '🎨',
        unlocked: stats.categoriesCompleted >= 3,
        progress: Math.min(stats.categoriesCompleted, 3),
        target: 3,
        category: 'Exploration',
        points: 60
      },
      {
        id: 'universal_learner',
        title: 'Pembelajar Universal',
        description: 'Selesaikan kuis dari semua kategori. Pengetahuan tanpa batas!',
        icon: '🌍',
        unlocked: stats.categoriesCompleted >= totalCategories,
        progress: Math.min(stats.categoriesCompleted, totalCategories),
        target: totalCategories,
        category: 'Exploration',
        points: 200
      },

      // 🔥 CONSISTENCY ACHIEVEMENTS
      {
        id: 'consistent_learner',
        title: 'Pembelajar Konsisten',
        description: 'Pertahankan streak 3 hari. Konsistensi adalah kunci!',
        icon: '🔥',
        unlocked: stats.streak >= 3,
        progress: Math.min(stats.streak, 3),
        target: 3,
        category: 'Consistency',
        points: 40
      },
      {
        id: 'week_warrior',
        title: 'Pejuang Mingguan',
        description: 'Pertahankan streak 7 hari. Dedikasi yang luar biasa!',
        icon: '⚡',
        unlocked: stats.streak >= 7,
        progress: Math.min(stats.streak, 7),
        target: 7,
        category: 'Consistency',
        points: 100
      },
      {
        id: 'unstoppable',
        title: 'Tak Terhentikan',
        description: 'Pertahankan streak 14 hari. Anda benar-benar tak terhentikan!',
        icon: '🚀',
        unlocked: stats.streak >= 14,
        progress: Math.min(stats.streak, 14),
        target: 14,
        category: 'Consistency',
        points: 200
      },

      // 🎉 SPECIAL ACHIEVEMENTS
      {
        id: 'speed_demon',
        title: 'Iblis Kecepatan',
        description: 'Selesaikan 5 kuis dalam satu hari. Kecepatan luar biasa!',
        icon: '💨',
        unlocked: checkSpeedDemon(stats.quizDates),
        progress: checkSpeedDemon(stats.quizDates) ? 1 : 0,
        target: 1,
        category: 'Special',
        points: 150
      },
      {
        id: 'night_owl',
        title: 'Burung Hantu',
        description: 'Selesaikan kuis di malam hari. Belajar tanpa kenal waktu!',
        icon: '🦉',
        unlocked: checkNightOwl(stats.quizDates),
        progress: checkNightOwl(stats.quizDates) ? 1 : 0,
        target: 1,
        category: 'Special',
        points: 50
      },
      {
        id: 'comeback_kid',
        title: 'Anak Comeback',
        description: 'Tingkatkan skor dari 50% ke 90%+. Perbaikan yang menakjubkan!',
        icon: '📈',
        unlocked: stats.averageScore >= 90 && stats.completedQuizzes >= 5,
        progress: Math.min(stats.averageScore >= 90 && stats.completedQuizzes >= 5 ? 1 : 0, 1),
        target: 1,
        category: 'Special',
        points: 200
      },
      {
        id: 'overachiever',
        title: 'Pencapai Berlebihan',
        description: 'Dapatkan 10 skor sempurna. Anda melebihi ekspektasi!',
        icon: '🎊',
        unlocked: stats.perfectScores >= 10,
        progress: Math.min(stats.perfectScores, 10),
        target: 10,
        category: 'Special',
        points: 500
      },

      // 🏅 MASTERY ACHIEVEMENTS
      {
        id: 'quiz_scholar',
        title: 'Sarjana Kuis',
        description: 'Jawab 200 soal dengan benar. Pengetahuan tingkat sarjana!',
        icon: '🎓',
        unlocked: stats.correctAnswers >= 200,
        progress: Math.min(stats.correctAnswers, 200),
        target: 200,
        category: 'Mastery',
        points: 250
      },
      {
        id: 'quiz_professor',
        title: 'Profesor Kuis',
        description: 'Jawab 500 soal dengan benar. Anda layak jadi profesor!',
        icon: '👨‍🏫',
        unlocked: stats.correctAnswers >= 500,
        progress: Math.min(stats.correctAnswers, 500),
        target: 500,
        category: 'Mastery',
        points: 500
      },
      {
        id: 'grand_master',
        title: 'Grand Master',
        description: 'Selesaikan 100 kuis dengan rata-rata 95%+. Pencapaian tertinggi!',
        icon: '👑',
        unlocked: stats.completedQuizzes >= 100 && stats.averageScore >= 95,
        progress: Math.min(stats.completedQuizzes >= 100 && stats.averageScore >= 95 ? 1 : 0, 1),
        target: 1,
        category: 'Mastery',
        points: 1000
      },

      // 🎈 FUN ACHIEVEMENTS
      {
        id: 'lucky_number',
        title: 'Angka Keberuntungan',
        description: 'Selesaikan kuis ke-7 Anda. Tujuh adalah angka keberuntungan!',
        icon: '🍀',
        unlocked: stats.completedQuizzes >= 7,
        progress: Math.min(stats.completedQuizzes, 7),
        target: 7,
        category: 'Fun',
        points: 77
      },
      {
        id: 'century_club',
        title: 'Klub Seratus',
        description: 'Dapatkan total 100 jawaban benar. Selamat datang di klub elit!',
        icon: '💯',
        unlocked: stats.correctAnswers >= 100,
        progress: Math.min(stats.correctAnswers, 100),
        target: 100,
        category: 'Fun',
        points: 100
      },
      {
        id: 'rainbow_learner',
        title: 'Pembelajar Pelangi',
        description: 'Selesaikan kuis dari 5 kategori berbeda. Warna-warni pengetahuan!',
        icon: '🌈',
        unlocked: stats.categoriesCompleted >= 5,
        progress: Math.min(stats.categoriesCompleted, 5),
        target: 5,
        category: 'Fun',
        points: 150
      },
      {
        id: 'golden_touch',
        title: 'Sentuhan Emas',
        description: 'Dapatkan 5 skor sempurna berturut-turut. Sentuhan emas!',
        icon: '✨',
        unlocked: stats.perfectScores >= 5, // Simplified for demo
        progress: Math.min(stats.perfectScores >= 5 ? 1 : 0, 1),
        target: 1,
        category: 'Fun',
        points: 300
      },

      // 🎪 MILESTONE ACHIEVEMENTS
      {
        id: 'double_digits',
        title: 'Dua Digit',
        description: 'Selesaikan 10 kuis. Masuk ke level dua digit!',
        icon: '🔟',
        unlocked: stats.completedQuizzes >= 10,
        progress: Math.min(stats.completedQuizzes, 10),
        target: 10,
        category: 'Milestone',
        points: 100
      },
      {
        id: 'quarter_century',
        title: 'Seperempat Abad',
        description: 'Selesaikan 25 kuis. Pencapaian seperempat abad!',
        icon: '🎂',
        unlocked: stats.completedQuizzes >= 25,
        progress: Math.min(stats.completedQuizzes, 25),
        target: 25,
        category: 'Milestone',
        points: 250
      },
      {
        id: 'half_century',
        title: 'Setengah Abad',
        description: 'Selesaikan 50 kuis. Setengah perjalanan menuju 100!',
        icon: '🏅',
        unlocked: stats.completedQuizzes >= 50,
        progress: Math.min(stats.completedQuizzes, 50),
        target: 50,
        category: 'Milestone',
        points: 500
      },

      // 🎭 PERSONALITY ACHIEVEMENTS
      {
        id: 'curious_cat',
        title: 'Kucing Penasaran',
        description: 'Coba berbagai jenis kuis. Rasa ingin tahu yang tinggi!',
        icon: '🐱',
        unlocked: stats.categoriesCompleted >= 2,
        progress: Math.min(stats.categoriesCompleted, 2),
        target: 2,
        category: 'Personality',
        points: 40
      },
      {
        id: 'wise_owl',
        title: 'Burung Hantu Bijak',
        description: 'Pertahankan rata-rata skor tinggi. Kebijaksanaan sejati!',
        icon: '🦉',
        unlocked: stats.averageScore >= 85 && stats.completedQuizzes >= 5,
        progress: Math.min(stats.averageScore >= 85 && stats.completedQuizzes >= 5 ? 1 : 0, 1),
        target: 1,
        category: 'Personality',
        points: 120
      },
      {
        id: 'busy_bee',
        title: 'Lebah Pekerja',
        description: 'Selesaikan banyak kuis dengan konsisten. Pekerja keras!',
        icon: '🐝',
        unlocked: stats.completedQuizzes >= 15,
        progress: Math.min(stats.completedQuizzes, 15),
        target: 15,
        category: 'Personality',
        points: 80
      },
      {
        id: 'eagle_eye',
        title: 'Mata Elang',
        description: 'Capai akurasi 90%+. Ketajaman mata elang!',
        icon: '🦅',
        unlocked: stats.accuracy >= 90,
        progress: Math.min(stats.accuracy, 90),
        target: 90,
        category: 'Personality',
        points: 180
      },

      // 🎨 CREATIVE ACHIEVEMENTS
      {
        id: 'pattern_master',
        title: 'Master Pola',
        description: 'Temukan pola dalam belajar. Kreativitas tinggi!',
        icon: '🎨',
        unlocked: stats.completedQuizzes >= 8 && stats.averageScore >= 75,
        progress: Math.min(stats.completedQuizzes >= 8 && stats.averageScore >= 75 ? 1 : 0, 1),
        target: 1,
        category: 'Creative',
        points: 90
      },
      {
        id: 'innovation_king',
        title: 'Raja Inovasi',
        description: 'Coba strategi belajar yang berbeda. Inovator sejati!',
        icon: '💡',
        unlocked: stats.categoriesCompleted >= 4 && stats.perfectScores >= 2,
        progress: Math.min(stats.categoriesCompleted >= 4 && stats.perfectScores >= 2 ? 1 : 0, 1),
        target: 1,
        category: 'Creative',
        points: 150
      },

      // 🌟 LEGENDARY ACHIEVEMENTS
      {
        id: 'quiz_deity',
        title: 'Dewa Kuis',
        description: 'Pencapaian tertinggi: 1000+ jawaban benar. Status legendaris!',
        icon: '⚡',
        unlocked: stats.correctAnswers >= 1000,
        progress: Math.min(stats.correctAnswers, 1000),
        target: 1000,
        category: 'Legendary',
        points: 2000
      },
      {
        id: 'immortal_learner',
        title: 'Pembelajar Abadi',
        description: 'Streak 30 hari. Pembelajaran yang tak pernah berhenti!',
        icon: '♾️',
        unlocked: stats.streak >= 30,
        progress: Math.min(stats.streak, 30),
        target: 30,
        category: 'Legendary',
        points: 1500
      },
      {
        id: 'universe_brain',
        title: 'Otak Semesta',
        description: 'Master semua kategori dengan skor 95%+. Pengetahuan universal!',
        icon: '🌌',
        unlocked: stats.categoriesCompleted >= totalCategories && stats.averageScore >= 95,
        progress: Math.min(stats.categoriesCompleted >= totalCategories && stats.averageScore >= 95 ? 1 : 0, 1),
        target: 1,
        category: 'Legendary',
        points: 3000
      }
    ];

    setAchievements(achievementList);
  };

  const getTotalPoints = () => {
    return achievements
      .filter(achievement => achievement.unlocked)
      .reduce((total, achievement) => total + achievement.points, 0);
  };

  const getUnlockedCount = () => {
    return achievements.filter(achievement => achievement.unlocked).length;
  };

  const getUserRank = () => {
    const points = getTotalPoints();
    if (points >= 10000) return { rank: 'Dewa Pembelajaran', icon: '👑', color: 'from-yellow-400 to-orange-500' };
    if (points >= 5000) return { rank: 'Grand Master', icon: '🏆', color: 'from-purple-500 to-pink-500' };
    if (points >= 2000) return { rank: 'Master', icon: '⭐', color: 'from-blue-500 to-indigo-500' };
    if (points >= 1000) return { rank: 'Expert', icon: '🎯', color: 'from-green-500 to-teal-500' };
    if (points >= 500) return { rank: 'Advanced', icon: '🚀', color: 'from-orange-500 to-red-500' };
    if (points >= 200) return { rank: 'Intermediate', icon: '📚', color: 'from-cyan-500 to-blue-500' };
    if (points >= 50) return { rank: 'Beginner+', icon: '🌱', color: 'from-green-400 to-green-600' };
    return { rank: 'Newbie', icon: '🐣', color: 'from-gray-400 to-gray-600' };
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Beginner': 'bg-green-100 text-green-800',
      'Progress': 'bg-blue-100 text-blue-800',
      'Excellence': 'bg-purple-100 text-purple-800',
      'Precision': 'bg-orange-100 text-orange-800',
      'Exploration': 'bg-indigo-100 text-indigo-800',
      'Mastery': 'bg-yellow-100 text-yellow-800',
      'Consistency': 'bg-red-100 text-red-800',
      'Special': 'bg-pink-100 text-pink-800',
      'Fun': 'bg-cyan-100 text-cyan-800',
      'Milestone': 'bg-emerald-100 text-emerald-800',
      'Personality': 'bg-violet-100 text-violet-800',
      'Creative': 'bg-rose-100 text-rose-800',
      'Legendary': 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Memuat pencapaian Anda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8">
      <div className="mb-8 animate-fade-in">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">
          🏆 Hall of Fame - Achievements
        </h1>
        <p className="text-xl text-slate-600 font-medium">
          Rayakan setiap pencapaian dalam perjalanan belajar Anda! Setiap achievement adalah bukti dedikasi dan kemajuan Anda. 🌟
        </p>

        {getUnlockedCount() > 0 && (
          <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200">
            <p className="text-green-700 font-semibold text-center">
              🎉 Selamat! Anda telah membuka {getUnlockedCount()} achievement dan mengumpulkan {getTotalPoints()} poin!
              {getUnlockedCount() >= 5 && " Anda luar biasa! 🚀"}
              {getUnlockedCount() >= 15 && " Anda adalah pembelajar sejati! ⭐"}
              {getUnlockedCount() >= 25 && " Anda hampir menjadi master! 🏆"}
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg animate-scale-in">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">{getTotalPoints()}</div>
            <p className="text-sm font-semibold text-slate-600">Total Poin</p>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg animate-scale-in">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">{getUnlockedCount()}</div>
            <p className="text-sm font-semibold text-slate-600">Achievement Terbuka</p>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg animate-scale-in">
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">{achievements.length}</div>
            <p className="text-sm font-semibold text-slate-600">Total Achievement</p>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg animate-scale-in">
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600 mb-2">
              {achievements.length > 0 ? Math.round((getUnlockedCount() / achievements.length) * 100) : 0}%
            </div>
            <p className="text-sm font-semibold text-slate-600">Completion Rate</p>
          </div>
        </div>

        <div className={`bg-gradient-to-r ${getUserRank().color} rounded-2xl p-6 shadow-lg animate-scale-in text-white`}>
          <div className="text-center">
            <div className="text-3xl mb-2">{getUserRank().icon}</div>
            <div className="text-lg font-bold mb-1">{getUserRank().rank}</div>
            <p className="text-xs opacity-90">Rank Anda</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-slide-up">
        {achievements.map((achievement, index) => (
          <div
            key={achievement.id}
            className={`rounded-2xl p-6 shadow-lg transition-all duration-300 hover:shadow-xl transform hover:-translate-y-1 ${
              achievement.unlocked
                ? 'bg-white/80 backdrop-blur-sm border-2 border-green-200'
                : 'bg-white/40 backdrop-blur-sm border-2 border-slate-200 opacity-75'
            }`}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`text-4xl ${achievement.unlocked ? '' : 'grayscale opacity-50'}`}>
                  {achievement.icon}
                </div>
                <div>
                  <h3 className={`font-bold text-lg ${achievement.unlocked ? 'text-slate-800' : 'text-slate-500'}`}>
                    {achievement.title}
                  </h3>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${getCategoryColor(achievement.category)}`}>
                    {achievement.category}
                  </span>
                </div>
              </div>
              {achievement.unlocked && (
                <div className="text-green-600 text-xl">✓</div>
              )}
            </div>

            <p className={`text-sm mb-4 ${achievement.unlocked ? 'text-slate-600' : 'text-slate-400'}`}>
              {achievement.description}
            </p>

            <div className="mb-4">
              <div className="flex justify-between text-xs mb-2">
                <span className={achievement.unlocked ? 'text-slate-600' : 'text-slate-400'}>
                  Progress
                </span>
                <span className={achievement.unlocked ? 'text-slate-600' : 'text-slate-400'}>
                  {achievement.progress}/{achievement.target}
                </span>
              </div>
              <div className="bg-slate-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    achievement.unlocked
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                      : 'bg-gradient-to-r from-slate-400 to-slate-500'
                  }`}
                  style={{ width: `${Math.min((achievement.progress / achievement.target) * 100, 100)}%` }}
                ></div>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div className={`text-sm font-semibold ${achievement.unlocked ? 'text-blue-600' : 'text-slate-400'}`}>
                {achievement.points} poin
              </div>
              {achievement.unlocked && (
                <div className="text-xs text-green-600 font-semibold bg-green-50 px-2 py-1 rounded-full">
                  UNLOCKED
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white text-center animate-bounce-in">
        <div className="text-4xl mb-4">
          {getUnlockedCount() === 0 ? "🌟" :
           getUnlockedCount() < 5 ? "🚀" :
           getUnlockedCount() < 15 ? "⭐" :
           getUnlockedCount() < 25 ? "🏆" :
           getUnlockedCount() === achievements.length ? "👑" : "🎯"}
        </div>
        <h2 className="text-2xl font-bold mb-4">
          {getUnlockedCount() === 0
            ? "Mulai Petualangan Belajar Anda!"
            : getUnlockedCount() < 5
            ? "Awal yang Bagus! Terus Semangat!"
            : getUnlockedCount() < 15
            ? "Luar Biasa! Anda Semakin Mahir!"
            : getUnlockedCount() < 25
            ? "Wow! Anda Hampir Jadi Master!"
            : getUnlockedCount() === achievements.length
            ? "🎉 SELAMAT! Anda adalah GRAND MASTER! 🎉"
            : "Terus Berjuang Menuju Puncak!"
          }
        </h2>
        <p className="text-lg opacity-90">
          {getUnlockedCount() === 0
            ? "Mulai dengan kuis pertama dan rasakan keseruan belajar! Setiap langkah kecil adalah kemajuan besar."
            : getUnlockedCount() < 5
            ? `Hebat! Anda sudah membuka ${getUnlockedCount()} achievement. Momentum yang bagus, jangan berhenti!`
            : getUnlockedCount() < 15
            ? `Menakjubkan! ${getUnlockedCount()} achievement sudah terbuka. Anda benar-benar pembelajar yang gigih!`
            : getUnlockedCount() < 25
            ? `Fantastis! ${getUnlockedCount()} achievement! Anda hampir mencapai level master. Sedikit lagi!`
            : getUnlockedCount() === achievements.length
            ? "Anda telah mencapai puncak tertinggi! Anda adalah inspirasi bagi semua pembelajar. Tetap jaga semangat belajar!"
            : `Luar biasa! ${getUnlockedCount()} dari ${achievements.length} achievement terbuka. Anda di jalur yang tepat menuju kesempurnaan!`
          }
        </p>

        {getUnlockedCount() > 0 && (
          <div className="mt-6 flex justify-center space-x-4">
            <div className="bg-white/20 rounded-lg px-4 py-2">
              <div className="text-sm opacity-75">Total Poin</div>
              <div className="text-xl font-bold">{getTotalPoints()}</div>
            </div>
            <div className="bg-white/20 rounded-lg px-4 py-2">
              <div className="text-sm opacity-75">Progress</div>
              <div className="text-xl font-bold">
                {Math.round((getUnlockedCount() / achievements.length) * 100)}%
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AchievementsPage;
