# Sistem Distribusi Aset FTI UNAND

Aplikasi web untuk mengelola distribusi aset Fakultas Teknologi Informasi Universitas Andalas. Sistem ini membantu proses pencatatan, pemantauan status aset, pengelolaan dokumen Berita Acara Serah Terima (BAST), serta pembuatan laporan distribusi secara terstruktur dan efisien.

**Mata Kuliah:** JSI61145 - Pemrograman Web  
**Dosen Pengampu:** Husnil Kamil, M.T.  
**Kelompok:** 3

---

## Teknologi yang Digunakan

| Kategori | Teknologi |
|---|---|
| Backend | Express.js v4 (Node.js) |
| Database | MySQL 8 (native mysql2, tanpa ORM) |
| Template Engine | EJS |
| CSS Framework | Basecoat UI v0.3.11 |
| Session | express-session |
| PDF Generator | PDFKit |
| Testing | Playwright (E2E, Chromium) |
| Deployment | Railway (PaaS) |
| Version Control | Git + GitHub |

---

## Cara Instalasi dan Menjalankan Aplikasi

### Prasyarat

Pastikan sudah terinstall:
- [Node.js](https://nodejs.org/) v18 atau lebih baru
- [MySQL](https://www.mysql.com/) v8
- [Git](https://git-scm.com/)

### 1. Clone Repository

```bash
git clone https://github.com/husniIk/facultyware.git
cd facultyware
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Konfigurasi Environment

Buat file `.env` di root project:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=facultyware

SESSION_SECRET=your_session_secret
PORT=3000
```

### 4. Setup Database

Buat database MySQL dan jalankan schema:

```bash
mysql -u root -p -e "CREATE DATABASE facultyware;"
mysql -u root -p facultyware < database/schema.sql
mysql -u root -p facultyware < database/seed.sql
```

### 5. Jalankan Aplikasi

```bash
npm start
```

Aplikasi berjalan di `http://localhost:3000`

**Kredensial default:**
- Username: `admin`
- Password: `password123`

---

## Menjalankan Testing (Playwright)

### Prasyarat Testing

Pastikan aplikasi sudah berjalan di `http://localhost:3000` sebelum menjalankan test.

### Install Playwright

```bash
npm install --save-dev @playwright/test
npx playwright install chromium
```

### Jalankan Semua Test

```bash
npx playwright test
```

### Jalankan dengan UI Playwright

```bash
npx playwright test --ui
```

### Konfigurasi Test

| Setting | Nilai |
|---|---|
| Base URL | `http://localhost:3000` |
| Browser | Chromium |
| Timeout per test | 90 detik |
| Action timeout | 30 detik |
| Mode | Sequential (1 worker) |

### Hasil Test

Total **14 test** mencakup seluruh fitur aplikasi dengan hasil **14/14 passed** dalam waktu ~20 detik.

---

## Fitur Aplikasi

| No | Fitur |
|---|---|
| 1 | Melihat data aset yang tersedia |
| 2 | Melihat detail informasi aset |
| 3 | Mencari aset berdasarkan nama atau kode |
| 4 | Memfilter aset berdasarkan status |
| 5 | REST API mengakses data aset |
| 6 | Generate data aset (Excel & PDF) |
| 7 | Mengunggah form BAST |
| 8 | Melihat daftar penerima aset |
| 9 | Mengalokasikan aset ke personal tertentu |
| 10 | Melihat detail informasi distribusi aset |
| 11 | REST API mengakses data distribusi |
| 12 | Mencetak form BAST |
| 13 | Menerima pengembalian aset |
| 14 | Melihat riwayat distribusi aset per penerima |

---

## Pembagian Tugas Anggota

### Raul Fathoni (2411522021)

**Infrastruktur & Backend:**
- Project setup, konfigurasi Express, koneksi database
- Database schema (6 tabel) dan seed data admin
- User model, auth controller, route login/logout

**Fitur:**
1. Pengelola Aset dapat melihat data aset yang tersedia di sistem
2. Pengelola Aset dapat melihat detail informasi aset
3. Pengelola Aset dapat mencari aset berdasarkan nama atau kode
4. Pengelola Aset dapat memfilter aset berdasarkan status
5. Pengelola Aset dapat mengakses data aset melalui REST API
6. Pengelola Aset dapat mengenerate data aset (Excel & PDF)
7. Pengelola Aset dapat melihat riwayat distribusi aset per penerima

---

### Zilfa Julyafitri (2411521013)

**UI & Middleware:**
- ACL middleware, error pages, login UI & styling
- Layout utama, sidebar navigasi, dashboard

**Fitur:**
1. Pengelola Aset dapat mengunggah form BAST
2. Pengelola Aset dapat melihat daftar penerima aset
3. Pengelola Aset dapat mengalokasikan aset ke personal/lokasi tertentu
4. Pengelola Aset dapat melihat detail informasi distribusi aset
5. Pengelola Aset dapat mengakses data distribusi melalui REST API
6. Pengelola Aset dapat mencetak form BAST
7. Pengelola Aset dapat menerima pengembalian aset dengan memverifikasi penerimaan aset pada sistem

---

## Deployment

Aplikasi di-deploy menggunakan **Railway (PaaS)** dan dapat diakses di:

🌐 [https://distribusiasetunand.my.id](https://distribusiasetunand.my.id)

---

## Anggota Kelompok

| Nama | NIM |
|---|---|
| Zilfa Julyafitri | 2411521013 |
| Raul Fathoni | 2411522021 |
