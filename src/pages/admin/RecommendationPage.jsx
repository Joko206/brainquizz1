import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';

const BASE_URL = import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "/api" : "https://brainquiz0.up.railway.app");

const RecommendationPage = () => {
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState({
    notCompleted: [],
    weakCategories: [],
    nextLevel: [],
    popular: []
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('notCompleted');

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

  // Handle navigation
  const handleNavigate = (path) => {
    console.log('🔗 Recommendation navigating to:', path);
    navigate(path);
  };

  useEffect(() => {
    if (userId) {
      fetchRecommendations();
    }
  }, [userId]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);

      // OPTIMIZED: Fetch all required data including hasil kuis in single call
      const [kuisRes, kategoriRes, tingkatanRes, hasilRes] = await Promise.all([
        api.getKuis(),
        api.getKategori(),
        api.getTingkatan(),
        api.getMyHasilKuis()
      ]);

      if (kuisRes.success && kategoriRes.success && tingkatanRes.success) {
        await generateRecommendations(kuisRes.data, kategoriRes.data, tingkatanRes.data, hasilRes.success ? hasilRes.data : []);
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateRecommendations = async (allKuis, allKategori, allTingkatan, hasilKuisList) => {
    const completedQuizIds = new Set();
    const categoryPerformance = {};

    // Initialize category performance tracking
    allKategori.forEach(kategori => {
      categoryPerformance[kategori.ID] = {
        name: kategori.name,
        totalScore: 0,
        count: 0,
        averageScore: 0
      };
    });

    // OPTIMIZED: Process results from single API call
    for (const hasil of hasilKuisList) {
      try {
        // Find the corresponding quiz
        const kuis = allKuis.find(k => k.ID === hasil.kuis_id);
        if (!kuis) continue;

        completedQuizIds.add(kuis.ID);

        // Track category performance
        const score = hasil.score || 0;
        if (categoryPerformance[kuis.kategori_id]) {
          categoryPerformance[kuis.kategori_id].totalScore += score;
          categoryPerformance[kuis.kategori_id].count++;
        }

        // Small delay to prevent overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error) {
        console.error(`Error processing quiz result ${hasil.kuis_id}:`, error);
        // Continue with next result
      }
    }

    // Calculate category averages
    Object.values(categoryPerformance).forEach(category => {
      if (category.count > 0) {
        category.averageScore = Math.round(category.totalScore / category.count);
      }
    });

    // Generate recommendations
    const notCompleted = allKuis
      .filter(kuis => !completedQuizIds.has(kuis.ID))
      .map(kuis => ({
        ...kuis,
        kategoriName: allKategori.find(k => k.ID === kuis.kategori_id)?.name || 'Unknown',
        tingkatanName: allTingkatan.find(t => t.ID === kuis.tingkatan_id)?.name || 'Unknown',
        reason: 'Belum dikerjakan'
      }))
      .slice(0, 12);

    // Find weak categories (score < 70)
    const weakCategoryIds = Object.entries(categoryPerformance)
      .filter(([_, perf]) => perf.count > 0 && perf.averageScore < 70)
      .map(([categoryId, _]) => parseInt(categoryId));

    const weakCategories = allKuis
      .filter(kuis => weakCategoryIds.includes(kuis.kategori_id) && !completedQuizIds.has(kuis.ID))
      .map(kuis => ({
        ...kuis,
        kategoriName: allKategori.find(k => k.ID === kuis.kategori_id)?.name || 'Unknown',
        tingkatanName: allTingkatan.find(t => t.ID === kuis.tingkatan_id)?.name || 'Unknown',
        reason: `Tingkatkan performa di ${allKategori.find(k => k.ID === kuis.kategori_id)?.name}`
      }))
      .slice(0, 8);

    // Find next level quizzes (higher tingkatan in completed categories)
    const completedCategories = Object.entries(categoryPerformance)
      .filter(([_, perf]) => perf.count > 0 && perf.averageScore >= 70)
      .map(([categoryId, _]) => parseInt(categoryId));

    const nextLevel = allKuis
      .filter(kuis => 
        completedCategories.includes(kuis.kategori_id) && 
        !completedQuizIds.has(kuis.ID)
      )
      .map(kuis => ({
        ...kuis,
        kategoriName: allKategori.find(k => k.ID === kuis.kategori_id)?.name || 'Unknown',
        tingkatanName: allTingkatan.find(t => t.ID === kuis.tingkatan_id)?.name || 'Unknown',
        reason: 'Level selanjutnya'
      }))
      .slice(0, 8);

    // Popular quizzes (random selection for now, could be based on completion count)
    const popular = allKuis
      .filter(kuis => !completedQuizIds.has(kuis.ID))
      .sort(() => Math.random() - 0.5)
      .map(kuis => ({
        ...kuis,
        kategoriName: allKategori.find(k => k.ID === kuis.kategori_id)?.name || 'Unknown',
        tingkatanName: allTingkatan.find(t => t.ID === kuis.tingkatan_id)?.name || 'Unknown',
        reason: 'Populer'
      }))
      .slice(0, 8);

    setRecommendations({
      notCompleted,
      weakCategories,
      nextLevel,
      popular
    });
  };

  const getDifficultyColor = (tingkatanName) => {
    const name = tingkatanName.toLowerCase();
    if (name.includes('mudah') || name.includes('easy')) return 'bg-green-100 text-green-800';
    if (name.includes('sedang') || name.includes('medium')) return 'bg-yellow-100 text-yellow-800';
    if (name.includes('sulit') || name.includes('hard')) return 'bg-red-100 text-red-800';
    return 'bg-blue-100 text-blue-800';
  };

  const tabs = [
    { id: 'notCompleted', label: 'Belum Dikerjakan', icon: '📝', count: recommendations.notCompleted.length },
    { id: 'weakCategories', label: 'Perlu Diperbaiki', icon: '⚠️', count: recommendations.weakCategories.length },
    { id: 'nextLevel', label: 'Level Selanjutnya', icon: '🚀', count: recommendations.nextLevel.length },
    { id: 'popular', label: 'Populer', icon: '🔥', count: recommendations.popular.length }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Menyiapkan rekomendasi untuk Anda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8">
      {/* Header */}
      <div className="mb-8 animate-fade-in">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">
          🎯 Rekomendasi Kuis
        </h1>
        <p className="text-xl text-slate-600 font-medium">
          Kuis yang dipersonalisasi berdasarkan performa Anda
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-8">
        <div className="flex flex-wrap gap-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center space-x-2 ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white/60 text-slate-700 hover:bg-white/80'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              <span className={`px-2 py-1 rounded-full text-xs ${
                activeTab === tab.id ? 'bg-white/20' : 'bg-slate-200'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Quiz Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-slide-up">
        {recommendations[activeTab].map((kuis, index) => (
          <div
            key={kuis.ID}
            className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 animate-scale-in"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="font-bold text-slate-800 text-lg mb-2 line-clamp-2">
                  {kuis.title}
                </h3>
                <p className="text-slate-600 text-sm mb-3 line-clamp-2">
                  {kuis.description}
                </p>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">KATEGORI</span>
                <span className="text-xs font-semibold text-blue-600">{kuis.kategoriName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">TINGKATAN</span>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${getDifficultyColor(kuis.tingkatanName)}`}>
                  {kuis.tingkatanName}
                </span>
              </div>
            </div>

            <div className="mb-4">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-200">
                <div className="flex items-center space-x-2">
                  <span className="text-blue-600">💡</span>
                  <span className="text-sm font-medium text-blue-800">{kuis.reason}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleNavigate(`/kuis/${kuis.ID}/jawab`)}
              className="block w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-center py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Mulai Kuis
            </button>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {recommendations[activeTab].length === 0 && (
        <div className="text-center py-16 animate-fade-in">
          <div className="text-6xl mb-4">
            {activeTab === 'notCompleted' && '📝'}
            {activeTab === 'weakCategories' && '⚠️'}
            {activeTab === 'nextLevel' && '🚀'}
            {activeTab === 'popular' && '🔥'}
          </div>
          <h3 className="text-2xl font-bold text-slate-800 mb-2">
            {activeTab === 'notCompleted' && 'Semua Kuis Sudah Diselesaikan!'}
            {activeTab === 'weakCategories' && 'Tidak Ada Kategori yang Perlu Diperbaiki'}
            {activeTab === 'nextLevel' && 'Belum Ada Level Selanjutnya'}
            {activeTab === 'popular' && 'Tidak Ada Kuis Populer'}
          </h3>
          <p className="text-slate-600 mb-6">
            {activeTab === 'notCompleted' && 'Luar biasa! Anda telah menyelesaikan semua kuis yang tersedia.'}
            {activeTab === 'weakCategories' && 'Performa Anda sudah bagus di semua kategori!'}
            {activeTab === 'nextLevel' && 'Selesaikan lebih banyak kuis untuk membuka level selanjutnya.'}
            {activeTab === 'popular' && 'Coba tab lain untuk menemukan kuis yang menarik.'}
          </p>
          <button
            onClick={() => handleNavigate('/ambil-kuis')}
            className="btn-primary inline-block"
          >
            Jelajahi Semua Kuis
          </button>
        </div>
      )}
    </div>
  );
};

export default RecommendationPage;
