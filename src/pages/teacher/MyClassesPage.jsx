import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import JoinCodeDisplay from '../../components/JoinCodeDisplay';

const MyClassesPage = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingClass, setEditingClass] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({ name: '', description: '' });
  const [openDropdown, setOpenDropdown] = useState(null);
  const [classStats, setClassStats] = useState({}); // Store stats for each class
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    fetchClasses();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openDropdown && !event.target.closest('.dropdown-container')) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdown]);

  const fetchClassStats = useCallback(async (classesData) => {
    setStatsLoading(true);
    const stats = {};

    // Process classes sequentially to reduce database load
    for (const kelas of classesData) {
      const kelasId = kelas.ID || kelas.id;

      try {
        // Fetch quiz count for this class
        const kuisResponse = await api.getKuisByKelasId(kelasId);

        const kuisCount = kuisResponse.success ? (kuisResponse.data || []).length : 0;

        // TODO: Fetch student count when backend implements /kelas/get-students/{kelasId}
        // For now, set to 0 since the endpoint doesn't exist yet
        const studentCount = 0;

        // Future implementation:
        // const studentsResponse = await api.getStudentsByKelasId(kelasId);
        // const studentCount = studentsResponse.success ? (studentsResponse.data || []).length : 0;

        stats[kelasId] = {
          kuisCount,
          studentCount
        };

        // Add small delay between requests to prevent overwhelming database
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        console.warn(`Error fetching stats for class ${kelasId}:`, error.message);
        // Set default values for failed requests
        stats[kelasId] = {
          kuisCount: 0,
          studentCount: 0
        };
      }
    }

    setClassStats(stats);
    setStatsLoading(false);
  }, []);

  const fetchClasses = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch classes data
      const response = await api.getKelas();

      if (response.success) {
        const classesData = response.data || [];
        setClasses(classesData);

        // Fetch stats for each class with delay to prevent database overload
        if (classesData.length > 0) {
          setTimeout(() => {
            fetchClassStats(classesData);
          }, 500); // Delay stats fetch to reduce initial load
        }
      } else {
        setError('Gagal memuat data kelas');
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      setError('Terjadi kesalahan saat memuat data');
    } finally {
      setLoading(false);
    }
  }, [fetchClassStats]);

  const handleEditClass = (kelas) => {
    setEditingClass(kelas);
    setEditFormData({
      name: kelas.name || '',
      description: kelas.description || ''
    });
    setShowEditModal(true);
  };

  const handleUpdateClass = async () => {
    try {
      const response = await api.updateKelas(editingClass.ID || editingClass.id, editFormData);
      if (response.success) {
        alert('Kelas berhasil diupdate');
        setShowEditModal(false);
        setEditingClass(null);
        fetchClasses(); // Refresh data
      } else {
        alert('Gagal mengupdate kelas: ' + response.message);
      }
    } catch (error) {
      console.error('Error updating class:', error);
      alert('Terjadi kesalahan saat mengupdate kelas');
    }
  };

  const handleDeleteClass = async (kelas) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus kelas "${kelas.name}"?\n\nSemua quiz dalam kelas ini juga akan terhapus.`)) {
      return;
    }

    try {
      const response = await api.deleteKelas(kelas.ID || kelas.id);
      if (response.success) {
        alert('Kelas berhasil dihapus');
        fetchClasses(); // Refresh data
      } else {
        alert('Gagal menghapus kelas: ' + response.message);
      }
    } catch (error) {
      console.error('Error deleting class:', error);
      alert('Terjadi kesalahan saat menghapus kelas');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Memuat data kelas...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error</h3>
            <p className="text-gray-500">{error}</p>
            <button
              onClick={fetchClasses}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Coba Lagi
            </button>
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
                Kelas Saya
              </h1>
              <p className="text-gray-600">
                Kelola kelas dan bagikan kode join kepada siswa
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              <Link
                to="/daftar-kelas"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Kelola Kelas
              </Link>
            </div>
          </div>
        </div>

        {/* Classes Grid */}
        {classes.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Belum Ada Kelas</h3>
            <p className="text-gray-500 mb-6">Buat kelas pertama Anda untuk mulai mengajar</p>
            <Link
              to="/daftar-kelas"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Buat Kelas Baru
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map((kelas, index) => (
              <div
                key={kelas.ID || kelas.id}
                className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Class Header */}
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-2">{kelas.name}</h3>
                      <p className="text-blue-100 text-sm line-clamp-2">
                        {kelas.description || 'Tidak ada deskripsi'}
                      </p>
                    </div>
                    <div className="ml-4 flex items-center space-x-2">
                      <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>

                      {/* Dropdown Menu */}
                      <div className="relative dropdown-container">
                        <button
                          onClick={() => setOpenDropdown(openDropdown === (kelas.ID || kelas.id) ? null : (kelas.ID || kelas.id))}
                          className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </button>

                        {openDropdown === (kelas.ID || kelas.id) && (
                          <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                            <div className="py-1">
                              <button
                                onClick={() => {
                                  handleEditClass(kelas);
                                  setOpenDropdown(null);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                              >
                                <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                <span>Edit Kelas</span>
                              </button>
                              <button
                                onClick={() => {
                                  handleDeleteClass(kelas);
                                  setOpenDropdown(null);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                <span>Hapus Kelas</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Class Content */}
                <div className="p-6">
                  {/* Join Code - Most Important */}
                  {kelas.join_code && (
                    <div className="mb-6">
                      <JoinCodeDisplay
                        joinCode={kelas.join_code}
                        variant="green"
                        size="normal"
                        showLabel={true}
                        showCopyButton={true}
                        showDescription={false}
                        className="mb-2"
                      />
                      <p className="text-xs text-gray-500 text-center">
                        Bagikan kode ini kepada siswa untuk bergabung
                      </p>
                    </div>
                  )}

                  {/* Class Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {statsLoading ? (
                          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                        ) : (
                          <span title="Student count API belum tersedia">
                            {classStats[kelas.ID || kelas.id]?.studentCount || 0}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-600">Siswa</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {statsLoading ? (
                          <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                        ) : (
                          classStats[kelas.ID || kelas.id]?.kuisCount || 0
                        )}
                      </div>
                      <div className="text-xs text-gray-600">Kuis</div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    <Link
                      to={`/kelas/${kelas.ID || kelas.id}`}
                      className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Lihat Detail
                    </Link>
                    <Link
                      to={`/admin/manage-kuis?kelas_id=${kelas.ID || kelas.id}`}
                      className="w-full flex items-center justify-center px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm font-medium"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Kelola Kuis
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Help Section */}
        <div className="mt-12 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-lg font-semibold text-green-800 mb-2">
                Cara Menggunakan Kode Join
              </h4>
              <div className="text-green-700 text-sm space-y-1">
                <p>• <strong>Kode Join</strong> adalah kode unik untuk setiap kelas</p>
                <p>• <strong>Bagikan kode</strong> kepada siswa via WhatsApp, email, atau LMS</p>
                <p>• <strong>Siswa join</strong> dengan kode tersebut di halaman "Ambil Kuis"</p>
                <p>• <strong>Quiz private</strong> akan muncul setelah siswa join kelas</p>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Edit Kelas</h3>
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nama Kelas
                    </label>
                    <input
                      type="text"
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="Masukkan nama kelas"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Deskripsi
                    </label>
                    <textarea
                      value={editFormData.description}
                      onChange={(e) => setEditFormData({...editFormData, description: e.target.value})}
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
                      placeholder="Masukkan deskripsi kelas"
                    />
                  </div>
                </div>

                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleUpdateClass}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
                  >
                    Simpan
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyClassesPage;
