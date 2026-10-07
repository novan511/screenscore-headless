/** Shared domain types across the headless frontend. */

export interface Term {
  id: number;
  name: string;
  slug: string;
}

export interface TitleImage {
  src: string;
  srcSet?: string;
  alt: string;
}

/** A title (WooCommerce product) normalised for the UI. */
export interface Title {
  id: number;
  slug: string;
  name: string;
  permalink: string;
  /** short_description HTML (year/age list + hook) */
  shortDescription: string;
  /** full description HTML (long synopsis) */
  description: string;
  /**
   * Body copy to render on the detail page. WooCommerce puts the long review
   * in `description`, but a large share of products (most games) keep their
   * entire article in `short_description` and leave `description` empty —
   * this is whichever of the two actually has content.
   */
  body: string;
  images: TitleImage[];
  categories: Term[];
  tags: Term[];
  averageRating: number;
  reviewCount: number;
  /** parsed from short_description <li> list */
  year?: string;
  ageRating?: string;
  /** plain-text hook line */
  excerpt?: string;
}

/**
 * Card-sized projection of a Title — exactly the fields `PosterCard` reads.
 *
 * Client components (the homepage `PosterSlider` rows) receive this instead
 * of the full `Title`, because whatever crosses a server→client boundary is
 * serialised into the RSC payload: shipping the ~10KB article `body` per card
 * inflated the homepage HTML to 672KB and made first paint wait on parsing a
 * 460KB inline script. Server components can still pass a full `Title` — it
 * structurally satisfies this type.
 */
export interface TitleCard {
  id: number;
  slug: string;
  name: string;
  /** Poster only — cards never show gallery images. */
  images: TitleImage[];
  categories: Term[];
  averageRating: number;
  reviewCount: number;
  year?: string;
  ageRating?: string;
}

/** Embedded trailer pulled from the WordPress page (Elementor video widget). */
export interface Trailer {
  provider: "youtube";
  id: string;
}

export interface Paged<T> {
  items: T[];
  page: number;
  totalPages: number;
  total: number;
}

/** One kid-safety dimension of the Screen Score (0–5 stars). */
export interface ScoreDimension {
  label: string;
  stars: number;
}

/** Editor review parsed from the reviewflow widget (WP HTML bridge). */
export interface ScreenScore {
  score: number | null;
  stars: number;
  label: string;
  review: string;
  dimensions: ScoreDimension[];
}

export interface Person {
  slug: string;
  title: string;
  uri: string;
  image?: string;
  /** kind of person: cast | creator | character | ... */
  kind: PersonKind;
}

export type PersonKind =
  | "cast"
  | "creator"
  | "character"
  | "song"
  | "idol"
  | "pro-player"
  | "gadget";

export interface StaticPage {
  title: string;
  uri: string;
  content: string;
}

export interface SeoMeta {
  title: string;
  description: string;
  image?: string;
}
