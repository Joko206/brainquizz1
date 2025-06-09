import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApiCache } from "../hooks/useApiCache";
import { api } from "../services/api";

const DataTable = ({
  title,
  endpoint,
  fields,
  onAdd,
  onEdit,
  onDelete,
  transformData = (data) => data,
}) => {
  const [data, setData] = useState([]);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [editingItem, setEditingItem] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState(
    fields.reduce((acc, field) => ({ ...acc, [field.name]: "" }), {})
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const fetchData = async (retryCount = 0) => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      console.log("Fetching data from:", endpoint);
      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        credentials: 'include',
      });

      console.log("Response status:", response.status);
      console.log("Response headers:", response.headers);

      // Cek content type
      const contentType = response.headers.get("content-type");
      console.log("Content-Type:", contentType);

      if (!contentType || !contentType.includes("application/json")) {
        console.error("Invalid content type:", contentType);
        console.log("🚨 DataTable: Non-JSON response detected");
        // Don't auto logout - just throw error
        throw new Error("Terjadi kesalahan pada server");
      }

      const responseData = await response.json();
      console.log("Data yang diterima:", responseData);

      if (response.ok) {
        if (responseData.success && responseData.data) {
          const transformedData = transformData(responseData.data);
          console.log("Data setelah transformasi:", transformedData);
          setData(transformedData);
          setError("");
        } else {
          console.error("Format data tidak valid:", responseData);
          setError(
            "Format data tidak valid: " +
              (responseData.message || "Tidak ada pesan error")
          );
        }
      } else {
        // Don't auto logout on 401 - just show error
        if (response.status === 401) {
          setError("Sesi Anda telah berakhir. Silakan login kembali.");
        } else {
          if (retryCount < 3) {
            console.log(`Retry attempt ${retryCount + 1} of 3`);
            await delay(1000); // Tunggu 1 detik sebelum retry
            return fetchData(retryCount + 1);
          } else {
            setError(
              responseData.message ||
                "Gagal mengambil data setelah beberapa percobaan"
            );
          }
        }
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      if (retryCount < 3) {
        console.log(`Retry attempt ${retryCount + 1} of 3`);
        await delay(1000); // Tunggu 1 detik sebelum retry
        return fetchData(retryCount + 1);
      } else {
        setError(err.message || "Terjadi kesalahan saat mengambil data");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      const result = await onAdd(newItem);
      if (result && result.success !== false) {
        setNewItem(
          fields.reduce((acc, field) => ({ ...acc, [field.name]: "" }), {})
        );
        setShowAddForm(false);
        setSuccessMessage("Data berhasil ditambahkan!");
        await fetchData();

        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(""), 3000);
      }
    } catch (err) {
      console.error("Error adding data:", err);
      setError(err.message || "Terjadi kesalahan saat menambahkan data");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      const itemId = editingItem?.id || editingItem?.ID;
      if (!editingItem || !itemId) {
        console.error("❌ Update failed: ID tidak ditemukan", editingItem);
        throw new Error("ID tidak ditemukan");
      }

      const result = await onEdit(itemId, editingItem);

      if (result && result.success !== false) {
        setEditingItem(null);
        setShowAddForm(false);
        setSuccessMessage("Data berhasil diperbarui!");
        await fetchData();

        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(""), 3000);
      } else {
        throw new Error(result?.message || "Update gagal");
      }
    } catch (err) {
      setError(err.message || "Terjadi kesalahan saat memperbarui data");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (item) => {
    const itemId = item?.id || item?.ID || item;
    if (!itemId) {
      setError("ID tidak ditemukan");
      return;
    }

    // Show ID and ask for confirmation
    const itemName = item?.name || item?.title || "Item";
    const confirmMessage = `Akan menghapus data dengan:\n\nID: ${itemId}\nNama: ${itemName}\n\nApakah Anda yakin ingin menghapus data ini?\nTindakan ini tidak dapat dibatalkan.`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setError("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      const result = await onDelete(itemId);
      if (result && result.success !== false) {
        setSuccessMessage("Data berhasil dihapus!");
        await fetchData();

        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(""), 3000);
      }
    } catch (err) {
      console.error("Error deleting data:", err);
      setError(err.message || "Terjadi kesalahan saat menghapus data");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderForm = () => {
    if (!showAddForm && !editingItem) {
      return null;
    }



    return (
      <div className="mb-8 p-6 bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 animate-slide-up">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {editingItem ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              )}
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800">
            {editingItem ? "Edit Data" : "Tambah Data Baru"}
          </h2>
          {editingItem && (
            <div className="text-sm text-gray-600 bg-blue-50 px-3 py-1 rounded-lg">
              ID: {editingItem.id || editingItem.ID}
            </div>
          )}
        </div>

        <form onSubmit={editingItem ? handleUpdate : handleAdd} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {fields.map((field, index) => (
              <div key={`${field.name}-${index}`} className={field.type === "textarea" ? "md:col-span-2" : ""}>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {field.label}
                </label>
                {field.type === "textarea" ? (
                  <textarea
                    name={field.name}
                    value={
                      editingItem ? (editingItem[field.name] || "") : (newItem[field.name] || "")
                    }
                    onChange={(e) =>
                      editingItem
                        ? setEditingItem({
                            ...editingItem,
                            [field.name]: e.target.value,
                          })
                        : setNewItem({ ...newItem, [field.name]: e.target.value })
                    }
                    className="input-modern min-h-[100px] resize-none"
                    required={field.required}
                    placeholder={`Masukkan ${field.label.toLowerCase()}`}
                  />
                ) : (
                  <input
                    type={field.type || "text"}
                    name={field.name}
                    value={
                      editingItem ? (editingItem[field.name] || "") : (newItem[field.name] || "")
                    }
                    onChange={(e) =>
                      editingItem
                        ? setEditingItem({
                            ...editingItem,
                            [field.name]: e.target.value,
                          })
                        : setNewItem({ ...newItem, [field.name]: e.target.value })
                    }
                    className="input-modern"
                    required={field.required}
                    placeholder={`Masukkan ${field.label.toLowerCase()}`}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={() => {
                setEditingItem(null);
                setShowAddForm(false);
                setNewItem(
                  fields.reduce(
                    (acc, field) => ({ ...acc, [field.name]: "" }),
                    {}
                  )
                );
              }}
              className="btn-outline flex items-center justify-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>Batal</span>
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`btn-primary flex items-center justify-center space-x-2 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {editingItem ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    )}
                  </svg>
                  <span>{editingItem ? "Update Data" : "Simpan Data"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-8 border border-white/20">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 space-y-4 sm:space-y-0">
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {title}
              </h2>
              <p className="text-gray-600 mt-1">Kelola data dengan mudah dan efisien</p>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="btn-primary flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Tambah Data</span>
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center space-x-2 animate-fade-in">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl flex items-center space-x-2 animate-fade-in">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{successMessage}</span>
            </div>
          )}

          {/* Form */}
          {renderForm()}

          {/* Loading State */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="spinner"></div>
              <p className="text-gray-600 font-medium">Memuat data...</p>
            </div>
          ) : (
            /* Data Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center py-16 space-y-4">
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Belum ada data</h3>
                    <p className="text-gray-600">Klik tombol "Tambah Data" untuk memulai</p>
                  </div>
                </div>
              ) : (
                data.map((item, index) => {
                  const itemId = item.id || item.ID;
                  return (
                    <div
                      key={itemId}
                      className="group card card-hover animate-scale-in"
                      style={{
                        animationDelay: `${index * 0.1}s`,
                        cursor: title === "Daftar Kelas" ? "pointer" : "default",
                      }}
                      onClick={() => {
                        if (title === "Daftar Kelas") {
                          navigate(`/kelas/${itemId}`);
                        }
                      }}
                    >
                    <div className="p-6">
                      {fields.map((field) => (
                        <div key={field.name} className="mb-3 last:mb-0">
                          <div className="text-sm text-gray-500 font-medium mb-1 capitalize">
                            {field.label}
                          </div>
                          <div className="text-gray-800 font-semibold group-hover:text-blue-600 transition-colors duration-200">
                            {item[field.name]}
                          </div>
                        </div>
                      ))}

                      {/* Join Code untuk Kelas */}
                      {title === "Daftar Kelas" && item.join_code && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm text-gray-500 font-medium mb-1">
                                Kode Join
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="font-mono font-bold text-green-700 bg-green-100 px-3 py-1 rounded-lg text-lg">
                                  {item.join_code}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(item.join_code);
                                    alert('Kode join berhasil disalin!');
                                  }}
                                  className="p-2 hover:bg-green-100 rounded-lg transition-colors duration-200"
                                  title="Salin kode join"
                                >
                                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                          <div className="mt-2 text-xs text-gray-500">
                            Bagikan kode ini kepada siswa untuk bergabung dengan kelas
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 flex justify-end space-x-3 border-t border-gray-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingItem(item);
                          setShowAddForm(false); // Ensure add form is closed
                        }}
                        className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                        title={`Edit data dengan ID: ${item.id || item.ID}`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item);
                        }}
                        disabled={isSubmitting}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title={`Hapus data dengan ID: ${item.id || item.ID}`}
                      >
                        {isSubmitting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                            <span>Menghapus...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span>Hapus</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataTable;
