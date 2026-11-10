# ZEN PANGKAS RAMBUT

Aplikasi web PWA modern untuk mengelola keuangan barbershop — catat **pemasukan** & **pengeluaran**, pantau **laporan otomatis**, dan kelola **karyawan** dengan PIN masing-masing.

> Dibangun dengan Next.js 16 (App Router) + TypeScript + Prisma + PostgreSQL (Neon) + Tailwind CSS 4.
> Siap deploy ke **Vercel**.

## Fitur

| Untuk Owner | Untuk Karyawan / Kasir / Tukang Pangkas |
| --- | --- |
| Dashboard laba bersih harian & bulanan | Login dengan PIN sendiri |
| Laporan lengkap per periode (harian, mingguan, bulanan, kustom) | Catat pemasukan jasa (Anak Rp15.000, Dewasa Rp20.000) |
| Ekspor laporan **CSV** (kompatibel Excel) & **Cetak/PDF** | Catat pengeluaran per kategori |
| Kelola karyawan (tambah, reset PIN, aktif/nonaktif) | Riwayat transaksi yang pernah dicatat |
| Kelola layanan & harga | — |
| Kelola kategori pengeluaran | — |
| Ubah & hapus transaksi (audit) | — |

### Keamanan
- Sesi **JWT HttpOnly cookie** (30 hari) — tahan XSS & CSRF
- PIN karyawan di-hash **bcrypt**
- Rate limit login (anti brute-force)
- Guard role di setiap API (karyawan tidak bisa akses laporan/pengaturan)
- Nama layanan/kategori di-snapshot ke setiap transaksi agar laporan historis tetap akurat

### PWA
- Bisa **di-install** ke layar utama (Android/iOS/Desktop)
- Service worker + halaman offline
- Ikon maskable, tema warna konsisten, aman untuk notch (safe-area)

## Harga Jasa Default
- Anak-anak: **Rp15.000**
- Dewasa: **Rp20.000**

## Menjalankan Secara Lokal

```bash
bun install

# 1. Nyalakan Postgres portabel (tanpa Docker, otomatis unduh binari ~15MB)
bun run dev:db

# 2. Buat tabel
bunx prisma db push

# 3. Jalankan aplikasi
bun run dev
```

Buka aplikasi → layar **Setup Awal** → buat akun owner → selesai.

## Deploy ke Vercel + Neon

1. **Neon** ([neon.tech](https://neon.tech)) → buat project → salin:
   - *Pooled connection string* → `DATABASE_URL`
   - *Direct connection string* → `DIRECT_DATABASE_URL`
2. Buat tabel di Neon dari komputer lokal:
   ```bash
   bunx prisma db push
   ```
3. **Vercel** → Import repo → set Environment Variables:
   | Variabel | Nilai |
   | --- | --- |
   | `DATABASE_URL` | Pooled string Neon |
   | `DIRECT_DATABASE_URL` | Direct string Neon |
   | `AUTH_SECRET` | string acak, contoh `openssl rand -hex 48` |
4. Deploy → buka `/api/health` untuk cek kesehatan.
5. Buka aplikasi → buat akun owner pertama.

## Struktur Penting

```
prisma/schema.prisma        → User, Service, Category, Transaction
src/app/api/                → REST API (auth, dashboard, transactions, reports, …)
src/components/screens/     → setup, login, beranda, catat, riwayat, laporan, menu
src/components/shared/      → keypad, pin-pad, grafik, komponen uang
src/lib/                    → sesi JWT, waktu WIB, format rupiah, guard API
public/                     → manifest PWA, service worker, ikon, offline
scripts/dev-postgres.ts     → Postgres portabel untuk dev lokal
scripts/gen-icons.mjs       → generator ikon PWA
```

## Zona Waktu

Semua batas harian/bulanan dihitung berdasarkan **WIB (Asia/Jakarta)** meskipun database menyimpan UTC — laporan selalu sesuai hari kerja barbershop di Indonesia.
