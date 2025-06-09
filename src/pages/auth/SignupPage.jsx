import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { userAPI } from "../../services/quizApi";

import Button from "../../components/UI/Button";
import Input from "../../components/UI/Input";
import Select from "../../components/UI/Select";

const SignupPage = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();



  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // Validasi role
    if (
      !role ||
      (role !== "teacher" && role !== "student")
    ) {
      setError("Peran tidak valid. Silakan pilih peran: Guru atau Siswa");
      setIsLoading(false);
      return;
    }

    try {
      if (import.meta.env.DEV) {
        console.log("Mencoba registrasi dengan:", { name, email, role });
      }

      const response = await userAPI.register({ name, email, password, role });

      if (import.meta.env.DEV) {
        console.log("Response dari server:", response);
      }

      if (response.success) {
        // Success notification
        const successDiv = document.createElement('div');
        successDiv.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in';
        successDiv.innerHTML = '✅ Pendaftaran berhasil! Mengarahkan ke halaman login...';
        document.body.appendChild(successDiv);

        setTimeout(() => {
          document.body.removeChild(successDiv);
          navigate("/login");
        }, 2000);
      } else {
        setError(response.message || "Pendaftaran gagal. Silakan coba lagi.");
      }
    } catch (err) {
      console.error("Error saat registrasi:", err);

      // More specific error messages
      let errorMessage = "Terjadi kesalahan saat mendaftar.";

      if (err.message.includes("terhubung ke server")) {
        errorMessage = "Tidak dapat terhubung ke server. Periksa koneksi internet Anda.";
      } else if (err.message.includes("fetch")) {
        errorMessage = "Gagal menghubungi server. Silakan coba lagi nanti.";
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center animate-fade-in">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
          </div>
          <h2 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-2">
            Bergabung Sekarang! 🚀
          </h2>
          <p className="text-gray-600 text-lg">Daftar untuk memulai perjalanan belajar yang menyenangkan</p>
        </div>

        {/* Signup Form */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-8 border border-white/20 animate-slide-up">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 animate-fade-in flex items-center space-x-2">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSignup}>
            <div className="space-y-4">
              <Input
                label="Nama Lengkap"
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Masukkan nama lengkap Anda"
              />

              <Input
                label="Alamat Email"
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Masukkan alamat email Anda"
              />

              <Input
                label="Kata Sandi"
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Buat kata sandi yang kuat"
              />

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Peran Akun
                </label>
                <select
                  id="role"
                  required
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="input-modern"
                >
                  <option value="">Pilih peran Anda</option>
                  <option value="student">👨‍🎓 Siswa - Untuk belajar dan mengikuti kuis</option>
                  <option value="teacher">👨‍🏫 Guru - Untuk mengajar dan membuat konten</option>
                </select>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="spinner w-5 h-5"></div>
                  <span>Mendaftarkan Akun...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  <span>Daftar Sekarang</span>
                </div>
              )}
            </Button>



            <div className="text-center">
              <p className="text-sm text-gray-600">
                Sudah punya akun?{" "}
                <a
                  href="/login"
                  className="font-semibold text-emerald-600 hover:text-teal-600 transition-colors duration-200"
                >
                  Masuk di sini
                </a>
              </p>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center animate-fade-in">
          <p className="text-sm text-gray-500">
            Dengan mendaftar, Anda menyetujui syarat dan ketentuan kami.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
