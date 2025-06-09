import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import JoinCodeDisplay from '../../components/JoinCodeDisplay';

const JoinKelasPage = () => {
  const [joinedClasses, setJoinedClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joiningClass, setJoiningClass] = useState(false);

  useEffect(() => {
    fetchJoinedClasses();
  }, []);

  const fetchJoinedClasses = async () => {
    try {
      setLoading(true);
      // Gunakan API khusus untuk mendapatkan kelas yang sudah di-join
      const response = await api.getJoinedClasses();
      if (response.success) {
        // Hanya tampilkan kelas yang sudah di-join oleh user
        setJoinedClasses(response.data || []);
      } else {
        // Jika tidak ada kelas yang di-join
        console.log('Tidak ada kelas yang sudah di-join');
        setJoinedClasses([]);
        setError(null);
      }
    } catch (error) {
      console.error('Error fetching joined classes:', error);
      // Jika error, tampilkan empty state
      setJoinedClasses([]);
      setError('Gagal memuat data kelas yang sudah bergabung');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClass = async () => {
    if (!joinCode.trim()) {
      alert('Masukkan kode join kelas');
      return;
    }

    try {
      setJoiningClass(true);
      // Gunakan API untuk join kelas dengan kode
      const response = await api.joinClassWithCode(joinCode.trim().toUpperCase());
      if (response.success) {
        alert('Berhasil bergabung dengan kelas!');
        setShowJoinModal(false);
        setJoinCode('');
        fetchJoinedClasses(); // Refresh data untuk menampilkan kelas baru
      } else {
        alert('Gagal bergabung: ' + (response.message || 'Kode join tidak valid'));
      }
    } catch (error) {
      console.error('Error joining class:', error);
      alert('Gagal bergabung dengan kelas: ' + (error.message || 'Terjadi kesalahan'));
    } finally {
      setJoiningClass(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Memuat kelas yang sudah bergabung...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Kelas yang Sudah Bergabung
              </h1>
              <p className="text-gray-600">
                Kelola kelas yang sudah Anda ikuti dan bergabung dengan kelas baru
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              <button
                onClick={() => setShowJoinModal(true)}
                className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Bergabung Kelas
              </button>
            </div>
          </div>
        </div>



        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-red-700">{error}</span>
            </div>
          </div>
        )}

        {/* Joined Classes Grid */}
        {joinedClasses.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Belum Bergabung dengan Kelas</h3>
            <p className="text-gray-500 mb-6">
              Anda belum bergabung dengan kelas apapun. Dapatkan kode join dari guru Anda dan bergabung untuk mengakses quiz private.
            </p>
            <button
              onClick={() => setShowJoinModal(true)}
              className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Bergabung Kelas Pertama
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {joinedClasses.map((kelas, index) => (
              <div
                key={kelas.ID || kelas.id}
                className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Class Header */}
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-2">{kelas.name}</h3>
                      <p className="text-green-100 text-sm line-clamp-2">
                        {kelas.description || 'Tidak ada deskripsi'}
                      </p>
                    </div>
                    <div className="ml-4">
                      <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Class Content */}
                <div className="p-6">
                  {/* Join Code Display */}
                  {kelas.join_code && (
                    <div className="mb-6">
                      <JoinCodeDisplay
                        joinCode={kelas.join_code}
                        variant="green"
                        size="small"
                        showLabel={false}
                        showCopyButton={true}
                        showDescription={false}
                        className="mb-2"
                      />
                      <p className="text-xs text-gray-500 text-center">
                        Kode join kelas ini
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    <button
                      onClick={() => window.location.href = `/kelas/${kelas.ID || kelas.id}`}
                      className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Lihat Quiz Kelas
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Join Class Modal */}
        {showJoinModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Bergabung dengan Kelas</h3>
                  <button
                    onClick={() => setShowJoinModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kode Join Kelas
                  </label>
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 font-mono text-center text-lg"
                    placeholder="Masukkan kode 6 karakter"
                    maxLength={6}
                    disabled={joiningClass}
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    Masukkan kode join yang diberikan oleh guru Anda
                  </p>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowJoinModal(false)}
                    className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                    disabled={joiningClass}
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleJoinClass}
                    className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
                    disabled={joiningClass || !joinCode.trim()}
                  >
                    {joiningClass ? 'Bergabung...' : 'Bergabung'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Help Section */}
        <div className="mt-12 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-lg font-semibold text-blue-800 mb-2">
                Cara Bergabung dengan Kelas
              </h4>
              <div className="text-blue-700 text-sm space-y-1">
                <p>• <strong>Dapatkan kode join</strong> dari guru Anda (6 karakter, contoh: ABC123)</p>
                <p>• <strong>Klik "Bergabung Kelas"</strong> dan masukkan kode dengan benar</p>
                <p>• <strong>Setelah bergabung</strong>, kelas akan muncul di halaman ini</p>
                <p>• <strong>Quiz private kelas</strong> akan tersedia di halaman "Ambil Kuis"</p>
                <p>• <strong>Halaman ini hanya menampilkan</strong> kelas yang sudah Anda ikuti</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JoinKelasPage;