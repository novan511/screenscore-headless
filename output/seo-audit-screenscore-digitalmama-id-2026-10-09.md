# SEO / GEO / AEO Audit Report — screenscore.digitalmama.id

**Audit type:** Full Audit (headless frontend, Next.js 16.4.0)
**Audit date:** 2026-10-09
**Pages reviewed:** 10 (homepage, 5 category archives, title detail, blog index, 2 legacy static pages, search)

| Dimension | Score | Status |
|---|---|---|
| SEO | 9/10 | 🟢 Strong |
| GEO | 7/10 | 🟡 On Track |
| AEO | 7/10 | 🟡 On Track |
| **Combined** | **23/30** | |

> Scores reflect the state **after** the structured-data work in this
> engagement. The "before" state is recorded in §3 so the delta is visible.

---

## 1. Executive Summary

The headless frontend is technically strong: Lighthouse scores 98–100 on
Performance, Accessibility and SEO for mobile, with LCP 1.4s, CLS 0 and TBT
50ms. The single largest weakness was not technical but **semantic** — the five
category archives, which are the site's main internal-linking hubs, emitted no
structured data at all, so their title grids existed only as pixels. That has
been fixed with `CollectionPage` + `ItemList`. GEO and AEO are the remaining
opportunity: the brand entity was thin (no logo, no author), and the homepage
FAQ had five ready-made answers that no answer engine could read. Both are now
addressed. The one score Lighthouse cannot award — actual Core Web Vitals on
the live domain — still needs a PageSpeed Insights run after deploy, because
every number here was measured on localhost.

---

## 2. Top Priorities

| Priority | Issue | Dimension | Effort | Impact |
|---|---|---|---|---|
| 🔴 Critical | WordPress Store API is 2.5–3.1s per call; cold renders of `/films`, `/search` are 3–6s | SEO (CWV) | High | LCP on first visit |
| 🟠 High | Homepage social links are `href=""` placeholders → no `sameAs`, no entity corroboration | GEO | Low | Entity confidence |
| 🟠 High | No `speakable` markup; FAQ answers are prose, not 40–60 word answer blocks | AEO | Low | Voice/AI extraction |
| 🟡 Medium | Archive `ItemList` carries only `name`/`url` — no `image` or `aggregateRating` | GEO | Low | Richer citations |
| 🟡 Medium | ISR `revalidate` is 300s; a long-tail visitor can hit a cold render | SEO (CWV) | Low | Repeat-visit LCP |
| 🟢 Quick Win | Titles on archive cards have no `ageRating`/`averageRating` in schema | AEO | Low | Snippet enrichment |

---

## 3. Before / After — what changed

| Page | Schema before | Schema after |
|---|---|---|
| `/` | WebSite, Organization | WebSite, **Organization** (+logo, knowsAbout), **Person**, **FAQPage** |
| `/films`, `/game`, `/series`, `/e-books`, `/aplikasi` | *(none)* | **CollectionPage + ItemList**, BreadcrumbList |
| `/content/[slug]` | BreadcrumbList, Product | BreadcrumbList, Product, **Person** |
| `/blog` | BreadcrumbList, CollectionPage | unchanged (already correct) |
| `/tentang-kami`, `/contact` | *(none)* | **AboutPage** |

---

## 4. Pages Audited

| URL | Page Type | Notes |
|---|---|---|
| `/` | Homepage | FAQPage + Organization + Person; hero carousel |
| `/films` | Category archive | 16-item ItemList, self-canonical |
| `/game`, `/series`, `/e-books`, `/aplikasi` | Category archives | Same template |
| `/content/widows-bay` | Title detail | Product + Review + BreadcrumbList + Person |
| `/blog` | Blog index | BreadcrumbList + CollectionPage |
| `/tentang-kami` | About | Now `AboutPage` |
| `/contact` | Contact | Now `AboutPage` |
| `/search?q=film` | Search results | No schema (correct — noindex-worthy, kept out of schema) |

---

## 5. SEO Analysis

### Technical On-Page

| Signal | Finding | Status |
|---|---|---|
| Title tag | Present, template `%s · ScreenScore`, lengths sensible per page | ✅ |
| Meta description | Present on every route; head-placement bug fixed by Next 16 | ✅ |
| H1 | Exactly one per page, verified across 8 routes | ✅ |
| Canonical | Self-referencing; age-filtered facets canonicalise back to the plain archive (correct de-dup) | ✅ |
| Robots meta | Archives indexable; filtered facets `noindex, follow` | ✅ |
| Viewport | `width=device-width, initial-scale=1` | ✅ |
| Image alt | All images have alt or `aria-hidden` | ✅ |
| Head tags in `<head>` | All 7 tested routes correct after Next 16 upgrade | ✅ |
| HTTP status | Real 404s (verified `zzz-not-real-999` → 404, not soft-404) | ✅ |

### Content Quality

