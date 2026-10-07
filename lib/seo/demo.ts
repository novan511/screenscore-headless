/**
 * Bentuk laporan SEO/GEO Lab — data CONTOH, belum tersambung ke pipeline.
 *
 * Tipe-tipe di bawah ini adalah kontrak yang nantinya diisi oleh snapshot
 * mingguan (lib/seo/probes/*) yang ditulis cron. Selama pipeline belum ada,
 * halaman /seo-lab membaca konstanta ini supaya bentuk laporan bisa dilihat
 * dan dibahas sebelum ada kode yang memanggil Monid.
 */

export type GeoRow = {
  prompt: string;
  engine: string;
  /** Posisi kita di jawaban AI, null = tidak disebut sama sekali. */
  us: number | null;
  /** Siapa yang justru di-cite oleh AI untuk pertanyaan yang sama. */
  competitors: string[];
};

export type SerpRow = {
  query: string;
  rank: number | null;
  /** Posisi minggu lalu — null artinya baru masuk tracking. */
  prev: number | null;
  url: string;
};

export type DemandRow = {
  question: string;
  source: string;
  /** Perkiraan berapa kali orang bertanya hal serupa per bulan. */
  volume: number;
  answered: "kita" | "lawan" | "belum";
};

export type FixRow = {
  task: string;
  impact: "tinggi" | "sedang" | "rendah";
  status: "todo" | "draft" | "done";
};

export type AuditRow = {
  finding: string;
  scope: string;
  severity: "error" | "warn" | "info";
};

export const DEMO = {
  week: "2026-W41",
  updatedAt: "Senin, 05 Okt 2026 · 03:12 WIB",
  job: "cron mingguan · Senin 03:00",

  geo: {
    asked: 40,
    engines: ["ChatGPT", "Perplexity"],
    mentioned: 7,
    previous: 3,
    /** Muncul di berapa dari 40 pertanyaan, 6 minggu terakhir. */
    trend: [1, 2, 3, 3, 5, 7],
    rows: [
      {
        prompt: "film animasi apa yang aman untuk anak 7 tahun",
        engine: "ChatGPT",
        us: 4,
        competitors: ["commonsensemedia.org", "imdb.com"],
      },
      {
        prompt: "cara menilai apakah sebuah konten aman untuk anak",
        engine: "Perplexity",
        us: 2,
        competitors: ["commonsensemedia.org"],
      },
      {
        prompt: "game mobile yang cocok untuk anak SD",
        engine: "ChatGPT",
        us: null,
        competitors: ["commonsensemedia.org", "commonsensemedia.org/es"],
      },
      {
        prompt: "apakah ScreenScore itu bisa dipercaya",
        engine: "ChatGPT",
        us: 1,
        competitors: [],
      },
      {
        prompt: "film horor yang tidak menakutkan untuk anak",
        engine: "Perplexity",
        us: null,
        competitors: ["imdb.com", "reddit.com"],
      },
      {
        prompt: "batas screen time anak 5 tahun berapa jam",
        engine: "ChatGPT",
        us: null,
        competitors: ["commonsensemedia.org", "who.int"],
      },
    ] satisfies GeoRow[],
  },

  serp: {
    tracked: 100,
    inTop10: 21,
    previousTop10: 17,
    rows: [
      { query: "screen score adalah", rank: 1, prev: 1, url: "/content/screen-score" },
      { query: "film aman untuk anak", rank: 6, prev: 9, url: "/films" },
      { query: "review film untuk anak", rank: 11, prev: 14, url: "/content/inside-out-2" },
      { query: "game untuk anak 7 tahun", rank: 18, prev: null, url: "/game" },
      { query: "daftar film anak 2026", rank: 4, prev: 4, url: "/films?age=7-tahun" },
    ] satisfies SerpRow[],
  },

  demand: [
    {
      question: "“<judul film> aman nggak buat anak usia 6?”",
      source: "Komentar YouTube · 12 kanal",
      volume: 210,
      answered: "belum",
    },
    {
      question: "“game Roblox aman untuk anak SD?”",
      source: "Reddit · r/indonesia & parenting",
      volume: 95,
      answered: "lawan",
    },
    {
      question: "“Screen Score itu apa, beda nggak sama IMDb?”",
      source: "Google · PAA + autocomplete",
      volume: 70,
      answered: "kita",
    },
    {
      question: "“film apa yang boleh ditonton anak 5 tahun?”",
      source: "Komentar YouTube · film animasi",
      volume: 180,
      answered: "belum",
    },
  ] satisfies DemandRow[],

  fixes: [
    { task: "Halaman “Apa itu Screen Score” + FAQPage schema", impact: "tinggi", status: "draft" },
    { task: "Tulis: 15 film aman untuk anak 5–7 tahun", impact: "tinggi", status: "done" },
    { task: "Ganti @type Product → Movie / VideoGame di halaman detail", impact: "tinggi", status: "todo" },
    { task: "Daftarkan ScreenScore ke Wikidata (sameAs)", impact: "sedang", status: "todo" },
    { task: "Turunkan TTFB halaman /content (cache priming)", impact: "sedang", status: "todo" },
    { task: "Jawab 4 pertanyaan YouTube di atas jadi artikel", impact: "tinggi", status: "todo" },
  ] satisfies FixRow[],

  audit: [
    { finding: "JSON-LD masih memakai Product, tanpa contentRating", scope: "412 halaman detail", severity: "warn" },
    { finding: "llms.txt belum ada di root", scope: "sitewide", severity: "info" },
    { finding: "og:image kosong", scope: "3 halaman gadget", severity: "error" },
    { finding: "canonical menunjuk URL lama", scope: "1 halaman blog", severity: "error" },
  ] satisfies AuditRow[],

  budget: {
    runs: 182,
    cost: 0.54,
    cap: 5.0,
    free: ["discover (182×)", "inspect (182×)"],
    endpoints: ["ahrefs#serp", "tinyfish#fetch", "reddit#search", "firecrawl#scrape"],
  },
};
