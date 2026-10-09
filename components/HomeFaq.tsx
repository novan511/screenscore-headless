/**
 * Homepage FAQ — the two accordion columns the legacy homepage closes with,
 * kept as native <details> so it works without JS and still reads as the
 * same design: light panel, bold question, pink caret.
 */
import { JsonLd } from "@/components/JsonLd";

const QUESTIONS = [
  {
    q: "Apakah saya bisa memberi review ?",
    a: "Mama bisa mereview konten yang pernah mama tonton di sini.",
  },
  {
    q: "Apakah ada batasan mereview konten ?",
    a: "Tidak ada batasan mereview konten. Mama bisa mereview banyak konten di website ini.",
  },
  {
    q: "Apakah review akan langsung muncul ?",
    a: "Review mama akan melalui proses kurasi terlebih dahulu, sehingga tidak akan langsung muncul.",
  },
  {
    q: "Apakah review ini jujur ?",
    a: "Semua jenis review bersifat jujur dan dari pengalaman pribadi masing-masing mama.",
  },
  {
    q: "Apakah saya bisa merekomendasikan film, game, e-books baru ?",
    a: "Boleh. Mama bisa menyampaikannya lewat halaman Tentang Kami, dan tim kami yang akan menimbangnya untuk direview.",
  },
] as const;

export function HomeFaq() {
  const half = Math.ceil(QUESTIONS.length / 2);
  const columns = [QUESTIONS.slice(0, half), QUESTIONS.slice(half)];

  return (
    <section
      className="bg-white py-16 sm:py-20"
      aria-labelledby="faq-heading"
    >
      {/*
        FAQPage schema.
        These five Q&A pairs were rendered as plain <details> with no
        structured data, so the answers existed only for a human reader. This
        is the single cheapest AEO win available: the same answers become
        eligible for "People also ask" and for AI assistants that quote a
        direct answer. Each question already follows the natural-language
        phrasing an answer engine looks for.
      */}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          inLanguage: "id",
          mainEntity: QUESTIONS.map((q) => ({
            "@type": "Question",
            name: q.q,
            acceptedAnswer: { "@type": "Answer", text: q.a },
          })),
        }}
      />
      <div className="mx-auto max-w-[1000px] px-4 sm:px-6">
        <div className="text-center">
          <h2
            id="faq-heading"
            className="text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink sm:text-[2.6rem] lg:text-[3rem]"
          >
            FAQ
          </h2>
          <p className="mt-2 text-base text-muted">
            Frequently Asked Questions
          </p>
        </div>

        <div className="mt-9 grid gap-4 sm:gap-5 lg:grid-cols-2">
          {columns.map((col, i) => (
            <div key={i} className="grid content-start gap-4 sm:gap-5">
              {col.map((item) => (
                <details key={item.q} className="group rounded-lg bg-surface p-4">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-base font-bold leading-snug text-muted">
                    {item.q}
                    <span
                      aria-hidden
                      className="mt-0.5 shrink-0 text-pink-600 transition-transform duration-200 group-open:rotate-90"
                    >
                      ▸
                    </span>
                  </summary>
                  <p className="mt-2.5 text-base leading-relaxed text-muted">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
