import { cache } from "react";
import { ENDPOINTS, SITE } from "./config";
import { isUpstreamError, wpFetch } from "./http";
import type { PersonKind } from "./types";

/**
 * Minimal WPGraphQL client.
 * The production schema emits harmless DUPLICATE_TYPE debug noise inside
 * `extensions` — we ignore extensions and only surface real errors.
 */
export async function gql<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const res = await wpFetch(ENDPOINTS.graphql, {
    revalidate: SITE.revalidate,
    init: {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
    },
  });
  if (!res.ok) {
    throw new Error(`GraphQL HTTP ${res.status} for ${query.slice(0, 60)}…`);
  }
  const json = (await res.json()) as {
    data?: T;
    errors?: { message: string }[];
  };
  if (json.errors?.length) {
    throw new Error(`GraphQL: ${json.errors.map((e) => e.message).join("; ")}`);
  }
  if (!json.data) throw new Error("GraphQL: empty data");
  return json.data;
}

/* ---------- shared fragments ---------- */

const PERSON_FIELDS = `
  databaseId
  title
  slug
  uri
  featuredImage {
    node {
      sourceUrl
      altText
    }
  }
`;

export interface GqlPersonNode {
  databaseId: number;
  title: string;
  slug: string;
  uri: string;
  featuredImage?: { node?: { sourceUrl: string; altText: string } };
}

export async function fetchPeople(
  kind: PersonKind,
  opts: { first?: number; search?: string; after?: string } = {},
): Promise<{ items: GqlPersonNode[]; total: number; endCursor: string | null; hasNext: boolean }> {
  const field =
    kind === "cast" ? "allCast"
      : kind === "creator" ? "allCreator"
        : kind === "character" ? "characters"
          : kind === "idol" ? "idols"
            : "songs";
  const searchArg = opts.search ? `, where: { search: "${escapeGql(opts.search)}" }` : "";
  const afterArg = opts.after ? `, after: "${opts.after}"` : "";
  const data = await gql<Record<string, {
    edges: { node: GqlPersonNode }[];
    pageInfo: { endCursor: string | null; hasNextPage: boolean };
    pageInfo2?: unknown;
  }>>(
    `{
      ${field}(first: ${opts.first ?? 24}${searchArg}${afterArg}) {
        edges { node { ${PERSON_FIELDS} } }
        pageInfo { endCursor hasNextPage }
      }
    }`,
  );
  const conn = data[field];
  return {
    items: conn.edges.map((e) => e.node),
    total: conn.edges.length,
    endCursor: conn.pageInfo.endCursor,
    hasNext: conn.pageInfo.hasNextPage,
  };
}

export const fetchPerson = cache(async (
  kind: PersonKind,
  slugOrUri: string,
): Promise<GqlPersonNode | null> => {
  const field =
    kind === "cast" ? "cast"
      : kind === "creator" ? "creator"
        : kind === "character" ? "character"
          : kind === "idol" ? "idol"
            : "song";
  try {
    const data = await gql<Record<string, GqlPersonNode | null>>(
      `{ ${field}(id: "${escapeGql(slugOrUri)}", idType: SLUG) { ${PERSON_FIELDS} } }`,
    );
    return data[field] ?? null;
  } catch (err) {
    // An unreachable backend must not be reported as "person not found".
    if (isUpstreamError(err)) throw err;
  }

  // hierarchical types (character/marvel/carnage) resolve by URI instead
  try {
    const data = await gql<{ nodeByUri: GqlPersonNode | null }>(
      `{ nodeByUri(uri: "${escapeGql(slugOrUri)}") { ... on Node { databaseId } ... on UniformResourceIdentifiable { uri } } }`,
    );
    return data.nodeByUri ?? null;
  } catch (err) {
    if (isUpstreamError(err)) throw err;
    return null;
  }
});

export interface GqlPage {
  title: string;
  slug: string;
  uri: string;
  content: string;
}

export const fetchStaticPage = cache(
  async (slug: string): Promise<GqlPage | null> => {
    const data = await gql<{ page: GqlPage | null }>(
      `{ page(id: "${escapeGql(slug)}", idType: URI) { title slug uri content } }`,
    );
    return data.page;
  },
);

export async function fetchMenu(): Promise<{ label: string; uri: string }[]> {
  const data = await gql<{
    menu: { menuItems: { edges: { node: { label: string; uri: string } }[] } } | null;
  }>(
    `{ menu(id: "primary", idType: LOCATION) { menuItems(first: 30) { edges { node { label uri } } } } }`,
  );
  return data.menu?.menuItems.edges.map((e) => e.node) ?? [];
}

export async function fetchSiteSettings(): Promise<{ title: string; description: string }> {
  const data = await gql<{ generalSettings: { title: string; description: string } }>(
    `{ generalSettings { title description } }`,
  );
  return data.generalSettings;
}

function escapeGql(v: string): string {
  return v.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
