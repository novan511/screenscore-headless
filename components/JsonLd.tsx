import type { ReactNode } from "react";

/**
 * Injects schema.org structured data.
 *
 * `<` is escaped so no value coming out of WordPress can break out of the
 * script element and execute.
 */
export function JsonLd({ data }: { data: object | object[]; children?: ReactNode }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
