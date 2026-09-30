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
| SEO (Yoast) per judul | **halaman render WP** (`/content/<slug>/`) di-parse via `lib/bridge.ts` | `wp/v2/product?slug=` butuh **4–6 detik**; halaman render selesai ±200 ms dan sudah bawa `<title>`, `og:image`, `og:description` |
| Isi panjang (sinopsis/artikel) | Store API — `description` **atau** `short_description` | Banyak judul (mayoritas game) mengosongkan `description` dan menaruh seluruh artikel di `short_description`; `title.body` memilih keduanya |
| Filter kategori & usia | Store API `?category=` / `?tag=` (slug product_cat / product_tag) | Tag usia = "Kelompok Umur" dari menu WP |
| Static page, menu, orang (cast/creator/character/song/idol) | **GraphQL** (`/graphql`) | |
| **Screen Score editor** + 6 dimensi keamanan | **HTML bridge** (`lib/bridge.ts`) | Plugin `reviewflow` belum punya REST — halaman WP di-fetch lalu di-parse. Kontrak datanya sudah siap diganti endpoint `rf/v1` kapan pun tersedia |
| Biografi orang | HTML bridge (widget Elementor) | ACF belum diekspos publik |
| Review komunitas | Store API `average_rating` / `review_count` | |

### Ketahanan koneksi (penting)

Semua bacaan WordPress lewat `lib/http.ts` (`wpFetch`): retry 3× dengan backoff, timeout 8 detik,
dan pemisahan dua keadaan yang sering tertukar:

- **WordPress tidak terjangkau** → melempar `UpstreamError` → halaman menampilkan `app/error.tsx` (bisa dicoba lagi), dan ISR menyimpan salinan terakhir.
- **Judul memang tidak ada** → `null` → 404 sungguhan.

Sebelumnya error sementara (429 rate-limit Cloudflare, timeout, 5xx) ikut diterjemahkan
menjadi `notFound()` lalu **di-cache sebagai 404 selama 5 menit** — itulah sebabnya
banyak game terlihat "tidak tersambung ke WordPress" padahal datanya ada.

### ISR

Setiap route dinamis wajib mengekspor `generateStaticParams()` meski mengembalikan `[]`.
Tanpa itu Next tidak mendaftarkan route di `prerender-manifest.dynamicRoutes` sehingga
semua respons keluar `Cache-Control: no-store` dan ISR tidak pernah bekerja.

`app/loading.tsx` (root) sengaja **tidak** ada: loading boundary mengirim status 200
sebelum `notFound()` sempat jalan → setiap URL hilang jadi soft-404. Skeleton hanya
dipasang di route yang mustahil 404 (`/game`, `/films`, `/series`, `/e-books`,
`/aplikasi`, `/search`).

ISR: semua bacaan WordPress di-cache **5 menit** (`SITE.revalidate` di `lib/config.ts`).

### Performa

Lebar dari sisi server dan sisi klien:

| Item | Nilai | Catatan |
|---|---|---|
| HTML | ±21 KB gzip | markup + payload RSC |
| JS awal | **113 KB gzip** (153 KB bila `polyfills` ikut dihitung) | `polyfills.js` bertanda `nomodule`, jadi browser modern tidak mengunduhnya |
| Gambar | AVIF, `q=70` | 47 KB → **26 KB** (−44%) untuk lebar 640 |
| ISR hangat | 2–4 ms | `x-nextjs-cache: HIT` |

Yang dikerjakan:

- **`formats: ["image/avif","image/webp"]` + `quality={70}`** — AVIF ±35% lebih kecil dari WebP; kualitas 70 tidak terbedakan untuk poster.
- **`deviceSizes`** memasukkan 1440/1600 (celah 1200→1920 di Next bikin hero 1280px menarik `w=1920`) dan mematok 2560 agar proses encode AVIF tidak lama.
- **`minimumCacheTTL: 86400`** supaya varian hasil optimisasi tidak di-encode ulang tiap menit.
- **Arsip & pencarian di-CDN** — keduanya membaca `searchParams` sehingga Next menandainya dinamis dan mengirim `private, no-store`. `headers()` di `next.config.ts` menimpanya jadi `public, s-maxage=300`, persis seperti ISR.
- **Metadata SEO dijalankan paralel** dengan lookup Store API lewat `productPermalink()` (semua produk ada di `/content/<slug>/`), bukan menunggu permalink lebih dulu.
- **Rail "Mirip dengan ini" di-stream** dengan `<Suspense>` — ia butuh satu putaran Store API lagi (±2,8 detik), jadi tidak menahan paint pertama halaman detail.

Sisa waktu render dingin (1,8–3,5 detik, sekali per URL) sepenuhnya berasal dari latensi WordPress:
`wc/store/v1` ±2,4 detik dan GraphQL ±2,3 detik, sementara halaman render WP hanya ±0,2 detik.

## Struktur route (mengikuti sitemap WP lama — aman untuk SEO)

```
/                           hero + rails + pencarian + filter usia
/films /series /e-books /game /aplikasi
                            arsip per kategori (?page=2&age=<tag>)
/content/[slug]             detail judul: hero sinema + Screen Score + trailer (film/serial) + artikel + review member + terkait
/api/reviews                proxy reviewflow: GET gate (login/form/already) + POST submit (admin-ajax, teruskan Cookie member)
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
  Dialog Kasar, Adegan Seksual, Keberagaman), **menumpuk di tepi hero gelap**
  sebagai jembatan ke area baca terang
- **Hero detail**: pita full-bleed `ink` dengan poster & backdrop blur, chip
  kategori/tahun/usia, chip skor kuning, CTA "Putar Trailer / Baca Review"
- **Trailer (film & serial)**: facade klik-main dari YouTube — thumbnail dulu,
  iframe `youtube-nocookie` hanya setelah diklik (`components/TrailerPlayer.tsx`);
  URL diambil dari widget video Elementor di halaman WP (`fetchTrailer` di bridge)
- **Artikel** (`lib/article.ts` + `.article-prose` di globals.css): judul bagian
  WP yang berupa paragraf pendek dipromosikan jadi `<h2>` ber-anchor, daftar
  "Label: nilai" jadi kartu fakta, muncul Daftar Isi bila ≥3 judul

## Komponen kunci

```
lib/config.ts      endpoint, kategori, tag usia
lib/graphql.ts     klien WPGraphQL (settings, page, orang)
lib/store.ts       klien Store API (judul + parse tahun/usia dari short_description)
lib/bridge.ts      jembatan HTML: reviewflow score + biografi Elementor
components/        Hero, Rail, PosterCard, ScorePanel, AgeChips, Pagination…
```

## Yang belum (roadmap)

- **Review member**: tulis-review sudah jalan lewat `/api/reviews` (proxy ke
  `reviewflow_submit`; gate & nonce diambil dari halaman WP dengan Cookie
  member — penuh hanya setelah frontend mengambil alih domain). Daftar review
  approved membaca `GET /wp-json/rf/v1/reviews?post_id=` — **snippet PHP-nya
  belum dipasang di plugin** (butuh source plugin untuk schema penyimpanan).
  Jalur member belum bisa diuji di localhost (cookie WP tidak ada) — uji di
  domain asli.
- Filmografi cast (tabel relasi `cast` di product masih kosong di WP)
- Endpoint REST resmi untuk reviewflow (ganti HTML bridge)
- Meilisearch untuk pencarian instan
