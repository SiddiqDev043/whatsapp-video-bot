# WhatsApp Video Bot (Node.js + TypeScript)

Bot WhatsApp yang memahami perintah bahasa natural (Indonesia) untuk mencari
video YouTube dan mengirimkannya langsung ke chat WhatsApp, lengkap dengan
pagination global ("next"), pengunduhan video berdasarkan nomor urut, dan
penanganan error.

> ⚠️ **Catatan hukum & kebijakan**: Mengunduh konten dari YouTube dapat
> melanggar Ketentuan Layanan YouTube dan hak cipta pemilik konten,
> tergantung yurisdiksi dan cara penggunaannya. Proyek ini disediakan untuk
> tujuan edukasi/penggunaan pribadi yang sah. Anda bertanggung jawab penuh
> untuk memastikan penggunaan bot ini mematuhi hukum dan ToS yang berlaku di
> wilayah Anda, serta mempertimbangkan penggunaan YouTube Data API resmi
> untuk kasus produksi/komersial.

## Fitur

- Integrasi WhatsApp via [Baileys](https://github.com/WhiskeySockets/Baileys) (multi-device, tanpa API berbayar).
- Pemahaman bahasa natural: "tolong berikan saya drama china", "carikan film korea", dll.
- Pencarian YouTube, 5 hasil per halaman, dengan nomor urut **global** per sesi:
  - Halaman pertama: 1–5
  - "next": 6–10
  - "next" lagi: 11–15
- State pencarian **per pengguna**, tersimpan di SQLite (bertahan setelah restart).
- Download video berdasarkan nomor urut ("download nomor 2"), dengan status
  "⏳ Sedang diproses..." dan caption otomatis setelah selesai.
- Deteksi ukuran file: jika melebihi batas WhatsApp, bot mengirim link
  alternatif + info ukuran, bukan mencoba mengirim file yang akan gagal.
- Penanganan error: video tidak ditemukan, gagal download, link rusak,
  pembatasan wilayah, file terlalu besar, rate limit.
- Rate limiting per JID, queue terkontrol untuk proses download berat, dan
  logging terstruktur (Winston) agar bot stabil di bawah beban banyak pengguna.
- Docker & docker-compose siap pakai.

## Arsitektur

```
src/
  commands/     # Orkestrasi per-perintah (search, next, download) + router
  services/      # Logika bisnis: pencarian YouTube, download, state pencarian, formatting
  providers/     # Integrasi eksternal (Baileys / WhatsApp)
  database/      # SQLite: schema + repository (search_sessions, session_items, cache, history)
  cache/         # Cache in-memory (hot path), terpisah dari cache SQLite (durable)
  utils/         # logger, rate limiter, queue, NLP intent parser
  config/        # Konfigurasi terpusat dari environment variables
  types/         # Tipe dan error domain bersama
```

Alur pesan masuk:

```
Baileys (pesan masuk)
  -> commandRouter (rate limit + parseIntent)
    -> searchCommand / nextCommand / downloadCommand
      -> searchStateService / downloadService (+ youtubeService)
        -> database (session & cache) / yt-dlp / kirim balik via Baileys
```

### Model data (SQLite)

| Tabel            | Fungsi                                                              |
|-------------------|----------------------------------------------------------------------|
| `search_history`  | Log semua query yang pernah dicari tiap user                        |
| `search_sessions` | Query aktif + halaman terakhir per user (untuk "next")              |
| `session_items`   | Mapping nomor urut global -> video, per user (untuk "download nomor N") |
| `search_cache`    | Cache hasil pencarian YouTube per query, dengan TTL                  |

## Instalasi (lokal)

### Prasyarat

- Node.js >= 18
- Python 3 + `yt-dlp` terpasang dan ada di PATH (`pip install -U yt-dlp` atau
  unduh binary dari [rilis resmi](https://github.com/yt-dlp/yt-dlp/releases))
- `ffmpeg` terpasang (dibutuhkan yt-dlp untuk merge/transcode format)

### Langkah

```bash
git clone <repo-ini>
cd whatsapp-video-bot
cp .env.example .env      # sesuaikan konfigurasi jika perlu
npm install
npm run build
npm start
```

Saat pertama kali dijalankan, bot akan menampilkan **QR code di terminal**.
Scan menggunakan WhatsApp di HP Anda (Perangkat Tertaut / Linked Devices).
Sesi login tersimpan di `AUTH_DIR` (default `./data/auth`) sehingga tidak
perlu scan ulang setiap restart.

Mode development (auto-reload):

```bash
npm run dev
```

## Deployment dengan Docker

```bash
cp .env.example .env
docker compose up -d --build
docker compose logs -f whatsapp-bot   # scan QR code dari sini saat pertama kali
```

Data (database, sesi login, file download sementara) disimpan di Docker
volume `bot-data` sehingga tetap ada meski container di-restart.

Untuk logout / relink device baru: hentikan container, hapus volume
`bot-data`, lalu jalankan ulang.

## Contoh Penggunaan

```
User: tolong berikan saya drama china
Bot:  [1]
      Judul: Drama China Full Episode Terbaru
      Link: https://youtube.com/watch?v=...
      Thumbnail: https://i.ytimg.com/...
      ... (sampai [5])

User: next
Bot:  [6] ... sampai [10]

User: download nomor 2
Bot:  ⏳ Sedang diproses...
Bot:  <video> Video berhasil diproses.
      Judul: Drama China Romantis 2026
```

## Konfigurasi (.env)

Lihat `.env.example` untuk daftar lengkap. Yang penting untuk production:

- `MAX_WHATSAPP_VIDEO_MB` — batas ukuran file sebelum bot beralih ke kirim link. Untuk 1 GB, gunakan `1024`.
- `DOWNLOAD_QUEUE_CONCURRENCY` — jumlah proses yt-dlp paralel maksimum. Ini mengatur berapa banyak video yang boleh diunduh sekaligus; naikan hanya jika VPS Anda punya CPU/RAM cukup.
- `RATE_LIMIT_MAX_REQUESTS` / `RATE_LIMIT_WINDOW_MS` — pembatasan permintaan per user.
- `SEARCH_CACHE_TTL_SECONDS` — masa berlaku cache hasil pencarian.

## Skalabilitas & Produksi

- **Cache**: `cache/cacheService.ts` adalah in-memory dan per-instance. Untuk
  deployment multi-instance, ganti dengan client Redis (ioredis) di balik
  interface yang sama.
- **Queue**: `utils/queue.ts` menggunakan `p-queue` in-process. Untuk beban
  sangat tinggi lintas instance, ganti dengan queue terdistribusi seperti
  BullMQ + Redis.
- **Database**: SQLite (better-sqlite3) cocok untuk single-instance. Untuk
  multi-instance, migrasikan ke PostgreSQL/MySQL dan sesuaikan layer
  repository di `database/repositories/`.
- **Logging**: Winston menulis ke `logs/combined.log` dan `logs/error.log`,
  serta stdout — siap diarahkan ke agregator log (ELK, Loki, dll).

## Batasan yang Diketahui

- Pencarian menggunakan `youtube-sr` (scraping) sehingga tidak butuh API key,
  namun bisa berhenti bekerja jika struktur halaman YouTube berubah. Untuk
  kebutuhan produksi jangka panjang, pertimbangkan migrasi ke YouTube Data
  API v3 resmi (butuh API key & kuota).
- Download menggunakan `yt-dlp`; ketersediaan/kecepatan bergantung pada
  perubahan sisi YouTube dan region video itu sendiri.
- Baileys adalah library tidak resmi untuk WhatsApp Web multi-device; risiko
  pemblokiran nomor tetap ada sesuai kebijakan WhatsApp. Untuk kebutuhan
  bisnis resmi, pertimbangkan WhatsApp Business API resmi (Cloud API/BSP).

## Lisensi

MIT — gunakan dengan bijak dan patuhi hukum yang berlaku di wilayah Anda.