| Signal | Finding | Status |
|---|---|---|
| Word count | Title detail pages carry long-form WP articles with promoted `<h2>` section headings | ✅ |
| Freshness | `datePublished` on articles; archives ordered `date desc` | ✅ |
| Readability | `.article-prose` typesetting, 1.75 line-height, fact sheets promoted to cards | ✅ |
| Skeleton accuracy | `SliderSkeleton` matches real carousel geometry (no CLS) | ✅ |

### Structured Data

| Signal | Finding | Status |
|---|---|---|
| JSON-LD present | 4 script blocks on homepage, 1 on every other route | ✅ |
| Parses cleanly | All blocks verified with `JSON.parse` | ✅ |
| Product/Review | Present only when WordPress actually collected the rating | ✅ |
| Breadcrumbs | On archives, detail and blog | ✅ |

---

## 6. GEO Analysis

### E-E-A-T

| Signal | Finding | Status |
|---|---|---|
| Named author | `Person` schema added; "About Writer" already printed on every detail page | ✅ |
| About page | `/tentang-kami` exists, now typed `AboutPage` | ✅ |
| Organization entity | Logo, description, `knowsAbout` now declared with a stable `@id` | ✅ |
| `sameAs` social corroboration | **Missing** — footer social links are `href=""` placeholders | ❌ |
| Contact page | `/contact` exists, typed `AboutPage` | ✅ |

### Content for AI Synthesis

| Signal | Finding | Status |
|---|---|---|
| Factual density | Screen Score editor rating + 6 safety dimensions per title | ✅ |
| Clear claim at top | Detail pages open with title, category, year and score | ✅ |
| Entity clarity | Brand named consistently in title template, footer and Organization node | ✅ |
| Machine-readable lists | Archive `ItemList` added — the single biggest GEO win here | ✅ |

### Technical GEO

| Signal | Finding | Status |
|---|---|---|
| HTTPS | Enforced in production (`NEXT_PUBLIC_SITE_URL`) | ✅ |
| Crawlability | `robots.txt` + `sitemap.xml` both 200 | ✅ |
| JS-only rendering | **Not an issue** — all copy is server-rendered, verified in raw HTML | ✅ |

---

## 7. AEO Analysis

### Featured Snippet Eligibility

| Signal | Finding | Status |
|---|---|---|
| Direct answer paragraphs | FAQ answers are one sentence each — ideal length | ✅ |
| FAQ schema | `FAQPage` added with all five Q&A pairs | ✅ |
| Question-phrased headings | FAQ questions use natural question form | ✅ |

### Structured Answer Formats

| Signal | Finding | Status |
|---|---|---|
| List content | Archive `ItemList` + age-filter chips | ✅ |
| Table content | Review articles can contain tables (styled in `.article-prose`) | ✅ |
| `speakable` | Not implemented | ❌ |

### Voice Search Readiness

| Signal | Finding | Status |
|---|---|---|
| Conversational language | Indonesian FAQ is written in conversational "Mama" register | ✅ |
| Long-tail coverage | Age bands ("0–3 Bulan" … "21+") target specific parent queries | ✅ |

---

## 8. What's Working Well

- **Zero CLS.** Image dimensions are derived from real `srcSet` data via
  `imageDims()`, so nothing reflows when images arrive.
- **Correct 404s under streaming.** The root `loading.tsx` was long suspected of
  causing soft-404s; on Next 16 it was measured to return a real `404`.
- **Warm navigation is instant.** 30–54ms with no skeleton flash — the fetch
  cache (`next: { revalidate }`) is doing its job.
- **Layout gutter is unified.** A single `.ss-container` replaced a mix of
  `max-w-[1200px]`/`max-w-[1280px]` wrappers that had the logo sitting 40px
  out of line with the content column on desktop.
- **Contrast was systematically audited, not assumed.** Footer white-on-sage
  measured 2.16:1 and is now 6.91:1; every route re-scanned at 0 failures.

---

## 9. Glossary

**SEO** — Search Engine Optimisation: earning visibility in Google/Bing results.

**GEO** — Generative Engine Optimisation: being *cited* by AI assistants
(ChatGPT Search, Perplexity, Gemini, AI Overviews) rather than merely ranked.
These systems favour pages that state facts plainly, declare their entities
with schema.org, and are unambiguous about who is behind them.

**AEO** — Answer Engine Optimisation: structuring content so a search engine can
lift a clean, self-contained answer into a featured snippet or voice response.
FAQ schema and question-shaped headings are the usual levers.

---

## 10. Measurement Caveat

Every performance number in this report was measured against
`http://localhost:3002` with Lighthouse CLI 13.5.0 (mobile emulation +
throttling). Two things that cannot be assessed that way:

- **Real Core Web Vitals** — localhost has no network latency and no CDN.
  Run PageSpeed Insights against the deployed domain before treating the
  performance score as final.
- **Backlinks and domain authority** — out of scope for any HTML audit.