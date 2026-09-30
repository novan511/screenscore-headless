# ScreenScore — Next.js Headless Frontend

Frontend headless untuk **ScreenScore** (screenscore.digitalmama.id) — "IMDb untuk anak-anak" — dengan **WordPress tetap sebagai backend**.

## Menjalankan

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start   # production
```

Konfigurasi (opsional, ada default-nya):

```bash
# .env.local
NEXT_PUBLIC_WP_SITE=https://screenscore.digitalmama.id
```

## Arsitektur data

| Data | Sumber | Catatan |
|---|---|---|
| Judul (film/serial/game/e-book/aplikasi) | **WooCommerce Store API** (`/wp-json/wc/store/v1/products`) | WPGraphQL di site ini **tidak mendaftarkan tipe `product`**, jadi judul dibaca dari REST |
| SEO (Yoast) per judul | `wp/v2/product?slug=` | `yoast_head_json` |
| Filter kategori & usia | Store API `?category=` / `?tag=` (slug product_cat / product_tag) | Tag usia = "Kelompok Umur" dari menu WP |
| Static page, menu, orang (cast/creator/character/song/idol) | **GraphQL** (`/graphql`) | |
| **Screen Score editor** + 6 dimensi keamanan | **HTML bridge** (`lib/bridge.ts`) | Plugin `reviewflow` belum punya REST — halaman WP di-fetch lalu di-parse. Kontrak datanya sudah siap diganti endpoint `rf/v1` kapan pun tersedia |
| Biografi orang | HTML bridge (widget Elementor) | ACF belum diekspos publik |
| Review komunitas | Store API `average_rating` / `review_count` | |

ISR: semua bacaan WordPress di-cache **5 menit** (`SITE.revalidate` di `lib/config.ts`).

## Struktur route (mengikuti sitemap WP lama — aman untuk SEO)

```
/                           hero + rails + pencarian + filter usia
/films /series /e-books /game /aplikasi
                            arsip per kategori (?page=2&age=<tag>)
/content/[slug]             detail judul + Screen Score + sinopsis + terkait
/search?q=                  judul (REST) + orang (GraphQL)
/cast, /cast/[slug]         daftar & detail pemeran
/characters, /character/[…] karakter (URL hierarkis ikut WP: marvel/carnage)
/creator/[slug] /song/[slug]
/[slug]                     static page WP (tentang-kami, contact, …)
/sitemap.xml
```

## Desain

Anchornya IMDb (chrome gelap, kartu poster, kotak skor kuning) tapi disesuaikan
brand ScreenScore:

- **Ink** `#17141A` (header/footer), **canvas** putih, **surface** hangat `#F6F4F0`
- **Pink** `#E5117F` (aksen/CTA — "score"), **Kuning** `#FFD400` (skor/bintang — "screen")
- Tipografi: **Plus Jakarta Sans** (via `next/font`)
- Momen signature: **ScorePanel** di halaman detail — kotak skor kuning ala IMDb
  + breakdown 6 dimensi (Pesan Positif, Kekerasan, Merokok/Alkohol/Narkoba,
  Dialog Kasar, Adegan Seksual, Keberagaman)

## Komponen kunci

```
lib/config.ts      endpoint, kategori, tag usia
lib/graphql.ts     klien WPGraphQL (settings, page, orang)
lib/store.ts       klien Store API (judul + parse tahun/usia dari short_description)
lib/bridge.ts      jembatan HTML: reviewflow score + biografi Elementor
components/        Hero, Rail, PosterCard, ScorePanel, AgeChips, Pagination…
```

## Yang belum (roadmap)

- Tulis review dari Next.js (saal ini form WP masih di backend)
- Filmografi cast (tabel relasi `cast` di product masih kosong di WP)
- Endpoint REST resmi untuk reviewflow (ganti HTML bridge)
- Meilisearch untuk pencarian instan
