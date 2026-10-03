/**
 * Inlines one schema.org JSON-LD block. `<` is escaped so a stray `</script>`
 * in user-facing copy can never close the tag early.
 */
export default function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
