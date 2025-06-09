# 🧠 BrainQuiz - Platform Pembelajaran Interaktif

<div align="center">
  <img src="https://img.shields.io/badge/React-18.2.0-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/Vite-4.4.5-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/TailwindCSS-3.3.0-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="TailwindCSS" />
  <img src="https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript" />
</div>

<div align="center">
  <h3>🎯 Platform pembelajaran modern dengan gamifikasi yang membuat belajar menjadi menyenangkan!</h3>
  <p><em>Belajar, Berkompetisi, dan Berkembang bersama BrainQuiz</em></p>
</div>

---

## 📋 Daftar Isi

- [🌟 Fitur Utama](#-fitur-utama)
- [🎮 Sistem Gamifikasi](#-sistem-gamifikasi)
- [👥 Role & Permissions](#-role--permissions)
- [🛠️ Teknologi](#️-teknologi)
- [🚀 Instalasi](#-instalasi)
- [📱 Halaman & Fitur](#-halaman--fitur)
- [🎨 Design System](#-design-system)
- [📊 Analytics & Tracking](#-analytics--tracking)
- [🔧 Konfigurasi](#-konfigurasi)
- [🤝 Kontribusi](#-kontribusi)

---

## 🌟 Fitur Utama

### 🎯 **Sistem Kuis Interaktif**
- **Multiple Choice Questions** dengan validasi real-time
- **Timer** untuk setiap kuis dengan countdown visual
- **Instant Feedback** setelah menyelesaikan kuis
- **Score Calculation** yang akurat dan konsisten
- **Review Mode** untuk mengulang kuis dengan skor rendah

### 📊 **Dashboard Analytics**
- **Real-time Statistics** - Total kuis, rata-rata skor, progress
- **Performance Tracking** - Grafik performa per kategori
- **Recent Activity** - Aktivitas terbaru dan hasil kuis
- **Goal Setting** - Target harian dan mingguan yang dapat disesuaikan

### 🏆 **Achievement System**
- **40+ Achievements** dengan kategori beragam:
  - 🎯 **Beginner** - Untuk pemula
  - 📈 **Progress** - Berdasarkan jumlah kuis
  - ⭐ **Excellence** - Berdasarkan skor tinggi
  - 🎯 **Precision** - Berdasarkan akurasi
  - 🌍 **Exploration** - Eksplorasi kategori
  - 🔥 **Consistency** - Streak belajar
  - 🎉 **Special** - Achievement unik
  - 🏅 **Mastery** - Level master
  - 🌟 **Legendary** - Pencapaian tertinggi

### 📅 **Study Planner**
- **Real Data Integration** - Berdasarkan hasil kuis aktual
- **Smart Recommendations** - Saran kuis berdasarkan performa
- **Streak Tracking** - Pelacakan konsistensi belajar
- **Weekly Planning** - Rencana belajar mingguan
- **Progress Monitoring** - Monitoring target harian/mingguan

### 🏅 **Leaderboard & Competition**
- **Global Ranking** - Peringkat berdasarkan total skor
- **Category-based Ranking** - Peringkat per kategori
- **Real-time Updates** - Update otomatis saat ada perubahan
- **Achievement Showcase** - Tampilan pencapaian user

---

## 🎮 Sistem Gamifikasi

### 🏆 **Ranking System**
```
👑 Dewa Pembelajaran (10000+ poin)
🏆 Grand Master (5000-9999 poin)
⭐ Master (2000-4999 poin)
🎯 Expert (1000-1999 poin)
🚀 Advanced (500-999 poin)
📚 Intermediate (200-499 poin)
🌱 Beginner+ (50-199 poin)
🐣 Newbie (0-49 poin)
```

### 🔥 **Streak System**
- **Daily Streak** - Konsistensi harian
- **Longest Streak** - Rekor terpanjang
- **Streak Rewards** - Bonus poin untuk streak tinggi
- **Visual Indicators** - Icon dan warna berdasarkan streak

### 💎 **Point System**
- **Quiz Completion** - Poin berdasarkan skor
- **Perfect Score** - Bonus untuk skor 100%
- **Achievement Unlock** - Poin dari achievement
- **Consistency Bonus** - Bonus untuk streak

---

## 👥 Role & Permissions

### 👨‍🎓 **Student (Siswa)**
- ✅ Mengikuti kuis dan melihat hasil
- ✅ Melihat leaderboard dan achievements
- ✅ Menggunakan study planner
- ✅ Join kelas yang dibuat guru
- ✅ Melihat analytics personal

### 👨‍🏫 **Teacher (Guru)**
- ✅ Semua fitur Student
- ✅ Membuat dan mengelola kuis
- ✅ Membuat dan mengelola soal
- ✅ Membuat kelas dan mengundang siswa
- ✅ Melihat analytics kelas
- ✅ Mengelola kategori dan tingkatan

### 👨‍💼 **Admin**
- ✅ Semua fitur Teacher
- ✅ Mengelola semua user
- ✅ Mengelola sistem secara keseluruhan
- ✅ Akses ke semua data dan analytics
- ❌ Tidak bisa mendaftar melalui UI (hanya backend)

---

## 🛠️ Teknologi

### **Frontend Stack**
- **React 18.2.0** - UI Library dengan Hooks
- **Vite 4.4.5** - Build tool yang cepat
- **TailwindCSS 3.3.0** - Utility-first CSS framework
- **React Router DOM** - Client-side routing
- **Lucide React** - Icon library modern

### **State Management**
- **React Hooks** - useState, useEffect, useContext
- **Local Storage** - Persistent data storage
- **Session Management** - JWT token handling

### **API Integration & Optimization**
- **Smart Caching** - 5 menit cache untuk GET requests
- **Rate Limiting** - Max 3 concurrent requests
- **Request Deduplication** - Mencegah duplicate API calls
- **Automatic Retry** - Exponential backoff untuk failed requests
- **Batch Processing** - Efficient multiple API calls
- **RESTful API** - Backend communication
- **Error Handling** - Graceful error management
- **Loading States** - User feedback during operations

### **UI/UX Features**
- **Responsive Design** - Mobile-first approach
- **Dark/Light Mode** - Theme switching
- **Animations** - Smooth transitions dan micro-interactions
- **Progressive Web App** - PWA capabilities
- **Accessibility** - ARIA labels dan keyboard navigation

---

## 🚀 Instalasi

### **Prerequisites**
```bash
Node.js >= 16.0.0
npm >= 8.0.0
```

### **Clone Repository**
```bash
git clone <repository-url>
cd frontend
```

### **Install Dependencies**
```bash
npm install
```

### **Environment Setup**
```bash
# Buat file .env
cp .env.example .env

# Edit .env dengan konfigurasi yang sesuai
VITE_API_URL=https://brainquiz0.up.railway.app
```

### **Development Server**
```bash
npm run dev
# Aplikasi akan berjalan di http://localhost:5173
```

### **Build for Production**
```bash
npm run build
npm run preview
```

---

## 📱 Halaman & Fitur

### 🏠 **Dashboard**
- **Overview Statistics** - Ringkasan performa
- **Recent Activities** - Aktivitas terbaru
- **Quick Actions** - Akses cepat ke fitur utama
- **Progress Charts** - Visualisasi kemajuan

### 🎯 **Ambil Kuis**
- **Category Filter** - Filter berdasarkan kategori
- **Difficulty Levels** - Level kesulitan berbeda
- **Quiz Preview** - Preview sebelum memulai
- **Timer Integration** - Countdown timer

### 📊 **Hasil Kuis**
- **Score Display** - Tampilan skor dengan grade
- **Performance Analysis** - Analisis performa detail
- **Review Options** - Opsi untuk mengulang
- **Share Results** - Bagikan hasil ke social media

### 🏆 **Achievements**
- **Achievement Gallery** - Galeri semua achievement
- **Progress Tracking** - Progress untuk setiap achievement
- **Category Filtering** - Filter berdasarkan kategori
- **Ranking Display** - Tampilan ranking user

### 📅 **Study Planner**
- **Weekly Calendar** - Kalender mingguan
- **Smart Recommendations** - Rekomendasi berdasarkan AI
- **Goal Setting** - Pengaturan target
- **Progress Monitoring** - Monitoring kemajuan

### 🏅 **Leaderboard**
- **Global Ranking** - Peringkat global
- **Category Rankings** - Peringkat per kategori
- **Real-time Updates** - Update real-time
- **User Profiles** - Profil user lain

### 📈 **Analytics**
- **Performance Metrics** - Metrik performa
- **Trend Analysis** - Analisis tren
- **Category Breakdown** - Breakdown per kategori
- **Time-based Charts** - Grafik berdasarkan waktu

---

## 🎨 Design System

### **Color Palette**
```css
/* Primary Colors */
--blue-500: #3B82F6
--indigo-600: #4F46E5
--purple-600: #9333EA

/* Success Colors */
--green-500: #10B981
--emerald-600: #059669

/* Warning Colors */
--yellow-500: #F59E0B
--orange-500: #F97316

/* Error Colors */
--red-500: #EF4444
--red-600: #DC2626
```

### **Typography**
- **Font Family**: Inter, system-ui, sans-serif
- **Font Weights**: 400 (normal), 500 (medium), 600 (semibold), 700 (bold)
- **Font Sizes**: text-xs to text-4xl

### **Components**
- **Buttons** - Multiple variants dengan hover effects
- **Cards** - Glass morphism design
- **Forms** - Modern input styling
- **Modals** - Backdrop blur effects
- **Animations** - Smooth transitions

---

## 📊 Analytics & Tracking

### **User Analytics**
- **Quiz Completion Rate** - Tingkat penyelesaian kuis
- **Average Score Tracking** - Pelacakan rata-rata skor
- **Time Spent** - Waktu yang dihabiskan
- **Category Preferences** - Preferensi kategori

### **Performance Metrics**
- **Response Time** - Waktu respon aplikasi
- **Error Tracking** - Pelacakan error
- **User Engagement** - Tingkat keterlibatan user
- **Feature Usage** - Penggunaan fitur

### **Real-time Data**
- **Live Updates** - Update data real-time
- **Instant Feedback** - Feedback instan
- **Dynamic Content** - Konten yang dinamis
- **Progressive Loading** - Loading progresif

---

## 🔧 Konfigurasi

### **Environment Variables**
```env
# API Configuration
VITE_API_URL=https://brainquiz0.up.railway.app
VITE_APP_NAME=BrainQuiz
VITE_APP_VERSION=1.0.0

# Performance Optimization
VITE_MAX_CONCURRENT_REQUESTS=3
VITE_REQUEST_DELAY=200
VITE_CACHE_DURATION=300000
VITE_BATCH_SIZE=2

# Debug Settings (Development)
VITE_DEBUG_API=false
VITE_SHOW_CACHE_STATS=false
```

### **Build Configuration**
```javascript
// vite.config.js
export default {
  server: {
    proxy: {
      '/api': 'http://localhost:8000'
    }
  }
}
```

---

## ⚡ Performance Optimization

### **🚀 API Optimizations**
- **Smart Caching System** - Cache GET requests selama 5 menit
- **Rate Limiting** - Maksimal 3 request bersamaan untuk mencegah server overload
- **Request Deduplication** - Mencegah duplicate API calls yang tidak perlu
- **Batch Processing** - Memproses multiple requests dalam batch kecil
- **Automatic Retry** - Retry otomatis dengan exponential backoff
- **Queue Management** - Antrian request dengan prioritas

### **📊 Performance Metrics**
```
Sebelum Optimasi:
❌ 10-15 request bersamaan saat load dashboard
❌ Data diambil ulang setiap page refresh
❌ Loading time 3-5 detik

Setelah Optimasi:
✅ Max 3 request bersamaan dengan queue
✅ Data di-cache selama 5 menit
✅ Loading time 1-2 detik (cached data instant)
✅ 50-70% pengurangan server load
```

### **🛠️ Custom Hooks untuk Optimasi**
```javascript
// API Caching Hook
const { data, loading, error } = useApiCache(
  api.getKategori,
  [],
  { cacheKey: 'dashboard_kategori' }
);

// Batch API Hook
const { results, progress } = useBatchApi(apiCalls, {
  batchSize: 2,
  delay: 500
});
```

---

## 🎯 Fitur Unggulan

### **🧠 Smart Score Calculation**
- **Consistent Algorithm** - Algoritma scoring yang konsisten di semua halaman
- **Real-time Feedback** - Feedback langsung setelah menyelesaikan kuis
- **Grade System** - Sistem grade A-E berdasarkan persentase
- **Progress Tracking** - Pelacakan kemajuan yang akurat

### **🎮 Gamification Elements**
- **Achievement Unlocks** - Notifikasi saat membuka achievement baru
- **Streak Counters** - Visual streak counter dengan emoji
- **Point System** - Sistem poin yang memotivasi
- **Ranking Badges** - Badge berdasarkan ranking

### **📱 Responsive Design**
- **Mobile-First** - Didesain untuk mobile terlebih dahulu
- **Tablet Optimized** - Optimasi khusus untuk tablet
- **Desktop Enhanced** - Fitur tambahan untuk desktop
- **Cross-Browser** - Kompatibel dengan semua browser modern

### **🔒 Security Features**
- **JWT Authentication** - Sistem autentikasi yang aman
- **Role-based Access** - Kontrol akses berdasarkan role
- **Input Validation** - Validasi input di frontend dan backend
- **XSS Protection** - Perlindungan dari serangan XSS

---

## 📸 Screenshots & Demo

### **🏠 Dashboard Overview**
```
┌─────────────────────────────────────────┐
│ 🧠 BrainQuiz Dashboard                  │
├─────────────────────────────────────────┤
│ 📊 Statistics Cards                     │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐        │
│ │ 15  │ │ 85% │ │ 🔥7 │ │ 🏆3 │        │
│ │Kuis │ │Skor │ │Strk │ │Ach  │        │
│ └─────┘ └─────┘ └─────┘ └─────┘        │
│                                         │
│ 📈 Performance Chart                    │
│ 📋 Recent Activities                    │
│ 🎯 Quick Actions                        │
└─────────────────────────────────────────┘
```

### **🎯 Quiz Interface**
```
┌─────────────────────────────────────────┐
│ ⏱️ 02:45 remaining                      │
├─────────────────────────────────────────┤
│ Question 3 of 10                        │
│                                         │
│ What is the capital of Indonesia?       │
│                                         │
│ ○ A. Jakarta                           │
│ ○ B. Bandung                           │
│ ○ C. Surabaya                          │
│ ○ D. Medan                             │
│                                         │
│ [Previous] [Next] [Submit]              │
└─────────────────────────────────────────┘
```

### **🏆 Achievement Gallery**
```
┌─────────────────────────────────────────┐
│ 🏆 Achievements (15/40 unlocked)        │
├─────────────────────────────────────────┤
│ ✅ First Steps      🔒 Quiz Master      │
│ ✅ High Scorer      🔒 Perfectionist    │
│ ✅ Streak Warrior   🔒 Category Expert  │
│                                         │
│ 👑 Your Rank: Expert (1,250 points)    │
└─────────────────────────────────────────┘
```

---

## 🚀 Quick Start Guide

### **1. Untuk Student**
```bash
1. Daftar akun dengan role "Student"
2. Login ke dashboard
3. Pilih "Ambil Kuis"
4. Pilih kategori yang diinginkan
5. Mulai mengerjakan kuis
6. Lihat hasil dan achievement
```

### **2. Untuk Teacher**
```bash
1. Daftar akun dengan role "Teacher"
2. Login ke dashboard
3. Buat kategori dan tingkatan
4. Buat kuis dan soal
5. Buat kelas dan undang siswa
6. Monitor progress siswa
```

### **3. Development Setup**
```bash
# Clone dan setup
git clone <repo-url>
cd frontend
npm install

# Environment
cp .env.example .env
# Edit VITE_API_URL

# Run development
npm run dev
```

---

## 🔧 Advanced Configuration

### **Custom Themes**
```javascript
// src/styles/themes.js
export const themes = {
  light: {
    primary: '#3B82F6',
    secondary: '#10B981',
    background: '#F8FAFC'
  },
  dark: {
    primary: '#60A5FA',
    secondary: '#34D399',
    background: '#0F172A'
  }
}
```

### **API Configuration**
```javascript
// src/config/api.js
export const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000,
  retries: 3
}
```

---

## 🐛 Troubleshooting

### **Common Issues**

**❌ Login tidak berhasil**
```bash
✅ Periksa kredensial
✅ Pastikan backend running
✅ Check network connection
```

**❌ Kuis tidak muncul**
```bash
✅ Refresh halaman
✅ Clear browser cache
✅ Check role permissions
```

**❌ Achievement tidak unlock**
```bash
✅ Periksa kriteria achievement
✅ Refresh data di dashboard
✅ Logout dan login kembali
```

---

## 📈 Performance Optimization

### **Bundle Size**
- **Code Splitting** - Lazy loading untuk route
- **Tree Shaking** - Eliminasi dead code
- **Asset Optimization** - Kompresi gambar dan font
- **Caching Strategy** - Browser dan service worker caching

### **Runtime Performance**
- **React.memo** - Memoization untuk komponen
- **useMemo/useCallback** - Optimasi hooks
- **Virtual Scrolling** - Untuk list panjang
- **Debounced Search** - Optimasi pencarian

---

## 🤝 Kontribusi

Kami menyambut kontribusi dari komunitas! Silakan:

1. **Fork** repository ini
2. **Create branch** untuk fitur baru
3. **Commit** perubahan Anda
4. **Push** ke branch
5. **Create Pull Request**

### **Development Guidelines**
- Gunakan **ESLint** untuk code quality
- Ikuti **naming conventions** yang konsisten
- Tulis **comments** untuk code yang kompleks
- Test fitur sebelum commit

### **Contribution Areas**
- 🐛 **Bug Fixes** - Perbaikan bug
- ✨ **New Features** - Fitur baru
- 📚 **Documentation** - Perbaikan dokumentasi
- 🎨 **UI/UX** - Perbaikan design
- ⚡ **Performance** - Optimasi performa

---

## 📞 Support & Contact

### **Getting Help**
- 📖 **Documentation** - Baca README ini
- 🐛 **Issues** - Buat issue di GitHub
- 💬 **Discussions** - GitHub Discussions
- 📧 **Email** - contact@brainquiz.com

### **Community**
- 🌟 **GitHub Stars** - Star repository ini
- 🍴 **Forks** - Fork untuk kontribusi
- 👥 **Contributors** - Join sebagai contributor
- 📢 **Share** - Bagikan ke teman-teman

---

<div align="center">
  <h2>🎓 BrainQuiz - Transforming Education Through Technology</h2>

  <p><strong>Dibuat dengan ❤️ untuk masa depan pendidikan yang lebih baik</strong></p>

  <br>

  <img src="https://img.shields.io/github/stars/username/brainquiz?style=social" alt="GitHub Stars" />
  <img src="https://img.shields.io/github/forks/username/brainquiz?style=social" alt="GitHub Forks" />
  <img src="https://img.shields.io/github/watchers/username/brainquiz?style=social" alt="GitHub Watchers" />

  <br><br>

  **🌟 Jika project ini membantu Anda, jangan lupa untuk memberikan star! 🌟**

  <br>

  <sub>© 2024 BrainQuiz. All rights reserved.</sub>
</div>
